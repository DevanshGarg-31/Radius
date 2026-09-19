"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, getIdToken, WS_URL, type ChatMessage, type RoomCall, type RoomEvent, type RoomResponse } from "@/services/api";

export type Connection = "connecting" | "live" | "polling";

type LoadState = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; room: RoomResponse };

const POLL_MS = 3000;
const CALL_REFRESH_MS = 15000;
const PING_MS = 5 * 60 * 1000; // API Gateway closes idle sockets after 10 minutes

/** Adds messages, skipping ones already shown (the sender also receives its own push). */
function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (!incoming.length) return current;
  const seen = new Set(current.map((m) => m.messageId));
  const fresh = incoming.filter((m) => !seen.has(m.messageId));
  if (!fresh.length) return current;
  return [...current, ...fresh].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * A team room: members, chat and call status. Loads history over HTTPS, then
 * stays live over the WebSocket; if the socket is unavailable it refreshes
 * every few seconds instead. Sending always goes over HTTPS.
 */
export function useTeamRoom(projectId: string, userId: string) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [call, setCall] = useState<RoomCall | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [nonce, setNonce] = useState(0);
  const lastKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    lastKey.current = messages.at(-1)?.sortKey;
  }, [messages]);

  useEffect(() => {
    let active = true;
    api
      .getRoom(projectId)
      .then((room) => {
        if (!active) return;
        setMessages(room.messages);
        setCall(room.call);
        setState({ status: "ready", room });
      })
      .catch((error: unknown) => active && setState({ status: "error", error }));
    return () => {
      active = false;
    };
  }, [projectId, userId, nonce]);

  const ready = state.status === "ready";

  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    let socket: WebSocket | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let callTimer: ReturnType<typeof setInterval> | undefined;
    let everOpened = false;
    let attempts = 0;

    const catchUp = () =>
      api
        .messagesAfter(projectId, lastKey.current)
        .then(({ messages: newer }) => !stopped && setMessages((m) => merge(m, newer)))
        .catch(() => undefined);

    const startPolling = () => {
      setConnection("polling");
      pollTimer ??= setInterval(catchUp, POLL_MS);
      callTimer ??= setInterval(() => {
        api
          .getRoom(projectId)
          .then((room) => !stopped && setCall(room.call))
          .catch(() => undefined);
      }, CALL_REFRESH_MS);
    };

    const onEvent = (event: RoomEvent) => {
      if (event.type === "message") setMessages((m) => merge(m, [event.message]));
      if (event.type === "call") setCall({ meetingId: "", startedBy: event.startedBy, startedAt: event.startedAt });
    };

    const connect = async () => {
      // A fresh ID token each time, since browsers can't send headers on WebSockets.
      const token = await getIdToken();
      if (stopped) return;
      if (!token) return startPolling();
      socket = new WebSocket(`${WS_URL}?${new URLSearchParams({ projectId, token })}`);
      socket.onopen = () => {
        everOpened = true;
        attempts = 0;
        setConnection("live");
        void catchUp(); // anything sent while we were connecting
      };
      socket.onmessage = (e) => {
        try {
          onEvent(JSON.parse(String(e.data)) as RoomEvent);
        } catch {
          // Ignore anything that isn't a room event.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        // Never connected: the WebSocket API isn't reachable, so refresh instead.
        if (!everOpened || attempts >= 5) return startPolling();
        attempts += 1;
        setConnection("connecting");
        timers.push(setTimeout(() => void connect(), Math.min(1000 * 2 ** attempts, 15000)));
      };
    };

    if (WS_URL) {
      void connect();
      const ping = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ action: "ping" })), PING_MS);
      timers.push(ping as unknown as ReturnType<typeof setTimeout>);
    } else {
      startPolling();
    }

    return () => {
      stopped = true;
      socket?.close();
      timers.forEach((t) => clearTimeout(t));
      timers.forEach((t) => clearInterval(t as unknown as ReturnType<typeof setInterval>));
      if (pollTimer) clearInterval(pollTimer);
      if (callTimer) clearInterval(callTimer);
    };
  }, [ready, projectId, userId]);

  const send = useCallback(
    async (text: string) => {
      const { message } = await api.sendMessage(projectId, text);
      setMessages((m) => merge(m, [message]));
    },
    [projectId],
  );

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  return { state, messages, call, setCall, connection, send, reload };
}
