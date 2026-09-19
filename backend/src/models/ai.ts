import { z } from "zod";

/**
 * Schemas for Bedrock structured outputs. The model is constrained to these shapes,
 * and the parsed result is validated again (and normalised) before use.
 */

export const ProjectAnalysisSchema = z.object({
  category: z.string().describe('Short "Domain/Domain" label, e.g. "AI/Sports"'),
  skills: z.array(z.string()).describe("3-6 core technical or non-technical skills, short canonical names"),
  roles: z.array(z.string()).describe("2-4 team roles needed, e.g. 'ML Engineer'"),
  requirements: z.array(z.string()).describe("2-5 short capability requirements"),
  topics: z.array(z.string()).describe("1-4 interest areas / domains, e.g. 'AI', 'Sports'"),
});
export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;

export const matchExplanationSchema = (userIds: [string, ...string[]]) =>
  z.object({
    explanations: z.array(
      z.object({
        userId: z.enum(userIds),
        reason: z.string().describe("One or two sentences, max 45 words"),
      }),
    ),
  });

export const teamGapSchema = (roles: [string, ...string[]]) =>
  z.object({
    missingRoles: z.array(z.enum(roles)).describe("Roles from the given list that the current team cannot yet fill"),
    recommendation: z.string().describe("One or two sentences, max 40 words"),
  });
