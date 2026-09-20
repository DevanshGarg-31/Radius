import type { Opening, OpeningInput, Project } from "../models/project.js";
import { newId } from "./ids.js";
import { keyOf, roleSkillKeys } from "./skills.js";

/** A role still looking for someone. */
export const isOpen = (opening: Opening): boolean => opening.filledBy.length < opening.count;

export const openOpenings = (project: Pick<Project, "openings">): Opening[] => (project.openings ?? []).filter(isOpen);

/** How many people an idea is still looking for, across all its roles. */
export const spotsLeft = (project: Pick<Project, "openings">): number =>
  (project.openings ?? []).reduce((total, o) => total + Math.max(0, o.count - o.filledBy.length), 0);

/**
 * Turns what the founder entered into stored roles. Editing keeps whoever has
 * already joined a role, and never leaves a role with fewer places than people.
 */
export function toOpenings(inputs: readonly OpeningInput[], existing: readonly Opening[] = []): Opening[] {
  const previous = new Map(existing.map((o) => [o.openingId, o]));
  return inputs.map((input) => {
    const kept = input.openingId ? previous.get(input.openingId) : undefined;
    const filledBy = kept?.filledBy ?? [];
    return {
      openingId: kept?.openingId ?? newId("o"),
      role: input.role,
      count: Math.max(input.count, filledBy.length),
      skills: input.skills,
      filledBy,
    };
  });
}

/**
 * Roles to start from after an idea is analysed: each suggested role, with the
 * skills from the analysis that belong to it. The founder edits these before publishing.
 */
export function suggestOpenings(roles: readonly string[], skills: readonly string[]): Opening[] {
  return roles.slice(0, 6).map((role) => {
    const wanted = roleSkillKeys(role);
    return {
      openingId: newId("o"),
      role,
      count: 1,
      skills: skills.filter((skill) => wanted.has(keyOf(skill))).slice(0, 4),
      filledBy: [],
    };
  });
}

export const findOpening = (project: Pick<Project, "openings">, openingId: string): Opening | undefined =>
  (project.openings ?? []).find((o) => o.openingId === openingId);
