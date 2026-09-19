import { z } from "zod";
import { ExperienceLevel } from "./user.js";

export const ProjectStatus = z.enum(["open", "full", "closed"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const CreateProjectInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  teamSize: z.number().int().min(2).max(20).default(4),
  category: z.string().trim().max(60).optional(),
  location: z.string().trim().max(80).optional().default(""),
  remote: z.boolean().default(true),
  /** Optional preferences used by the matching engine. */
  preferredAvailability: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  preferredExperience: ExperienceLevel.optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export interface AiRequirements {
  category: string;
  skills: string[];
  roles: string[];
  requirements: string[];
  topics: string[];
  source: "bedrock" | "fallback" | "seed";
  modelId?: string;
  analyzedAt: string;
}

export interface CachedExplanation {
  /** Score the explanation was written for; a different score invalidates it. */
  score: number;
  reason: string;
  source: "bedrock" | "fallback";
}

export interface Project {
  projectId: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredRoles: string[];
  teamSize: number;
  currentTeamSize: number;
  location: string;
  remote: boolean;
  status: ProjectStatus;
  preferredAvailability: string[];
  preferredExperience?: z.infer<typeof ExperienceLevel>;
  aiRequirements?: AiRequirements;
  /** Match explanations keyed by userId, so repeated demo runs don't re-call Bedrock. */
  explanationCache?: Record<string, CachedExplanation>;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
