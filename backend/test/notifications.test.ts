/**
 * Notifications: what gets pushed to someone's own channel while they are
 * elsewhere in the app, and what GET /notifications rebuilds after a reload.
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_USERS } from "../scripts/seed-data.js";
import type { Notification } from "../src/models/notification.js";

vi.mock("../src/services/chime.js", () => ({
  findMeeting: async () => undefined,
  createMeeting: async () => ({ MeetingId: "meeting-1", MediaRegion: "ap-south-1" }),
  createAttendee: async (meetingId: string, userId: string) => ({ AttendeeId: `att-${userId}`, MeetingId: meetingId }),
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

let pushed: Array<{ connectionId: string; event: { type: string; notification?: Notification } }> = [];
const notificationsTo = (connectionId: string) => pushed.filter((p) => p.connectionId === connectionId && p.event.type === "notification").map((p) => p.event.notification!);

/** A project owned by u001 with u002 on the team. */
async function formTeam() {
  const { body } = await call("POST", "/projects", {
    as: "u001",
    body: { title: "AI Football Analytics", description: "Football analytics with computer vision and machine learning.", teamSize: 4 },
  });
  const projectId = body.projectId as string;
  await call("POST", `/projects/${projectId}/requests`, { as: "u001", body: { toUserId: "u002" } });
  await call("PUT", `/requests/r_${projectId}_u002`, { as: "u002", body: { status: "accepted" } });
  return projectId;
}

beforeEach(() => {
  resetMemoryStore({ users: DEMO_USERS });
  pushed = [];
  setRealtimeSender(async (connectionId, data) => {
    pushed.push({ connectionId, event: JSON.parse(data) });
    return true;
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("notifications", () => {
  it("opens a personal channel for anyone signed in, and refuses without a token", async () => {
    expect((await ws("c-1", "CONNECT", { channel: "user", token: "dev:u002" })).statusCode).toBe(200);
    expect((await ws("c-2", "CONNECT", { channel: "user" })).statusCode).toBe(400);
    expect((await ws("c-3", "CONNECT", { channel: "user", token: "nonsense" })).statusCode).toBe(401);
  });

  it("tells teammates about messages and calls, but never the person who caused them", async () => {
    const projectId = await formTeam();
    await ws("c-aarav", "CONNECT", { channel: "user", token: "dev:u001" });
    await ws("c-rahul", "CONNECT", { channel: "user", token: "dev:u002" });

    await call("POST", `/projects/${projectId}/messages`, { as: "u001", body: { text: "Kickoff at six?" } });
    expect(notificationsTo("c-rahul")).toMatchObject([{ kind: "message", text: "Kickoff at six?", projectTitle: "AI Football Analytics", actor: { name: "Aarav Mehta" } }]);
    expect(notificationsTo("c-aarav")).toEqual([]);

    await call("POST", `/projects/${projectId}/call`, { as: "u002" });
    expect(notificationsTo("c-aarav")).toMatchObject([{ kind: "call", actor: { name: "Rahul Sharma" } }]);
  });

  it("tells people they've been invited, and the owner how they answered", async () => {
    const { body } = await call("POST", "/projects", {
      as: "u001",
      body: { title: "Campus Eats", description: "A food ordering app for the campus with React and Node.", teamSize: 3 },
    });
    const projectId = body.projectId as string;
    await ws("c-aarav", "CONNECT", { channel: "user", token: "dev:u001" });
    await ws("c-priya", "CONNECT", { channel: "user", token: "dev:u003" });

    await call("POST", `/projects/${projectId}/requests`, { as: "u001", body: { toUserId: "u003" } });
    expect(notificationsTo("c-priya")).toMatchObject([{ kind: "invite", projectTitle: "Campus Eats", actor: { name: "Aarav Mehta" } }]);

    await call("PUT", `/requests/r_${projectId}_u003`, { as: "u003", body: { status: "accepted" } });
    expect(notificationsTo("c-aarav")).toMatchObject([{ kind: "invite-answer", status: "accepted", actor: { name: "Priya Nair" } }]);
  });

  it("rebuilds recent activity for a page that has just loaded", async () => {
    const projectId = await formTeam();
    await call("POST", `/projects/${projectId}/messages`, { as: "u001", body: { text: "Kickoff at six?" } });
    await call("POST", `/projects/${projectId}/call`, { as: "u001" });
    await call("POST", `/projects/${projectId}/requests`, { as: "u001", body: { toUserId: "u003" } });

    const mine = await call("GET", "/notifications", { as: "u002" });
    expect(mine.status).toBe(200);
    expect(mine.body.notifications.map((n: Notification) => n.kind).sort()).toEqual(["call", "message"]);
    expect(mine.body.notifications[0].actor).toMatchObject({ name: "Aarav Mehta" });

    // Their own message and call aren't news to them, but Rahul joining is.
    const owner = await call("GET", "/notifications", { as: "u001" });
    expect(owner.body.notifications).toMatchObject([{ kind: "invite-answer", status: "accepted", actor: { name: "Rahul Sharma" } }]);

    // The invited person sees the invitation.
    const invited = await call("GET", "/notifications", { as: "u003" });
    expect(invited.body.notifications).toMatchObject([{ kind: "invite", projectTitle: "AI Football Analytics", actor: { name: "Aarav Mehta" } }]);

    // Answering it shows up for the owner.
    await call("PUT", `/requests/r_${projectId}_u003`, { as: "u003", body: { status: "rejected" } });
    const afterAnswer = await call("GET", "/notifications", { as: "u001" });
    expect(afterAnswer.body.notifications.map((n: Notification) => `${n.kind}:${n.actor.name}`)).toEqual(["invite-answer:Priya Nair", "invite-answer:Rahul Sharma"]);
  });

  it("only looks back as far as asked", async () => {
    const projectId = await formTeam();
    await call("POST", `/projects/${projectId}/messages`, { as: "u001", body: { text: "Kickoff at six?" } });
    const future = new Date(Date.now() + 60_000).toISOString();
    expect((await call("GET", `/notifications?since=${encodeURIComponent(future)}`, { as: "u002" })).body.notifications).toEqual([]);
  });

  it("needs a signed-in caller", async () => {
    expect((await call("GET", "/notifications")).status).toBe(401);
  });
});
