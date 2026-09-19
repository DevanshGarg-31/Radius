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

/** Cognito's default password policy, checked as you type. */
const RULES: Array<[string, (p: string) => boolean]> = [
  ["8+ characters", (p) => p.length >= 8],
  ["Upper case", (p) => /[A-Z]/.test(p)],
  ["Lower case", (p) => /[a-z]/.test(p)],
  ["A number", (p) => /\d/.test(p)],
  ["A symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];

function SignupInner() {
  useAuthRedirect();
  const { signUp, confirmCode, resendCode } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = useNextPath();
  const confirmEmail = params.get("confirm");
  const [step, setStep] = useState<"form" | "code">(confirmEmail ? "code" : "form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(confirmEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const passwordOk = RULES.every(([, test]) => test(password));

  async function create() {
    setError(undefined);
    if (!name.trim()) return setError("Tell us your name.");
    if (!passwordOk) return setError("Your password needs to meet all the rules below.");
    setBusy(true);
    try {
      const outcome = await signUp({ email, password, name });
      if (outcome === "confirm-code") setStep("code");
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(undefined);
    setBusy(true);
    try {
      const outcome = await confirmCode(email, code);
      // Signed in automatically → useAuthRedirect takes them to /welcome.
      // If this tab didn't start the sign-up, they log in with their password.
      if (outcome === "confirmed") router.replace(`/login?confirmed=1&email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(undefined);
    try {
      await resendCode(email);
      setNotice(`A new code is on its way to ${email.trim()}.`);
    } catch (err) {
      setError(authError(err));
    }
  }

  if (!isAuthConfigured) {
    return (
      <AuthShell title="Sign-up is on its way." lede="Accounts aren't switched on for this site yet. Check back soon.">
        <Link href="/" className="font-semibold underline underline-offset-4">
          ← Back home
        </Link>
      </AuthShell>
    );
  }

  if (step === "code") {
    return (
      <AuthShell title="Check your email." lede={<>We sent a 6-digit code to <strong>{email}</strong>. Enter it to confirm it&apos;s you.</>}>
        {notice && <p className="mb-6 rounded-card border-2 border-ink bg-mint px-4 py-3 text-[15px] font-medium">{notice}</p>}
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <Input label="Code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} maxLength={10} className="font-mono text-2xl tracking-[0.4em]" />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" variant="pop" busy={busy} disabled={code.length < 6} className="w-full">
            Confirm and continue →
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Didn&apos;t get it? Check spam, or{" "}
          <button type="button" onClick={resend} className="font-semibold text-ink underline underline-offset-4">
            send a new code
          </button>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Join radius."
      lede={
        <>
          Already have an account?{" "}
          <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton next={next} label="Sign up with Google" />
      <OrDivider />
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Input label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Password rules">
            {RULES.map(([rule, test]) => {
              const ok = test(password);
              return (
                <li key={rule} className={`rounded-btn border-2 px-2 py-0.5 font-mono text-[11px] font-bold ${ok ? "border-ink bg-mint" : "border-ink/25 text-muted"}`}>
                  {ok ? "✓ " : ""}
                  {rule}
                </li>
              );
            })}
          </ul>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" variant="pop" busy={busy} className="w-full">
          Create account →
        </Button>
        <p className="text-center text-[13px] text-muted">We&apos;ll email you a code to confirm it&apos;s really you.</p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
