"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { firstName } from "@/lib/format";
import { useCurrentUser, useSession } from "@/lib/session";

export function AccountMenu() {
  const user = useCurrentUser();
  const { signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-btn py-1 pl-1 pr-2 hover:bg-sunken">
        <Avatar name={user.name} seed={user.userId} src={user.avatarUrl || undefined} size={30} />
        <span className="hidden text-sm font-medium sm:inline">{firstName(user.name)}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-muted">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 animate-rise rounded-card border-[2.5px] border-ink bg-surface p-2 shadow-brutal">
          <div className="px-3 pb-3 pt-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[13px] text-muted">{user.email || `@${user.username}`}</p>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="block rounded-btn px-3 py-2 text-sm hover:bg-sunken">
            Your profile
          </Link>
          <div className="my-2 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
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
