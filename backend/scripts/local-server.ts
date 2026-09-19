/**
 * Runs the Lambda handler as a local HTTP server for frontend development.
 * Uses your local AWS credentials and backend/.env.
 *
 *   npm run dev   ->  http://localhost:4000
 */
import "dotenv/config";
import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../src/index.js";

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
}).listen(port, () => console.log(`Radius API running at http://localhost:${port}`));
