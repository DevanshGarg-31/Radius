import { z } from "zod";
import { ExperienceLevel } from "./user.js";

export const ProjectStatus = z.enum(["open", "full", "closed"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

/** One role an idea is looking for: "Backend Developer x2, Node.js and DynamoDB". */
export const OpeningInput = z.object({
  /** Kept when editing, so who has already joined a role isn't lost. */
  openingId: z.string().trim().max(40).optional(),
  role: z.string().trim().min(2).max(60),
  count: z.number().int().min(1).max(10).default(1),
  skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});
export type OpeningInput = z.infer<typeof OpeningInput>;

export const SetOpeningsInput = z.object({ openings: z.array(OpeningInput).max(12) });

export interface Opening {
  openingId: string;
  role: string;
  count: number;
  skills: string[];
  /** Who has taken this role, so a card can say "1 of 2 taken". */
  filledBy: string[];
}

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
  /** Roles wanted. Publishing without them is fine; they can be added after the idea is analysed. */
  openings: z.array(OpeningInput).max(12).default([]),
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
  /** The roles this idea is looking for, in the founder's own words. */
  openings: Opening[];
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
