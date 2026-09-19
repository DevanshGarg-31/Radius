"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingState } from "@/components/ui/States";
import { PageContainer } from "@/components/layout/PageContainer";
import { useSession } from "@/lib/session";

/**
 * Signed-in area. Visitors go to /login, and people who haven't created a
 * profile yet go to /welcome; both come back here afterwards.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const next = encodeURIComponent(pathname);
    if (state.status === "signed-out") router.replace(`/login?next=${next}`);
    if (state.status === "needs-profile") router.replace(`/welcome?next=${next}`);
  }, [state.status, router, pathname]);

  if (state.status !== "ready") {
    const message = state.status === "loading" ? "Opening your workspace…" : state.status === "needs-profile" ? "Let's set up your profile…" : "Taking you to sign in…";
    return (
      <PageContainer>
        <LoadingState message={message} />
      </PageContainer>
    );
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="pb-24">
        {children}
      </main>
    </>
  );
}
