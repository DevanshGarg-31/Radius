"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { notificationHref, notificationText, useNotifications, whenLabel } from "@/lib/notifications";
import type { Notification } from "@/services/api";

const ICONS: Record<Notification["kind"], string> = {
  message: "💬",
  call: "📹",
  invite: "✉️",
  application: "🙋",
  "invite-answer": "🤝",
};

/** Activity across your projects: a count while you're away, a list when you look. */
export function NotificationBell() {
  const { items, unread, markAllSeen, live } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = unread > 0 ? `Activity, ${unread} new` : "Activity";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllSeen();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-btn border-2 border-transparent hover:border-ink hover:bg-surface"
      >
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10.5v-3a5 5 0 0 0-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 15.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-tomato px-1 text-[11px] font-bold leading-4 text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] animate-rise rounded-card border-[2.5px] border-ink bg-surface shadow-brutal">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
            <p className="font-mono text-[13px] font-bold uppercase">Activity</p>
            <span className="text-[12px] text-muted">{live ? "Live" : "Refreshing"}</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Nothing yet. Messages, calls and invitations will show up here.</p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link role="menuitem" href={notificationHref(n)} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-sunken">
                    <Avatar name={n.actor.name} seed={n.actor.userId} src={n.actor.avatarUrl || undefined} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <span className="font-semibold">{n.actor.name}</span> {notificationText(n)}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted">
                        <span aria-hidden="true">{ICONS[n.kind]}</span> {n.projectTitle} · {whenLabel(n.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
