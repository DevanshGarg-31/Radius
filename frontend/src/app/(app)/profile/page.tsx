"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PersonProfile } from "@/components/people/PersonProfile";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/Button";
import { useAsync } from "@/hooks/useAsync";
import { humanError } from "@/lib/errors";
import { useCurrentUser, useSession } from "@/lib/session";
import { api } from "@/services/api";

export default function ProfilePage() {
  const me = useCurrentUser();
  const { refresh } = useSession();
  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const projects = useAsync(() => api.listProjects({ memberId: me.userId }).then((r) => r.projects), [me.userId]);

  if (editing) {
    return (
      <PageContainer narrow className="pb-10 pt-12">
        <h1 className="mb-8 text-[36px] font-extrabold leading-[1.02] sm:text-[44px]">Edit your profile</h1>
        <ProfileForm
          mode="edit"
          initial={me}
          submitLabel="Save profile"
          serverError={serverError}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            setServerError(undefined);
            try {
              // The server ignores username changes; it is fixed once chosen.
              await api.updateUser(me.userId, values);
              await refresh();
              setEditing(false);
            } catch (err) {
              setServerError(humanError(err, "We couldn't save your profile. Your changes are still here; try again."));
            }
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PersonProfile
        user={me}
        projects={projects.status === "success" ? projects.data : undefined}
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        }
      />
    </PageContainer>
  );
}
