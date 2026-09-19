/**
 * Deterministic stand-ins for the three Bedrock features. Used when Bedrock is
 * disabled, fails, or returns something that does not pass validation, so the
 * demo never breaks. Responses carry source: "fallback" so this is visible.
 */
import type { ProjectAnalysis } from "../models/ai.js";
import type { User } from "../models/user.js";
import type { MatchResult } from "./matching.js";
import { canonicalSkill, keyOf, roleSkillKeys, scanSkills, scanTopics } from "../utils/skills.js";
import demoAnalyses from "../fixtures/analyses.json" with { type: "json" };

const ROLE_FOR_SKILL: Record<string, string> = {
  "Machine Learning": "ML Engineer",
  "Deep Learning": "ML Engineer",
  "Computer Vision": "Computer Vision Engineer",
  NLP: "AI Engineer",
  LLMs: "AI Engineer",
  React: "Frontend Developer",
  Frontend: "Frontend Developer",
  "Next.js": "Frontend Developer",
  Backend: "Backend Developer",
  "Node.js": "Backend Developer",
  Go: "Backend Developer",
  "Mobile Development": "Mobile Developer",
  Flutter: "Mobile Developer",
  "React Native": "Mobile Developer",
  "UI/UX": "Product Designer",
  "Product Design": "Product Designer",
  Figma: "Product Designer",
  "Data Analysis": "Data Analyst",
  DevOps: "DevOps Engineer",
  AWS: "DevOps Engineer",
  Blockchain: "Blockchain Developer",
  Marketing: "Marketing Lead",
  "Social Media": "Marketing Lead",
  "Event Management": "Event Coordinator",
  "Content Writing": "Content Writer",
  IoT: "Hardware Engineer",
};

const FIXTURES = demoAnalyses as Record<string, ProjectAnalysis>;

export function fallbackAnalysis(title: string, description: string): ProjectAnalysis {
  const fixture = FIXTURES[keyOf(title)];
  if (fixture) return fixture;

  const text = `${title} ${description}`;
  const skills = scanSkills(text).slice(0, 6);
  const roles = [...new Set(skills.map((s) => ROLE_FOR_SKILL[s]).filter((r): r is string => Boolean(r)))].slice(0, 4);
  const topics = scanTopics(text).slice(0, 4);
  return {
    category: topics.slice(0, 2).join("/") || "General",
    skills: skills.length ? skills : ["Product Management"],
    roles: roles.length ? roles : ["Collaborator"],
    requirements: skills.slice(0, 5).map((s) => `${s} expertise`),
    topics,
  };
}

export function fallbackExplanation(user: Pick<User, "name">, match: MatchResult): string {
  const skills = match.gapSkills.length ? match.gapSkills : match.matchedSkills;
  const parts: string[] = [];
  if (skills.length) parts.push(`brings ${skills.join(", ")}`);
  if (match.matchedInterests.length) parts.push(`shares interests in ${match.matchedInterests.join(", ")}`);
  const body = parts.length ? parts.join(" and ") : "has a partial fit with the project's needs";
  return `${user.name} ${body}, for an overall match score of ${match.score}%.`;
}

export function fallbackGap(requiredRoles: readonly string[], assignedRoles: readonly string[], missingSkills: readonly string[]) {
  const missingKeys = new Set(missingSkills.map((s) => keyOf(canonicalSkill(s))));
  const assigned = new Set(assignedRoles.map(keyOf));
  const missingRoles = requiredRoles.filter((role) => !assigned.has(keyOf(role)) && [...roleSkillKeys(role)].some((k) => missingKeys.has(k)));
  let recommendation: string;
  if (!missingSkills.length) recommendation = "The team covers every required skill. Invite more people only if you need extra capacity.";
  else if (missingRoles.length) recommendation = `Find a ${missingRoles.join(" and a ")} to cover ${missingSkills.join(", ")}.`;
  else recommendation = `Find someone with ${missingSkills.join(", ")}.`;
  return { missingRoles, recommendation };
}
