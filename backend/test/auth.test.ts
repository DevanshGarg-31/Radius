/**
 * Sign-in and profile creation. Uses the test-only "dev:<userId>" tokens
 * (AUTH_DEV_TOKENS=true in vitest.config.ts); real requests need a Cognito ID token.
 */
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "../src/index.js";
import { resetMemoryStore } from "../src/services/memory-store.js";
import { DEMO_USERS } from "../scripts/seed-data.js";

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const event = {
    version: "2.0",
    rawPath: path,
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: { http: { method }, requestId: "test", stage: "$default" },
  } as unknown as APIGatewayProxyEventV2;
  const res = await handler(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
}

const profile = {
  name: "Maya Iyer",
  username: "mayabuilds",
  bio: "Designer who codes.",
  skills: ["UI/UX", "React"],
  interests: ["Design", "Education"],
  availability: ["weekends"],
  experienceLevel: "intermediate",
  location: "Pune",
};

beforeEach(() => {
  resetMemoryStore({ users: DEMO_USERS });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("sign-in and profiles", () => {
  it("rejects requests without a token, or with a token the server can't verify", async () => {
    expect((await call("GET", "/me")).status).toBe(401);
    expect((await call("GET", "/users")).status).toBe(401);
    expect((await call("GET", "/projects")).status).toBe(401);
    // Not a dev token and no Cognito pool configured in tests.
    expect((await call("GET", "/me", { token: "eyJhbGciOi.fake.token" })).status).toBe(503);
  });

  it("walks a new person from sign-in to a profile", async () => {
    const token = "dev:cognito-sub-123";
    const before = await call("GET", "/me", { token });
    expect(before.body).toEqual({ account: { email: "cognito-sub-123@example.test", name: "" }, user: null });

    // Signed in but no profile yet: product endpoints ask for one.
    const blocked = await call("POST", "/projects", { token, body: { title: "An idea", description: "Something worth building together." } });
    expect(blocked.status).toBe(403);
    expect(blocked.body.details).toEqual({ code: "profile_required" });

    expect((await call("POST", "/me/profile", { token, body: { ...profile, skills: [] } })).status).toBe(400);
    expect((await call("POST", "/me/profile", { token, body: { ...profile, username: "aarav" } })).status).toBe(409);

    const created = await call("POST", "/me/profile", { token, body: { ...profile, email: "spoofed@evil.test" } });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ userId: "cognito-sub-123", email: "cognito-sub-123@example.test", username: "mayabuilds", skills: ["UI/UX", "React"] });
    expect((await call("POST", "/me/profile", { token, body: profile })).status).toBe(409);

    const after = await call("GET", "/me", { token });
    expect(after.body.user.name).toBe("Maya Iyer");
    expect((await call("POST", "/projects", { token, body: { title: "An idea", description: "Something worth building together." } })).status).toBe(201);
  });

  it("hides other people's email and only lets you edit yourself", async () => {
    const other = await call("GET", "/users/u002", { token: "dev:u001" });
    expect(other.body.user.email).toBe("");
    const mine = await call("GET", "/users/u001", { token: "dev:u001" });
    expect(mine.body.user.email).toBe("aarav@radius.demo");
    expect((await call("PUT", "/users/u002", { token: "dev:u001", body: { bio: "hacked" } })).status).toBe(403);
    const edited = await call("PUT", "/users/u001", { token: "dev:u001", body: { bio: "Still building.", email: "x@y.z" } });
    expect(edited.body.user).toMatchObject({ bio: "Still building.", email: "aarav@radius.demo" });
  });
});
