/**
 * Deterministic matching engine. Pure functions only: same inputs, same scores.
 * The LLM never touches the score; it only explains it afterwards.
 */
import type { Project } from "../models/project.js";
import type { ExperienceLevel, User } from "../models/user.js";
import { canonicalInterest, canonicalSkill, expandedSkillKeys, interestKeys, keyOf, scanTopics, uniqueCanonical } from "../utils/skills.js";

export const WEIGHTS = {
  skills: 0.5,
  interests: 0.2,
  availability: 0.15,
  experience: 0.1,
  location: 0.05,
} as const;

/** Sharing this many project topics counts as a full interest match. */
const INTERESTS_FOR_FULL_MATCH = 2;

const EXPERIENCE_ORDER: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const EXPERIENCE_VALUE: Record<ExperienceLevel, number> = { beginner: 0.5, intermediate: 0.75, advanced: 1 };

export interface MatchContext {
  requiredSkills: string[];
  /** Skills the current team already covers (expanded, lowercase keys). */
  coveredSkillKeys: Set<string>;
  topics: string[];
  location: string;
  remote: boolean;
  preferredAvailability: string[];
  preferredExperience?: ExperienceLevel;
}

export interface ScoreBreakdown {
  skills: number;
  interests: number;
  availability: number;
  experience: number;
  location: number;
}

export interface MatchResult {
  userId: string;
  score: number;
  /** Required skills the candidate has. */
  matchedSkills: string[];
  /** Required skills the candidate has that the team is still missing. */
  gapSkills: string[];
  /** Candidate's own interest labels that overlap the project's topics. */
  matchedInterests: string[];
  breakdown: ScoreBreakdown;
}

/** Project topics come from the AI analysis plus a deterministic scan of the project text. */
export function projectTopics(project: Pick<Project, "title" | "description" | "category" | "aiRequirements">): string[] {
  const categoryParts = project.category.split(/[/,&|]+/).map((p) => p.trim()).filter(Boolean);
  return uniqueCanonical(
    [...scanTopics(`${project.title} ${project.description}`), ...scanTopics(categoryParts.join(" ")), ...(project.aiRequirements?.topics ?? [])],
    (s) => s,
  );
}

export function buildMatchContext(project: Project, teamMembers: readonly User[]): MatchContext {
  const coveredSkillKeys = new Set<string>();
  for (const member of teamMembers) expandedSkillKeys(member.skills).forEach((k) => coveredSkillKeys.add(k));
  return {
    requiredSkills: uniqueCanonical(project.requiredSkills),
    coveredSkillKeys,
    topics: projectTopics(project),
    location: project.location,
    remote: project.remote,
    preferredAvailability: project.preferredAvailability ?? [],
    preferredExperience: project.preferredExperience,
  };
}

/** Skills the team still needs. When the team already covers everything, all required skills count. */
export function targetSkills(ctx: MatchContext): string[] {
  const missing = ctx.requiredSkills.filter((s) => !ctx.coveredSkillKeys.has(keyOf(s)));
  return missing.length ? missing : ctx.requiredSkills;
}

export function missingSkills(ctx: MatchContext): string[] {
  return ctx.requiredSkills.filter((s) => !ctx.coveredSkillKeys.has(keyOf(s)));
}

function experienceScore(level: ExperienceLevel, preferred?: ExperienceLevel): number {
  if (!preferred) return EXPERIENCE_VALUE[level] ?? 0.5;
  const distance = Math.abs(EXPERIENCE_ORDER.indexOf(level) - EXPERIENCE_ORDER.indexOf(preferred));
  return distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
}

function availabilityScore(candidate: readonly string[], preferred: readonly string[]): number {
  if (preferred.length) {
    const wanted = new Set(preferred.map(keyOf));
    return candidate.some((a) => wanted.has(keyOf(a))) ? 1 : 0;
  }
  return candidate.length ? 1 : 0.5;
}

function locationScore(ctx: MatchContext, candidateLocation: string): number {
  if (ctx.remote) return 1;
  return ctx.location && keyOf(ctx.location) === keyOf(candidateLocation) ? 1 : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scoreCandidate(ctx: MatchContext, user: User): MatchResult {
  const have = expandedSkillKeys(user.skills);
  const target = targetSkills(ctx);
  const gapSkills = target.filter((s) => have.has(keyOf(canonicalSkill(s))));
  const matchedSkills = ctx.requiredSkills.filter((s) => have.has(keyOf(s)));

  const topicKeys = new Set(ctx.topics.map(keyOf));
  const matchedInterests = user.interests.filter((i) => topicKeys.has(keyOf(canonicalInterest(i))));
  const sharedTopics = new Set([...interestKeys(user.interests)].filter((k) => topicKeys.has(k))).size;

  const breakdown: ScoreBreakdown = {
    skills: target.length ? gapSkills.length / target.length : 0,
    interests: Math.min(1, sharedTopics / INTERESTS_FOR_FULL_MATCH),
    availability: availabilityScore(user.availability, ctx.preferredAvailability),
    experience: experienceScore(user.experienceLevel, ctx.preferredExperience),
    location: locationScore(ctx, user.location),
  };

  const weighted =
    breakdown.skills * WEIGHTS.skills +
    breakdown.interests * WEIGHTS.interests +
    breakdown.availability * WEIGHTS.availability +
    breakdown.experience * WEIGHTS.experience +
    breakdown.location * WEIGHTS.location;

  return {
    userId: user.userId,
    score: Math.round(weighted * 100),
    matchedSkills,
    gapSkills,
    matchedInterests,
    breakdown: {
      skills: round2(breakdown.skills),
      interests: round2(breakdown.interests),
      availability: round2(breakdown.availability),
      experience: round2(breakdown.experience),
      location: round2(breakdown.location),
    },
  };
}

/** Scores and ranks candidates. Ties break on skill fit, then userId, so order is stable. */
export function rankCandidates(ctx: MatchContext, users: readonly User[], topN: number): MatchResult[] {
  return users
    .map((u) => scoreCandidate(ctx, u))
    .filter((m) => m.breakdown.skills > 0 || m.breakdown.interests > 0)
    .sort((a, b) => b.score - a.score || b.breakdown.skills - a.breakdown.skills || a.userId.localeCompare(b.userId))
    .slice(0, topN);
}
