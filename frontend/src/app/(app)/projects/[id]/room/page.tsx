"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ChatPanel } from "@/components/room/ChatPanel";
import { VideoCall } from "@/components/room/VideoCall";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useProject } from "@/hooks/useProject";
import { useTeamRoom } from "@/hooks/useTeamRoom";
import { useCurrentUser } from "@/lib/session";
import { ApiError } from "@/services/api";

function Room({ projectId, userId }: { projectId: string; userId: string }) {
  const room = useTeamRoom(projectId, userId);

  if (room.state.status === "loading") return <LoadingState message="Opening the team room…" />;
  if (room.state.status === "error") {
    const status = room.state.error instanceof ApiError ? room.state.error.status : 0;
    if (status === 403) return <EmptyState title="This room is for the team." body="Only people on this project's team can chat and call here." action={<ButtonLink href={`/projects/${projectId}`} variant="secondary">Back to the project</ButtonLink>} />;
    if (status === 409)
      return (
        <EmptyState
          title="The room opens when someone joins."
          body="As soon as a collaborator accepts an invitation, the team gets a shared space to chat and call."
          action={<ButtonLink href={`/projects/${projectId}/people`}>Find collaborators →</ButtonLink>}
        />
      );
    return <ErrorState title="We couldn't open the team room." error={room.state.error} onRetry={room.reload} />;
  }

  const { members, project } = room.state.room;
  return (
    <>
      <div className="flex flex-col gap-2 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <h2 className="text-[36px] font-extrabold leading-[1.02] sm:text-[44px]">Team room</h2>
          <p className="mt-2 text-[17px] text-ink-soft">Everyone on {project.title} can chat and call here.</p>
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <ChatPanel messages={room.messages} members={members} meId={userId} connection={room.connection} onSend={room.send} />
        <aside className="space-y-6">
          <VideoCall projectId={projectId} meId={userId} members={members} call={room.call} onCallStarted={room.setCall} />
          <section aria-labelledby="on-team" className="rounded-panel border-[2.5px] border-ink bg-lilac/40 p-5 shadow-brutal">
            <h2 id="on-team" className="mb-4 text-xl font-extrabold">
              On this team
            </h2>
            <TeamMemberList members={members} highlight={userId} showSkills={false} />
          </section>
        </aside>
      </div>
    </>
  );
}

export default function RoomPage() {
  const user = useCurrentUser();
  const project = useProject();

  if (project.status === "loading") return <PageContainer><LoadingState message="Opening the project…" /></PageContainer>;
  if (project.status === "error") return <PageContainer className="pt-16"><ErrorState title="We couldn't open this project." error={project.error} onRetry={project.reload} /></PageContainer>;

  return (
    <>
      <ProjectHeader project={project.data.project} owner={project.data.owner} compact />
      <PageContainer className="pt-10">
        <Room key={`${project.projectId}:${user.userId}`} projectId={project.projectId} userId={user.userId} />
      </PageContainer>
    </>
  );
}
