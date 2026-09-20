"use client";

import { useState } from "react";
import { RolesSection } from "@/components/ideas/RolesSection";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalysisSteps } from "@/components/projects/AnalysisSteps";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectRequirements } from "@/components/projects/ProjectRequirements";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowLink, Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useProject } from "@/hooks/useProject";
import { capitalise } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { api, type Analysis } from "@/services/api";

function SentInvitations({ projectId, userId }: { projectId: string; userId: string }) {
  const sent = useAsync(() => api.projectRequests(projectId).then((r) => r.requests), [projectId, userId]);
  if (sent.status !== "success" || !sent.data.length) return null;
  return (
    <section aria-labelledby="sent" className="mt-16">
      <h2 id="sent" className="text-xl font-bold">
        Invitations you&apos;ve sent
      </h2>
      <ul className="mt-4 divide-y divide-line">
        {sent.data.map((r) => (
          <li key={r.requestId} className="flex items-center gap-4 py-3">
            {r.toUser && <Avatar name={r.toUser.name} seed={r.toUser.userId} size={32} />}
            <div className="flex-1">
              <p className="font-medium">{r.toUser?.name ?? r.toUserId}</p>
              <p className="text-sm text-muted">{r.role}</p>
            </div>
            <span className={`text-sm font-medium ${r.status === "accepted" ? "text-success-ink" : r.status === "rejected" ? "text-muted" : "text-warm-ink"}`}>
              {r.status === "pending" ? "Waiting for a reply" : capitalise(r.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalyzeNow({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [state, setState] = useState<{ running: boolean; analysis?: Analysis; error?: unknown }>({ running: false });
  async function run() {
    setState({ running: true });
    try {
      setState({ running: true, analysis: await api.analyzeProject(projectId) });
    } catch (error) {
      setState({ running: false, error });
    }
  }
  if (state.running) return <AnalysisSteps analysis={state.analysis} onRevealed={onDone} />;
  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold">What will this project need?</h2>
      <p className="mt-2 text-[17px] text-muted">We&apos;ll read your description and work out the skills and roles your team needs.</p>
      {state.error !== undefined && (
        <div className="mt-6">
          <ErrorState title="We couldn't finish understanding your project." reassurance="Your project is saved. Try again in a moment." />
        </div>
      )}
      <Button size="lg" className="mt-6" onClick={run}>
        Understand requirements →
      </Button>
    </div>
  );
}

export default function ProjectPage() {
  const user = useCurrentUser();
  const project = useProject();
  const team = useAsync(() => api.getTeam(project.projectId), [project.projectId]);

  if (project.status === "loading") return <PageContainer><LoadingState message="Opening the project…" /></PageContainer>;
  if (project.status === "error") return <PageContainer className="pt-16"><ErrorState title="We couldn't open this project." error={project.error} onRetry={project.reload} /></PageContainer>;

  const { project: p, owner } = project.data;
  const isOwner = p.ownerId === user.userId;
  const analyzed = p.requiredSkills.length > 0;

  return (
    <>
      <ProjectHeader project={p} owner={owner} />
      <PageContainer className="pt-12">
        {analyzed ? (
          <ProjectRequirements title={p.title} skills={p.requiredSkills} roles={p.requiredRoles} requirements={p.aiRequirements?.requirements} teamSize={p.teamSize} />
        ) : isOwner ? (
          <AnalyzeNow projectId={p.projectId} onDone={project.reload} />
        ) : (
          <p className="text-[17px] text-muted">The founder hasn&apos;t worked out what this project needs yet.</p>
        )}

        {analyzed && (
          <RolesSection projectId={p.projectId} openings={p.openings ?? []} suggested={project.data.suggestedOpenings ?? []} isOwner={isOwner} skills={p.requiredSkills} onSaved={project.reload} />
        )}

        <section aria-labelledby="team" className="mt-16 grid gap-8 border-t-[2.5px] border-ink pt-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="team" className="text-xl font-bold">
              The team so far
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              {p.currentTeamSize} of {p.teamSize} people
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isOwner && analyzed && p.status === "open" && <ButtonLink href={`/projects/${p.projectId}/people`}>Find collaborators →</ButtonLink>}
              <ArrowLink href={`/projects/${p.projectId}/team`} className="self-center text-[15px]">
                Team and gaps
              </ArrowLink>
            </div>
          </div>
          <div>
            {team.status === "loading" && <LoadingState message="Gathering the team…" />}
            {team.status === "error" && <ErrorState title="We couldn't load the team." error={team.error} onRetry={team.reload} />}
            {team.status === "success" && <TeamMemberList members={team.data.members} />}
          </div>
        </section>

        {isOwner && <SentInvitations projectId={p.projectId} userId={user.userId} />}
      </PageContainer>
    </>
  );
}
