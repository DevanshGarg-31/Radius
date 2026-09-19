import { z } from "zod";

export const ExperienceLevel = z.enum(["beginner", "intermediate", "advanced"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

const stringList = (max: number) => z.array(z.string().trim().min(1).max(60)).max(max);

export const UserProfileInput = z.object({
  name: z.string().trim().min(1).max(80),
  username: z.string().trim().min(2).max(40).regex(/^[a-z0-9_.-]+$/i, "letters, numbers, _ . - only"),
  email: z.email().max(120).optional().default(""),
  bio: z.string().trim().max(500).optional().default(""),
  avatarUrl: z.string().max(500).optional().default(""),
  skills: stringList(20).default([]),
  interests: stringList(20).default([]),
  availability: stringList(5).default([]),
  experienceLevel: ExperienceLevel.default("intermediate"),
  location: z.string().trim().max(80).optional().default(""),
  githubUrl: z.string().max(200).optional().default(""),
});
export type UserProfileInput = z.infer<typeof UserProfileInput>;

export const UserUpdateInput = UserProfileInput.partial().omit({ username: true });

export interface User extends UserProfileInput {
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Public card shown in lists, matches and teams. */
export type UserSummary = Pick<User, "userId" | "name" | "username" | "avatarUrl" | "bio" | "skills" | "interests" | "availability" | "experienceLevel" | "location">;

export const toSummary = (u: User): UserSummary => ({
  userId: u.userId,
  name: u.name,
  username: u.username,
  avatarUrl: u.avatarUrl,
  bio: u.bio,
  skills: u.skills,
  interests: u.interests,
  availability: u.availability,
  experienceLevel: u.experienceLevel,
  location: u.location,
});
