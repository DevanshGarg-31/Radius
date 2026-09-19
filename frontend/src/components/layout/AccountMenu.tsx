"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { firstName } from "@/lib/format";
import { useCurrentUser, useSession } from "@/lib/session";
import { api, type UserSummary } from "@/services/api";

/** The demo cast shown first in the switcher, in story order. */
const DEMO_CAST = ["aarav", "rahuldev", "priyacv"];

export function AccountMenu() {
  const user = useCurrentUser();
  const { signIn, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || people.length) return;
    api
      .listUsers()
      .then(({ users }) => setPeople(users))
      .catch(() => setPeople([]));
  }, [open, people.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cast = DEMO_CAST.map((u) => people.find((p) => p.username === u)).filter((p): p is UserSummary => Boolean(p) && p!.userId !== user.userId);

  async function switchTo(userId: string) {
    setOpen(false);
    await signIn({ userId });
    router.push("/dashboard");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-btn py-1 pl-1 pr-2 hover:bg-sunken"
      >
        <Avatar name={user.name} seed={user.userId} src={user.avatarUrl || undefined} size={30} />
        <span className="hidden text-sm font-medium sm:inline">{firstName(user.name)}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-muted">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 animate-rise rounded-card border border-line bg-surface p-2 shadow-lift">
          <div className="px-3 pb-3 pt-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-[13px] text-muted">@{user.username}</p>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="block rounded-btn px-3 py-2 text-sm hover:bg-sunken">
            Your profile
          </Link>
          <div className="my-2 border-t border-line" />
          <p className="eyebrow px-3 pb-1 pt-1">Switch account</p>
          {cast.map((p) => (
            <button key={p.userId} role="menuitem" type="button" onClick={() => switchTo(p.userId)} className="flex w-full items-center gap-3 rounded-btn px-3 py-2 text-left text-sm hover:bg-sunken">
              <Avatar name={p.name} seed={p.userId} size={24} />
              <span className="flex-1">{p.name}</span>
            </button>
          ))}
          <Link role="menuitem" href="/login" onClick={() => setOpen(false)} className="block rounded-btn px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-ink">
            Someone else…
          </Link>
          <div className="my-2 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="w-full rounded-btn px-3 py-2 text-left text-sm text-muted hover:bg-sunken hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
