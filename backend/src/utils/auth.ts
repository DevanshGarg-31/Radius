import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleFetcher } from "aws-jwt-verify/https";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import type { Req } from "../router.js";
import { config } from "../config.js";
import type { Project } from "../models/project.js";
import type { User } from "../models/user.js";
import { db } from "../services/store.js";
import { forbidden, HttpError, notFound, unauthorized } from "./http.js";

/** Who is signed in, from their verified Cognito ID token. */
export interface Account {
  /** Cognito's permanent user id; also the user's userId in Radius. */
  sub: string;
  email: string;
  name?: string;
}

function createVerifier(userPoolId: string, clientId: string) {
  // Cognito's signing keys are fetched once and cached. The library's default
  // 1.5 s timeout is too tight on slow networks, so allow longer for that one fetch.
  const jwksCache = new SimpleJwksCache({ fetcher: new SimpleFetcher({ defaultRequestOptions: { responseTimeout: 8000 } }) });
  return CognitoJwtVerifier.create({ userPoolId, tokenUse: "id", clientId }, { jwksCache });
}

let verifier: ReturnType<typeof createVerifier> | undefined;

/**
 * Checks a Cognito ID token's signature, expiry, issuer and audience.
 * Tests (and only tests) may enable AUTH_DEV_TOKENS and use "dev:<userId>".
 */
export async function verifyToken(token: string): Promise<Account> {
  if (config.auth.devTokens && token.startsWith("dev:")) {
    const sub = token.slice(4);
    return { sub, email: `${sub}@example.test` };
  }
  const { userPoolId, clientId } = config.auth;
  if (!userPoolId || !clientId) throw new HttpError(503, "Sign-in isn't configured on the server yet");
  verifier ??= createVerifier(userPoolId, clientId);
  try {
    const claims = await verifier.verify(token);
    return { sub: claims.sub, email: String(claims.email ?? ""), name: typeof claims.name === "string" ? claims.name : undefined };
  } catch {
    throw unauthorized("Your session has ended. Sign in again.");
  }
}

function bearerToken(req: Req): string | undefined {
  const header = req.event.headers?.authorization ?? req.event.headers?.Authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

/** Any signed-in person, whether or not they have created a profile yet. */
export async function requireAccount(req: Req): Promise<Account> {
  const token = bearerToken(req);
  if (!token) throw unauthorized();
  return verifyToken(token);
}

/** A signed-in person who has a Radius profile. */
export async function requireCaller(req: Req): Promise<User> {
  const account = await requireAccount(req);
  const user = await db.getUser(account.sub);
  if (!user) throw new HttpError(403, "Create your profile first", { code: "profile_required" });
  return user;
}

export async function requireProject(projectId: string | undefined): Promise<Project> {
  const project = projectId ? await db.getProject(projectId) : undefined;
  if (!project) throw notFound("Project");
  return project;
}

export function assertOwner(project: Project, user: User): void {
  if (project.ownerId !== user.userId) throw forbidden("Only the project owner can do this");
}
