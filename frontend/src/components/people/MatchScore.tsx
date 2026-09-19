"use client";

import { useCountUp } from "@/hooks/useCountUp";

/**
 * Circular match score. The number always comes from the backend's
 * deterministic scoring; this component only animates it into view.
 */
export function MatchScore({ score, size = 56 }: { score: number; size?: number }) {
  const shown = useCountUp(score);
  const stroke = size >= 96 ? 6 : 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const large = size >= 96;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold tabular-nums" aria-hidden="true">
        <span className={large ? "text-[34px] leading-none" : "text-[17px] leading-none"}>{shown}</span>
        <span className={large ? "mt-2 text-sm text-muted" : "mt-1 text-[10px] text-muted"}>%</span>
      </span>
    </div>
  );
}
