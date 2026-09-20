import type { Handler } from "../router.js";
import type { Notification, NotificationActor } from "../models/notification.js";
import type { Project } from "../models/project.js";
import type { User } from "../models/user.js";
import { db } from "../services/store.js";
import { requireCaller } from "../utils/auth.js";
import { json } from "../utils/http.js";

/** How far back to look when a page asks without saying. */
const DEFAULT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MESSAGES_PER_PROJECT = 20;
const MAX_ITEMS = 30;

const unknownActor = (userId: string): NotificationActor => ({ userId, name: "Someone", avatarUrl: "" });

/**
 * GET /notifications?since=<ISO> - what happened in your projects recently.
 *
 * Live updates arrive over the WebSocket; this rebuilds the same list when a
 * page loads, or keeps it current when the socket isn't available.
 */
export const listNotifications: Handler = async (req) => {
  const caller = await requireCaller(req);
  const since = sinceFrom(req.query.since);

  const [teams, invitations, ownedProjects] = await Promise.all([
    db.listTeamsForMember(caller.userId),
    db.listRequestsForUser(caller.userId),
    db.listProjectsByOwner(caller.userId),
  ]);

  // Chat and calls in the teams they're on.
  const teamActivity = await Promise.all(
    teams.map(async (team) => {
      const [project, messages] = await Promise.all([
        db.getProject(team.projectId),
        db.listMessages(team.projectId, { limit: MESSAGES_PER_PROJECT, after: since }),
      ]);
      if (!project) return [];
      const items: Notification[] = messages
        .filter((m) => m.userId !== caller.userId)
        .map((m) => ({ id: `msg_${m.messageId}`, kind: "message", at: m.sentAt, projectId: project.projectId, projectTitle: project.title, actor: unknownActor(m.userId), text: m.text }));
      const call = team.meeting;
      if (call && call.startedAt > since && call.startedBy !== caller.userId) {
        items.push({ id: `call_${call.meetingId}`, kind: "call", at: call.startedAt, projectId: project.projectId, projectTitle: project.title, actor: unknownActor(call.startedBy), startedAt: call.startedAt });
      }
      return items;
    }),
  );

  // Invitations waiting for them.
  const pending = invitations.filter((r) => r.status === "pending" && r.createdAt > since);
  const invitedProjects = await loadProjects(pending.map((r) => r.projectId));
  const inviteItems: Notification[] = pending.flatMap((r) => {
    const project = invitedProjects.get(r.projectId);
    return project
      ? [{ id: `inv_${r.requestId}_${r.createdAt}`, kind: "invite" as const, at: r.createdAt, projectId: project.projectId, projectTitle: project.title, actor: unknownActor(r.fromUserId), requestId: r.requestId, role: r.role }]
      : [];
  });

  // Answers to invitations they sent.
  const answerLists = await Promise.all(
    ownedProjects.map(async (project) => {
      const requests = await db.listRequestsByProject(project.projectId);
      return requests
        .filter((r) => r.status !== "pending" && r.updatedAt > since && r.fromUserId === caller.userId)
        .map<Notification>((r) => ({
          id: `ans_${r.requestId}_${r.status}`,
          kind: "invite-answer",
          at: r.updatedAt,
          projectId: project.projectId,
          projectTitle: project.title,
          actor: unknownActor(r.toUserId),
          requestId: r.requestId,
          status: r.status as "accepted" | "rejected",
        }));
    }),
  );

  const items = [...teamActivity.flat(), ...inviteItems, ...answerLists.flat()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ITEMS);

  return json(200, { notifications: await withActors(items) });
};

function sinceFrom(raw: string | undefined): string {
  const fallback = new Date(Date.now() - DEFAULT_WINDOW_MS).toISOString();
  if (!raw) return fallback;
  const asked = new Date(raw);
  // Ignore anything unparseable or further back than the window we support.
  return Number.isNaN(asked.getTime()) || raw < fallback ? fallback : raw;
}

async function loadProjects(projectIds: string[]): Promise<Map<string, Project>> {
  const unique = [...new Set(projectIds)];
  const projects = await Promise.all(unique.map((id) => db.getProject(id)));
  return new Map(projects.filter((p): p is Project => Boolean(p)).map((p) => [p.projectId, p]));
}

/** Fills in names and photos in one lookup, rather than one per item. */
async function withActors(items: Notification[]): Promise<Notification[]> {
  const users = await db.getUsers([...new Set(items.map((n) => n.actor.userId))]);
  const byId = new Map(users.map((u: User) => [u.userId, u]));
  return items.map((item) => {
    const user = byId.get(item.actor.userId);
    return user ? { ...item, actor: { userId: user.userId, name: user.name, avatarUrl: user.avatarUrl } } : item;
  });
}
