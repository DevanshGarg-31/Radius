import { describe, expect, it } from "vitest";
import { canonicalSkill, expandedSkillKeys, scanSkills, scanTopics, suggestRole, uniqueCanonical } from "../src/utils/skills.js";

describe("skill normalisation", () => {
  it("maps aliases to canonical names", () => {
    expect(canonicalSkill("ml")).toBe("Machine Learning");
    expect(canonicalSkill("  ReactJS ")).toBe("React");
    expect(canonicalSkill("Tableau")).toBe("Tableau");
  });

  it("de-duplicates case-insensitively after canonicalising", () => {
    expect(uniqueCanonical(["ML", "machine learning", "Python", "python"])).toEqual(["Machine Learning", "Python"]);
  });

  it("expands implied skills", () => {
    const keys = expandedSkillKeys(["OpenCV", "PyTorch"]);
    expect(keys.has("computer vision")).toBe(true);
    expect(keys.has("machine learning")).toBe(true);
    expect(expandedSkillKeys(["Next.js"]).has("react")).toBe(true);
  });

  it("scans free text without matching ambiguous short words", () => {
    expect(scanSkills("We will go build a React app with computer vision")).toEqual(expect.arrayContaining(["React", "Computer Vision"]));
    expect(scanSkills("We will go build it")).not.toContain("Go");
    expect(scanTopics("AI football analytics platform")).toEqual(expect.arrayContaining(["AI", "Sports"]));
  });

  it("suggests the role that fits a person's skills", () => {
    const roles = ["ML Engineer", "Frontend Developer", "Computer Vision Engineer"];
    expect(suggestRole(roles, ["OpenCV"])).toBe("Computer Vision Engineer");
    expect(suggestRole(roles, ["Next.js"])).toBe("Frontend Developer");
    expect(suggestRole(roles, ["Marketing"])).toBe("Collaborator");
  });
});
