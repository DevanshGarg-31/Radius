"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { TeamGap } from "@/components/team/TeamGap";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/lib/session";
import { api, type TeamGaps } from "@/services/api";

function TeamInner() {
  const user = useCurrentUser();
  const project = useProject();
  const joined = useSearchParams().get("joined") ?? undefined;
  const team = useAsync(() => api.getTeam(project.projectId), [project.projectId]);
  const [gaps, setGaps] = useState<{ status: "idle" | "loading" | "done" | "error"; data?: TeamGaps; error?: unknown }>({ status: "idle" });

  async function analyzeTeam() {
    setGaps({ status: "loading" });
    try {
      setGaps({ status: "done", data: await api.getTeamGaps(user.userId, project.projectId) });
    } catch (error) {
      setGaps({ status: "error", error });
    }
  }

  if (project.status === "loading") return <PageContainer><LoadingState message="Opening the project…" /></PageContainer>;
  if (project.status === "error") return <PageContainer className="pt-16"><ErrorState title="We couldn't open this project." error={project.error} onRetry={project.reload} /></PageContainer>;

  const { project: p, owner } = project.data;
  const analyzed = p.requiredSkills.length > 0;
  const size = team.status === "success" ? team.data.members.length : p.currentTeamSize;

  return (
    <>
      <ProjectHeader project={p} owner={owner} compact />
      <PageContainer className="pt-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <section aria-labelledby="members">
            <h2 id="members" className="text-[28px] font-extrabold leading-tight">
              {size > 1 ? "Your team is taking shape." : "It starts with you."}
            </h2>
            <p className="mt-2 text-[15px] text-muted">
              {size} of {p.teamSize} collaborators
            </p>
            <div className="mt-6">
              {team.status === "loading" && <LoadingState message="Gathering the team…" />}
              {team.status === "error" && <ErrorState title="We couldn't load the team." error={team.error} onRetry={team.reload} />}
              {team.status === "success" && <TeamMemberList members={team.data.members} highlight={joined} />}
            </div>
          </section>

          <section aria-label="Team analysis" className="lg:border-l lg:border-line lg:pl-12">
            {!analyzed && <p className="text-[17px] text-muted">Once the project&apos;s requirements are worked out, you can check what the team still needs.</p>}

            {analyzed && gaps.status === "idle" && (
              <div className="max-w-md">
                <p className="eyebrow mb-3">Team check</p>
                <h2 className="text-2xl font-bold">What is the team still missing?</h2>
                <p className="mt-2 text-[17px] text-muted">We&apos;ll compare everyone&apos;s skills with what {p.title} needs.</p>
                <Button size="lg" className="mt-6" onClick={analyzeTeam}>
                  Analyze the team →
                </Button>
              </div>
            )}

            {gaps.status === "loading" && <LoadingState message="Reviewing your team against the project…" />}
            {gaps.status === "error" && <ErrorState title="We couldn't review the team right now." reassurance="Your team is unchanged. Try again in a moment." onRetry={analyzeTeam} />}
            {gaps.status === "done" && gaps.data && (
              <div className="max-w-md animate-fade">
                <p className="eyebrow mb-3">Team check</p>
                <p className="text-[17px]">
                  {gaps.data.missingSkills.length ? `${gaps.data.coveredSkills.length} of ${gaps.data.requiredSkills.length} capabilities covered.` : "Every capability is covered."}
                </p>
                <Button variant="quiet" size="sm" className="-ml-3 mt-3" onClick={analyzeTeam}>
                  Check again
                </Button>
              </div>
            )}
          </section>
        </div>

        {gaps.status === "done" && gaps.data && (
          <div className="mt-14 border-t border-line pt-12">
            <TeamGap gaps={gaps.data} projectId={p.projectId} title={p.title} />
          </div>
        )}

        {gaps.status === "done" && gaps.data && gaps.data.missingSkills.length === 0 && p.status === "open" && (
          <div className="mt-12 border-t border-line pt-8">
            <ButtonLink href={`/projects/${p.projectId}/people`} variant="secondary">
              Look for more collaborators
            </ButtonLink>
          </div>
        )}
      </PageContainer>
    </>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamInner />
    </Suspense>
  );
}
