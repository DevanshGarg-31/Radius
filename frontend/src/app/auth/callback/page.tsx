"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoadingState } from "@/components/ui/States";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useSession } from "@/lib/session";

/** Google sends people back here; Amplify finishes the sign-in and the redirect hook moves them on. */
function CallbackInner() {
  useAuthRedirect();
  const { state } = useSession();
  const params = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);

  // Give Amplify time to swap the code for tokens before calling it a failure.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const failed = Boolean(params.get("error")) || (timedOut && state.status === "signed-out");

  if (failed) {
    return (
      <AuthShell title="That didn't work." lede="We couldn't finish signing you in with Google. Try again, or use your email and password.">
        <Link href="/login" className="font-semibold underline underline-offset-4">
          ← Back to log in
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Signing you in…">
      <LoadingState message="Finishing up with Google…" />
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
