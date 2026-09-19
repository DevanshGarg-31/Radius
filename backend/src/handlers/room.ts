import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { Handler } from "../router.js";
import { SendMessageInput, type ChatMessage, type RoomConnection } from "../models/room.js";
import { ROOM_MIN_MEMBERS, type Team } from "../models/team.js";
import { toSummary, type User } from "../models/user.js";
import { createAttendee, createMeeting, findMeeting } from "../services/chime.js";
import { broadcast, isRealtimeEnabled } from "../services/realtime.js";
import { db } from "../services/store.js";
import { requireCaller, requireProject } from "../utils/auth.js";
import { conflict, forbidden, json, notFound, parseBody } from "../utils/http.js";
import { newId, nowIso, teamIdFor } from "../utils/ids.js";
import { errorFields, log } from "../utils/logger.js";

const HISTORY_LIMIT = 50;

/** Loads the team and checks the caller may use its room. */
async function requireRoom(projectId: string | undefined, userId: string): Promise<Team> {
  const project = await requireProject(projectId);
  const team = await db.getTeam(teamIdFor(project.projectId));
  if (!team) throw notFound("Team");
  if (!team.members.includes(userId)) throw forbidden("Only team members can enter the team room");
  if (team.members.length < ROOM_MIN_MEMBERS) throw conflict("The team room opens as soon as someone joins the team");
  return team;
}

/** The team's call if Chime still has it running; forgets calls that have ended. */
async function activeCall(team: Team) {
  if (!team.meeting) return null;
  try {
    if (await findMeeting(team.meeting.meetingId)) return team.meeting;
  } catch (err) {
    // If Chime can't be reached, don't block the room; assume the call is still on.
    log.warn("could not check meeting", errorFields(err));
    return team.meeting;
  }
  await db.setTeamMeeting(team.teamId, undefined);
  return null;
}

/** GET /projects/{projectId}/room - members, roles, recent messages and call status. */
export const getRoom: Handler = async (req) => {
  const caller = await requireCaller(req);
  const team = await requireRoom(req.params.projectId, caller.userId);
  const project = await requireProject(req.params.projectId);
  const [users, messages, call] = await Promise.all([db.getUsers(team.members), db.listMessages(project.projectId, { limit: HISTORY_LIMIT }), activeCall(team)]);
  const roleOf = new Map(team.roles.map((r) => [r.userId, r.role]));
  return json(200, {
    project: { projectId: project.projectId, title: project.title, description: project.description, category: project.category },
    members: users.map((u: User) => ({ ...toSummary(u), role: roleOf.get(u.userId) ?? "Member" })),
    messages,
    call,
    realtime: isRealtimeEnabled(),
  });
};

/** GET /projects/{projectId}/messages?after= - newer messages, for clients without a live connection. */
export const listMessages: Handler = async (req) => {
  const caller = await requireCaller(req);
  await requireRoom(req.params.projectId, caller.userId);
  const messages = await db.listMessages(req.params.projectId!, { limit: HISTORY_LIMIT, after: req.query.after || undefined });
  return json(200, { messages });
};

/** POST /projects/{projectId}/messages - saves a message and pushes it to everyone in the room. */
export const sendMessage: Handler = async (req) => {
  const caller = await requireCaller(req);
  await requireRoom(req.params.projectId, caller.userId);
  const { text } = parseBody(req.event, SendMessageInput);
  const sentAt = nowIso();
  const messageId = newId("m");
  const message: ChatMessage = { projectId: req.params.projectId!, sortKey: `${sentAt}#${messageId}`, messageId, userId: caller.userId, text, sentAt };
  await db.putMessage(message);
  await broadcast(message.projectId, { type: "message", message });
  return json(201, { message });
};

/** POST /projects/{projectId}/call - joins the team's call, starting one if none is running. */
export const joinCall: Handler = async (req) => {
  const caller = await requireCaller(req);
  const team = await requireRoom(req.params.projectId, caller.userId);

  let meeting = team.meeting ? await findMeeting(team.meeting.meetingId) : undefined;
  let started = false;
  if (!meeting) {
    meeting = await createMeeting(team.teamId);
    const record = { meetingId: meeting.MeetingId!, startedBy: caller.userId, startedAt: nowIso() };
    await db.setTeamMeeting(team.teamId, record);
    await broadcast(team.projectId, { type: "call", status: "started", startedBy: record.startedBy, startedAt: record.startedAt });
    started = true;
  }
  const attendee = await createAttendee(meeting.MeetingId!, caller.userId);
  return json(200, { meeting, attendee, started });
};

// ---------- WebSocket API ($connect / $disconnect / $default) ----------

interface WebSocketEvent {
  requestContext: { connectionId: string; eventType: "CONNECT" | "DISCONNECT" | "MESSAGE" };
  queryStringParameters?: Record<string, string | undefined>;
}

const ok: APIGatewayProxyStructuredResultV2 = { statusCode: 200 };

/**
 * Browsers can't send headers when opening a WebSocket, so the room and user
 * come in the query string: wss://.../prod?projectId=p_1&userId=u_1
 */
export async function handleWebSocket(event: WebSocketEvent): Promise<APIGatewayProxyStructuredResultV2> {
  const { connectionId, eventType } = event.requestContext;
  if (eventType === "DISCONNECT") {
    await db.deleteConnection(connectionId);
    return ok;
  }
  if (eventType === "MESSAGE") return ok; // keep-alive pings; messages are sent over HTTPS

  const projectId = event.queryStringParameters?.projectId;
  const userId = event.queryStringParameters?.userId;
  if (!projectId || !userId) return { statusCode: 400 };
  const team = await db.getTeam(teamIdFor(projectId));
  if (!team?.members.includes(userId) || team.members.length < ROOM_MIN_MEMBERS) return { statusCode: 403 };

  const now = Date.now();
  const connection: RoomConnection = { connectionId, projectId, userId, connectedAt: new Date(now).toISOString(), ttl: Math.floor(now / 1000) + 3 * 60 * 60 };
  await db.putConnection(connection);
  return ok;
}
