"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { NEXT_KEY } from "@/components/auth/GoogleButton";
import { useSession } from "@/lib/session";

/** Where to go after signing in: ?next= (same-site paths only), or a stored one from a Google trip. */
export function useNextPath(): string {
  const params = useSearchParams();
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/**
 * On sign-in pages: once someone is signed in, send them on. People without a
 * profile go to /welcome first.
 */
export function useAuthRedirect(): void {
  const { state } = useSession();
  const router = useRouter();
  const next = useNextPath();

  useEffect(() => {
    if (state.status === "needs-profile") router.replace(`/welcome?next=${encodeURIComponent(next)}`);
    if (state.status === "ready") {
      let target = next;
      try {
        target = sessionStorage.getItem(NEXT_KEY) ?? next;
        sessionStorage.removeItem(NEXT_KEY);
      } catch {
        // No stored destination.
      }
      router.replace(target);
    }
  }, [state.status, router, next]);
}
