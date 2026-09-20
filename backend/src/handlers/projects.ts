import type { Handler } from "../router.js";
import { config } from "../config.js";
import { CreateProjectInput, SetOpeningsInput, type Project } from "../models/project.js";
import type { Team } from "../models/team.js";
import { toSummary } from "../models/user.js";
import { analyzeProject as runAnalysis } from "../services/bedrock.js";
import { db } from "../services/store.js";
import { indexProject } from "../services/opensearch.js";
import { assertOwner, requireAccount, requireCaller, requireProject } from "../utils/auth.js";
import { json, parseBody } from "../utils/http.js";
import { newId, nowIso, teamIdFor } from "../utils/ids.js";
import { suggestOpenings, toOpenings } from "../utils/openings.js";
import { errorFields, log } from "../utils/logger.js";

async function reindex(project: Project): Promise<void> {
  try {
    await indexProject(project);
  } catch (err) {
    log.warn("failed to index project", { projectId: project.projectId, ...errorFields(err) });
  }
}

/** Strips internal caches from API responses. */
export const publicProject = ({ explanationCache: _cache, ...project }: Project) => project;

export const createProject: Handler = async (req) => {
  const owner = await requireCaller(req);
  const input = parseBody(req.event, CreateProjectInput);
  const now = nowIso();
  const project: Project = {
    projectId: newId("p"),
    ownerId: owner.userId,
    title: input.title,
    description: input.description,
    category: input.category ?? "",
    requiredSkills: [],
    preferredSkills: [],
    requiredRoles: [],
    openings: toOpenings(input.openings),
    teamSize: input.teamSize,
    currentTeamSize: 1,
    location: input.location || owner.location,
    remote: input.remote,
    status: "open",
    preferredAvailability: input.preferredAvailability,
    preferredExperience: input.preferredExperience,
    createdAt: now,
    updatedAt: now,
  };
  const team: Team = {
    teamId: teamIdFor(project.projectId),
    projectId: project.projectId,
    members: [owner.userId],
    roles: [{ userId: owner.userId, role: "Founder" }],
    createdAt: now,
    updatedAt: now,
  };
  await db.createProjectWithTeam(project, team);
  await reindex(project);
  return json(201, { projectId: project.projectId, title: project.title, project: publicProject(project) });
};

/** GET /projects?ownerId=&memberId=&status= */
export const listProjects: Handler = async (req) => {
  await requireAccount(req);
  const { ownerId, memberId, status } = req.query;
  let projects: Project[];
  if (ownerId) {
    projects = await db.listProjectsByOwner(ownerId);
  } else if (memberId) {
    const teams = await db.listTeamsForMember(memberId);
    projects = (await Promise.all(teams.map((t) => db.getProject(t.projectId)))).filter((p): p is Project => Boolean(p));
  } else {
    projects = await db.listProjects();
  }
  if (status) projects = projects.filter((p) => p.status === status);
  projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(200, { projects: projects.map(publicProject) });
};

export const getProject: Handler = async (req) => {
  await requireAccount(req);
  const project = await requireProject(req.params.projectId);
  const owner = await db.getUser(project.ownerId);
  return json(200, { project: publicProject(project), owner: owner ? toSummary(owner) : undefined });
};

/** POST /projects/{projectId}/analyze - Bedrock extracts skills, roles and topics. */
export const analyzeProject: Handler = async (req) => {
  const caller = await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  assertOwner(project, caller);

  const { analysis, source } = await runAnalysis(project);
  const aiRequirements = { ...analysis, source, modelId: source === "bedrock" ? config.bedrock.modelId : undefined, analyzedAt: nowIso() };
  // An idea with no roles yet gets a suggested set, which the founder edits before publishing.
  const openings = project.openings.length ? project.openings : suggestOpenings(analysis.roles, analysis.skills);
  const updated: Project = {
    ...project,
    category: analysis.category,
    requiredSkills: analysis.skills,
    requiredRoles: analysis.roles,
    openings,
    aiRequirements,
  };
  await db.saveProjectAnalysis(project.projectId, updated);
  if (!project.openings.length && openings.length) await db.saveOpenings(project.projectId, openings);
  await reindex(updated);

  return json(200, {
    projectId: project.projectId,
    category: analysis.category,
    skills: analysis.skills,
    roles: analysis.roles,
    openings,
    requirements: analysis.requirements,
    topics: analysis.topics,
    source,
  });
};

/** PUT /projects/{projectId}/openings - the founder sets the roles they're looking for. */
export const setOpenings: Handler = async (req) => {
  const caller = await requireCaller(req);
  const project = await requireProject(req.params.projectId);
  assertOwner(project, caller);
  const { openings } = parseBody(req.event, SetOpeningsInput);
  const saved = toOpenings(openings, project.openings);
  await db.saveOpenings(project.projectId, saved);
  return json(200, { openings: saved });
};
