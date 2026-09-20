"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useCurrentUser } from "@/lib/session";
import { api } from "@/services/api";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AccountMenu } from "./AccountMenu";

/** Dispatched after accepting or declining, so the count updates without a navigation. */
export const INVITATIONS_CHANGED = "radius:invitations-changed";

const LINKS = [
  { href: "/ideas", label: "Ideas" },
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "Projects" },
  { href: "/invitations", label: "Invitations" },
];

export function Navbar() {
  const user = useCurrentUser();
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  // Re-checked on every navigation, and whenever an invitation is answered.
  const [answered, setAnswered] = useState(0);
  useEffect(() => {
    const onChange = () => setAnswered((n) => n + 1);
    window.addEventListener(INVITATIONS_CHANGED, onChange);
    return () => window.removeEventListener(INVITATIONS_CHANGED, onChange);
  }, []);
  useEffect(() => {
    let active = true;
    api
      .myInvitations(user.userId)
      .then(({ requests }) => active && setPending(requests.filter((r) => r.status === "pending").length))
      .catch(() => active && setPending(0));
    return () => {
      active = false;
    };
  }, [user.userId, pathname, answered]);

  return (
    <header className="sticky top-0 z-30 border-b-[2.5px] border-ink bg-canvas/95 backdrop-blur-sm">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo href="/dashboard" />
        <ul className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = (pathname === link.href || pathname.startsWith(`${link.href}/`)) && pathname !== "/projects/new";
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-btn border-2 px-3 py-1.5 font-mono text-[13px] font-bold uppercase transition-colors ${active ? "border-ink bg-mustard shadow-brutal-sm" : "border-transparent hover:border-ink hover:bg-surface"}`}
                >
                  {link.label}
                  {link.href === "/invitations" && pending > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-tomato px-1 text-[11px] font-bold leading-4 text-ink" aria-label={`${pending} pending`}>
                      {pending}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block">
            <ButtonLink href="/projects/new" size="sm">
              <span aria-hidden="true">+</span> Start a project
            </ButtonLink>
          </span>
          <NotificationBell />
          <AccountMenu />
        </div>
      </nav>
      {/* Compact navigation for small screens. */}
      <ul className="flex items-center gap-1 overflow-x-auto border-t-2 border-ink px-3 py-1.5 md:hidden">
        {[...LINKS, { href: "/projects/new", label: "+ Start" }].map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={`block rounded-btn px-3 py-1.5 text-sm ${pathname === link.href ? "border-2 border-ink bg-mustard font-bold" : "text-ink-soft"}`}>
              {link.label}
              {link.href === "/invitations" && pending > 0 ? ` (${pending})` : ""}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
