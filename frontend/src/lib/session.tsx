"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { api, type User } from "@/services/api";

/**
 * Demo sign-in: the chosen person's id is kept in localStorage and sent to the
 * API as X-User-Id. Switching accounts is how the demo shows both sides of an invite.
 */

const STORAGE_KEY = "radius.userId";
const CHANGE_EVENT = "radius:session";

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(STORAGE_KEY, userId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the session lasts for this page only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

interface Session {
  /** undefined while restoring; null when signed out. */
  user: User | null | undefined;
  signIn: (who: { userId?: string; username?: string }) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // undefined on the server and during hydration, then the stored id (or null).
  const storedId = useSyncExternalStore<string | null | undefined>(subscribe, readStoredId, () => undefined);
  const [loaded, setLoaded] = useState<{ id: string; user: User } | null>(null);

  useEffect(() => {
    if (!storedId || loaded?.id === storedId) return;
    let active = true;
    api
      .getUser(storedId)
      .then(({ user }) => active && setLoaded({ id: storedId, user }))
      .catch(() => active && storeId(null));
    return () => {
      active = false;
    };
  }, [storedId, loaded?.id]);

  const signIn = useCallback(async (who: { userId?: string; username?: string }) => {
    const { user } = await api.demoLogin(who);
    setLoaded({ id: user.userId, user });
    storeId(user.userId);
    return user;
  }, []);

  const signOut = useCallback(() => storeId(null), []);

  const refresh = useCallback(async () => {
    if (!storedId) return;
    const { user } = await api.getUser(storedId);
    setLoaded({ id: storedId, user });
  }, [storedId]);

  const user = storedId === undefined ? undefined : storedId === null ? null : loaded?.id === storedId ? loaded.user : undefined;
  const value = useMemo(() => ({ user, signIn, signOut, refresh }), [user, signIn, signOut, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** For pages inside the app shell, where a signed-in user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useCurrentUser used outside the signed-in app shell");
  return user;
}
