"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProjectRow } from "@/components/projects/ProjectCard";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowLink, Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { firstName, greeting } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { DRAFT_KEY } from "@/app/(app)/projects/new/draft";
import { api, type Project } from "@/services/api";

function IdeaStarter() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  function start() {
    try {
      sessionStorage.setItem(DRAFT_KEY, draft);
    } catch {
      // Without storage the new-project page simply starts empty.
    }
    router.push("/projects/new");
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
      className="rounded-panel border border-line bg-surface p-5 shadow-soft transition-shadow focus-within:shadow-lift sm:p-6"
    >
      <label htmlFor="idea-starter" className="flex items-center gap-2 font-display font-bold">
        <span aria-hidden="true" className="text-muted">
          +
        </span>
        Start a new project
      </label>
      <textarea
        id="idea-starter"
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Describe what you're trying to build…"
        className="mt-3 w-full resize-none bg-transparent text-[17px] leading-relaxed placeholder:text-muted/70 focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm" variant={draft.trim() ? "primary" : "secondary"}>
          Continue →
        </Button>
      </div>
    </form>
  );
}

function PendingInvitations({ userId }: { userId: string }) {
  const invites = useAsync(() => api.myInvitations(userId).then((r) => r.requests.filter((i) => i.status === "pending")), [userId]);
  if (invites.status !== "success" || !invites.data.length) return null;
  const first = invites.data[0]!;
  return (
    <section aria-label="Invitations" className="animate-rise rounded-card border border-warm/40 bg-warm-soft px-5 py-4">
      <p className="text-[15px]">
        <strong>{first.fromUser?.name ?? "Someone"}</strong> invited you to join <strong>{first.project?.title ?? "a project"}</strong>
        {first.role ? ` as ${first.role}` : ""}.
        {invites.data.length > 1 && ` And ${invites.data.length - 1} more.`}{" "}
        <Link href="/invitations" className="font-medium underline underline-offset-4">
          Review →
        </Link>
      </p>
    </section>
  );
}

function PeopleToMeet({ project, userId }: { project: Project; userId: string }) {
  const matches = useAsync(() => api.getMatches(userId, project.projectId), [project.projectId, userId]);
  return (
    <section aria-labelledby="meet">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="meet" className="text-xl font-bold">
          People you may want to meet
        </h2>
        <p className="text-sm text-muted">for {project.title}</p>
      </div>
      {matches.status === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}
      {matches.status === "error" && <ErrorState title="We couldn't find collaborators right now." reassurance="Your project is safe. Try again in a moment." onRetry={matches.reload} />}
      {matches.status === "success" &&
        (matches.data.matches.length ? (
          <>
            <ul className="divide-y divide-line">
              {matches.data.matches.slice(0, 3).map((m) => (
                <li key={m.userId} className="flex items-center gap-4 py-3">
                  <Avatar name={m.name} seed={m.userId} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/people/${m.userId}`} className="font-semibold hover:underline">
                      {m.name}
                    </Link>
                    <p className="truncate text-sm text-muted">{m.suggestedRole !== "Collaborator" ? m.suggestedRole : m.skills.slice(0, 3).join(" · ")}</p>
                  </div>
                  <span className="font-display text-lg font-bold tabular-nums">{m.score}%</span>
                </li>
              ))}
            </ul>
            <ArrowLink href={`/projects/${project.projectId}/people`} className="mt-4 text-sm">
              See everyone who fits
            </ArrowLink>
          </>
        ) : (
          <p className="text-[15px] text-muted">No one fits yet. Try widening the project description.</p>
        ))}
    </section>
  );
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const projects = useAsync(async () => {
    const [owned, member] = await Promise.all([api.listProjects({ ownerId: user.userId }), api.listProjects({ memberId: user.userId })]);
    const seen = new Set<string>();
    return [...owned.projects, ...member.projects].filter((p) => (seen.has(p.projectId) ? false : (seen.add(p.projectId), true)));
  }, [user.userId]);

  const active = projects.status === "success" ? projects.data.filter((p) => p.status !== "closed") : [];
  const focusProject = active.find((p) => p.ownerId === user.userId && p.status === "open" && p.requiredSkills.length);

  return (
    <PageContainer narrow>
      <header className="animate-rise pb-8 pt-12 sm:pt-16">
        <p className="text-[17px] text-muted">
          {greeting()}, {firstName(user.name)}.
        </p>
        <h1 className="mt-1 text-[36px] font-extrabold leading-tight sm:text-[44px]">What are you working on?</h1>
      </header>

      <div className="space-y-14">
        <PendingInvitations userId={user.userId} />
        <IdeaStarter />

        <section aria-labelledby="active">
          <h2 id="active" className="text-xl font-bold">
            Your active projects
          </h2>
          {projects.status === "loading" && (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}
          {projects.status === "error" && (
            <div className="mt-4">
              <ErrorState title="We couldn't load your projects." error={projects.error} onRetry={projects.reload} />
            </div>
          )}
          {projects.status === "success" &&
            (active.length ? (
              <ul className="divide-y divide-line">
                {active.map((p) => (
                  <ProjectRow key={p.projectId} project={p} isOwner={p.ownerId === user.userId} />
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState title="No projects yet." body="Describe an idea above and we'll help you find the people to build it with." />
              </div>
            ))}
        </section>

        {focusProject && <PeopleToMeet project={focusProject} userId={user.userId} />}
      </div>
    </PageContainer>
  );
}
