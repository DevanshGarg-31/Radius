"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { InviteModal } from "@/components/people/InviteModal";
import { MatchDetail } from "@/components/people/MatchDetail";
import { MatchRow } from "@/components/people/PersonCard";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useProject } from "@/hooks/useProject";
import { ApiError, api, type Match, type MatchesResponse } from "@/services/api";
import { useCurrentUser } from "@/lib/session";

function SearchCaption({ data }: { data: MatchesResponse }) {
  const { searchMeta } = data;
  const via = searchMeta.source === "opensearch" ? `searched with OpenSearch in ${searchMeta.tookMs} ms` : "searched the network directly";
  return (
    <p className="text-sm text-muted">
      {searchMeta.candidatesConsidered} {searchMeta.candidatesConsidered === 1 ? "person" : "people"} found · {via}
    </p>
  );
}

function MatchesInner() {
  const user = useCurrentUser();
  const project = useProject();
  const focus = useSearchParams().get("focus") ?? undefined;
  const matches = useAsync(() => api.getMatches(user.userId, project.projectId), [project.projectId, user.userId]);
  const [detail, setDetail] = useState<Match | null>(null);
  const [inviting, setInviting] = useState<Match | null>(null);

  if (project.status === "loading") return <PageContainer><LoadingState message="Opening the project…" /></PageContainer>;
  if (project.status === "error") return <PageContainer className="pt-16"><ErrorState title="We couldn't open this project." error={project.error} onRetry={project.reload} /></PageContainer>;

  const { project: p, owner } = project.data;
  const isOwner = p.ownerId === user.userId;
  const topics = p.aiRequirements?.topics ?? [];

  function markInvited(userId: string, requestId: string) {
    if (matches.status !== "success") return;
    matches.setData({ ...matches.data, matches: matches.data.matches.map((m) => (m.userId === userId ? { ...m, requestStatus: "pending", requestId } : m)) });
    setDetail((d) => (d && d.userId === userId ? { ...d, requestStatus: "pending", requestId } : d));
  }

  return (
    <>
      <ProjectHeader project={p} owner={owner} compact />
      <PageContainer className="pt-10">
        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-rise">
            <h2 className="text-[28px] font-extrabold leading-tight">People for your project</h2>
            {matches.status === "success" && (
              <div className="mt-2 space-y-1">
                <SearchCaption data={matches.data} />
                <p className="text-[15px]">
                  <span className="text-muted">Based on </span>
                  {[...(matches.data.missingSkills.length ? matches.data.missingSkills : matches.data.requiredSkills), ...topics].filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                </p>
              </div>
            )}
          </div>
        </div>

        {focus && (
          <div className="mb-6 flex animate-rise items-center justify-between gap-4 border-l-2 border-warm bg-warm-soft px-5 py-3">
            <p className="text-[15px]">
              Focused on <strong>{focus}</strong>, the gap in your team. People who cover it are marked.
            </p>
            <Link href={`/projects/${p.projectId}/people`} className="shrink-0 text-sm text-muted underline underline-offset-4 hover:text-ink">
              Clear
            </Link>
          </div>
        )}

        {matches.status === "loading" && (
          <div>
            <LoadingState message="Finding collaborators…" />
            <div className="space-y-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          </div>
        )}

        {matches.status === "error" &&
          (matches.error instanceof ApiError && matches.error.status === 409 ? (
            <EmptyState
              title="Let's understand the project first."
              body="Once we know which skills it needs, we can find the people who have them."
              action={isOwner ? <ButtonLink href={`/projects/${p.projectId}`}>Understand requirements →</ButtonLink> : undefined}
            />
          ) : (
            <ErrorState title="We couldn't find collaborators right now." reassurance="Your project is safe. Try again in a moment." onRetry={matches.reload} />
          ))}

        {matches.status === "success" &&
          (matches.data.matches.length ? (
            <ol className="overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
              {matches.data.matches.map((m, i) => (
                <MatchRow key={m.userId} match={m} index={i} focus={focus} onExplain={() => setDetail(m)} onInvite={() => isOwner && setInviting(m)} />
              ))}
            </ol>
          ) : (
            <EmptyState title="No one in the network fits yet." body="Try describing the project in more detail, or check back as more people join." />
          ))}

        {!isOwner && matches.status === "success" && <p className="mt-6 text-sm text-muted">Only the project&apos;s founder can send invitations.</p>}
      </PageContainer>

      <MatchDetail
        match={detail}
        weights={matches.status === "success" ? matches.data.weights : undefined}
        onClose={() => setDetail(null)}
        onInvite={() => {
          if (!detail || !isOwner) return;
          setInviting(detail);
          setDetail(null);
        }}
      />
      {inviting && (
        <InviteModal
          open
          onClose={() => setInviting(null)}
          project={{ projectId: p.projectId, title: p.title, requiredRoles: p.requiredRoles }}
          person={inviting}
          onSent={(request) => markInvited(request.toUserId, request.requestId)}
        />
      )}
    </>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={null}>
      <MatchesInner />
    </Suspense>
  );
}
