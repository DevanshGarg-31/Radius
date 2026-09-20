/**
 * Typed client for the Radius API (see docs/api.md).
 * Every request carries the signed-in person's Cognito ID token as a Bearer token.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Team-room WebSocket (API Gateway WebSocket API, or ws://localhost:4000/ws locally). Empty = poll instead. */
export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "").replace(/\/$/, "");

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
  /** The roles it's looking for. Absent on projects saved before the idea board. */
  openings?: Opening[];
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

/** A role an idea is looking for, as its founder sees it. */
export interface Opening {
  openingId: string;
  role: string;
  count: number;
  skills: string[];
  filledBy: string[];
}

/** The same role as a visitor sees it: how many places, how many taken. */
export interface PublicOpening {
  openingId: string;
  role: string;
  skills: string[];
  count: number;
  taken: number;
}

/** A published idea on the public board. */
export interface Idea {
  projectId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  remote: boolean;
  createdAt: string;
  spotsLeft: number;
  openings: PublicOpening[];
  owner?: Pick<UserSummary, "userId" | "name" | "username" | "avatarUrl">;
}

export interface IdeaDetail extends Idea {
  requiredSkills: string[];
  teamSize: number;
  currentTeamSize: number;
}

export interface Analysis {
  projectId: string;
  category: string;
  skills: string[];
  roles: string[];
  requirements: string[];
  topics: string[];
  source: AiSource;
  /** Roles suggested from the description, for the founder to edit. */
  openings: Opening[];
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
  /** Always the person who would join, however it started. */
  toUserId: string;
  /** "owner" is an invitation the candidate answers; "applicant" is an application the founder answers. */
  initiatedBy: "owner" | "applicant";
  openingId?: string;
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

export type Invitation = CollaborationRequest & {
  project?: Pick<Project, "projectId" | "title" | "description" | "category" | "requiredRoles">;
  fromUser?: UserSummary;
};

export interface ChatMessage {
  projectId: string;
  sortKey: string;
  messageId: string;
  userId: string;
  text: string;
  sentAt: string;
}

export interface RoomCall {
  meetingId: string;
  startedBy: string;
  startedAt: string;
}

export interface RoomResponse {
  project: Pick<Project, "projectId" | "title" | "description" | "category">;
  members: Array<UserSummary & { role: string }>;
  messages: ChatMessage[];
  call: RoomCall | null;
  realtime: boolean;
}

/** Chime meeting and attendee objects, passed straight to the Chime SDK. */
export interface CallJoin {
  meeting: { MeetingId: string } & Record<string, unknown>;
  attendee: { AttendeeId: string; ExternalUserId: string } & Record<string, unknown>;
  started: boolean;
}

/** Pushed over the WebSocket to everyone in a team room. */
export type RoomEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "call"; status: "started"; startedBy: string; startedAt: string }
  | { type: "notification"; notification: Notification };

/** Who caused a notification. */
export interface NotificationActor {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface NotificationBase {
  id: string;
  at: string;
  projectId: string;
  projectTitle: string;
  actor: NotificationActor;
}

/** Something that happened in one of your projects while you were elsewhere. */
export type Notification =
  | (NotificationBase & { kind: "message"; text: string })
  | (NotificationBase & { kind: "call"; startedAt: string })
  | (NotificationBase & { kind: "invite"; requestId: string; role: string })
  | (NotificationBase & { kind: "application"; requestId: string; role: string })
  | (NotificationBase & { kind: "invite-answer"; requestId: string; status: "accepted" | "rejected" });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Supplies the signed-in person's Cognito ID token (refreshed automatically). Set by the session provider. */
let tokenProvider: () => Promise<string | undefined> = async () => undefined;

export function setTokenProvider(provider: () => Promise<string | undefined>): void {
  tokenProvider = provider;
}

/** The current ID token, e.g. for opening the team-room WebSocket. */
export const getIdToken = (): Promise<string | undefined> => tokenProvider();

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await tokenProvider();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  return data as T;
}

/** Fields a person fills in to create or edit their profile. */
export type ProfileInput = Pick<User, "name" | "bio" | "avatarUrl" | "skills" | "interests" | "availability" | "experienceLevel" | "location"> & { username?: string; githubUrl?: string };

export const api = {
  health: () => request<{ ok: boolean; services: Record<string, unknown> }>("GET", "/health"),

  getMe: () => request<{ account: { email: string; name: string }; user: User | null }>("GET", "/me"),
  createProfile: (input: ProfileInput & { username: string }) => request<{ user: User }>("POST", "/me/profile", input),

  listUsers: () => request<{ users: UserSummary[] }>("GET", "/users"),
  getUser: (userId: string) => request<{ user: User }>("GET", `/users/${userId}`),
  updateUser: (userId: string, patch: Partial<ProfileInput>) => request<{ user: User }>("PUT", `/users/${userId}`, patch),
  myInvitations: (userId: string) => request<{ requests: Invitation[] }>("GET", `/users/${userId}/requests`),

  listProjects: (filter: { ownerId?: string; memberId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();
    return request<{ projects: Project[] }>("GET", `/projects${qs ? `?${qs}` : ""}`);
  },
  getProject: (projectId: string) => request<{ project: Project; owner?: UserSummary; suggestedOpenings: Opening[] }>("GET", `/projects/${projectId}`),
  listIdeas: (filter: { q?: string; role?: string; skill?: string; category?: string; remote?: boolean } = {}) => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString();
    return request<{ ideas: Idea[]; roles: string[]; categories: string[] }>("GET", `/ideas${qs ? `?${qs}` : ""}`);
  },
  getIdea: (projectId: string) => request<{ idea: IdeaDetail; team: Array<UserSummary & { role: string }> }>("GET", `/ideas/${projectId}`),
  setOpenings: (projectId: string, openings: Array<{ openingId?: string; role: string; count: number; skills: string[] }>) =>
    request<{ openings: Opening[] }>("PUT", `/projects/${projectId}/openings`, { openings }),
  applyToProject: (projectId: string, input: { openingId: string; message?: string }) =>
    request<{ request: CollaborationRequest }>("POST", `/projects/${projectId}/applications`, input),

  createProject: (input: { title: string; description: string; teamSize?: number; location?: string; remote?: boolean; openings?: Array<{ role: string; count: number; skills: string[] }> }) =>
    request<{ projectId: string; title: string; project: Project }>("POST", "/projects", input),
  analyzeProject: (projectId: string) => request<Analysis>("POST", `/projects/${projectId}/analyze`),
  getMatches: (projectId: string) => request<MatchesResponse>("GET", `/projects/${projectId}/matches`),

  invite: (projectId: string, input: { toUserId: string; message?: string; role?: string; openingId?: string }) => request<{ request: CollaborationRequest }>("POST", `/projects/${projectId}/requests`, input),
  projectRequests: (projectId: string) => request<{ requests: Array<CollaborationRequest & { toUser?: UserSummary }> }>("GET", `/projects/${projectId}/requests`),
  respond: (requestId: string, status: "accepted" | "rejected") => request<{ request: CollaborationRequest; team?: Team }>("PUT", `/requests/${requestId}`, { status }),

  getTeam: (projectId: string) => request<TeamResponse>("GET", `/projects/${projectId}/team`),
  getTeamGaps: (projectId: string) => request<TeamGaps>("GET", `/projects/${projectId}/team-gaps`),

  presignUpload: (kind: "avatar" | "project", contentType: string) =>
    request<{ uploadUrl: string; key: string; assetPath: string; headers: Record<string, string> }>("POST", "/uploads/presign", { kind, contentType }),
  assetUrl: (assetPath: string) => `${API_BASE_URL}${assetPath}`,

  getRoom: (projectId: string) => request<RoomResponse>("GET", `/projects/${projectId}/room`),
  messagesAfter: (projectId: string, after?: string) => request<{ messages: ChatMessage[] }>("GET", `/projects/${projectId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  sendMessage: (projectId: string, text: string) => request<{ message: ChatMessage }>("POST", `/projects/${projectId}/messages`, { text }),
  joinCall: (projectId: string) => request<CallJoin>("POST", `/projects/${projectId}/call`),

  listNotifications: (since?: string) => request<{ notifications: Notification[] }>("GET", `/notifications${since ? `?since=${encodeURIComponent(since)}` : ""}`),
};
