import { randomUUID } from "node:crypto";

export const newId = (prefix: string): string => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

export const nowIso = (): string => new Date().toISOString();

/** One request per (project, invitee) pair, so repeated invites are idempotent. */
export const requestIdFor = (projectId: string, toUserId: string): string => `r_${projectId}_${toUserId}`;

/** One team per project. */
export const teamIdFor = (projectId: string): string => `t_${projectId}`;

/**
 * Open connections are grouped by channel: a project id for people sitting in
 * that team room, or this for someone's own notifications anywhere in the app.
 */
export const userChannel = (userId: string): string => `user#${userId}`;
