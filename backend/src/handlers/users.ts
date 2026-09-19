import { z } from "zod";
import type { Handler } from "../router.js";
import { UserProfileInput, UserUpdateInput, toSummary, type User } from "../models/user.js";
import * as db from "../services/dynamodb.js";
import { indexUser } from "../services/opensearch.js";
import { requireCaller } from "../utils/auth.js";
import { conflict, forbidden, json, notFound, parseBody } from "../utils/http.js";
import { newId, nowIso } from "../utils/ids.js";
import { errorFields, log } from "../utils/logger.js";
import { uniqueCanonical } from "../utils/skills.js";

const tidyList = (values: string[]) => uniqueCanonical(values, (s) => s.trim());

/** Search indexing is best-effort: DynamoDB is the source of truth and search has a fallback. */
async function reindex(user: User): Promise<void> {
  try {
    await indexUser(user);
  } catch (err) {
    log.warn("failed to index user", { userId: user.userId, ...errorFields(err) });
  }
}

const DemoLoginInput = z.object({ userId: z.string().optional(), username: z.string().optional() }).refine((v) => v.userId || v.username, "userId or username is required");

export const demoLogin: Handler = async (req) => {
  const body = parseBody(req.event, DemoLoginInput);
  const user = body.userId ? await db.getUser(body.userId) : await db.findUserByUsername(body.username!);
  if (!user) throw notFound("User");
  return json(200, { user });
};

export const listUsers: Handler = async () => {
  const users = await db.listUsers();
  return json(200, { users: users.map(toSummary).sort((a, b) => a.name.localeCompare(b.name)) });
};

export const getUser: Handler = async (req) => {
  const user = await db.getUser(req.params.userId!);
  if (!user) throw notFound("User");
  return json(200, { user });
};

export const createUser: Handler = async (req) => {
  const input = parseBody(req.event, UserProfileInput);
  if (await db.findUserByUsername(input.username)) throw conflict("Username is already taken");
  const now = nowIso();
  const user: User = {
    ...input,
    skills: tidyList(input.skills),
    interests: tidyList(input.interests),
    availability: tidyList(input.availability),
    userId: newId("u"),
    createdAt: now,
    updatedAt: now,
  };
  await db.putUser(user);
  await reindex(user);
  return json(201, { user });
};

export const updateUser: Handler = async (req) => {
  const caller = await requireCaller(req);
  if (caller.userId !== req.params.userId) throw forbidden("You can only edit your own profile");
  const patch = parseBody(req.event, UserUpdateInput);
  const user: User = {
    ...caller,
    ...patch,
    skills: tidyList(patch.skills ?? caller.skills),
    interests: tidyList(patch.interests ?? caller.interests),
    availability: tidyList(patch.availability ?? caller.availability),
    userId: caller.userId,
    username: caller.username,
    createdAt: caller.createdAt,
    updatedAt: nowIso(),
  };
  await db.putUser(user);
  await reindex(user);
  return json(200, { user });
};

/** Invitations sent to a user: what the invitee sees before accepting. */
export const listUserRequests: Handler = async (req) => {
  const caller = await requireCaller(req);
  if (caller.userId !== req.params.userId) throw forbidden("You can only see your own invitations");
  const requests = await db.listRequestsForUser(caller.userId);
  const filtered = req.query.status ? requests.filter((r) => r.status === req.query.status) : requests;

  const projects = new Map((await Promise.all([...new Set(filtered.map((r) => r.projectId))].map((id) => db.getProject(id)))).flatMap((p) => (p ? [[p.projectId, p] as const] : [])));
  const senders = new Map((await db.getUsers(filtered.map((r) => r.fromUserId))).map((u) => [u.userId, toSummary(u)]));

  const enriched = filtered
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const p = projects.get(r.projectId);
      return {
        ...r,
        project: p ? { projectId: p.projectId, title: p.title, description: p.description, category: p.category, requiredRoles: p.requiredRoles } : undefined,
        fromUser: senders.get(r.fromUserId),
      };
    });
  return json(200, { requests: enriched });
};
