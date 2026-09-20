import { z } from "zod";

export const RequestStatus = z.enum(["pending", "accepted", "rejected"]);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const CreateRequestInput = z.object({
  toUserId: z.string().min(1).max(64),
  message: z.string().trim().max(1000).optional().default(""),
  /** Role the invitee would take; suggested from their skills when omitted. */
  role: z.string().trim().max(60).optional(),
  /** The opening being offered, when the idea lists its roles. */
  openingId: z.string().trim().max(40).optional(),
});

/** Someone asking to join an idea they found, rather than being invited. */
export const ApplyInput = z.object({
  openingId: z.string().trim().min(1).max(40),
  message: z.string().trim().max(1000).optional().default(""),
});

export const UpdateRequestInput = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export interface CollaborationRequest {
  requestId: string;
  projectId: string;
  /** Who started it: the founder inviting, or the person applying. */
  fromUserId: string;
  /** Always the person who would join, whichever way round it started. */
  toUserId: string;
  /** Decides who answers: the founder invites and the candidate replies, or the other way round. */
  initiatedBy: "owner" | "applicant";
  openingId?: string;
  message: string;
  role: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}
