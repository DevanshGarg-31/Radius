"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INVITATIONS_CHANGED } from "@/components/layout/Navbar";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { JoinTransition } from "@/components/team/JoinTransition";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { humanError } from "@/lib/errors";
import { capitalise, firstName } from "@/lib/format";
import { useCurrentUser, useSession } from "@/lib/session";
import { api, type Invitation, type TeamResponse } from "@/services/api";

interface Joined {
  invitation: Invitation;
  team: TeamResponse;
}

function TeamFormed({ joined, me }: { joined: Joined; me: { userId: string; name: string } }) {
  const { signIn } = useSession();
  const router = useRouter();
  const founder = joined.invitation.fromUser;
  const projectId = joined.invitation.projectId;
  return (
    <section className="animate-fade" aria-live="polite">
      <JoinTransition projectTitle={joined.team.project.title} members={joined.team.members} joiner={me} />
      <div className="mt-8 animate-rise [animation-delay:1100ms]">
        <h2 className="inline-block -rotate-1 rounded-btn border-[2.5px] border-ink bg-mint px-3 py-1 text-[32px] font-extrabold shadow-brutal">Team formed ✓</h2>
        <p className="mt-2 text-[17px] text-ink-soft">
          You&apos;re now on <strong>{joined.team.project.title}</strong> as {joined.invitation.role}.
        </p>
        <ul className="mt-6 divide-y-2 divide-ink rounded-card border-[2.5px] border-ink bg-surface px-4 shadow-brutal">
          {joined.team.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-3">
              <Avatar name={m.name} seed={m.userId} size={32} />
              <span className="flex-1 font-medium">{m.name}</span>
              <span className="text-[15px] text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/projects/${projectId}/room`} variant="pop">
            Open the team room →
          </ButtonLink>
          <ButtonLink href={`/projects/${projectId}/team?joined=${me.userId}`} variant="secondary">
            See the team
          </ButtonLink>
          {founder && (
            <Button
              variant="secondary"
              onClick={async () => {
                await signIn({ userId: founder.userId });
                router.push(`/projects/${projectId}/team?joined=${me.userId}`);
              }}
            >
              Back to {firstName(founder.name)}&apos;s view →
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function InvitationItem({ invitation, onAnswered }: { invitation: Invitation; onAnswered: (status: "accepted" | "rejected", team?: TeamResponse) => void }) {
  const me = useCurrentUser();
  const [busy, setBusy] = useState<"accepted" | "rejected">();
  const [error, setError] = useState<string>();

  async function answer(status: "accepted" | "rejected") {
    setBusy(status);
    setError(undefined);
    try {
      await api.respond(me.userId, invitation.requestId, status);
      window.dispatchEvent(new Event(INVITATIONS_CHANGED));
      const team = status === "accepted" ? await api.getTeam(invitation.projectId) : undefined;
      onAnswered(status, team);
    } catch (err) {
      setError(humanError(err, "We couldn't send your answer. Nothing changed; try again."));
      setBusy(undefined);
    }
  }

  return (
    <li className="animate-rise rounded-panel border-[2.5px] border-ink bg-surface p-6 shadow-brutal">
      <div className="flex gap-4">
        {invitation.fromUser && <Avatar name={invitation.fromUser.name} seed={invitation.fromUser.userId} size={44} />}
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-relaxed">
            <strong>{invitation.fromUser?.name ?? "Someone"}</strong> invited you to join <strong>{invitation.project?.title ?? "a project"}</strong>
            {invitation.role && (
              <>
                {" "}
                as <strong>{invitation.role}</strong>
              </>
            )}
            .
          </p>
          {invitation.message && <blockquote className="mt-4 rounded-card border-2 border-dashed border-ink/40 bg-canvas px-4 py-3 text-[15px] leading-relaxed">{invitation.message}</blockquote>}
          {invitation.project?.description && <p className="mt-4 max-w-2xl text-[15px] text-muted">{invitation.project.description}</p>}
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="pop" onClick={() => answer("accepted")} busy={busy === "accepted"} disabled={Boolean(busy)}>
              Accept and join →
            </Button>
            <Button variant="quiet" onClick={() => answer("rejected")} busy={busy === "rejected"} disabled={Boolean(busy)}>
              Decline
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function InvitationsPage() {
  const me = useCurrentUser();
  const invitations = useAsync(() => api.myInvitations(me.userId).then((r) => r.requests), [me.userId]);
  const [joined, setJoined] = useState<Joined>();

  if (joined) {
    return (
      <PageContainer narrow className="pt-14">
        <TeamFormed joined={joined} me={me} />
      </PageContainer>
    );
  }

  const pending = invitations.status === "success" ? invitations.data.filter((i) => i.status === "pending") : [];
  const past = invitations.status === "success" ? invitations.data.filter((i) => i.status !== "pending") : [];

  return (
    <PageContainer narrow>
      <PageHeader title="Invitations" lede="People who'd like to build something with you." />
      {invitations.status === "loading" && <LoadingState message="Checking your invitations…" />}
      {invitations.status === "error" && <ErrorState title="We couldn't load your invitations." error={invitations.error} onRetry={invitations.reload} />}
      {invitations.status === "success" && (
        <>
          {pending.length ? (
            <ul className="space-y-6">
              {pending.map((inv) => (
                <InvitationItem
                  key={inv.requestId}
                  invitation={inv}
                  onAnswered={(status, team) => {
                    if (status === "accepted" && team) setJoined({ invitation: inv, team });
                    else invitations.reload();
                  }}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No new invitations." body="When a founder invites you to their project, it will appear here." action={<ButtonLink href="/discover" variant="secondary">See who&apos;s building what</ButtonLink>} />
          )}
          {past.length > 0 && (
            <section aria-labelledby="past" className="mt-16">
              <h2 id="past" className="eyebrow mb-3">
                Earlier
              </h2>
              <ul className="divide-y divide-line">
                {past.map((inv) => (
                  <li key={inv.requestId} className="flex items-center justify-between gap-4 py-3 text-[15px]">
                    <span>
                      {inv.project?.title ?? "A project"} <span className="text-muted">· {inv.role}</span>
                    </span>
                    <span className={inv.status === "accepted" ? "font-medium text-success-ink" : "text-muted"}>{inv.status === "rejected" ? "Declined" : capitalise(inv.status)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}
