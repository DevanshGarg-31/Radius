"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { humanError } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { api, type UserSummary } from "@/services/api";

const STORY: Array<{ username: string; part: string }> = [
  { username: "aarav", part: "Has an idea and needs a team" },
  { username: "rahuldev", part: "ML developer who loves football" },
  { username: "priyacv", part: "Computer vision engineer" },
];

function PersonButton({ person, caption, onPick, busy }: { person: UserSummary; caption: string; onPick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={busy}
      className="group flex w-full items-center gap-4 rounded-card border border-transparent p-3 text-left transition-colors hover:border-line hover:bg-surface disabled:opacity-60"
    >
      <Avatar name={person.name} seed={person.userId} src={person.avatarUrl || undefined} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{person.name}</span>
        <span className="block truncate text-[15px] text-muted">{caption}</span>
      </span>
      <span className="text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function LoginInner() {
  const { signIn } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const people = useAsync(() => api.listUsers().then((r) => r.users), []);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  async function pick(userId: string) {
    setBusy(userId);
    setError(undefined);
    try {
      await signIn({ userId });
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(humanError(err, "We couldn't sign you in. Try again."));
      setBusy(undefined);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-24 sm:px-6">
      <div className="py-8">
        <Logo />
      </div>
      <header className="animate-rise pb-10 pt-8">
        <h1 className="text-[36px] font-extrabold leading-tight sm:text-[44px]">Who&apos;s joining today?</h1>
        <p className="mt-3 text-[17px] text-muted">This is a demo network. Pick a person to continue as them; you can switch at any time from the menu.</p>
      </header>

      {error && <p role="alert" className="mb-6 text-danger">{error}</p>}

      {people.status === "loading" && <LoadingState message="Gathering the network…" />}
      {people.status === "error" && <ErrorState title="We couldn't load the network." error={people.error} onRetry={people.reload} />}
      {people.status === "success" && (
        <div className="space-y-12">
          <section aria-labelledby="story">
            <h2 id="story" className="eyebrow mb-3">
              The demo story
            </h2>
            <div className="divide-y divide-line rounded-panel border border-line bg-surface/60 px-2 py-1">
              {STORY.map(({ username, part }) => {
                const person = people.data.find((p) => p.username === username);
                return person ? <PersonButton key={username} person={person} caption={part} onPick={() => pick(person.userId)} busy={Boolean(busy)} /> : null;
              })}
            </div>
          </section>
          <section aria-labelledby="everyone">
            <h2 id="everyone" className="eyebrow mb-3">
              Everyone else in the network
            </h2>
            <div className="grid gap-1 sm:grid-cols-2">
              {people.data
                .filter((p) => !STORY.some((s) => s.username === p.username))
                .map((p) => (
                  <PersonButton key={p.userId} person={p} caption={p.skills.slice(0, 3).join(" · ")} onPick={() => pick(p.userId)} busy={Boolean(busy)} />
                ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
