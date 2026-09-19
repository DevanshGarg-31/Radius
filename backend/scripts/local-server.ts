/**
 * Runs the Lambda handler as a local HTTP server for frontend development.
 * Uses your local AWS credentials and backend/.env.
 *
 *   npm run dev          ->  http://localhost:4000 (real AWS services)
 *   npm run dev:memory   ->  same API with no AWS at all: in-memory data seeded with
 *                            the demo users/projects, Bedrock and OpenSearch fallbacks
 */
import "dotenv/config";
import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

const memory = process.argv.includes("--memory");
if (memory) {
  process.env.DATA_STORE = "memory";
  process.env.BEDROCK_ENABLED = "false";
  process.env.OPENSEARCH_ENDPOINT = "";
}

// Imported after the env is set, because config is read at import time.
const { handler } = await import("../src/index.js");
if (memory) {
  const { resetMemoryStore } = await import("../src/services/memory-store.js");
  const { DEMO_PROJECTS, DEMO_TEAMS, DEMO_USERS } = await import("./seed-data.js");
  resetMemoryStore({ users: DEMO_USERS, projects: DEMO_PROJECTS, teams: DEMO_TEAMS });
}

const port = Number(process.env.PORT ?? 4000);

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(",") : (v ?? "")]));

  const event = {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method ?? "GET", path: url.pathname }, requestId: `local-${Date.now()}`, stage: "$default" },
  } as unknown as APIGatewayProxyEventV2;

  const result = await handler(event);
  res.writeHead(result.statusCode ?? 200, result.headers as Record<string, string>);
  res.end(result.body ?? "");
}).listen(port, () => console.log(`Radius API running at http://localhost:${port}${memory ? " (in-memory demo data, no AWS)" : ""}`));
