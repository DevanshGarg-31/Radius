/**
 * Loads the demo users, projects and teams into DynamoDB and (if configured) OpenSearch.
 * Safe to run repeatedly: items are overwritten with the same fixed content.
 *
 *   npm run seed
 */
import "dotenv/config";
import { putProject, putTeam, putUser } from "../src/services/dynamodb.js";
import { indexProject, indexUser, isSearchEnabled } from "../src/services/opensearch.js";
import { DEMO_PROJECTS, DEMO_TEAMS, DEMO_USERS } from "./seed-data.js";

async function main() {
  for (const user of DEMO_USERS) await putUser(user);
  console.log(`DynamoDB: wrote ${DEMO_USERS.length} users`);
  for (const project of DEMO_PROJECTS) await putProject(project);
  console.log(`DynamoDB: wrote ${DEMO_PROJECTS.length} projects`);
  for (const team of DEMO_TEAMS) await putTeam(team);
  console.log(`DynamoDB: wrote ${DEMO_TEAMS.length} teams`);

  if (!isSearchEnabled()) {
    console.log("OpenSearch: OPENSEARCH_ENDPOINT not set, skipping (matching will use the DynamoDB fallback)");
    return;
  }
  for (const user of DEMO_USERS) await indexUser(user);
  for (const project of DEMO_PROJECTS) await indexProject(project);
  console.log(`OpenSearch: indexed ${DEMO_USERS.length} users and ${DEMO_PROJECTS.length} projects`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
