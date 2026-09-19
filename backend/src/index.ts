import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { getMatches } from "./handlers/matches.js";
import { analyzeProject, createProject, getProject, listProjects } from "./handlers/projects.js";
import { health } from "./handlers/health.js";
import { createRequest, listProjectRequests, updateRequest } from "./handlers/requests.js";
import { getRoom, handleWebSocket, joinCall, listMessages, sendMessage } from "./handlers/room.js";
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
  .get("/projects/:projectId/room", getRoom)
  .get("/projects/:projectId/messages", listMessages)
  .post("/projects/:projectId/messages", sendMessage)
  .post("/projects/:projectId/call", joinCall)
  .post("/uploads/presign", presign)
  .get("/assets/*", getAsset);

type WebSocketEvent = Parameters<typeof handleWebSocket>[0];

const isWebSocketEvent = (event: APIGatewayProxyEventV2 | WebSocketEvent): event is WebSocketEvent => "eventType" in event.requestContext;

/**
 * Lambda entry point. One function serves both the HTTP API (payload format 2.0)
 * and the WebSocket API used for live team-room updates.
 */
export async function handler(event: APIGatewayProxyEventV2 | WebSocketEvent, context?: Context): Promise<APIGatewayProxyStructuredResultV2> {
  const start = Date.now();
  if (isWebSocketEvent(event)) {
    setLogContext({ requestId: context?.awsRequestId, route: `WS ${event.requestContext.eventType}` });
    try {
      const response = await handleWebSocket(event);
      log.info("websocket", { status: response.statusCode, durationMs: Date.now() - start });
      return response;
    } catch (err) {
      log.error("websocket failed", errorFields(err));
      return { statusCode: 500 };
    }
  }
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
