import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { getMatches } from "./handlers/matches.js";
import { analyzeProject, createProject, getProject, listProjects } from "./handlers/projects.js";
import { health } from "./handlers/health.js";
import { createRequest, listProjectRequests, updateRequest } from "./handlers/requests.js";
import { createTeam, getTeam, getTeamGaps } from "./handlers/teams.js";
import { getAsset, presign } from "./handlers/uploads.js";
import { createUser, demoLogin, getUser, listUserRequests, listUsers, updateUser } from "./handlers/users.js";
import { Router } from "./router.js";
import { corsHeaders, errorResponse, HttpError } from "./utils/http.js";
import { errorFields, log, setLogContext } from "./utils/logger.js";

export const router = new Router()
  .get("/health", health)
  .post("/auth/demo-login", demoLogin)
  .get("/users", listUsers)
  .post("/users", createUser)
  .get("/users/:userId", getUser)
  .put("/users/:userId", updateUser)
  .get("/users/:userId/requests", listUserRequests)
  .get("/projects", listProjects)
  .post("/projects", createProject)
  .get("/projects/:projectId", getProject)
  .post("/projects/:projectId/analyze", analyzeProject)
  .get("/projects/:projectId/matches", getMatches)
  .post("/projects/:projectId/requests", createRequest)
  .get("/projects/:projectId/requests", listProjectRequests)
  .put("/requests/:requestId", updateRequest)
  .post("/teams", createTeam)
  .get("/projects/:projectId/team", getTeam)
  .get("/projects/:projectId/team-gaps", getTeamGaps)
  .post("/uploads/presign", presign)
  .get("/assets/*", getAsset);

/** Lambda entry point for the API Gateway HTTP API (payload format 2.0). */
export async function handler(event: APIGatewayProxyEventV2, context?: Context): Promise<APIGatewayProxyStructuredResultV2> {
  const start = Date.now();
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  const { route, run } = router.resolve(event);
  setLogContext({ requestId: context?.awsRequestId ?? event.requestContext.requestId, route, userId: event.headers?.["x-user-id"] });

  let response: APIGatewayProxyStructuredResultV2;
  try {
    response = await run();
  } catch (err) {
    if (!(err instanceof HttpError) || err.statusCode >= 500) log.error("request failed", errorFields(err));
    response = errorResponse(err);
  }
  log.info("request", { status: response.statusCode, durationMs: Date.now() - start });
  return response;
}
