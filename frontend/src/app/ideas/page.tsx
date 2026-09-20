"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/lib/session";
import { api } from "@/services/api";

/** A dropdown of values taken from what's actually on the board. */
function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[11px] font-bold uppercase text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-btn border-2 border-ink bg-surface px-2 text-sm font-medium shadow-brutal-sm focus:outline-2 focus:outline-accent"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Board() {
  const { state } = useSession();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [role, setRole] = useState(params.get("role") ?? "");
  const [category, setCategory] = useState("");
  const board = useAsync(() => api.listIdeas({ q: q.trim() || undefined, role: role || undefined, category: category || undefined }), [q.trim(), role, category]);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageContainer className="pb-20 pt-12">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">The idea board</p>
            <h1 className="text-[40px] font-extrabold leading-[1.02] sm:text-[56px]">Ideas looking for people.</h1>
            <p className="mt-5 text-[17px] text-muted">
              Every idea here says which roles it needs. Find one that fits and apply — or{" "}
              <Link href={state.status === "ready" ? "/projects/new" : "/signup?next=/projects/new"} className="font-semibold text-ink underline underline-offset-4">
                publish your own
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-y-2 border-line py-4">
            <label className="flex min-w-[15rem] flex-1 items-center gap-2">
              <span className="sr-only">Search ideas</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ideas, skills, roles…"
                className="h-10 w-full rounded-btn border-2 border-ink bg-surface px-3 text-[15px] shadow-brutal-sm placeholder:text-muted/70 focus:outline-2 focus:outline-accent"
              />
            </label>
            <Filter label="Role" value={role} options={board.data?.roles ?? []} onChange={setRole} />
            <Filter label="Field" value={category} options={board.data?.categories ?? []} onChange={setCategory} />
          </div>

          {board.status === "loading" && <LoadingState message="Gathering ideas…" />}
          {board.status === "error" && <ErrorState title="We couldn't load the board." error={board.error} onRetry={board.reload} />}
          {board.status === "success" &&
            (board.data.ideas.length === 0 ? (
              <EmptyState
                title="Nothing matches that yet."
                body="Try a different role or search, or be the first to publish an idea here."
                action={
                  <ButtonLink href={state.status === "ready" ? "/projects/new" : "/signup?next=/projects/new"} variant="pop">
                    Publish an idea →
                  </ButtonLink>
                }
              />
            ) : (
              <>
                <p className="mt-8 font-mono text-[12px] font-bold uppercase text-muted">
                  {board.data.ideas.length} {board.data.ideas.length === 1 ? "idea" : "ideas"}
                </p>
                <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {board.data.ideas.map((idea, i) => (
                    <li key={idea.projectId}>
                      <IdeaCard idea={idea} accent={i} />
                    </li>
                  ))}
                </ul>
              </>
            ))}
        </PageContainer>
      </main>
    </>
  );
}

export default function IdeasPage() {
  return (
    <Suspense fallback={null}>
      <Board />
    </Suspense>
  );
}
