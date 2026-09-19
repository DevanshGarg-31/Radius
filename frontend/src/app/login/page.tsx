"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, OrDivider } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useAuthRedirect, useNextPath } from "@/hooks/useAuthRedirect";
import { isAuthConfigured } from "@/lib/amplify";
import { authError } from "@/lib/errors";
import { useSession } from "@/lib/session";

type Mode = "login" | "forgot" | "reset";

function LoginInner() {
  useAuthRedirect();
  const { signIn, forgotPassword, confirmNewPassword } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = useNextPath();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>(params.get("confirmed") ? "Email confirmed. Log in to continue." : undefined);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }

  const login = () =>
    run(async () => {
      const step = await signIn(email, password);
      // Account exists but the email was never confirmed: a fresh code was sent.
      if (step === "confirm-code") router.push(`/signup?confirm=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
    });

  const sendReset = () =>
    run(async () => {
      await forgotPassword(email);
      setNotice(`We sent a code to ${email.trim()}.`);
      setMode("reset");
    });

  const reset = () =>
    run(async () => {
      await confirmNewPassword(email, code, password);
      setNotice("Password changed. Log in with your new password.");
      setPassword("");
      setCode("");
      setMode("login");
    });

  if (!isAuthConfigured) {
    return (
      <AuthShell title="Sign-in is on its way." lede="Accounts aren't switched on for this site yet. Check back soon.">
        <Link href="/" className="font-semibold underline underline-offset-4">
          ← Back home
        </Link>
      </AuthShell>
    );
  }

  const titles: Record<Mode, string> = { login: "Welcome back.", forgot: "Reset your password.", reset: "Choose a new password." };

  return (
    <AuthShell
      title={titles[mode]}
      lede={
        mode === "login" ? (
          <>
            New to radius?{" "}
            <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline underline-offset-4">
              Create an account
            </Link>
          </>
        ) : undefined
      }
    >
      {notice && <p className="mb-6 rounded-card border-2 border-ink bg-mint px-4 py-3 text-[15px] font-medium">{notice}</p>}

      {mode === "login" && (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      )}

      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void (mode === "login" ? login() : mode === "forgot" ? sendReset() : reset());
        }}
      >
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === "reset"} />
        {mode === "reset" && <Input label="Code from the email" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} />}
        {mode !== "forgot" && (
          <Input
            label={mode === "reset" ? "New password" : "Password"}
            type="password"
            autoComplete={mode === "reset" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={mode === "reset" ? "At least 8 characters, with upper and lower case, a number and a symbol." : undefined}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" variant="pop" busy={busy} className="w-full">
          {mode === "login" ? "Log in →" : mode === "forgot" ? "Send me a code →" : "Save new password →"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        {mode === "login" ? (
          <button type="button" onClick={() => (setMode("forgot"), setError(undefined), setNotice(undefined))} className="font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
            Forgot your password?
          </button>
        ) : (
          <button type="button" onClick={() => (setMode("login"), setError(undefined))} className="font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
            ← Back to log in
          </button>
        )}
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
