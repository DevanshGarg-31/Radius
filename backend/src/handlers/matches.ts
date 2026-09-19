import type { Handler } from "../router.js";
import { config } from "../config.js";
import type { CachedExplanation, Project } from "../models/project.js";
import type { CollaborationRequest } from "../models/request.js";
import { toSummary, type User } from "../models/user.js";
import { explainMatches } from "../services/bedrock.js";
import * as db from "../services/dynamodb.js";
import { buildMatchContext, missingSkills, rankCandidates, targetSkills, WEIGHTS, type MatchContext } from "../services/matching.js";
import { isSearchEnabled, searchCandidates } from "../services/opensearch.js";
import { requireCaller, requireProject } from "../utils/auth.js";
import { conflict, json } from "../utils/http.js";
import { teamIdFor } from "../utils/ids.js";
import { errorFields, log, metric } from "../utils/logger.js";
import { expandedSkillKeys, interestKeys, keyOf, suggestRole } from "../utils/skills.js";

interface SearchMeta {
  source: "opensearch" | "dynamodb";
  tookMs: number;
  candidatesConsidered: number;
  fallbackReason?: string;
}

/** DynamoDB fallback: scan users and keep anyone sharing a wanted skill or topic. */
async function scanCandidates(ctx: MatchContext, exclude: Set<string>): Promise<User[]> {
  const wantedSkills = new Set(targetSkills(ctx).map(keyOf));
  const topics = new Set(ctx.topics.map(keyOf));
  const users = await db.listUsers();
  return users.filter((u) => {
    if (exclude.has(u.userId)) return false;
    const skillHit = [...expandedSkillKeys(u.skills)].some((k) => wantedSkills.has(k));
    const topicHit = [...interestKeys(u.interests)].some((k) => topics.has(k));
    return skillHit || topicHit;
  });
}

/** OpenSearch finds the pool; any failure drops to DynamoDB so the demo keeps working. */
async function findCandidatePool(ctx: MatchContext, exclude: Set<string>): Promise<{ users: User[]; meta: SearchMeta }> {
  const start = Date.now();
  if (isSearchEnabled()) {
    try {
      const { userIds, tookMs } = await searchCandidates({
        skillKeys: targetSkills(ctx).map(keyOf),
        topicKeys: ctx.topics.map(keyOf),
        excludeUserIds: [...exclude],
        size: config.matching.candidatePoolSize,
      });
      metric("OpenSearchTookMs", tookMs, "Milliseconds");
      const users = await db.getUsers(userIds);
      return { users, meta: { source: "opensearch", tookMs, candidatesConsidered: users.length } };
    } catch (err) {
      log.warn("opensearch failed, falling back to dynamodb scan", errorFields(err));
      const users = await scanCandidates(ctx, exclude);
      return { users, meta: { source: "dynamodb", tookMs: Date.now() - start, candidatesConsidered: users.length, fallbackReason: "opensearch_error" } };
    }
  }
  const users = await scanCandidates(ctx, exclude);
  return { users, meta: { source: "dynamodb", tookMs: Date.now() - start, candidatesConsidered: users.length, fallbackReason: "opensearch_not_configured" } };
}

/** GET /projects/{projectId}/matches - search, then deterministic scoring, then AI explanation. */
export const getMatches: Handler = async (req) => {
  await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  if (!project.requiredSkills.length) throw conflict("Run AI analysis on this project first (POST /projects/{projectId}/analyze)");

  const team = await db.getTeam(teamIdFor(project.projectId));
  const memberIds = team?.members ?? [project.ownerId];
  const [members, requests] = await Promise.all([db.getUsers(memberIds), db.listRequestsByProject(project.projectId)]);

  const ctx = buildMatchContext(project, members);
  const exclude = new Set([project.ownerId, ...memberIds]);
  const { users, meta } = await findCandidatePool(ctx, exclude);
  const ranked = rankCandidates(ctx, users, config.matching.topN);
  metric("CandidatesScored", users.length);

  const usersById = new Map(users.map((u) => [u.userId, u]));
  const stillMissing = missingSkills(ctx);
  const reasons = await explanationsFor(project, ranked, usersById, stillMissing);
  const roleContext = { takenRoles: team?.roles.map((r) => r.role), missingSkills: stillMissing };
  const requestByUser = new Map<string, CollaborationRequest>(requests.map((r) => [r.toUserId, r]));

  const matches = ranked.map((m) => {
    const user = usersById.get(m.userId)!;
    const request = requestByUser.get(m.userId);
    return {
      ...toSummary(user),
      userId: m.userId,
      score: m.score,
      matchedSkills: m.matchedSkills,
      gapSkills: m.gapSkills,
      matchedInterests: m.matchedInterests,
      breakdown: m.breakdown,
      reason: reasons.get(m.userId)?.reason ?? "",
      reasonSource: reasons.get(m.userId)?.source ?? "fallback",
      suggestedRole: suggestRole(project.requiredRoles, user.skills, roleContext),
      requestStatus: request?.status ?? null,
      requestId: request?.requestId ?? null,
    };
  });

  return json(200, {
    projectId: project.projectId,
    requiredSkills: ctx.requiredSkills,
    missingSkills: stillMissing,
    weights: WEIGHTS,
    searchMeta: meta,
    matches,
  });
};

/** Reuses cached explanations when the score is unchanged; asks Bedrock (once, batched) for the rest. */
async function explanationsFor(
  project: Project,
  ranked: ReturnType<typeof rankCandidates>,
  usersById: Map<string, User>,
  teamMissingSkills: string[],
): Promise<Map<string, CachedExplanation>> {
  const cache = project.explanationCache ?? {};
  const result = new Map<string, CachedExplanation>();
  const toExplain = [];
  for (const match of ranked) {
    const cached = cache[match.userId];
    if (cached && cached.score === match.score) result.set(match.userId, cached);
    else toExplain.push({ user: usersById.get(match.userId)!, match });
  }
  if (!toExplain.length) return result;

  const fresh = await explainMatches(project, toExplain, teamMissingSkills);
  const updatedCache = { ...cache };
  for (const { match } of toExplain) {
    const explanation = fresh.get(match.userId);
    if (!explanation) continue;
    const entry: CachedExplanation = { score: match.score, ...explanation };
    result.set(match.userId, entry);
    // Only cache real model output; a fallback should be retried next time.
    if (explanation.source === "bedrock") updatedCache[match.userId] = entry;
  }
  try {
    await db.saveExplanationCache(project.projectId, updatedCache);
  } catch (err) {
    log.warn("failed to save explanation cache", errorFields(err));
  }
  return result;
}
