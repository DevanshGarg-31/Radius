"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { notificationHref, notificationText, useNotifications } from "@/lib/notifications";
import type { Notification } from "@/services/api";

const ACTION: Record<Notification["kind"], string> = {
  message: "Open the room →",
  call: "Join the call →",
  invite: "See the invitation →",
  "invite-answer": "Open the team →",
};

const ACCENT: Record<Notification["kind"], string> = {
  message: "bg-mint",
  call: "bg-tomato",
  invite: "bg-mustard",
  "invite-answer": "bg-lilac",
};

/** Cards for things that just happened, stacked above the corner of the page. */
export function NotificationToasts() {
  const { toasts, dismiss } = useNotifications();

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-[20rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="pointer-events-auto overflow-hidden rounded-card border-[2.5px] border-ink bg-surface shadow-brutal"
          >
            <div className={`h-1.5 ${ACCENT[n.kind]}`} />
            <div className="flex gap-3 p-3">
              <Avatar name={n.actor.name} seed={n.actor.userId} src={n.actor.avatarUrl || undefined} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{n.actor.name}</span> {notificationText(n)}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-muted">{n.projectTitle}</p>
                <Link href={notificationHref(n)} onClick={() => dismiss(n.id)} className="mt-2 inline-block font-mono text-[12px] font-bold uppercase underline underline-offset-4">
                  {ACTION[n.kind]}
                </Link>
              </div>
              <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss" className="-mr-1 -mt-1 h-6 w-6 shrink-0 rounded-btn text-muted hover:bg-sunken hover:text-ink">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
