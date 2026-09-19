"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { Connection } from "@/hooks/useTeamRoom";
import { humanError } from "@/lib/errors";
import { firstName } from "@/lib/format";
import type { ChatMessage, UserSummary } from "@/services/api";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const STATUS: Record<Connection, { label: string; tone: string }> = {
  live: { label: "Live", tone: "bg-mint" },
  connecting: { label: "Connecting…", tone: "bg-sunken" },
  polling: { label: "Refreshing every few seconds", tone: "bg-warm-soft" },
};

interface ChatPanelProps {
  messages: ChatMessage[];
  members: UserSummary[];
  meId: string;
  connection: Connection;
  onSend: (text: string) => Promise<void>;
}

/** The team's chat: bubbles, newest at the bottom; Enter sends, Shift+Enter adds a line. */
export function ChatPanel({ messages, members, meId, connection, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const listRef = useRef<HTMLOListElement>(null);
  const byId = new Map(members.map((m) => [m.userId, m]));

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(undefined);
    try {
      await onSend(text);
      setDraft("");
    } catch (err) {
      setError(humanError(err, "Your message didn't send. It's still in the box; try again."));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  const status = STATUS[connection];

  return (
    <section aria-label="Team chat" className="flex h-[min(640px,70dvh)] flex-col overflow-hidden rounded-panel border-[2.5px] border-ink bg-surface shadow-brutal">
      <header className="flex items-center justify-between gap-3 border-b-[2.5px] border-ink bg-mustard px-5 py-3">
        <h2 className="text-xl font-extrabold">Team chat</h2>
        <span className={`rounded-btn border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${status.tone}`} aria-live="polite">
          {connection === "live" && <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-success" aria-hidden="true" />}
          {status.label}
        </span>
      </header>

      <ol ref={listRef} className="dot-grid flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <li className="mx-auto mt-10 max-w-xs rounded-card border-2 border-dashed border-ink bg-surface px-5 py-6 text-center">
            <p className="font-display text-lg font-extrabold">No messages yet.</p>
            <p className="mt-1 text-[15px] text-ink-soft">Say hello and agree on a first step.</p>
          </li>
        )}
        {messages.map((m, i) => {
          const mine = m.userId === meId;
          const author = byId.get(m.userId);
          const continued = messages[i - 1]?.userId === m.userId;
          return (
            <li key={m.messageId} className={`flex animate-rise items-end gap-2.5 ${mine ? "flex-row-reverse" : ""} ${continued ? "-mt-2" : ""}`}>
              <span className={`shrink-0 ${continued ? "invisible" : ""}`} aria-hidden={continued || undefined}>
                <Avatar name={author?.name ?? "Someone"} seed={m.userId} src={author?.avatarUrl || undefined} size={32} />
              </span>
              <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                {!continued && (
                  <p className="mb-1 font-mono text-[11px] font-bold uppercase text-ink-soft">
                    {mine ? "You" : firstName(author?.name ?? "Someone")} · {time(m.sentAt)}
                  </p>
                )}
                <p className={`inline-block whitespace-pre-wrap break-words rounded-card border-2 border-ink px-3.5 py-2 text-left text-[15px] leading-relaxed shadow-brutal-sm ${mine ? "bg-mustard" : "bg-surface"}`}>{m.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <form
        className="border-t-[2.5px] border-ink bg-canvas p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message the team
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message the team…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-btn border-2 border-ink bg-surface px-3.5 py-2.5 text-[15px] shadow-brutal-sm focus:shadow-brutal focus:outline-none"
          />
          <Button type="submit" variant="pop" busy={sending} disabled={!draft.trim()} className="h-11">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
