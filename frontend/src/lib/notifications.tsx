"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, getIdToken, WS_URL, type Notification, type RoomEvent } from "@/services/api";
import { useSession } from "./session";

/**
 * Activity in your projects while you're somewhere else in the app.
 *
 * Each signed-in tab keeps its own channel open on the same WebSocket the team
 * room uses, so a message, call, invitation or answer arrives at once. Without
 * a socket the list is refreshed every half minute instead. Nothing is stored
 * on the server: what you've already seen lives in this browser.
 */

const MAX_ITEMS = 30;
const POLL_MS = 30_000;
const PING_MS = 5 * 60 * 1000; // API Gateway closes idle sockets after 10 minutes
const TOAST_MS = 8000;

interface NotificationsValue {
  items: Notification[];
  unread: number;
  /** The newest few that haven't been dismissed, shown as cards. */
  toasts: Notification[];
  dismiss: (id: string) => void;
  markAllSeen: () => void;
  live: boolean;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

const seenKey = (userId: string) => `radius:notifications-seen:${userId}`;

function readSeen(userId: string): string {
  try {
    return localStorage.getItem(seenKey(userId)) ?? "";
  } catch {
    return "";
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const userId = state.status === "ready" ? state.user.userId : undefined;
  const pathname = usePathname();

  const [items, setItems] = useState<Notification[]>([]);
  /** Cards only appear for things that happen while you're here, never for a page's catch-up. */
  const [toasts, setToasts] = useState<Array<{ notification: Notification; until: number }>>([]);
  // Read once: signing in as someone else remounts this, because the app shell
  // goes back to its loading state in between.
  const [seenAt, setSeenAt] = useState(() => (userId ? readSeen(userId) : ""));
  const [live, setLive] = useState(false);

  // The room you're looking at speaks for itself, so it never raises a card.
  const openRoom = useRef<string | undefined>(undefined);
  useEffect(() => {
    openRoom.current = /^\/projects\/([^/]+)\/room/.exec(pathname ?? "")?.[1];
  }, [pathname]);

  const add = useCallback((incoming: Notification[]) => {
    if (!incoming.length) return;
    setItems((current) => {
      const known = new Set(current.map((n) => n.id));
      const fresh = incoming.filter((n) => !known.has(n.id));
      if (!fresh.length) return current;
      return [...fresh, ...current].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ITEMS);
    });
  }, []);

  /** Known ids, so a refresh can tell what is new without re-reading state. */
  const knownIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    knownIds.current = new Set(items.map((n) => n.id));
  }, [items]);

  const raise = useCallback((notification: Notification) => {
    if (notification.kind === "message" && notification.projectId === openRoom.current) return;
    setToasts((current) => (current.some((t) => t.notification.id === notification.id) ? current : [{ notification, until: Date.now() + TOAST_MS }, ...current].slice(0, 3)));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    // Only things that happen from now on are worth interrupting someone for.
    const arrivedAt = new Date().toISOString();
    let socket: WebSocket | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let attempts = 0;

    const catchUp = () =>
      api
        .listNotifications()
        .then(({ notifications }) => {
          if (stopped) return;
          // Without a socket this is the only way new activity arrives, so it raises cards too.
          notifications.filter((n) => n.at > arrivedAt && !knownIds.current.has(n.id)).forEach(raise);
          add(notifications);
        })
        .catch(() => undefined);

    const startPolling = () => {
      setLive(false);
      pollTimer ??= setInterval(catchUp, POLL_MS);
    };

    const connect = async () => {
      // Browsers can't send headers on a WebSocket, so the token goes in the query.
      const token = await getIdToken();
      if (stopped) return;
      if (!token) return startPolling();
      socket = new WebSocket(`${WS_URL}?${new URLSearchParams({ channel: "user", token })}`);
      socket.onopen = () => {
        attempts = 0;
        setLive(true);
        void catchUp(); // anything that happened while connecting
      };
      socket.onmessage = (e) => {
        try {
          const event = JSON.parse(String(e.data)) as RoomEvent;
          if (event.type === "notification") {
            add([event.notification]);
            raise(event.notification);
          }
        } catch {
          // Ignore anything that isn't an event we know.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        setLive(false);
        if (attempts >= 5) return startPolling();
        attempts += 1;
        timers.push(setTimeout(() => void connect(), Math.min(1000 * 2 ** attempts, 15000)));
      };
    };

    void catchUp();
    if (WS_URL) {
      void connect();
      ping = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ action: "ping" })), PING_MS);
    } else {
      startPolling();
    }

    return () => {
      stopped = true;
      socket?.close();
      timers.forEach(clearTimeout);
      if (pollTimer) clearInterval(pollTimer);
      if (ping) clearInterval(ping);
    };
  }, [userId, add, raise]);

  const markAllSeen = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(seenKey(userId), now);
    } catch {
      // Private browsing: the count resets on the next load, which is fine.
    }
  }, [userId]);

  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((t) => t.notification.id !== id)), []);

  // Each card fades away on its own; the bell keeps the history.
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setInterval(() => setToasts((current) => current.filter((t) => t.until > Date.now())), 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread: items.filter((n) => n.at > seenAt).length, toasts: toasts.map((t) => t.notification), dismiss, markAllSeen, live }),
    [items, seenAt, toasts, dismiss, markAllSeen, live],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}

/** "just now", "6 min ago", "3:40 pm", "Tue" - as much as is useful. */
export function whenLabel(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return new Date(iso).toLocaleDateString([], { weekday: "short" });
}

/** What the notification says, in one line. */
export function notificationText(n: Notification): string {
  switch (n.kind) {
    case "message":
      return n.text;
    case "call":
      return "started a video call";
    case "invite":
      return `invited you to join as ${n.role}`;
    case "application":
      return `wants to join as ${n.role}`;
    case "invite-answer":
      return n.status === "accepted" ? "joined your team" : "passed on your invitation";
  }
}

/** Where clicking it should take you. */
export function notificationHref(n: Notification): string {
  switch (n.kind) {
    case "message":
    case "call":
      return `/projects/${n.projectId}/room`;
    case "invite":
      return "/invitations";
    case "application":
      return `/projects/${n.projectId}/people`;
    case "invite-answer":
      return n.status === "accepted" ? `/projects/${n.projectId}/team` : `/projects/${n.projectId}/people`;
  }
}
