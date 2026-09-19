import type { Match } from "@/services/api";

const FACTORS: Array<{ key: keyof Match["breakdown"]; label: string; explain: string; fill: string }> = [
  { key: "skills", label: "Skills", explain: "share of the skills your team still needs", fill: "bg-tomato" },
  { key: "interests", label: "Interests", explain: "overlap with what the project is about", fill: "bg-mustard" },
  { key: "availability", label: "Availability", explain: "time they can give", fill: "bg-teal" },
  { key: "experience", label: "Experience", explain: "level of experience", fill: "bg-lilac" },
  { key: "location", label: "Location", explain: "remote, or the same city", fill: "bg-sky" },
];

/** How the deterministic score is built: each factor's value and its weight. */
export function ScoreFactors({ breakdown, weights }: { breakdown: Match["breakdown"]; weights?: Record<string, number> }) {
  return (
    <dl className="space-y-3">
      {FACTORS.map(({ key, label, explain, fill }) => {
        const value = breakdown[key];
        const weight = weights?.[key];
        return (
          <div key={key} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
            <dt className="font-mono text-xs font-bold uppercase">{label}</dt>
            <dd className="m-0">
              <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-surface" title={explain}>
                <div className={`h-full ${value > 0 && value < 1 ? "border-r-2 border-ink" : ""} ${fill} transition-[width] duration-700 ease-out`} style={{ width: `${Math.round(value * 100)}%` }} />
              </div>
              <span className="sr-only">
                {Math.round(value * 100)}% ({explain})
              </span>
            </dd>
            <dd className="m-0 w-16 text-right font-mono text-xs tabular-nums text-muted">{weight !== undefined ? `× ${Math.round(weight * 100)}%` : `${Math.round(value * 100)}%`}</dd>
          </div>
        );
      })}
    </dl>
  );
}
