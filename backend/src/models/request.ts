import { z } from "zod";

export const RequestStatus = z.enum(["pending", "accepted", "rejected"]);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const CreateRequestInput = z.object({
  toUserId: z.string().min(1).max(64),
  message: z.string().trim().max(1000).optional().default(""),
  /** Role the invitee would take; suggested from their skills when omitted. */
  role: z.string().trim().max(60).optional(),
});

export const UpdateRequestInput = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export interface CollaborationRequest {
  requestId: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  role: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}
