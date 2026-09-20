"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { humanError } from "@/lib/errors";
import { joinNatural } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { api, type IdeaDetail, type PublicOpening } from "@/services/api";

interface ApplyModalProps {
  projectId: string;
  idea: Pick<IdeaDetail, "title">;
  opening: PublicOpening;
  onClose: () => void;
  onApplied: (openingId: string) => void;
}

/** A first line they can send as is, from the skills they share with the role. */
function suggestedNote(role: string, title: string, mine: string[], wanted: string[]): string {
  const shared = wanted.filter((w) => mine.some((m) => m.toLowerCase() === w.toLowerCase())).slice(0, 2);
  return shared.length
    ? `I'd like to join ${title} as ${role} — I work with ${joinNatural(shared)} and this is the kind of thing I want to build.`
    : `I'd like to join ${title} as ${role}. Here's why I think I'd be useful:`;
}

/** Asking to join a published idea, for one of the roles it lists. */
export function ApplyModal({ projectId, idea, opening, onClose, onApplied }: ApplyModalProps) {
  const me = useCurrentUser();
  const [message, setMessage] = useState(() => suggestedNote(opening.role, idea.title, me.skills, opening.skills));
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string>();

  async function send() {
    setState("sending");
    setError(undefined);
    try {
      await api.applyToProject(projectId, { openingId: opening.openingId, message: message.trim() });
      setState("sent");
    } catch (err) {
      setError(humanError(err, "We couldn't send your application. Nothing was sent; try again."));
      setState("form");
    }
  }

  if (state === "sent") {
    return (
      <Modal open onClose={() => onApplied(opening.openingId)} title="Application sent ✓">
        <div className="animate-rise space-y-3">
          <p className="text-[15px] leading-relaxed">
            You&apos;ve asked to join <strong>{idea.title}</strong> as <strong>{opening.role}</strong>.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">
            They&apos;ll see it straight away. If they say yes, you join the team and the team room opens — you can follow it under{" "}
            <Link href="/invitations" className="font-semibold text-ink underline underline-offset-4">
              Invitations
            </Link>
            .
          </p>
          <div className="pt-3">
            <Button onClick={() => onApplied(opening.openingId)}>Keep looking</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Apply as ${opening.role}`}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="pop" busy={state === "sending"} onClick={send}>
            Send application →
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[15px] leading-relaxed">
          {opening.skills.length > 0 ? (
            <>
              This role is about <strong>{joinNatural(opening.skills)}</strong>. Say what you&apos;d bring.
            </>
          ) : (
            <>Say a little about why this one, and what you&apos;d bring.</>
          )}
        </p>
        <Textarea label="Your note" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={1000} hint="They see your profile too, so keep it short." />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
