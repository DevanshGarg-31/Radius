/**
 * Checks the OpenSearch setup on its own (no DynamoDB, Lambda or Bedrock needed):
 * runs the same candidate query the API uses for the demo project, then scores
 * the results with the matching engine.
 *
 *   npm run search:check
 */
import "dotenv/config";
import fixtures from "../src/fixtures/analyses.json" with { type: "json" };
import type { Project } from "../src/models/project.js";
import { buildMatchContext, rankCandidates, targetSkills } from "../src/services/matching.js";
import { isSearchEnabled, searchCandidates } from "../src/services/opensearch.js";
import { keyOf } from "../src/utils/skills.js";
import { DEMO_USERS } from "./seed-data.js";

const analysis = fixtures["ai football analytics"];
const founder = DEMO_USERS.find((u) => u.userId === "u001")!;

const demoProject: Project = {
  projectId: "p_search_check",
  ownerId: founder.userId,
  title: "AI Football Analytics",
  description: "Build a platform that analyzes football matches using computer vision and machine learning.",
  category: analysis.category,
  requiredSkills: analysis.skills,
  preferredSkills: [],
  requiredRoles: analysis.roles,
  openings: [],
  teamSize: 4,
  currentTeamSize: 1,
  location: founder.location,
  remote: true,
  status: "open",
  preferredAvailability: [],
  aiRequirements: { ...analysis, source: "fallback", analyzedAt: "" },
  createdAt: "",
  updatedAt: "",
};

async function main() {
  if (!isSearchEnabled()) throw new Error("Set OPENSEARCH_ENDPOINT in backend/.env first");

  const ctx = buildMatchContext(demoProject, [founder]);
  const query = { skillKeys: targetSkills(ctx).map(keyOf), topicKeys: ctx.topics.map(keyOf), excludeUserIds: [founder.userId], size: 20 };
  console.log(`Query: skills [${query.skillKeys.join(", ")}], topics [${query.topicKeys.join(", ")}]`);

  const { userIds, tookMs } = await searchCandidates(query);
  console.log(`OpenSearch returned ${userIds.length} candidates in ${tookMs} ms`);
  if (!userIds.length) throw new Error("No candidates. Did you run `npm run create-indices` and `npm run seed -- --search-only`?");

  const pool = DEMO_USERS.filter((u) => userIds.includes(u.userId));
  const ranked = rankCandidates(ctx, pool, 5);
  console.log("\nTop matches (deterministic score):");
  for (const m of ranked) {
    const name = pool.find((u) => u.userId === m.userId)!.name;
    console.log(`  ${String(m.score).padStart(3)}%  ${name.padEnd(18)} fills: ${m.gapSkills.join(", ") || "-"}`);
  }

  const ok = ranked[0]?.userId === "u002";
  console.log(ok ? "\nPASS: OpenSearch is working and Rahul is the top match." : "\nWARN: search works, but the demo ranking is unexpected. Re-run the seed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? `\nFAILED: ${err.message}` : err);
  if (err?.meta?.statusCode === 403) console.error("403 from OpenSearch: check the domain access policy and that your IAM identity has es:ESHttp* permission.");
  process.exit(1);
});
