"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { capitalise, firstName } from "@/lib/format";
import type { Match } from "@/services/api";
import { MatchScore } from "./MatchScore";
import { ScoreFactors } from "./ScoreFactors";
import { CheckList } from "./SkillList";

interface MatchDetailProps {
  match: Match | null;
  weights?: Record<string, number>;
  onClose: () => void;
  onInvite: () => void;
}

/** "Why this person?": the facts behind the score, then the explanation. */
export function MatchDetail({ match, weights, onClose, onInvite }: MatchDetailProps) {
  return (
    <Modal
      open={Boolean(match)}
      onClose={onClose}
      placement="side"
      title="Why this person?"
      footer={
        match && (
          <>
            <ButtonLink href={`/people/${match.userId}`} variant="quiet">
              Full profile
            </ButtonLink>
            {match.requestStatus === null || match.requestStatus === "rejected" ? (
              <Button onClick={onInvite}>Invite {firstName(match.name)} →</Button>
            ) : (
              <span className="rounded-btn border-2 border-ink bg-mint px-2.5 py-1 font-mono text-xs font-bold uppercase">{match.requestStatus === "pending" ? "Invitation sent ✓" : "On the team ✓"}</span>
            )}
          </>
        )
      }
    >
      {match && (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Avatar name={match.name} seed={match.userId} src={match.avatarUrl || undefined} size={52} />
            <div>
              <p className="font-display text-2xl font-extrabold leading-tight">{match.name}</p>
              <p className="text-[15px] text-muted">
                {match.suggestedRole !== "Collaborator" ? match.suggestedRole : capitalise(match.experienceLevel)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <MatchScore score={match.score} size={112} />
            <p className="text-[15px] leading-relaxed text-ink-soft">{match.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <CheckList label="Skills" items={match.matchedSkills} note="None of the required skills" />
            <CheckList label="Interests" items={match.matchedInterests} note="No shared interests" />
            <CheckList label="Availability" items={match.availability.map(capitalise)} note="Not listed" />
            <CheckList label="Experience" items={[capitalise(match.experienceLevel)]} />
          </div>

          {match.gapSkills.length > 0 && (
            <p className="rounded-card border-2 border-ink bg-mint px-4 py-3 text-[15px] shadow-brutal-sm">
              Fills a gap in your team: <strong>{match.gapSkills.join(", ")}</strong>
            </p>
          )}

          <section>
            <p className="eyebrow mb-3">How the score is built</p>
            <ScoreFactors breakdown={match.breakdown} weights={weights} />
            <p className="mt-4 text-[13px] leading-relaxed text-muted">The score is calculated from these five factors, so the same profile always gets the same score. The written explanation describes the result; it doesn&apos;t change it.</p>
          </section>
        </div>
      )}
    </Modal>
  );
}
