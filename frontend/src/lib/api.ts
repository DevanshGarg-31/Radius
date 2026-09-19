/**
 * Typed client for the Radius API (see docs/api.md).
 * Demo auth: the logged-in demo user's id is sent as the X-User-Id header.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type AiSource = "bedrock" | "fallback" | "seed";
export type RequestStatus = "pending" | "accepted" | "rejected";

export interface UserSummary {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  skills: string[];
  interests: string[];
  availability: string[];
  experienceLevel: ExperienceLevel;
  location: string;
}

export interface User extends UserSummary {
  email: string;
  githubUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  projectId: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  requiredRoles: string[];
  teamSize: number;
  currentTeamSize: number;
  location: string;
  remote: boolean;
  status: "open" | "full" | "closed";
  aiRequirements?: {
    category: string;
    skills: string[];
    roles: string[];
    requirements: string[];
    topics: string[];
    source: AiSource;
    analyzedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  projectId: string;
  category: string;
  skills: string[];
  roles: string[];
  requirements: string[];
  topics: string[];
  source: AiSource;
}

export interface Match extends UserSummary {
  score: number;
  matchedSkills: string[];
  gapSkills: string[];
  matchedInterests: string[];
  breakdown: { skills: number; interests: number; availability: number; experience: number; location: number };
  reason: string;
  reasonSource: AiSource;
  suggestedRole: string;
  requestStatus: RequestStatus | null;
  requestId: string | null;
}

export interface MatchesResponse {
  projectId: string;
  requiredSkills: string[];
  missingSkills: string[];
  weights: Record<string, number>;
  searchMeta: { source: "opensearch" | "dynamodb"; tookMs: number; candidatesConsidered: number; fallbackReason?: string };
  matches: Match[];
}

export interface CollaborationRequest {
  requestId: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  role: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  teamId: string;
  projectId: string;
  members: string[];
  roles: Array<{ userId: string; role: string }>;
}

export interface TeamResponse {
  team: Team;
  project: Pick<Project, "projectId" | "title" | "teamSize" | "currentTeamSize" | "status">;
  members: Array<UserSummary & { role: string }>;
}

export interface TeamGaps {
  projectId: string;
  requiredSkills: string[];
  coveredSkills: string[];
  missingSkills: string[];
  missingRoles: string[];
  recommendation: string;
  source: AiSource;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, options: { userId?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.userId ? { "X-User-Id": options.userId } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean; services: Record<string, unknown> }>("GET", "/health"),

  demoLogin: (username: string) => request<{ user: User }>("POST", "/auth/demo-login", { body: { username } }),
  listUsers: () => request<{ users: UserSummary[] }>("GET", "/users"),
  getUser: (userId: string) => request<{ user: User }>("GET", `/users/${userId}`),
  updateUser: (userId: string, patch: Partial<User>) => request<{ user: User }>("PUT", `/users/${userId}`, { userId, body: patch }),
  myInvitations: (userId: string) =>
    request<{ requests: Array<CollaborationRequest & { project?: Pick<Project, "projectId" | "title" | "description" | "category" | "requiredRoles">; fromUser?: UserSummary }> }>(
      "GET",
      `/users/${userId}/requests`,
      { userId },
    ),

  listProjects: (filter: { ownerId?: string; memberId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();
    return request<{ projects: Project[] }>("GET", `/projects${qs ? `?${qs}` : ""}`);
  },
  getProject: (projectId: string) => request<{ project: Project; owner?: UserSummary }>("GET", `/projects/${projectId}`),
  createProject: (userId: string, input: { title: string; description: string; teamSize?: number; location?: string; remote?: boolean }) =>
    request<{ projectId: string; title: string; project: Project }>("POST", "/projects", { userId, body: input }),
  analyzeProject: (userId: string, projectId: string) => request<Analysis>("POST", `/projects/${projectId}/analyze`, { userId }),
  getMatches: (userId: string, projectId: string) => request<MatchesResponse>("GET", `/projects/${projectId}/matches`, { userId }),

  invite: (userId: string, projectId: string, input: { toUserId: string; message?: string; role?: string }) =>
    request<{ request: CollaborationRequest }>("POST", `/projects/${projectId}/requests`, { userId, body: input }),
  projectRequests: (userId: string, projectId: string) =>
    request<{ requests: Array<CollaborationRequest & { toUser?: UserSummary }> }>("GET", `/projects/${projectId}/requests`, { userId }),
  respond: (userId: string, requestId: string, status: "accepted" | "rejected") =>
    request<{ request: CollaborationRequest; team?: Team }>("PUT", `/requests/${requestId}`, { userId, body: { status } }),

  getTeam: (projectId: string) => request<TeamResponse>("GET", `/projects/${projectId}/team`),
  getTeamGaps: (userId: string, projectId: string) => request<TeamGaps>("GET", `/projects/${projectId}/team-gaps`, { userId }),

  presignUpload: (userId: string, kind: "avatar" | "project", contentType: string) =>
    request<{ uploadUrl: string; key: string; assetPath: string; headers: Record<string, string> }>("POST", "/uploads/presign", { userId, body: { kind, contentType } }),
  assetUrl: (assetPath: string) => `${API_BASE_URL}${assetPath}`,
};
