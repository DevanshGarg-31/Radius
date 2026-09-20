import type { Handler } from "../router.js";
import type { Opening, Project } from "../models/project.js";
import { toSummary, type User } from "../models/user.js";
import { db } from "../services/store.js";
import { json, notFound } from "../utils/http.js";
import { openOpenings, spotsLeft } from "../utils/openings.js";
import { keyOf } from "../utils/skills.js";
import { teamIdFor } from "../utils/ids.js";

/**
 * The public idea board. Anyone can look without signing in; applying needs an
 * account. An idea appears here once it says which roles it is looking for.
 */

const LIMIT = 60;

/** What a visitor may see about a role: what it is and how many places are left. */
const publicOpening = (opening: Opening) => ({
  openingId: opening.openingId,
  role: opening.role,
  skills: opening.skills,
  count: opening.count,
  taken: opening.filledBy.length,
});

const card = (project: Project, owner?: User) => ({
  projectId: project.projectId,
  title: project.title,
  description: project.description,
  category: project.category,
  location: project.location,
  remote: project.remote,
  createdAt: project.createdAt,
  spotsLeft: spotsLeft(project),
  openings: project.openings.map(publicOpening),
  owner: owner ? { userId: owner.userId, name: owner.name, username: owner.username, avatarUrl: owner.avatarUrl } : undefined,
});

const published = (project: Project): boolean => project.status === "open" && project.openings.length > 0;

const matchesText = (project: Project, q: string): boolean =>
  [project.title, project.description, project.category, ...project.requiredSkills, ...project.openings.map((o) => o.role)].join(" ").toLowerCase().includes(q);

/** GET /ideas?q=&role=&skill=&category=&remote=true - published ideas, newest first. */
export const listIdeas: Handler = async (req) => {
  const { q, role, skill, category, remote } = req.query;
  const all = await db.listProjects();
  let ideas = all.filter(published);

  if (q) ideas = ideas.filter((p) => matchesText(p, q.trim().toLowerCase()));
  if (role) ideas = ideas.filter((p) => openOpenings(p).some((o) => keyOf(o.role).includes(keyOf(role))));
  if (skill) ideas = ideas.filter((p) => [...p.requiredSkills, ...p.openings.flatMap((o) => o.skills)].some((s) => keyOf(s) === keyOf(skill)));
  if (category) ideas = ideas.filter((p) => keyOf(p.category) === keyOf(category));
  if (remote === "true") ideas = ideas.filter((p) => p.remote);

  ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ideas = ideas.slice(0, LIMIT);

  const owners = new Map((await db.getUsers(ideas.map((p) => p.ownerId))).map((u: User) => [u.userId, u]));
  return json(200, {
    ideas: ideas.map((p) => card(p, owners.get(p.ownerId))),
    // For the filter menus, from what is actually on the board.
    roles: [...new Set(all.filter(published).flatMap((p) => openOpenings(p).map((o) => o.role)))].sort(),
    categories: [...new Set(all.filter(published).map((p) => p.category).filter(Boolean))].sort(),
  });
};

/** GET /ideas/{projectId} - one idea, its roles and who is already on the team. */
export const getIdea: Handler = async (req) => {
  const project = await db.getProject(req.params.projectId ?? "");
  if (!project || !published(project)) throw notFound("Idea");

  const [owner, team] = await Promise.all([db.getUser(project.ownerId), db.getTeam(teamIdFor(project.projectId))]);
  const members = await db.getUsers(team?.members ?? []);
  const roleOf = new Map((team?.roles ?? []).map((r) => [r.userId, r.role]));

  return json(200, {
    idea: { ...card(project, owner), requiredSkills: project.requiredSkills, teamSize: project.teamSize, currentTeamSize: project.currentTeamSize },
    team: members.map((u: User) => ({ ...toSummary(u), role: roleOf.get(u.userId) ?? "Member" })),
  });
};
