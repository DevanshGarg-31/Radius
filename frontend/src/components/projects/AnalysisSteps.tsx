"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Analysis } from "@/services/api";

interface AnalysisStepsProps {
  /** The real analysis once the API has answered; undefined while waiting. */
  analysis?: Analysis;
  /** Called once every step has been revealed. */
  onRevealed?: () => void;
  heading?: string;
}

const STEPS: Array<{ label: string; value: (a: Analysis) => string }> = [
  { label: "Project type", value: (a) => a.category },
  { label: "Skills needed", value: (a) => a.skills.join(", ") },
  { label: "Roles needed", value: (a) => a.roles.join(", ") },
  { label: "Team requirements", value: (a) => a.requirements.join("; ") },
];

/**
 * "Understanding your project". Steps only complete when the real response
 * has arrived; they are then revealed one by one so the result can be read.
 */
export function AnalysisSteps({ analysis, onRevealed, heading = "Understanding your project" }: AnalysisStepsProps) {
  const reduced = usePrefersReducedMotion();
  const [stepsShown, setStepsShown] = useState(0);
  const revealed = analysis && reduced ? STEPS.length : stepsShown;

  useEffect(() => {
    if (!analysis || reduced) return;
    const timers = STEPS.map((_, i) => setTimeout(() => setStepsShown(i + 1), 280 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [analysis, reduced]);

  useEffect(() => {
    if (revealed !== STEPS.length || !onRevealed) return;
    const t = setTimeout(onRevealed, reduced ? 0 : 500);
    return () => clearTimeout(t);
  }, [revealed, onRevealed, reduced]);

  return (
    <section aria-live="polite" className="animate-rise rounded-panel border-[2.5px] border-ink bg-surface p-6 shadow-brutal-lg sm:p-8">
      <h2 className="text-3xl font-extrabold">{heading}</h2>
      <ol className="mt-6 space-y-4">
        {STEPS.map((step, i) => {
          const done = analysis && revealed > i;
          const active = !done && (analysis ? revealed === i : i === 0);
          return (
            <li key={step.label} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex size-6 items-center justify-center" aria-hidden="true">
                {done ? (
                  <span className="flex size-6 animate-pop items-center justify-center rounded-full border-2 border-ink bg-mint text-xs font-bold">✓</span>
                ) : (
                  <span className={`size-3.5 rounded-full border-2 border-ink ${active ? "dot-pending bg-mustard" : "bg-surface"}`} />
                )}
              </span>
              <div>
                <p className={`text-[15px] font-medium ${done || active ? "text-ink" : "text-muted"}`}>
                  {step.label}
                  <span className="sr-only">{done ? ": done" : ": in progress"}</span>
                </p>
                {done && <p className="mt-0.5 animate-fade text-[15px] text-muted">{step.value(analysis)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
