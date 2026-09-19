import { CollaborationGraph } from "@/components/network/CollaborationGraph";
import { hubLayout } from "@/components/network/layouts";
import { ButtonLink } from "@/components/ui/Button";
import { joinNatural, numberWord } from "@/lib/format";
import type { TeamGaps } from "@/services/api";

/**
 * The team-gap view: every required capability hangs off the project;
 * covered ones are checked, missing ones are empty dashed nodes.
 */
export function TeamGap({ gaps, projectId, title }: { gaps: TeamGaps; projectId: string; title: string }) {
  const items = [
    ...gaps.coveredSkills.map((label) => ({ label, kind: "skill" as const, checked: true })),
    ...gaps.missingSkills.map((label) => ({ label, kind: "missing" as const })),
  ];
  const graph = hubLayout({ id: "project", label: title, kind: "project" }, items, { width: 440, height: 340, radius: 124, startDeg: -150 });
  const missing = gaps.missingSkills.length;
  const focus = gaps.missingSkills[0];

  return (
    <section aria-labelledby="gap-heading" className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="dot-grid rounded-panel border-[2.5px] border-ink bg-surface p-3 shadow-brutal">
        <CollaborationGraph {...graph} width={440} height={340} title={`Covered: ${gaps.coveredSkills.join(", ") || "none"}. Missing: ${gaps.missingSkills.join(", ") || "none"}.`} />
      </div>
      <div className="animate-rise [animation-delay:600ms]">
        {missing === 0 ? (
          <>
            <p className="eyebrow mb-3">Team check</p>
            <h2 id="gap-heading" className="text-3xl font-extrabold">
              Every capability is covered.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{gaps.recommendation}</p>
          </>
        ) : (
          <>
            <p className="eyebrow mb-3">{missing === 1 ? "One gap remains" : `${numberWord(missing)} gaps remain`}</p>
            <h2 id="gap-heading" className="inline-block -rotate-1 rounded-btn border-[2.5px] border-ink bg-mustard px-3 py-1 text-[34px] font-extrabold leading-tight shadow-brutal">
              {joinNatural(gaps.missingSkills)}
            </h2>
            {gaps.missingRoles.length > 0 && (
              <p className="mt-3 text-[17px]">
                Look for a <strong>{joinNatural(gaps.missingRoles)}</strong>.
              </p>
            )}
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-soft">{gaps.recommendation}</p>
            {focus && (
              <ButtonLink href={`/projects/${projectId}/people?focus=${encodeURIComponent(focus)}`} size="lg" className="mt-8">
                Find them →
              </ButtonLink>
            )}
          </>
        )}
        {gaps.coveredSkills.length > 0 && <p className="mt-8 text-sm text-muted">Already covered: {gaps.coveredSkills.join(" · ")}</p>}
      </div>
    </section>
  );
}
