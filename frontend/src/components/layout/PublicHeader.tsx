"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useSession } from "@/lib/session";

export function PublicHeader() {
  const { state } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b-[2.5px] border-ink bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden gap-1 font-mono text-[13px] font-bold uppercase md:flex">
          {[
            ["/ideas", "Idea board"],
            ["#how-it-works", "How it works"],
            ["#matching", "Matching"],
            ["#under-the-hood", "Under the hood"],
          ].map(([href, label]) =>
            // Anchors jump within the landing page; real routes navigate.
            href!.startsWith("/") ? (
              <Link key={href} href={href!} className="rounded-btn px-3 py-1.5 hover:bg-mustard">
                {label}
              </Link>
            ) : (
              <a key={href} href={href} className="rounded-btn px-3 py-1.5 hover:bg-mustard">
                {label}
              </a>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {state.status === "needs-profile" ? (
            <ButtonLink href="/welcome" size="sm" variant="pop">
              Finish your profile →
            </ButtonLink>
          ) : state.status === "ready" ? (
            <ButtonLink href="/dashboard" size="sm">
              Open radius →
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-btn px-3 py-1.5 text-[15px] font-semibold hover:bg-mustard sm:block">
                Sign in
              </Link>
              <ButtonLink href="/signup?next=/projects/new" size="sm" variant="pop">
                Start building →
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
