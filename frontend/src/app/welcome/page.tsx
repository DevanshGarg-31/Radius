"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LoadingState } from "@/components/ui/States";
import { useNextPath } from "@/hooks/useAuthRedirect";
import { humanError } from "@/lib/errors";
import { useSession } from "@/lib/session";

/** A starting username from the email address, e.g. maya.iyer@... -> maya.iyer */
const usernameFrom = (email: string) =>
  email
    .split("@")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 40);

function WelcomeInner() {
  const { state, createProfile } = useSession();
  const router = useRouter();
  const next = useNextPath();
  const [serverError, setServerError] = useState<string>();

  useEffect(() => {
    if (state.status === "signed-out") router.replace("/login");
    if (state.status === "ready") router.replace(next);
  }, [state.status, router, next]);

  if (state.status !== "needs-profile") {
    return (
      <AuthShell title="One moment…">
        <LoadingState message="Checking your account…" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      title="Create your profile."
      lede="This is what people see when radius suggests you for their idea. Your skills and interests drive the matching, so be specific."
    >
      <ProfileForm
        mode="create"
        initial={{ name: state.account.name, username: usernameFrom(state.account.email) }}
        submitLabel="Join the network →"
        serverError={serverError}
        onSubmit={async (values) => {
          setServerError(undefined);
          try {
            await createProfile(values);
          } catch (err) {
            setServerError(humanError(err, "We couldn't save your profile. Try again."));
          }
        }}
      />
    </AuthShell>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeInner />
    </Suspense>
  );
}
