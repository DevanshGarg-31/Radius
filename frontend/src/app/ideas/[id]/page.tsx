"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ApplyModal } from "@/components/ideas/ApplyModal";
import { OpeningList } from "@/components/ideas/OpeningList";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/lib/session";
import { api, type PublicOpening } from "@/services/api";

export default function IdeaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useSession();
  const idea = useAsync(() => api.getIdea(id), [id]);
  const [applyingTo, setApplyingTo] = useState<PublicOpening | null>(null);
  const [appliedTo, setAppliedTo] = useState<string>();

  const signedIn = state.status === "ready";
  const isOwner = signedIn && idea.data?.idea.owner?.userId === state.user.userId;
  const onTeam = signedIn && Boolean(idea.data?.team.some((m) => m.userId === state.user.userId));

  function onApply(opening: PublicOpening) {
    // Visitors sign in first and come straight back here.
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(`/ideas/${id}`)}`);
    setApplyingTo(opening);
  }

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageContainer className="pb-20 pt-10">
          <Link href="/ideas" className="font-mono text-[12px] font-bold uppercase text-muted underline underline-offset-4 hover:text-ink">
            ← All ideas
          </Link>

          {idea.status === "loading" && <LoadingState message="Opening the idea…" />}
          {idea.status === "error" && <ErrorState title="We couldn't find that idea." error={idea.error} onRetry={idea.reload} />}

          {idea.status === "success" && (
            <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_22rem]">
              <div>
                {idea.data.idea.category && <p className="eyebrow mb-3">{idea.data.idea.category}</p>}
                <h1 className="text-[36px] font-extrabold leading-[1.05] sm:text-[48px]">{idea.data.idea.title}</h1>
                <p className="mt-5 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed">{idea.data.idea.description}</p>

                {idea.data.idea.requiredSkills.length > 0 && (
                  <>
                    <h2 className="mt-10 font-mono text-[12px] font-bold uppercase text-muted">What it takes</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {idea.data.idea.requiredSkills.map((skill, i) => (
                        <li key={skill} className={`rounded-btn border-2 border-ink px-3 py-1 font-display font-bold shadow-brutal-sm ${["bg-mustard", "bg-mint", "bg-sky", "bg-pink", "bg-lilac"][i % 5]}`}>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h2 className="mt-12 font-display text-2xl font-extrabold">Who they&apos;re looking for</h2>
                <p className="mb-5 mt-1 text-[15px] text-muted">
                  {isOwner ? "This is your idea — you'll hear about every application." : onTeam ? "You're already on this team." : "Pick the role that fits you and say hello."}
                </p>
                <div className="max-w-xl">
                  <OpeningList openings={idea.data.idea.openings} onApply={isOwner || onTeam ? undefined : onApply} appliedTo={appliedTo} />
                </div>
              </div>

              <aside className="space-y-6 lg:pt-16">
                <div className="rounded-panel border-[2.5px] border-ink bg-surface p-5 shadow-brutal">
                  <h2 className="font-mono text-[12px] font-bold uppercase text-muted">The team so far</h2>
                  <ul className="mt-4 space-y-3">
                    {idea.data.team.map((member) => (
                      <li key={member.userId} className="flex items-center gap-3">
                        <Avatar name={member.name} seed={member.userId} src={member.avatarUrl || undefined} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{member.name}</p>
                          <p className="truncate text-[13px] text-muted">{member.role}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-line pt-4 text-[15px]">
                    <strong className="font-semibold">{idea.data.idea.spotsLeft}</strong> {idea.data.idea.spotsLeft === 1 ? "place" : "places"} still open
                    {idea.data.idea.remote ? " · Remote" : idea.data.idea.location ? ` · ${idea.data.idea.location}` : ""}
                  </p>
                </div>

                {!signedIn && (
                  <div className="rounded-panel border-[2.5px] border-ink bg-mustard p-5 shadow-brutal">
                    <p className="font-display text-lg font-extrabold">Want in?</p>
                    <p className="mt-1 text-[15px]">Create an account to apply for a role, or publish an idea of your own.</p>
                    <ButtonLink href={`/signup?next=${encodeURIComponent(`/ideas/${id}`)}`} size="sm" className="mt-4">
                      Join radius →
                    </ButtonLink>
                  </div>
                )}
              </aside>
            </div>
          )}
        </PageContainer>
      </main>

      {applyingTo && (
        <ApplyModal
          projectId={id}
          idea={idea.data!.idea}
          opening={applyingTo}
          onClose={() => setApplyingTo(null)}
          onApplied={(openingId) => {
            setAppliedTo(openingId);
            setApplyingTo(null);
          }}
        />
      )}
    </>
  );
}
