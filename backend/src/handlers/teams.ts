import type { Handler } from "../router.js";
import type { Project } from "../models/project.js";
import { CreateTeamInput, type Team } from "../models/team.js";
import { toSummary } from "../models/user.js";
import { analyzeTeamGap } from "../services/bedrock.js";
import { db } from "../services/store.js";
import { buildMatchContext, missingSkills } from "../services/matching.js";
import { assertOwner, requireAccount, requireCaller, requireProject } from "../utils/auth.js";
import { conflict, json, parseBody } from "../utils/http.js";
import { nowIso, teamIdFor } from "../utils/ids.js";
import { keyOf } from "../utils/skills.js";

async function loadTeam(project: Project): Promise<Team> {
  const team = await db.getTeam(teamIdFor(project.projectId));
  return (
    team ?? {
      teamId: teamIdFor(project.projectId),
      projectId: project.projectId,
      members: [project.ownerId],
      roles: [{ userId: project.ownerId, role: "Founder" }],
      createdAt: project.createdAt,
      updatedAt: project.createdAt,
    }
  );
}

async function teamMembers(team: Team) {
  const users = await db.getUsers(team.members);
  const roleOf = new Map(team.roles.map((r) => [r.userId, r.role]));
  return users.map((u) => ({ user: u, role: roleOf.get(u.userId) ?? "Member" }));
}

/** POST /teams - idempotent; teams are normally created together with the project. */
export const createTeam: Handler = async (req) => {
  const caller = await requireCaller(req);
  const { projectId } = parseBody(req.event, CreateTeamInput);
  const project = await requireProject(projectId);
  assertOwner(project, caller);
  const now = nowIso();
  const created = await db.createTeamIfMissing({
    teamId: teamIdFor(projectId),
    projectId,
    members: [project.ownerId],
    roles: [{ userId: project.ownerId, role: "Founder" }],
    createdAt: now,
    updatedAt: now,
  });
  return json(created ? 201 : 200, { team: await db.getTeam(teamIdFor(projectId)) });
};

/** GET /projects/{projectId}/team */
export const getTeam: Handler = async (req) => {
  await requireAccount(req);
  const project = await requireProject(req.params.projectId);
  const team = await loadTeam(project);
  const members = await teamMembers(team);
  return json(200, {
    team,
    project: { projectId: project.projectId, title: project.title, teamSize: project.teamSize, currentTeamSize: project.currentTeamSize, status: project.status },
    members: members.map(({ user, role }) => ({ ...toSummary(user), role })),
  });
};

/** GET /projects/{projectId}/team-gaps - missing skills are computed; Bedrock maps them to roles and advice. */
export const getTeamGaps: Handler = async (req) => {
  await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  if (!project.requiredSkills.length) throw conflict("Run AI analysis on this project first (POST /projects/{projectId}/analyze)");

  const team = await loadTeam(project);
  const members = await teamMembers(team);
  const ctx = buildMatchContext(project, members.map((m) => m.user));
  const missing = missingSkills(ctx);
  const missingKeys = new Set(missing.map(keyOf));

  const gap = await analyzeTeamGap(
    project,
    members.map(({ user, role }) => ({ name: user.name, role, skills: user.skills })),
    missing,
  );

  return json(200, {
    projectId: project.projectId,
    requiredSkills: ctx.requiredSkills,
    coveredSkills: ctx.requiredSkills.filter((s) => !missingKeys.has(keyOf(s))),
    missingSkills: gap.missingSkills,
    missingRoles: gap.missingRoles,
    recommendation: gap.recommendation,
    source: gap.source,
  });
};
