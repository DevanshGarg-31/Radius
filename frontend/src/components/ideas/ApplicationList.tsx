"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAsync } from "@/hooks/useAsync";
import { humanError } from "@/lib/errors";
import { api, type CollaborationRequest, type UserSummary } from "@/services/api";

type Application = CollaborationRequest & { toUser?: UserSummary };

function ApplicationItem({ application, onAnswered }: { application: Application; onAnswered: () => void }) {
  const [busy, setBusy] = useState<"accepted" | "rejected">();
  const [error, setError] = useState<string>();
  const person = application.toUser;

  async function answer(status: "accepted" | "rejected") {
    setBusy(status);
    setError(undefined);
    try {
      await api.respond(application.requestId, status);
      onAnswered();
    } catch (err) {
      setError(humanError(err, "We couldn't send your answer. Nothing changed; try again."));
      setBusy(undefined);
    }
  }

  return (
    <li className="rounded-card border-2 border-ink bg-surface p-5 shadow-brutal-sm">
      <div className="flex gap-4">
        {person && <Avatar name={person.name} seed={person.userId} src={person.avatarUrl || undefined} size={44} />}
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-relaxed">
            {person ? (
              <Link href={`/people/${person.userId}`} className="font-semibold underline underline-offset-4">
                {person.name}
              </Link>
            ) : (
              <strong>Someone</strong>
            )}{" "}
            wants to join as <strong>{application.role}</strong>.
          </p>
          {person?.skills?.length ? <p className="mt-1 text-[15px] text-muted">{person.skills.slice(0, 5).join(" · ")}</p> : null}
          {application.message && <blockquote className="mt-4 rounded-card border-2 border-dashed border-ink/40 bg-canvas px-4 py-3 text-[15px] leading-relaxed">{application.message}</blockquote>}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <Button variant="pop" onClick={() => answer("accepted")} busy={busy === "accepted"} disabled={Boolean(busy)}>
              Add to the team →
            </Button>
            <Button variant="quiet" onClick={() => answer("rejected")} busy={busy === "rejected"} disabled={Boolean(busy)}>
              Not this time
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** People who asked to join this idea, waiting on the founder. */
export function ApplicationList({ projectId, onTeamChanged }: { projectId: string; onTeamChanged?: () => void }) {
  const requests = useAsync(() => api.projectRequests(projectId).then((r) => r.requests), [projectId]);
  const waiting = (requests.status === "success" ? requests.data : []).filter((r) => r.initiatedBy === "applicant" && r.status === "pending");

  if (!waiting.length) return null;

  return (
    <section aria-labelledby="applications" className="mb-10">
      <h2 id="applications" className="font-display text-2xl font-extrabold">
        {waiting.length === 1 ? "Someone applied" : `${waiting.length} people applied`}
      </h2>
      <p className="mb-5 mt-1 text-[15px] text-muted">They found your idea on the board and asked for a role.</p>
      <ul className="space-y-4">
        {waiting.map((application) => (
          <ApplicationItem
            key={application.requestId}
            application={application}
            onAnswered={() => {
              requests.reload();
              onTeamChanged?.();
            }}
          />
        ))}
      </ul>
    </section>
  );
}
