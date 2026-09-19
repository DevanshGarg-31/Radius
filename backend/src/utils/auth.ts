import type { Req } from "../router.js";
import type { Project } from "../models/project.js";
import type { User } from "../models/user.js";
import { db } from "../services/store.js";
import { forbidden, notFound, unauthorized } from "./http.js";

/** Loads the demo user identified by the X-User-Id header. */
export async function requireCaller(req: Req): Promise<User> {
  if (!req.callerId) throw unauthorized();
  const user = await db.getUser(req.callerId);
  if (!user) throw unauthorized();
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
