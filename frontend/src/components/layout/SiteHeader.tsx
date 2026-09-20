"use client";

import { Navbar } from "@/components/layout/Navbar";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { useSession } from "@/lib/session";

/**
 * For pages anyone can open: visitors get the public header, while someone
 * signed in keeps the app's own navigation rather than being thrown out of it.
 */
export function SiteHeader() {
  const { state } = useSession();
  return state.status === "ready" ? <Navbar /> : <PublicHeader />;
}
