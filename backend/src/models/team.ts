import { z } from "zod";

export const CreateTeamInput = z.object({ projectId: z.string().min(1).max(64) });

export interface TeamRole {
  userId: string;
  role: string;
}

export interface Team {
  teamId: string;
  projectId: string;
  members: string[];
  roles: TeamRole[];
  createdAt: string;
  updatedAt: string;
}
