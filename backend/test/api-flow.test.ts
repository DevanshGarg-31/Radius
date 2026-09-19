/**
 * Runs the whole demo journey through the real Lambda handler and router against
 * the in-memory store (DATA_STORE=memory in vitest.config.ts; Bedrock and
 * OpenSearch are disabled there too, so their fallbacks are exercised).
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../src/models/project.js";
import { handler } from "../src/index.js";
import { resetMemoryStore } from "../src/services/memory-store.js";
import { DEMO_TEAMS, DEMO_USERS } from "../scripts/seed-data.js";

async function call(method: string, path: string, opts: { as?: string; body?: unknown } = {}) {
  const [rawPath, qs = ""] = path.split("?");
  const event = {
    version: "2.0",
    rawPath,
    rawQueryString: qs,
    queryStringParameters: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined,
    headers: opts.as ? { "x-user-id": opts.as } : {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    isBase64Encoded: false,
    requestContext: { http: { method }, requestId: "test", stage: "$default" },
  } as unknown as APIGatewayProxyEventV2;
  const res = await handler(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
}

beforeEach(() => {
  resetMemoryStore({ users: DEMO_USERS });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("IDEA -> MATCH -> TEAM", () => {
  it("runs the full demo journey", async () => {
    const login = await call("POST", "/auth/demo-login", { body: { username: "aarav" } });
    expect(login.status).toBe(200);
    const founder = login.body.user.userId;

    const created = await call("POST", "/projects", {
      as: founder,
      body: { title: "AI Football Analytics", description: "Build a platform that analyzes football matches using computer vision and machine learning.", teamSize: 4 },
    });
    expect(created.status).toBe(201);
    const projectId = created.body.projectId;

    expect((await call("GET", `/projects/${projectId}/matches`, { as: founder })).status).toBe(409);

    const analysis = await call("POST", `/projects/${projectId}/analyze`, { as: founder });
    expect(analysis.status).toBe(200);
    expect(analysis.body).toMatchObject({ category: "AI/Sports", roles: expect.arrayContaining(["Computer Vision Engineer"]), source: "fallback" });

    const matches = await call("GET", `/projects/${projectId}/matches`, { as: founder });
    expect(matches.status).toBe(200);
    expect(matches.body.searchMeta.source).toBe("dynamodb");
    const top = matches.body.matches[0];
    expect(top).toMatchObject({ userId: "u002", name: "Rahul Sharma", matchedInterests: ["Football", "AI"] });
    expect(top.reason).toContain("Rahul Sharma");

    const invite = await call("POST", `/projects/${projectId}/requests`, { as: founder, body: { toUserId: "u002", message: "Join us!" } });
    expect(invite.status).toBe(201);
    expect((await call("POST", `/projects/${projectId}/requests`, { as: founder, body: { toUserId: "u002" } })).status).toBe(409);

    const inbox = await call("GET", "/users/u002/requests", { as: "u002" });
    expect(inbox.body.requests).toHaveLength(1);
    expect(inbox.body.requests[0].project.title).toBe("AI Football Analytics");
    const requestId = inbox.body.requests[0].requestId;

    expect((await call("PUT", `/requests/${requestId}`, { as: founder, body: { status: "accepted" } })).status).toBe(403);
    const accepted = await call("PUT", `/requests/${requestId}`, { as: "u002", body: { status: "accepted" } });
    expect(accepted.status).toBe(200);
    expect(accepted.body.team.members).toEqual([founder, "u002"]);

    const team = await call("GET", `/projects/${projectId}/team`);
    expect(team.body.members.map((m: { name: string }) => m.name)).toEqual(["Aarav Mehta", "Rahul Sharma"]);
    expect(team.body.project.currentTeamSize).toBe(2);

    const gaps = await call("GET", `/projects/${projectId}/team-gaps`, { as: founder });
    expect(gaps.body).toMatchObject({ missingSkills: ["Computer Vision"], missingRoles: ["Computer Vision Engineer"] });

    const next = await call("GET", `/projects/${projectId}/matches`, { as: founder });
    expect(next.body.matches[0]).toMatchObject({ userId: "u003", suggestedRole: "Computer Vision Engineer", gapSkills: ["Computer Vision"] });
    expect(next.body.matches.map((m: { userId: string }) => m.userId)).not.toContain("u002");
  });

  it("rejects unauthenticated writes and invalid bodies", async () => {
    expect((await call("POST", "/projects", { body: { title: "x" } })).status).toBe(401);
    const bad = await call("POST", "/projects", { as: "u001", body: { title: "x" } });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("Invalid request");
  });

  it("lists projects for owners and members", async () => {
    const team = DEMO_TEAMS.find((t) => t.members.length > 1)!;
    resetMemoryStore({ users: DEMO_USERS, projects: [{ projectId: team.projectId, ownerId: team.members[0]!, createdAt: "2026-01-01", status: "open" } as Project], teams: [team] });
    expect((await call("GET", `/projects?ownerId=${team.members[0]}`)).body.projects).toHaveLength(1);
    expect((await call("GET", `/projects?memberId=${team.members[1]}`)).body.projects).toHaveLength(1);
    expect((await call("GET", "/projects?memberId=u002")).body.projects).toHaveLength(0);
  });
});
