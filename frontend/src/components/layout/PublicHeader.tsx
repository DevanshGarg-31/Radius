"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useSession } from "@/lib/session";

export function PublicHeader() {
  const { user } = useSession();
  return (
    <header className="mx-auto flex h-20 max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8">
      <Logo />
      <nav aria-label="Main" className="ml-4 hidden gap-6 text-[15px] text-muted md:flex">
        <a href="#how-it-works" className="hover:text-ink">
          How it works
        </a>
        <a href="#under-the-hood" className="hover:text-ink">
          Under the hood
        </a>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <ButtonLink href="/dashboard" size="sm">
            Open radius →
          </ButtonLink>
        ) : (
          <>
            <Link href="/login" className="rounded-btn px-3 py-1.5 text-[15px] font-medium hover:bg-sunken">
              Sign in
            </Link>
            <ButtonLink href="/login?next=/projects/new" size="sm">
              Start building →
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
