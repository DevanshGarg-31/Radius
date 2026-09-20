import { z } from "zod";
import type { Notification } from "./notification.js";

export const SendMessageInput = z.object({
  text: z.string().trim().min(1, "Write something first").max(2000),
});

/**
 * A chat message in a team room. Stored with partition key projectId and sort
 * key `${sentAt}#${messageId}`, so a room's history reads back in time order.
 */
export interface ChatMessage {
  projectId: string;
  sortKey: string;
  messageId: string;
  userId: string;
  text: string;
  sentAt: string;
}

/** An open WebSocket connection. Expires via DynamoDB TTL. */
export interface RoomConnection {
  connectionId: string;
  /** The channel it listens to: a project id (a team room), or `user#<userId>` (their notifications). */
  projectId: string;
  userId: string;
  connectedAt: string;
  /** Epoch seconds; DynamoDB TTL removes stale connections. */
  ttl: number;
}

/** Everything pushed over the WebSocket: room events, plus personal notifications. */
export type RoomEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "call"; status: "started"; startedBy: string; startedAt: string }
  | { type: "notification"; notification: Notification };
