/**
 * Creates users-index and projects-index in the OpenSearch domain.
 *
 *   npm run create-indices
 */
import "dotenv/config";
import { createIndices, isSearchEnabled } from "../src/services/opensearch.js";

async function main() {
  if (!isSearchEnabled()) throw new Error("Set OPENSEARCH_ENDPOINT in backend/.env first");
  const created = await createIndices();
  console.log(created.length ? `Created: ${created.join(", ")}` : "Indices already exist");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
