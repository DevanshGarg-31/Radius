"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingState } from "@/components/ui/States";
import { PageContainer } from "@/components/layout/PageContainer";
import { useSession } from "@/lib/session";

/** Signed-in area: sends visitors to /login and brings them back afterwards. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, router, pathname]);

  if (!user) {
    return (
      <PageContainer>
        <LoadingState message={user === null ? "Taking you to sign in…" : "Opening your workspace…"} />
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
