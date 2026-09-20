import type { Handler } from "../router.js";
import { ApplyInput, CreateRequestInput, UpdateRequestInput, type CollaborationRequest } from "../models/request.js";
import type { Notification } from "../models/notification.js";
import { toSummary } from "../models/user.js";
import { notify } from "../services/realtime.js";
import { db } from "../services/store.js";
import { buildMatchContext, missingSkills } from "../services/matching.js";
import { assertOwner, requireCaller, requireProject } from "../utils/auth.js";
import { findOpening, isOpen } from "../utils/openings.js";
import { badRequest, conflict, forbidden, json, notFound, parseBody } from "../utils/http.js";
import { nowIso, requestIdFor, teamIdFor } from "../utils/ids.js";
import { suggestRole } from "../utils/skills.js";

/** POST /projects/{projectId}/requests - the owner invites a candidate. */
export const createRequest: Handler = async (req) => {
  const caller = await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  assertOwner(project, caller);
  const input = parseBody(req.event, CreateRequestInput);

  if (input.toUserId === caller.userId) throw badRequest("You cannot invite yourself");
  if (project.status !== "open") throw conflict("This project's team is already full");
  const invitee = await db.getUser(input.toUserId);
  if (!invitee) throw notFound("Invited user");
  const team = await db.getTeam(teamIdFor(project.projectId));
  if (team?.members.includes(invitee.userId)) throw conflict("This person is already on the team");

  const members = await db.getUsers(team?.members ?? [project.ownerId]);
  const roleContext = { takenRoles: team?.roles.map((r) => r.role), missingSkills: missingSkills(buildMatchContext(project, members)) };

  const opening = input.openingId ? findOpening(project, input.openingId) : undefined;
  if (input.openingId && !opening) throw notFound("Role");
  if (opening && !isOpen(opening)) throw conflict("That role is already taken");

  const now = nowIso();
  const request: CollaborationRequest = {
    requestId: requestIdFor(project.projectId, invitee.userId),
    projectId: project.projectId,
    fromUserId: caller.userId,
    toUserId: invitee.userId,
    initiatedBy: "owner",
    openingId: opening?.openingId,
    message: input.message,
    role: opening?.role || input.role || suggestRole(project.requiredRoles, invitee.skills, roleContext),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await db.createRequest(request);
  const invite: Notification = {
    id: `inv_${request.requestId}_${now}`,
    kind: "invite",
    at: now,
    projectId: project.projectId,
    projectTitle: project.title,
    actor: { userId: caller.userId, name: caller.name, avatarUrl: caller.avatarUrl },
    requestId: request.requestId,
    role: request.role,
  };
  await notify([invitee.userId], invite);
  return json(201, { request });
};

/** POST /projects/{projectId}/applications - someone asks to join a role they found. */
export const applyToProject: Handler = async (req) => {
  const caller = await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  const { openingId, message } = parseBody(req.event, ApplyInput);

  if (project.ownerId === caller.userId) throw badRequest("This is your own idea");
  if (project.status !== "open") throw conflict("This idea isn't looking for people any more");
  const opening = findOpening(project, openingId);
  if (!opening) throw notFound("Role");
  if (!isOpen(opening)) throw conflict("That role is already taken");
  const team = await db.getTeam(teamIdFor(project.projectId));
  if (team?.members.includes(caller.userId)) throw conflict("You're already on this team");

  const now = nowIso();
  const request: CollaborationRequest = {
    requestId: requestIdFor(project.projectId, caller.userId),
    projectId: project.projectId,
    fromUserId: caller.userId,
    toUserId: caller.userId,
    initiatedBy: "applicant",
    openingId: opening.openingId,
    message,
    role: opening.role,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await db.createRequest(request);
  await notify([project.ownerId], {
    id: `app_${request.requestId}_${now}`,
    kind: "application",
    at: now,
    projectId: project.projectId,
    projectTitle: project.title,
    actor: { userId: caller.userId, name: caller.name, avatarUrl: caller.avatarUrl },
    requestId: request.requestId,
    role: opening.role,
  });
  return json(201, { request });
};

/** GET /projects/{projectId}/requests - the owner's view of sent invitations. */
export const listProjectRequests: Handler = async (req) => {
  const caller = await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  assertOwner(project, caller);
  const requests = await db.listRequestsByProject(project.projectId);
  const invitees = new Map((await db.getUsers(requests.map((r) => r.toUserId))).map((u) => [u.userId, toSummary(u)]));
  return json(200, {
    requests: requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => ({ ...r, toUser: invitees.get(r.toUserId) })),
  });
};

/**
 * PUT /requests/{requestId} - accept or decline. An invitation is answered by
 * the person invited; an application is answered by the founder. Accepting
 * either one adds them to the team.
 */
export const updateRequest: Handler = async (req) => {
  const caller = await requireCaller(req);
  const { status } = parseBody(req.event, UpdateRequestInput);
  const request = await db.getRequest(req.params.requestId!);
  if (!request) throw notFound("Request");
  if (request.status !== "pending") throw conflict(`This request was already ${request.status}`);

  const project = await requireProject(request.projectId);
  const decider = request.initiatedBy === "applicant" ? project.ownerId : request.toUserId;
  if (decider !== caller.userId) {
    throw forbidden(request.initiatedBy === "applicant" ? "Only the founder can answer an application" : "Only the invited person can respond to this request");
  }
  // The person who sent the invitation hears back either way.
  const answer = (outcome: "accepted" | "rejected"): Promise<void> =>
    notify([request.initiatedBy === "applicant" ? request.toUserId : request.fromUserId], {
      id: `ans_${request.requestId}_${outcome}`,
      kind: "invite-answer",
      at: nowIso(),
      projectId: project.projectId,
      projectTitle: project.title,
      actor: { userId: caller.userId, name: caller.name, avatarUrl: caller.avatarUrl },
      requestId: request.requestId,
      status: outcome,
    });

  const openingIndex = request.openingId ? (project.openings ?? []).findIndex((o) => o.openingId === request.openingId) : -1;

  if (status === "rejected") {
    await db.rejectRequest(request.requestId, request.toUserId);
    await answer("rejected");
    return json(200, { request: { ...request, status: "rejected" } });
  }

  const teamId = teamIdFor(project.projectId);
  // Projects created before teams existed get their team on first accept.
  await db.createTeamIfMissing({
    teamId,
    projectId: project.projectId,
    members: [project.ownerId],
    roles: [{ userId: project.ownerId, role: "Founder" }],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await db.acceptRequest(request, project, teamId, { userId: request.toUserId, role: request.role }, openingIndex >= 0 ? openingIndex : undefined);
  await answer("accepted");
  const team = await db.getTeam(teamId);
  return json(200, { request: { ...request, status: "accepted" }, team });
};
