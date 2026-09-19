import type { Handler } from "../router.js";
import { CreateRequestInput, UpdateRequestInput, type CollaborationRequest } from "../models/request.js";
import { toSummary } from "../models/user.js";
import { db } from "../services/store.js";
import { buildMatchContext, missingSkills } from "../services/matching.js";
import { assertOwner, requireCaller, requireProject } from "../utils/auth.js";
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

  const now = nowIso();
  const request: CollaborationRequest = {
    requestId: requestIdFor(project.projectId, invitee.userId),
    projectId: project.projectId,
    fromUserId: caller.userId,
    toUserId: invitee.userId,
    message: input.message,
    role: input.role || suggestRole(project.requiredRoles, invitee.skills, roleContext),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await db.createRequest(request);
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

/** PUT /requests/{requestId} - the invitee accepts or rejects. Accepting adds them to the team. */
export const updateRequest: Handler = async (req) => {
  const caller = await requireCaller(req);
  const { status } = parseBody(req.event, UpdateRequestInput);
  const request = await db.getRequest(req.params.requestId!);
  if (!request) throw notFound("Request");
  if (request.toUserId !== caller.userId) throw forbidden("Only the invited person can respond to this request");
  if (request.status !== "pending") throw conflict(`This request was already ${request.status}`);

  if (status === "rejected") {
    await db.rejectRequest(request.requestId, caller.userId);
    return json(200, { request: { ...request, status: "rejected" } });
  }

  const project = await requireProject(request.projectId);
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
  await db.acceptRequest(request, project, teamId, { userId: caller.userId, role: request.role });
  const team = await db.getTeam(teamId);
  return json(200, { request: { ...request, status: "accepted" }, team });
};
