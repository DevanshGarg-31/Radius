/**
 * Something that happened in one of your projects while you were elsewhere in
 * the app: a chat message, a call, an invitation, someone applying to join,
 * or an answer to either.
 *
 * Notifications are not stored. They are pushed to whoever is online and
 * rebuilt from messages, teams and requests when a page loads (GET /notifications).
 */

/** Who caused it, in the little detail the bell and the pop-up card need. */
export interface NotificationActor {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface Common {
  /** Stable for the same event, so the same thing is never listed twice. */
  id: string;
  at: string;
  projectId: string;
  projectTitle: string;
  actor: NotificationActor;
}

export type Notification =
  | (Common & { kind: "message"; text: string })
  | (Common & { kind: "call"; startedAt: string })
  | (Common & { kind: "invite"; requestId: string; role: string })
  | (Common & { kind: "application"; requestId: string; role: string })
  | (Common & { kind: "invite-answer"; requestId: string; status: "accepted" | "rejected" });

export type NotificationKind = Notification["kind"];
