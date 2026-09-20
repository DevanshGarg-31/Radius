"use client";

import type { PublicOpening } from "@/services/api";

/** How many places are left in a role, in words. */
export function spotsLabel(opening: PublicOpening): string {
  const left = Math.max(0, opening.count - opening.taken);
  if (left === 0) return "Filled";
  if (opening.count === 1) return "1 place";
  return `${left} of ${opening.count} left`;
}

/**
 * The roles an idea is looking for. `onApply` turns each open role into
 * something a visitor can act on.
 */
export function OpeningList({ openings, onApply, appliedTo }: { openings: PublicOpening[]; onApply?: (opening: PublicOpening) => void; appliedTo?: string }) {
  if (!openings.length) return null;

  return (
    <ul className="space-y-3">
      {openings.map((opening) => {
        const filled = opening.taken >= opening.count;
        const applied = appliedTo === opening.openingId;
        return (
          <li key={opening.openingId} className={`rounded-card border-2 border-ink bg-surface p-4 ${filled ? "opacity-60" : "shadow-brutal-sm"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{opening.role}</p>
              <span className={`rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${filled ? "bg-sunken text-muted" : "bg-mint"}`}>{spotsLabel(opening)}</span>
            </div>
            {opening.skills.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {opening.skills.map((skill) => (
                  <li key={skill} className="rounded-btn border-2 border-ink bg-canvas px-2 py-0.5 text-[13px] font-medium">
                    {skill}
                  </li>
                ))}
              </ul>
            )}
            {onApply && !filled && (
              <button
                type="button"
                onClick={() => onApply(opening)}
                disabled={applied}
                className="mt-3 rounded-btn border-2 border-ink bg-mustard px-3 py-1.5 font-mono text-[12px] font-bold uppercase shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:translate-y-0 disabled:bg-sunken disabled:text-muted disabled:shadow-none"
              >
                {applied ? "Applied ✓" : "Apply for this →"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
