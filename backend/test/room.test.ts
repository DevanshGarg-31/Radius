/**
 * Team room: access rules, chat history, live pushes over the WebSocket path,
 * and calls. Chime is mocked so tests never create real meetings.
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_USERS } from "../scripts/seed-data.js";

const chime = vi.hoisted(() => ({ meetings: new Set<string>(), created: 0 }));
vi.mock("../src/services/chime.js", () => ({
  findMeeting: async (id: string) => (chime.meetings.has(id) ? { MeetingId: id } : undefined),
  createMeeting: async () => {
    const id = `meeting-${++chime.created}`;
    chime.meetings.add(id);
    return { MeetingId: id, MediaRegion: "ap-south-1" };
  },
  createAttendee: async (meetingId: string, userId: string) => ({ AttendeeId: `att-${userId}`, ExternalUserId: userId, JoinToken: "token", MeetingId: meetingId }),
}));

const { handler } = await import("../src/index.js");
const { resetMemoryStore } = await import("../src/services/memory-store.js");
const { setRealtimeSender } = await import("../src/services/realtime.js");

async function call(method: string, path: string, opts: { as?: string; body?: unknown } = {}) {
  const [rawPath, qs = ""] = path.split("?");
  const event = {
    version: "2.0",
    rawPath,
    queryStringParameters: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined,
    headers: opts.as ? { authorization: `Bearer dev:${opts.as}` } : {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: { http: { method }, requestId: "test", stage: "$default" },
  } as unknown as APIGatewayProxyEventV2;
  const res = await handler(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
}

const ws = (connectionId: string, eventType: "CONNECT" | "DISCONNECT" | "MESSAGE", query?: Record<string, string>) =>
  handler({ requestContext: { connectionId, eventType }, queryStringParameters: query } as never);

let pushed: Array<{ connectionId: string; event: { type: string } }> = [];

async function formTeam() {
  const { body } = await call("POST", "/projects", {
    as: "u001",
    body: { title: "AI Football Analytics", description: "Football analytics with computer vision and machine learning.", teamSize: 4 },
  });
  const projectId = body.projectId as string;
  return {
    projectId,
    async addRahul() {
      await call("POST", `/projects/${projectId}/requests`, { as: "u001", body: { toUserId: "u002" } });
      await call("PUT", `/requests/r_${projectId}_u002`, { as: "u002", body: { status: "accepted" } });
    },
  };
}

beforeEach(() => {
  resetMemoryStore({ users: DEMO_USERS });
  chime.meetings.clear();
  pushed = [];
  setRealtimeSender(async (connectionId, data) => {
    pushed.push({ connectionId, event: JSON.parse(data) });
    return true;
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("team room", () => {
  it("opens only once someone joins, and only for members", async () => {
    const team = await formTeam();
    expect((await call("GET", `/projects/${team.projectId}/room`, { as: "u001" })).status).toBe(409);
    await team.addRahul();
    const room = await call("GET", `/projects/${team.projectId}/room`, { as: "u002" });
    expect(room.status).toBe(200);
    expect(room.body.members.map((m: { name: string; role: string }) => `${m.name}:${m.role}`)).toEqual(["Aarav Mehta:Founder", "Rahul Sharma:Collaborator"]);
    expect(room.body.call).toBeNull();
    expect((await call("GET", `/projects/${team.projectId}/room`, { as: "u003" })).status).toBe(403);
  });

  it("stores messages and pushes them to connected members", async () => {
    const team = await formTeam();
    await team.addRahul();
    expect((await ws("c-outsider", "CONNECT", { projectId: team.projectId, token: "dev:u003" })).statusCode).toBe(403);
    expect((await ws("c-rahul", "CONNECT", { projectId: team.projectId, token: "dev:u002" })).statusCode).toBe(200);

    const sent = await call("POST", `/projects/${team.projectId}/messages`, { as: "u001", body: { text: "  Welcome aboard!  " } });
    expect(sent.status).toBe(201);
    expect(sent.body.message).toMatchObject({ userId: "u001", text: "Welcome aboard!" });
    expect(pushed).toEqual([{ connectionId: "c-rahul", event: { type: "message", message: sent.body.message } }]);

    await call("POST", `/projects/${team.projectId}/messages`, { as: "u002", body: { text: "Thanks! Starting on the ML side." } });
    const history = await call("GET", `/projects/${team.projectId}/room`, { as: "u001" });
    expect(history.body.messages.map((m: { text: string }) => m.text)).toEqual(["Welcome aboard!", "Thanks! Starting on the ML side."]);

    const newer = await call("GET", `/projects/${team.projectId}/messages?after=${encodeURIComponent(sent.body.message.sortKey)}`, { as: "u001" });
    expect(newer.body.messages).toHaveLength(1);

    expect((await call("POST", `/projects/${team.projectId}/messages`, { as: "u001", body: { text: "   " } })).status).toBe(400);
    expect((await call("POST", `/projects/${team.projectId}/messages`, { as: "u003", body: { text: "hi" } })).status).toBe(403);

    await ws("c-rahul", "DISCONNECT");
    pushed = [];
    await call("POST", `/projects/${team.projectId}/messages`, { as: "u001", body: { text: "anyone?" } });
    expect(pushed).toEqual([]);
  });

  it("starts one call per team and lets others join it", async () => {
    const team = await formTeam();
    await team.addRahul();
    await ws("c-rahul", "CONNECT", { projectId: team.projectId, token: "dev:u002" });

    const first = await call("POST", `/projects/${team.projectId}/call`, { as: "u001" });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ started: true, meeting: { MeetingId: "meeting-1" }, attendee: { ExternalUserId: "u001" } });
    expect(pushed.map((p) => p.event.type)).toEqual(["call"]);

    const second = await call("POST", `/projects/${team.projectId}/call`, { as: "u002" });
    expect(second.body).toMatchObject({ started: false, meeting: { MeetingId: "meeting-1" }, attendee: { ExternalUserId: "u002" } });
    expect((await call("GET", `/projects/${team.projectId}/room`, { as: "u002" })).body.call).toMatchObject({ meetingId: "meeting-1", startedBy: "u001" });

    // Chime ends the meeting after everyone leaves; the room forgets it and the next call starts fresh.
    chime.meetings.clear();
    expect((await call("GET", `/projects/${team.projectId}/room`, { as: "u001" })).body.call).toBeNull();
    expect((await call("POST", `/projects/${team.projectId}/call`, { as: "u001" })).body.meeting.MeetingId).toBe("meeting-2");

    expect((await call("POST", `/projects/${team.projectId}/call`, { as: "u003" })).status).toBe(403);
  });
});
