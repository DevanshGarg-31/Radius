/**
 * The public idea board: what visitors can read without signing in, the roles
 * an idea is looking for, and people applying for one of them.
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROJECTS, DEMO_TEAMS, DEMO_USERS } from "../scripts/seed-data.js";

const { handler } = await import("../src/index.js");
const { resetMemoryStore } = await import("../src/services/memory-store.js");

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

beforeEach(() => {
  resetMemoryStore({ users: DEMO_USERS, projects: DEMO_PROJECTS, teams: DEMO_TEAMS });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("idea board", () => {
  it("lets a visitor browse ideas and their open roles without signing in", async () => {
    const res = await call("GET", "/ideas");
    expect(res.status).toBe(200);
    expect(res.body.ideas.length).toBeGreaterThan(5);

    const idea = res.body.ideas.find((i: { title: string }) => i.title === "MedAssist Symptom Checker");
    expect(idea.owner).toMatchObject({ name: "Ishita Kapoor" });
    expect(idea.owner.email).toBeUndefined();
    expect(idea.openings[0]).toMatchObject({ role: expect.any(String), count: expect.any(Number), taken: expect.any(Number) });
    // Who took a role isn't a visitor's business; how many places are left is.
    expect(idea.openings[0].filledBy).toBeUndefined();
    expect(idea.spotsLeft).toBeGreaterThan(0);

    expect(res.body.roles).toContain("NLP Engineer");
    expect(res.body.categories.length).toBeGreaterThan(1);
  });

  it("survives projects saved before ideas listed their roles", async () => {
    // Old rows have no openings field at all; they simply aren't on the board.
    const legacy = { ...DEMO_PROJECTS[0]!, projectId: "p_legacy", title: "Written Before Roles" } as Record<string, unknown>;
    delete legacy.openings;
    resetMemoryStore({ users: DEMO_USERS, projects: [...DEMO_PROJECTS, legacy as unknown as (typeof DEMO_PROJECTS)[number]], teams: DEMO_TEAMS });

    const res = await call("GET", "/ideas");
    expect(res.status).toBe(200);
    expect(res.body.ideas.some((i: { title: string }) => i.title === "Written Before Roles")).toBe(false);
    expect((await call("GET", "/ideas/p_legacy")).status).toBe(404);
    expect((await call("GET", "/ideas?q=football")).status).toBe(200);
  });

  it("filters by role, skill, category and words in the idea", async () => {
    const byRole = await call("GET", "/ideas?role=video%20editor");
    expect(byRole.body.ideas.map((i: { title: string }) => i.title)).toEqual(["Football Highlights Channel"]);

    const bySkill = await call("GET", "/ideas?skill=Flutter");
    expect(bySkill.body.ideas.every((i: { title: string }) => i.title.length > 0)).toBe(true);
    expect(bySkill.body.ideas.length).toBeGreaterThan(0);

    const byWords = await call("GET", "/ideas?q=food");
    expect(byWords.body.ideas.map((i: { title: string }) => i.title)).toContain("Community Food Bank Network");

    expect((await call("GET", "/ideas?category=nothing-like-this")).body.ideas).toEqual([]);
  });

  it("shows one idea with its team, and hides ideas that aren't published", async () => {
    const res = await call("GET", "/ideas/p001");
    expect(res.status).toBe(200);
    expect(res.body.idea.title).toBe("MedAssist Symptom Checker");
    expect(res.body.team[0]).toMatchObject({ name: "Ishita Kapoor", role: "Founder" });

    expect((await call("GET", "/ideas/p_nope")).status).toBe(404);

    // An idea with no roles listed yet stays off the board.
    const fresh = await call("POST", "/projects", { as: "u005", body: { title: "Quiet Draft", description: "Still deciding what this needs from people.", teamSize: 3 } });
    expect((await call("GET", `/ideas/${fresh.body.projectId}`)).status).toBe(404);
    const listed = await call("GET", "/ideas");
    expect(listed.body.ideas.some((i: { title: string }) => i.title === "Quiet Draft")).toBe(false);
  });

  it("lets the founder say which roles they need, keeping who already joined", async () => {
    const created = await call("POST", "/projects", {
      as: "u001",
      body: {
        title: "Match Day Companion",
        description: "A live companion app for football fans at the stadium, with stats and replays.",
        teamSize: 4,
        openings: [{ role: "Mobile Developer", count: 2, skills: ["Flutter"] }],
      },
    });
    const projectId = created.body.projectId as string;
    expect(created.body.project.openings[0]).toMatchObject({ role: "Mobile Developer", count: 2, filledBy: [] });

    const openingId = created.body.project.openings[0].openingId as string;
    const edited = await call("PUT", `/projects/${projectId}/openings`, {
      as: "u001",
      body: { openings: [{ openingId, role: "Mobile Developer", count: 3, skills: ["Flutter", "Dart"] }, { role: "UI Designer", count: 1, skills: ["Figma"] }] },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.openings.map((o: { role: string; count: number }) => `${o.role}:${o.count}`)).toEqual(["Mobile Developer:3", "UI Designer:1"]);
    expect(edited.body.openings[0].openingId).toBe(openingId);

    expect((await call("PUT", `/projects/${projectId}/openings`, { as: "u002", body: { openings: [] } })).status).toBe(403);
  });

  it("lets someone apply for a role, and the founder decide", async () => {
    const idea = (await call("GET", "/ideas/p001")).body.idea;
    const opening = idea.openings.find((o: { taken: number; count: number }) => o.taken < o.count);

    expect((await call("POST", "/projects/p001/applications", { body: { openingId: opening.openingId } })).status).toBe(401);
    expect((await call("POST", "/projects/p001/applications", { as: "u008", body: { openingId: opening.openingId } })).status).toBe(400);
    expect((await call("POST", "/projects/p001/applications", { as: "u003", body: { openingId: "o_nope" } })).status).toBe(404);

    const applied = await call("POST", "/projects/p001/applications", { as: "u003", body: { openingId: opening.openingId, message: "I've built this before." } });
    expect(applied.status).toBe(201);
    expect(applied.body.request).toMatchObject({ initiatedBy: "applicant", toUserId: "u003", role: opening.role, status: "pending" });

    // The applicant can't wave themselves through; the founder answers.
    expect((await call("PUT", `/requests/${applied.body.request.requestId}`, { as: "u003", body: { status: "accepted" } })).status).toBe(403);

    const accepted = await call("PUT", `/requests/${applied.body.request.requestId}`, { as: "u008", body: { status: "accepted" } });
    expect(accepted.status).toBe(200);
    expect(accepted.body.team.members).toContain("u003");
    expect(accepted.body.team.roles).toContainEqual({ userId: "u003", role: opening.role });

    // That role now has one fewer place left.
    const after = (await call("GET", "/ideas/p001")).body.idea;
    const sameRole = after.openings.find((o: { openingId: string }) => o.openingId === opening.openingId);
    expect(sameRole.taken).toBe(opening.taken + 1);
    expect(after.spotsLeft).toBe(idea.spotsLeft - 1);
  });

  it("refuses a role that is already taken, or an idea that isn't open", async () => {
    const idea = (await call("GET", "/ideas/p001")).body.idea;
    const opening = idea.openings.find((o: { taken: number; count: number }) => o.taken < o.count);
    await call("POST", "/projects/p001/applications", { as: "u003", body: { openingId: opening.openingId } });
    await call("PUT", `/requests/r_p001_u003`, { as: "u008", body: { status: "accepted" } });

    const second = await call("POST", "/projects/p001/applications", { as: "u004", body: { openingId: opening.openingId } });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already taken/i);
  });

  it("tells the founder about an application, and the applicant about the answer", async () => {
    const idea = (await call("GET", "/ideas/p001")).body.idea;
    const opening = idea.openings.find((o: { taken: number; count: number }) => o.taken < o.count);
    await call("POST", "/projects/p001/applications", { as: "u003", body: { openingId: opening.openingId } });

    const founder = await call("GET", "/notifications", { as: "u008" });
    expect(founder.body.notifications).toMatchObject([{ kind: "application", actor: { name: "Priya Nair" }, role: opening.role }]);

    await call("PUT", "/requests/r_p001_u003", { as: "u008", body: { status: "rejected" } });
    const applicant = await call("GET", "/notifications", { as: "u003" });
    expect(applicant.body.notifications).toMatchObject([{ kind: "invite-answer", status: "rejected", actor: { name: "Ishita Kapoor" } }]);
  });
});
