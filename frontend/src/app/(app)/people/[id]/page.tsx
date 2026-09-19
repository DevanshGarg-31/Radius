"use client";

import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PersonProfile } from "@/components/people/PersonProfile";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/lib/session";
import { api } from "@/services/api";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const me = useCurrentUser();
  const data = useAsync(async () => {
    const [{ user }, { projects }] = await Promise.all([api.getUser(id), api.listProjects({ memberId: id })]);
    return { user, projects };
  }, [id]);

  return (
    <PageContainer>
      {data.status === "loading" && <LoadingState message="Opening profile…" />}
      {data.status === "error" && (
        <div className="pt-16">
          <ErrorState title="We couldn't open this profile." error={data.error} onRetry={data.reload} />
        </div>
      )}
      {data.status === "success" && (
        <PersonProfile user={data.data.user} projects={data.data.projects} actions={data.data.user.userId === me.userId ? <ButtonLink href="/profile" variant="secondary">Edit your profile</ButtonLink> : undefined} />
      )}
    </PageContainer>
  );
}
