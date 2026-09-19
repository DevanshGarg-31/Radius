import { z } from "zod";

export const CreateTeamInput = z.object({ projectId: z.string().min(1).max(64) });

export interface TeamRole {
  userId: string;
  role: string;
}

/** The team's current Chime meeting, if a call has been started. */
export interface TeamMeeting {
  meetingId: string;
  startedBy: string;
  startedAt: string;
}

export interface Team {
  teamId: string;
  projectId: string;
  members: string[];
  roles: TeamRole[];
  meeting?: TeamMeeting;
  createdAt: string;
  updatedAt: string;
}

/** The team room opens once the founder has at least one collaborator. */
export const ROOM_MIN_MEMBERS = 2;
