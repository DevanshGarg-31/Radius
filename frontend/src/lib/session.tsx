"use client";

import "aws-amplify/auth/enable-oauth-listener";
import {
  autoSignIn,
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  signIn as amplifySignIn,
  signInWithRedirect,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, setTokenProvider, type ProfileInput, type User } from "@/services/api";
import { configureAmplify, isAuthConfigured } from "./amplify";

/**
 * Who is using radius, via Amazon Cognito:
 *   loading        restoring the session
 *   signed-out     no session
 *   needs-profile  signed in (email verified or Google) but hasn't created a profile yet
 *   ready          signed in with a profile
 */
export type SessionState =
  | { status: "loading" }
  /** byUser: they clicked Sign out (go home), rather than a session that expired (go to log in). */
  | { status: "signed-out"; byUser?: boolean }
  | { status: "needs-profile"; account: Account }
  | { status: "ready"; account: Account; user: User };

export interface Account {
  email: string;
  name: string;
}

/** What happened after a sign-in or sign-up attempt, so the page knows what to show next. */
export type AuthStep = "done" | "confirm-code";

interface Session {
  state: SessionState;
  /** The profile when ready; null when signed out or without a profile; undefined while loading. */
  user: User | null | undefined;
  signIn: (email: string, password: string) => Promise<AuthStep>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<AuthStep>;
  /** "signed-in" when the new account signed in straight away; "confirmed" when they still need to log in. */
  confirmCode: (email: string, code: string) => Promise<"signed-in" | "confirmed">;
  resendCode: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmNewPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  createProfile: (input: ProfileInput & { username: string }) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

setTokenProvider(async () => {
  if (!isAuthConfigured) return undefined;
  try {
    const { tokens } = await fetchAuthSession();
    return tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const inFlight = useRef<Promise<void> | null>(null);

  const readSession = useCallback(async () => {
    if (!isAuthConfigured) {
      setState({ status: "signed-out" });
      return;
    }
    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) {
        setState({ status: "signed-out" });
        return;
      }
      // Cognito says they're signed in, so one bad reply from our API (a cold
      // start, a dropped connection) shouldn't show them the login page. Try twice.
      for (let attempt = 0; ; attempt++) {
        try {
          const me = await api.getMe();
          setState(me.user ? { status: "ready", account: me.account, user: me.user } : { status: "needs-profile", account: me.account });
          return;
        } catch (err) {
          if (attempt > 0) throw err;
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    } catch {
      setState({ status: "signed-out" });
    }
  }, []);

  /** Several things can ask at once (page load, a Hub event, coming back to the tab); one check is enough. */
  const refresh = useCallback(() => {
    inFlight.current ??= readSession().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [readSession]);

  useEffect(() => {
    configureAmplify();
    const stop = Hub.listen("auth", ({ payload }) => {
      // Covers Google redirects, sign-in/out in other tabs, and expired sessions.
      // (Our own Sign out already set the state; refreshing would drop the "signed out on purpose" flag.)
      if (["signedIn", "signInWithRedirect", "signInWithRedirect_failure", "tokenRefresh_failure"].includes(payload.event)) void refresh();
      if (payload.event === "signedOut") setState((s) => (s.status === "signed-out" ? s : { status: "signed-out" }));
    });
    // A tab left open while someone signed in elsewhere (another tab, another
    // window) catches up when they come back to it.
    const onVisible = () => {
      if (document.visibilityState === "visible" && statusRef.current === "signed-out") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // Restore any existing session once, after Amplify is configured.
    const first = setTimeout(() => void refresh(), 0);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearTimeout(first);
    };
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthStep> => {
      let result;
      try {
        result = await amplifySignIn({ username: email.trim(), password });
      } catch (err) {
        // A session is already open in this browser: either the same person on a
        // stale page, or someone signing in as somebody else. Clear it and log in.
        if ((err as Error)?.name !== "UserAlreadyAuthenticatedException") throw err;
        await amplifySignOut();
        result = await amplifySignIn({ username: email.trim(), password });
      }
      const { nextStep } = result;
      if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        await resendSignUpCode({ username: email.trim() });
        return "confirm-code";
      }
      await refresh();
      return "done";
    },
    [refresh],
  );

  const signUp = useCallback(async ({ email, password, name }: { email: string; password: string; name: string }): Promise<AuthStep> => {
    const { nextStep } = await amplifySignUp({
      username: email.trim(),
      password,
      options: { userAttributes: { email: email.trim(), name: name.trim() }, autoSignIn: true },
    });
    return nextStep.signUpStep === "CONFIRM_SIGN_UP" ? "confirm-code" : "done";
  }, []);

  const confirmCode = useCallback(
    async (email: string, code: string) => {
      const { nextStep } = await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
      // Signs in straight away after sign-up; if that isn't possible (e.g. a new tab), they log in normally.
      let signedIn = false;
      if (nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
        try {
          signedIn = (await autoSignIn()).isSignedIn;
        } catch {
          signedIn = false;
        }
      }
      await refresh();
      return signedIn ? "signed-in" : "confirmed";
    },
    [refresh],
  );

  const resendCode = useCallback(async (email: string) => {
    await resendSignUpCode({ username: email.trim() });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithRedirect({ provider: "Google" });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await resetPassword({ username: email.trim() });
  }, []);

  const confirmNewPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await confirmResetPassword({ username: email.trim(), confirmationCode: code.trim(), newPassword });
  }, []);

  const createProfile = useCallback(
    async (input: ProfileInput & { username: string }) => {
      const { user } = await api.createProfile(input);
      setState((s) => (s.status === "needs-profile" || s.status === "ready" ? { status: "ready", account: s.account, user } : s));
      return user;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setState({ status: "signed-out", byUser: true });
  }, []);

  const user = state.status === "ready" ? state.user : state.status === "loading" ? undefined : null;

  const value = useMemo(
    () => ({ state, user, signIn, signUp, confirmCode, resendCode, signInWithGoogle, forgotPassword, confirmNewPassword, createProfile, signOut, refresh }),
    [state, user, signIn, signUp, confirmCode, resendCode, signInWithGoogle, forgotPassword, confirmNewPassword, createProfile, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** For pages inside the app shell, where a signed-in user with a profile is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useCurrentUser used outside the signed-in app shell");
  return user;
}
