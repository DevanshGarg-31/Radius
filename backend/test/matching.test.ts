import { describe, expect, it } from "vitest";
import type { User } from "../src/models/user.js";
import { rankCandidates, scoreCandidate, targetSkills, WEIGHTS, type MatchContext } from "../src/services/matching.js";

const ctx = (overrides: Partial<MatchContext> = {}): MatchContext => ({
  requiredSkills: ["Python", "Machine Learning", "Computer Vision", "React"],
  coveredSkillKeys: new Set(),
  topics: ["AI", "Sports"],
  location: "Bengaluru",
  remote: true,
  preferredAvailability: [],
  ...overrides,
});

const user = (userId: string, overrides: Partial<User> = {}): User => ({
  userId,
  name: userId,
  username: userId,
  email: "",
  bio: "",
  avatarUrl: "",
  skills: [],
  interests: [],
  availability: ["weekends"],
  experienceLevel: "intermediate",
  location: "Bengaluru",
  githubUrl: "",
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

describe("matching engine", () => {
  it("weights sum to 1", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("scores a perfect candidate 100", () => {
    const m = scoreCandidate(ctx(), user("a", { skills: ["Python", "ML", "OpenCV", "React"], interests: ["Football", "AI"], experienceLevel: "advanced" }));
    expect(m.score).toBe(100);
    expect(m.matchedSkills).toEqual(["Python", "Machine Learning", "Computer Vision", "React"]);
    expect(m.matchedInterests).toEqual(["Football", "AI"]);
  });

  it("is deterministic", () => {
    const u = user("a", { skills: ["Python", "React"], interests: ["AI"] });
    expect(scoreCandidate(ctx(), u)).toEqual(scoreCandidate(ctx(), u));
  });

  it("targets only skills the team is missing", () => {
    const c = ctx({ coveredSkillKeys: new Set(["python", "react", "frontend", "machine learning"]) });
    expect(targetSkills(c)).toEqual(["Computer Vision"]);
    expect(scoreCandidate(c, user("cv", { skills: ["OpenCV"] })).breakdown.skills).toBe(1);
    expect(scoreCandidate(c, user("web", { skills: ["React"] })).breakdown.skills).toBe(0);
  });

  it("applies location only for non-remote projects", () => {
    const onsite = ctx({ remote: false });
    expect(scoreCandidate(onsite, user("a", { location: "bengaluru" })).breakdown.location).toBe(1);
    expect(scoreCandidate(onsite, user("b", { location: "Delhi" })).breakdown.location).toBe(0);
  });

  it("respects preferred availability and experience", () => {
    const c = ctx({ preferredAvailability: ["weekdays"], preferredExperience: "advanced" });
    const m = scoreCandidate(c, user("a", { availability: ["weekends"], experienceLevel: "beginner" }));
    expect(m.breakdown.availability).toBe(0);
    expect(m.breakdown.experience).toBe(0);
  });

  it("ranks by score with stable tie-breaks and drops people with no overlap", () => {
    const users = [user("b", { skills: ["Python"] }), user("a", { skills: ["Python"] }), user("z", { skills: ["Marketing"], interests: ["Music"] })];
    expect(rankCandidates(ctx(), users, 5).map((m) => m.userId)).toEqual(["a", "b"]);
  });
});
