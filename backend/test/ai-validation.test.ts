import { describe, expect, it } from "vitest";
import type { User } from "../src/models/user.js";
import { isGroundedExplanation, normaliseAnalysis } from "../src/services/bedrock.js";
import { fallbackAnalysis, fallbackGap } from "../src/services/fallbacks.js";

const rahul = { skills: ["Python", "React", "Machine Learning"] } as User;
const project = { requiredSkills: ["Python", "Machine Learning", "Computer Vision", "React"] };

describe("Bedrock output validation", () => {
  it("normalises and caps analysis output", () => {
    const a = normaliseAnalysis({
      category: "AI/Sports",
      skills: ["ML", "machine learning", "Python", "React", "CV", "Docker", "AWS", "Go"],
      roles: ["ML Engineer", "ML Engineer", "Frontend Developer"],
      requirements: ["Computer vision"],
      topics: ["football", "AI"],
    });
    expect(a.skills).toEqual(["Machine Learning", "Python", "React", "Computer Vision", "Docker", "AWS"]);
    expect(a.roles).toEqual(["ML Engineer", "Frontend Developer"]);
    expect(a.topics).toEqual(["Sports", "AI"]);
  });

  it("rejects analysis without skills", () => {
    expect(() => normaliseAnalysis({ category: "x", skills: [], roles: ["a"], requirements: [], topics: [] })).toThrow();
  });

  it("accepts explanations grounded in the candidate's skills", () => {
    expect(isGroundedExplanation("Rahul brings Python, React and machine learning, and shares an interest in football.", rahul, project)).toBe(true);
    // Mentioning a project skill the candidate lacks is fine (e.g. "does not cover Computer Vision").
    expect(isGroundedExplanation("Rahul covers ML and React but not Computer Vision.", rahul, project)).toBe(true);
  });

  it("rejects explanations that invent skills", () => {
    expect(isGroundedExplanation("Rahul is an expert in Kubernetes and Rust.", rahul, project)).toBe(false);
    expect(isGroundedExplanation("", rahul, project)).toBe(false);
  });
});

describe("fallbacks", () => {
  it("uses the fixture for the demo project", () => {
    expect(fallbackAnalysis("AI Football Analytics", "anything").roles).toContain("Computer Vision Engineer");
  });

  it("derives an analysis from text for unknown projects", () => {
    const a = fallbackAnalysis("Event app", "A React app to run college sports events with marketing on social media");
    expect(a.skills).toEqual(expect.arrayContaining(["React", "Social Media"]));
    expect(a.roles).toContain("Frontend Developer");
  });

  it("maps missing skills to unassigned roles", () => {
    expect(fallbackGap(["ML Engineer", "Frontend Developer"], ["Founder"], []).missingRoles).toEqual([]);
    expect(fallbackGap(["ML Engineer", "Frontend Developer"], ["Frontend Developer"], ["React", "Machine Learning"]).missingRoles).toEqual(["ML Engineer"]);
  });
});
