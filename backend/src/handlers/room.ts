import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { Handler } from "../router.js";
import type { Notification, NotificationActor } from "../models/notification.js";
import { SendMessageInput, type ChatMessage, type RoomConnection } from "../models/room.js";
import type { Project } from "../models/project.js";
import { ROOM_MIN_MEMBERS, type Team } from "../models/team.js";
import { toSummary, type User } from "../models/user.js";
import { createAttendee, createMeeting, findMeeting } from "../services/chime.js";
import { broadcast, isRealtimeEnabled, notify } from "../services/realtime.js";
import { db } from "../services/store.js";
import { requireCaller, requireProject, verifyToken } from "../utils/auth.js";
import { conflict, forbidden, json, notFound, parseBody } from "../utils/http.js";
import { newId, nowIso, teamIdFor, userChannel } from "../utils/ids.js";
import { errorFields, log } from "../utils/logger.js";

const HISTORY_LIMIT = 50;

/** Loads the project and team, and checks the caller may use the room. */
async function requireRoom(projectId: string | undefined, userId: string): Promise<{ project: Project; team: Team }> {
  const project = await requireProject(projectId);
  const team = await db.getTeam(teamIdFor(project.projectId));
  if (!team) throw notFound("Team");
  if (!team.members.includes(userId)) throw forbidden("Only team members can enter the team room");
  if (team.members.length < ROOM_MIN_MEMBERS) throw conflict("The team room opens as soon as someone joins the team");
  return { project, team };
}

const actorOf = (user: User): NotificationActor => ({ userId: user.userId, name: user.name, avatarUrl: user.avatarUrl });

/** Everyone on the team except whoever caused the event. */
const others = (team: Team, userId: string): string[] => team.members.filter((id) => id !== userId);

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
  const { project, team } = await requireRoom(req.params.projectId, caller.userId);
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
  const { project, team } = await requireRoom(req.params.projectId, caller.userId);
  const { text } = parseBody(req.event, SendMessageInput);
  const sentAt = nowIso();
  const messageId = newId("m");
  const message: ChatMessage = { projectId: req.params.projectId!, sortKey: `${sentAt}#${messageId}`, messageId, userId: caller.userId, text, sentAt };
  await db.putMessage(message);
  const notification: Notification = {
    id: `msg_${messageId}`,
    kind: "message",
    at: sentAt,
    projectId: project.projectId,
    projectTitle: project.title,
    actor: actorOf(caller),
    text,
  };
  await Promise.all([broadcast(message.projectId, { type: "message", message }), notify(others(team, caller.userId), notification)]);
  return json(201, { message });
};

/** POST /projects/{projectId}/call - joins the team's call, starting one if none is running. */
export const joinCall: Handler = async (req) => {
  const caller = await requireCaller(req);
  const { project, team } = await requireRoom(req.params.projectId, caller.userId);

  let meeting = team.meeting ? await findMeeting(team.meeting.meetingId) : undefined;
  let started = false;
  if (!meeting) {
    meeting = await createMeeting(team.teamId);
    const record = { meetingId: meeting.MeetingId!, startedBy: caller.userId, startedAt: nowIso() };
    await db.setTeamMeeting(team.teamId, record);
    const notification: Notification = {
      id: `call_${record.meetingId}`,
      kind: "call",
      at: record.startedAt,
      projectId: project.projectId,
      projectTitle: project.title,
      actor: actorOf(caller),
      startedAt: record.startedAt,
    };
    await Promise.all([
      broadcast(team.projectId, { type: "call", status: "started", startedBy: record.startedBy, startedAt: record.startedAt }),
      notify(others(team, caller.userId), notification),
    ]);
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
 * Browsers can't send headers when opening a WebSocket, so the room and the
 * signed-in person's ID token come in the query string: wss://.../prod?projectId=p_1&token=eyJ…
 */
export async function handleWebSocket(event: WebSocketEvent): Promise<APIGatewayProxyStructuredResultV2> {
  const { connectionId, eventType } = event.requestContext;
  if (eventType === "DISCONNECT") {
    await db.deleteConnection(connectionId);
    return ok;
  }
  if (eventType === "MESSAGE") return ok; // keep-alive pings; messages are sent over HTTPS

  const projectId = event.queryStringParameters?.projectId;
  const token = event.queryStringParameters?.token;
  // channel=user listens for this person's own notifications from anywhere in the app.
  const personal = event.queryStringParameters?.channel === "user";
  if ((!projectId && !personal) || !token) return { statusCode: 400 };
  let userId: string;
  try {
    userId = (await verifyToken(token)).sub;
  } catch {
    return { statusCode: 401 };
  }
  let channel: string;
  if (personal) {
    channel = userChannel(userId);
  } else {
    const team = await db.getTeam(teamIdFor(projectId!));
    if (!team?.members.includes(userId) || team.members.length < ROOM_MIN_MEMBERS) return { statusCode: 403 };
    channel = projectId!;
  }

  const now = Date.now();
  const connection: RoomConnection = { connectionId, projectId: channel, userId, connectedAt: new Date(now).toISOString(), ttl: Math.floor(now / 1000) + 3 * 60 * 60 };
  await db.putConnection(connection);
  return ok;
}
