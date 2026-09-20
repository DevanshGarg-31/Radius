import { describe, expect, it } from "vitest";
import fixtures from "../src/fixtures/analyses.json" with { type: "json" };
import type { Project } from "../src/models/project.js";
import { fallbackGap } from "../src/services/fallbacks.js";
import { buildMatchContext, missingSkills, rankCandidates } from "../src/services/matching.js";
import { DEMO_PROJECTS, DEMO_USERS } from "../scripts/seed-data.js";

/** Guards the scripted demo: if seed data or scoring changes break the story, this fails. */
const analysis = fixtures["ai football analytics"];
const byId = (id: string) => DEMO_USERS.find((u) => u.userId === id)!;

const demoProject: Project = {
  projectId: "p_demo",
  ownerId: "u001",
  title: "AI Football Analytics",
  description: "Build a platform that analyzes football matches using computer vision and machine learning.",
  category: analysis.category,
  requiredSkills: analysis.skills,
  preferredSkills: [],
  requiredRoles: analysis.roles,
  openings: [],
  teamSize: 4,
  currentTeamSize: 1,
  location: "Bengaluru",
  remote: true,
  status: "open",
  preferredAvailability: [],
  aiRequirements: { ...analysis, source: "fallback", analyzedAt: "" },
  createdAt: "",
  updatedAt: "",
};

const candidatesExcept = (ids: string[]) => DEMO_USERS.filter((u) => !ids.includes(u.userId));

describe("demo story", () => {
  it("has 25 users and 12 projects", () => {
    expect(DEMO_USERS).toHaveLength(25);
    expect(DEMO_PROJECTS).toHaveLength(12);
  });

  it("Rahul is the clear top match for the founder's project", () => {
    const ctx = buildMatchContext(demoProject, [byId("u001")]);
    const ranked = rankCandidates(ctx, candidatesExcept(["u001"]), 5);
    expect(ranked[0]!.userId).toBe("u002");
    expect(ranked[0]!.score - ranked[1]!.score).toBeGreaterThanOrEqual(5);
    expect(ranked[0]!.matchedInterests).toEqual(["Football", "AI"]);
  });

  it("after Rahul joins, the gap is Computer Vision and Priya becomes the top match", () => {
    const team = [byId("u001"), byId("u002")];
    const ctx = buildMatchContext(demoProject, team);
    expect(missingSkills(ctx)).toEqual(["Computer Vision"]);
    expect(fallbackGap(demoProject.requiredRoles, ["Founder", "ML Engineer"], missingSkills(ctx)).missingRoles).toEqual(["Computer Vision Engineer"]);

    const ranked = rankCandidates(ctx, candidatesExcept(["u001", "u002"]), 5);
    expect(ranked[0]!.userId).toBe("u003");
    expect(ranked[0]!.gapSkills).toEqual(["Computer Vision"]);
  });
});
