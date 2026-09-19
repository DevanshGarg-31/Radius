"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { capitalise, joinNatural } from "@/lib/format";
import type { Match, UserSummary } from "@/services/api";
import { MatchScore } from "./MatchScore";
import { SkillList } from "./SkillList";

interface MatchRowProps {
  match: Match;
  focus?: string;
  onExplain: () => void;
  onInvite: () => void;
  index: number;
}

function InviteStatus({ status, onInvite }: { status: Match["requestStatus"]; onInvite: () => void }) {
  if (status === "pending") return <span className="text-sm font-medium text-success-ink">Invitation sent ✓</span>;
  if (status === "accepted") return <span className="text-sm font-medium text-success-ink">On the team ✓</span>;
  return (
    <Button size="sm" onClick={onInvite}>
      {status === "rejected" ? "Invite again →" : "Invite →"}
    </Button>
  );
}

/** One candidate in the match list: a person first, then why they fit. */
export function MatchRow({ match, focus, onExplain, onInvite, index }: MatchRowProps) {
  const coversFocus = focus ? match.gapSkills.some((s) => s.toLowerCase() === focus.toLowerCase()) || match.matchedSkills.some((s) => s.toLowerCase() === focus.toLowerCase()) : false;
  return (
    <li
      className={`animate-rise border-b border-line px-5 py-6 last:border-b-0 sm:px-7 ${coversFocus ? "relative bg-warm-soft/50 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-warm" : ""}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex gap-4 sm:gap-5">
        <Link href={`/people/${match.userId}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
          <Avatar name={match.name} seed={match.userId} src={match.avatarUrl || undefined} size={48} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold leading-tight">
                <Link href={`/people/${match.userId}`} className="hover:underline">
                  {match.name}
                </Link>
              </h3>
              <p className="mt-0.5 text-[15px] text-muted">
                {match.suggestedRole !== "Collaborator" ? match.suggestedRole : capitalise(match.experienceLevel)}
                {match.location && ` · ${match.location}`}
              </p>
            </div>
            <MatchScore score={match.score} size={54} />
          </div>

          {coversFocus && focus && <p className="mt-3 text-sm font-semibold text-warm-ink">Covers {focus}, the gap in your team</p>}

          <div className="mt-3 space-y-1">
            <SkillList items={match.skills} emphasise={match.matchedSkills} />
            {match.gapSkills.length > 0 && <p className="text-[15px] text-ink">Fills your team&apos;s gap in {joinNatural(match.gapSkills)}</p>}
            {match.matchedInterests.length > 0 && <p className="text-[15px] text-muted">Into {match.matchedInterests.join(" · ")}</p>}
          </div>

          {match.reason && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{match.reason}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" onClick={onExplain} className="text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Why this person?
            </button>
            <InviteStatus status={match.requestStatus} onInvite={onInvite} />
          </div>
        </div>
      </div>
    </li>
  );
}

/** A person in the network directory. */
export function PersonRow({ person }: { person: UserSummary }) {
  return (
    <li>
      <Link href={`/people/${person.userId}`} className="group flex gap-4 rounded-card p-4 transition-colors hover:bg-surface">
        <Avatar name={person.name} seed={person.userId} src={person.avatarUrl || undefined} size={44} />
        <div className="min-w-0">
          <p className="font-semibold group-hover:underline">{person.name}</p>
          <p className="line-clamp-2 text-[15px] text-muted">{person.bio}</p>
          <SkillList items={person.skills} limit={4} className="mt-2 !text-sm" />
        </div>
      </Link>
    </li>
  );
}
