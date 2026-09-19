"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { humanError } from "@/lib/errors";
import { firstName, joinNatural } from "@/lib/format";
import { api, type CollaborationRequest, type Match } from "@/services/api";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  project: { projectId: string; title: string; requiredRoles: string[] };
  person: Pick<Match, "userId" | "name" | "suggestedRole" | "gapSkills" | "matchedSkills">;
  onSent: (request: CollaborationRequest) => void;
}

function suggestedMessage(person: InviteModalProps["person"], title: string): string {
  const skills = (person.gapSkills.length ? person.gapSkills : person.matchedSkills).slice(0, 2);
  return skills.length
    ? `Your ${joinNatural(skills)} experience looks like a strong fit for what we're building with ${title}. Would you like to join?`
    : `I think you'd be a great fit for ${title}. Would you like to join?`;
}

export function InviteModal({ open, onClose, project, person, onSent }: InviteModalProps) {
  const roles = [...new Set([person.suggestedRole, ...project.requiredRoles])].filter((r) => r && r !== "Collaborator");
  const [role, setRole] = useState(roles[0] ?? "Collaborator");
  const [message, setMessage] = useState(() => suggestedMessage(person, project.title));
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string>();
  const name = firstName(person.name);

  async function send() {
    setState("sending");
    setError(undefined);
    try {
      const { request } = await api.invite(project.projectId, { toUserId: person.userId, message, role });
      setState("sent");
      onSent(request);
    } catch (err) {
      setError(humanError(err, "We couldn't send the invitation. Nothing was sent; try again."));
      setState("form");
    }
  }

  if (state === "sent") {
    return (
      <Modal open={open} onClose={onClose} title="Invitation sent ✓">
        <div className="animate-rise space-y-3">
          <p className="text-[15px] leading-relaxed">
            {name} will find your invitation to join <strong>{project.title}</strong> as <strong>{role}</strong> in their invitations.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">They&apos;ll see it under Invitations when they sign in. As soon as they accept, they join the team and the team room opens.</p>
          <div className="flex flex-wrap gap-2 pt-3">
            <Button onClick={onClose}>Keep looking</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite ${name}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} busy={state === "sending"} disabled={!message.trim()}>
            Send invite →
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[15px] text-muted">
          To <span className="font-medium text-ink">{project.title}</span>
        </p>
        {roles.length > 0 && (
          <Select label="Role on the team" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
        <Textarea label="Why you'd like to collaborate" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
