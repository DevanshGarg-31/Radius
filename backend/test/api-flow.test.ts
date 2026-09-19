/**
 * Runs the whole demo journey through the real Lambda handler and router, with
 * DynamoDB replaced by an in-memory fake (Bedrock and OpenSearch are disabled in
 * vitest.config.ts, so their fallbacks are exercised).
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CachedExplanation, Project } from "../src/models/project.js";
import type { CollaborationRequest } from "../src/models/request.js";
import type { Team, TeamRole } from "../src/models/team.js";
import type { User } from "../src/models/user.js";
import { DEMO_TEAMS, DEMO_USERS } from "../scripts/seed-data.js";

const store = {
  users: new Map<string, User>(),
  projects: new Map<string, Project>(),
  teams: new Map<string, Team>(),
  requests: new Map<string, CollaborationRequest>(),
};

vi.mock("../src/services/dynamodb.js", async () => {
  const { conflict } = await import("../src/utils/http.js");
  const clone = <T>(v: T): T => structuredClone(v);
  return {
    getUser: async (id: string) => clone(store.users.get(id)),
    putUser: async (u: User) => void store.users.set(u.userId, clone(u)),
    listUsers: async () => [...store.users.values()].map(clone),
    findUserByUsername: async (name: string) => clone([...store.users.values()].find((u) => u.username === name)),
    getUsers: async (ids: string[]) => ids.flatMap((id) => (store.users.has(id) ? [clone(store.users.get(id)!)] : [])),
    getProject: async (id: string) => clone(store.projects.get(id)),
    putProject: async (p: Project) => void store.projects.set(p.projectId, clone(p)),
    listProjects: async () => [...store.projects.values()].map(clone),
    listProjectsByOwner: async (owner: string) => [...store.projects.values()].filter((p) => p.ownerId === owner).map(clone),
    createProjectWithTeam: async (p: Project, t: Team) => {
      store.projects.set(p.projectId, clone(p));
      store.teams.set(t.teamId, clone(t));
    },
    saveProjectAnalysis: async (id: string, f: Partial<Project>) => {
      const p = store.projects.get(id)!;
      store.projects.set(id, { ...p, category: f.category!, requiredSkills: f.requiredSkills!, requiredRoles: f.requiredRoles!, aiRequirements: f.aiRequirements, explanationCache: {} });
    },
    saveExplanationCache: async (id: string, cache: Record<string, CachedExplanation>) => {
      store.projects.get(id)!.explanationCache = clone(cache);
    },
    getTeam: async (id: string) => clone(store.teams.get(id)),
    putTeam: async (t: Team) => void store.teams.set(t.teamId, clone(t)),
    createTeamIfMissing: async (t: Team) => {
      if (store.teams.has(t.teamId)) return false;
      store.teams.set(t.teamId, clone(t));
      return true;
    },
    listTeamsForMember: async (uid: string) => [...store.teams.values()].filter((t) => t.members.includes(uid)).map(clone),
    getRequest: async (id: string) => clone(store.requests.get(id)),
    listRequestsByProject: async (pid: string) => [...store.requests.values()].filter((r) => r.projectId === pid).map(clone),
    listRequestsForUser: async (uid: string) => [...store.requests.values()].filter((r) => r.toUserId === uid).map(clone),
    createRequest: async (r: CollaborationRequest) => {
      const existing = store.requests.get(r.requestId);
      if (existing && existing.status !== "rejected") throw conflict("This person has already been invited to this project");
      store.requests.set(r.requestId, clone(r));
    },
    rejectRequest: async (id: string) => {
      store.requests.get(id)!.status = "rejected";
    },
    acceptRequest: async (r: CollaborationRequest, p: Project, teamId: string, role: TeamRole) => {
      const req = store.requests.get(r.requestId)!;
      const team = store.teams.get(teamId)!;
      const project = store.projects.get(p.projectId)!;
      if (req.status !== "pending" || team.members.includes(r.toUserId) || project.currentTeamSize >= project.teamSize) throw conflict("Could not accept");
      req.status = "accepted";
      team.members.push(r.toUserId);
      team.roles.push(role);
      project.currentTeamSize += 1;
      if (project.currentTeamSize >= project.teamSize) project.status = "full";
    },
  };
});

const { handler } = await import("../src/index.js");

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
  store.users = new Map(DEMO_USERS.map((u) => [u.userId, structuredClone(u)]));
  store.projects = new Map();
  store.teams = new Map();
  store.requests = new Map();
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
    store.projects.set(team.projectId, { projectId: team.projectId, ownerId: team.members[0]!, createdAt: "2026-01-01", status: "open" } as Project);
    store.teams.set(team.teamId, structuredClone(team));
    expect((await call("GET", `/projects?ownerId=${team.members[0]}`)).body.projects).toHaveLength(1);
    expect((await call("GET", `/projects?memberId=${team.members[1]}`)).body.projects).toHaveLength(1);
    expect((await call("GET", "/projects?memberId=u002")).body.projects).toHaveLength(0);
  });
});
