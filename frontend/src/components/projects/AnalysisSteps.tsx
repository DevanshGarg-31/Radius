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
    <section aria-live="polite" className="animate-rise">
      <h2 className="text-2xl font-bold">{heading}</h2>
      <ol className="mt-6 space-y-4">
        {STEPS.map((step, i) => {
          const done = analysis && revealed > i;
          const active = !done && (analysis ? revealed === i : i === 0);
          return (
            <li key={step.label} className="grid grid-cols-[24px_1fr] gap-3">
              <span className="mt-0.5 flex size-5 items-center justify-center" aria-hidden="true">
                {done ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" className="animate-pop text-success">
                    <circle cx="9" cy="9" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m5.5 9.2 2.4 2.4 4.6-4.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className={`size-2 rounded-full ${active ? "dot-pending bg-ink" : "bg-line-strong"}`} />
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
