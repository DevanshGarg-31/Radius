/**
 * In-memory implementation of the DynamoDB repository, for local development
 * (DATA_STORE=memory) and tests. Same functions, same conflict semantics; data is
 * lost when the process exits. Never used in Lambda unless DATA_STORE is set.
 */
import type { CachedExplanation, Project } from "../models/project.js";
import type { CollaborationRequest } from "../models/request.js";
import type { Team, TeamRole } from "../models/team.js";
import type { User } from "../models/user.js";
import { conflict } from "../utils/http.js";
import { nowIso } from "../utils/ids.js";
import type * as dynamo from "./dynamodb.js";

const users = new Map<string, User>();
const projects = new Map<string, Project>();
const teams = new Map<string, Team>();
const requests = new Map<string, CollaborationRequest>();

const clone = <T>(value: T): T => structuredClone(value);
const all = <T>(map: Map<string, T>) => [...map.values()].map(clone);

export function resetMemoryStore(data: { users?: User[]; projects?: Project[]; teams?: Team[] } = {}): void {
  users.clear();
  projects.clear();
  teams.clear();
  requests.clear();
  data.users?.forEach((u) => users.set(u.userId, clone(u)));
  data.projects?.forEach((p) => projects.set(p.projectId, clone(p)));
  data.teams?.forEach((t) => teams.set(t.teamId, clone(t)));
}

export const memoryStore: Omit<typeof dynamo, "INDEXES"> = {
  getUser: async (userId) => clone(users.get(userId)),
  putUser: async (user) => void users.set(user.userId, clone(user)),
  listUsers: async () => all(users),
  findUserByUsername: async (username) => clone([...users.values()].find((u) => u.username === username)),
  getUsers: async (ids) => [...new Set(ids)].flatMap((id) => (users.has(id) ? [clone(users.get(id)!)] : [])),

  getProject: async (projectId) => clone(projects.get(projectId)),
  putProject: async (project) => void projects.set(project.projectId, clone(project)),
  listProjects: async () => all(projects),
  listProjectsByOwner: async (ownerId) => all(projects).filter((p) => p.ownerId === ownerId),
  createProjectWithTeam: async (project: Project, team: Team) => {
    if (projects.has(project.projectId) || teams.has(team.teamId)) throw conflict("Project already exists");
    projects.set(project.projectId, clone(project));
    teams.set(team.teamId, clone(team));
  },
  saveProjectAnalysis: async (projectId, fields) => {
    const p = projects.get(projectId);
    if (!p) return;
    Object.assign(p, {
      category: fields.category,
      requiredSkills: clone(fields.requiredSkills),
      requiredRoles: clone(fields.requiredRoles),
      aiRequirements: clone(fields.aiRequirements),
      explanationCache: {},
      updatedAt: nowIso(),
    });
  },
  saveExplanationCache: async (projectId: string, cache: Record<string, CachedExplanation>) => {
    const p = projects.get(projectId);
    if (p) p.explanationCache = clone(cache);
  },

  getTeam: async (teamId) => clone(teams.get(teamId)),
  putTeam: async (team) => void teams.set(team.teamId, clone(team)),
  createTeamIfMissing: async (team) => {
    if (teams.has(team.teamId)) return false;
    teams.set(team.teamId, clone(team));
    return true;
  },
  listTeamsForMember: async (userId) => all(teams).filter((t) => t.members.includes(userId)),

  getRequest: async (requestId) => clone(requests.get(requestId)),
  listRequestsByProject: async (projectId) => all(requests).filter((r) => r.projectId === projectId),
  listRequestsForUser: async (toUserId) => all(requests).filter((r) => r.toUserId === toUserId),
  createRequest: async (request) => {
    const existing = requests.get(request.requestId);
    if (existing && existing.status !== "rejected") throw conflict("This person has already been invited to this project");
    requests.set(request.requestId, clone(request));
  },
  rejectRequest: async (requestId, toUserId) => {
    const r = requests.get(requestId);
    if (!r || r.status !== "pending" || r.toUserId !== toUserId) throw conflict("This request is no longer pending");
    Object.assign(r, { status: "rejected", updatedAt: nowIso() });
  },
  acceptRequest: async (request: CollaborationRequest, project: Project, teamId: string, role: TeamRole) => {
    const r = requests.get(request.requestId);
    const team = teams.get(teamId);
    const p = projects.get(project.projectId);
    if (!r || !team || !p || r.status !== "pending" || r.toUserId !== request.toUserId || team.members.includes(request.toUserId) || p.currentTeamSize !== project.currentTeamSize || p.currentTeamSize >= p.teamSize) {
      throw conflict("Could not accept: request is not pending, user is already on the team, or the team is full");
    }
    const now = nowIso();
    Object.assign(r, { status: "accepted", updatedAt: now });
    team.members.push(request.toUserId);
    team.roles.push(clone(role));
    team.updatedAt = now;
    p.currentTeamSize += 1;
    if (p.currentTeamSize >= p.teamSize) p.status = "full";
    p.updatedAt = now;
  },
};
