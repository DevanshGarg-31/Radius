"use client";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { ProjectRow } from "@/components/projects/ProjectCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/lib/session";
import { api, type Project } from "@/services/api";

function Section({ id, title, projects, userId, empty }: { id: string; title: string; projects: Project[]; userId: string; empty?: React.ReactNode }) {
  if (!projects.length && !empty) return null;
  return (
    <section aria-labelledby={id} className="mt-12 first:mt-0">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {projects.length ? (
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <ProjectRow key={p.projectId} project={p} isOwner={p.ownerId === userId} />
          ))}
        </ul>
      ) : (
        <div className="mt-4">{empty}</div>
      )}
    </section>
  );
}

export default function ProjectsPage() {
  const me = useCurrentUser();
  const data = useAsync(async () => {
    const [all, member] = await Promise.all([api.listProjects(), api.listProjects({ memberId: me.userId })]);
    const memberIds = new Set(member.projects.map((p) => p.projectId));
    return {
      mine: all.projects.filter((p) => p.ownerId === me.userId),
      joined: member.projects.filter((p) => p.ownerId !== me.userId),
      open: all.projects.filter((p) => p.ownerId !== me.userId && !memberIds.has(p.projectId) && p.status === "open"),
    };
  }, [me.userId]);

  return (
    <PageContainer>
      <PageHeader eyebrow="Projects" title="Ideas becoming teams" actions={<ButtonLink href="/projects/new">+ Start a project</ButtonLink>} />
      {data.status === "loading" && <LoadingState message="Gathering projects…" />}
      {data.status === "error" && <ErrorState title="We couldn't load projects." error={data.error} onRetry={data.reload} />}
      {data.status === "success" && (
        <>
          <Section
            id="mine"
            title="Started by you"
            projects={data.data.mine}
            userId={me.userId}
            empty={<EmptyState title="You haven't started a project yet." body="Describe an idea and we'll help you find the people to build it with." action={<ButtonLink href="/projects/new">Start a project →</ButtonLink>} />}
          />
          <Section id="joined" title="Teams you're on" projects={data.data.joined} userId={me.userId} />
          <Section id="open" title="Open projects in the network" projects={data.data.open} userId={me.userId} />
        </>
      )}
    </PageContainer>
  );
}
