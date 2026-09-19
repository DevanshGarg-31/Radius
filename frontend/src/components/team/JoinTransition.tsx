"use client";

import { useEffect, useState } from "react";
import { avatarTone } from "@/components/ui/Avatar";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { initials } from "@/lib/format";

interface Person {
  userId: string;
  name: string;
}

/**
 * The new member's node travels into the team and connects to the project.
 * Deliberately small: one movement, one line drawing, no celebration.
 */
export function JoinTransition({ projectTitle, members, joiner }: { projectTitle: string; members: Person[]; joiner: Person }) {
  const reduced = usePrefersReducedMotion();
  const [joined, setJoined] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setJoined(true), 350);
    return () => clearTimeout(t);
  }, [reduced]);

  const W = 520;
  const H = 220;
  const hub = { x: 300, y: 110 };
  const others = members.filter((m) => m.userId !== joiner.userId);
  const seats = others.map((m, i) => {
    const angle = (-100 + (i * 200) / Math.max(others.length, 1)) * (Math.PI / 180);
    return { ...m, x: hub.x + 90 * Math.cos(angle), y: hub.y + 80 * Math.sin(angle) };
  });
  const target = { x: hub.x - 110, y: hub.y };
  const start = { x: 40, y: hub.y };
  const pos = joined ? target : start;
  const tone = avatarTone(joiner.userId);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[520px]" role="img" aria-label={`${joiner.name} joins ${projectTitle}`}>
      {seats.map((s) => (
        <line key={`e-${s.userId}`} x1={hub.x} y1={hub.y} x2={s.x} y2={s.y} stroke="rgba(18,18,18,0.35)" strokeWidth={1.5} />
      ))}
      <line
        x1={hub.x}
        y1={hub.y}
        x2={target.x}
        y2={target.y}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeDasharray={110}
        strokeDashoffset={joined ? 0 : 110}
        style={{ transition: "stroke-dashoffset 600ms ease-out 700ms" }}
      />
      <rect x={hub.x - 11} y={hub.y - 11} width={22} height={22} rx={5} fill="var(--color-ink)" />
      <text x={hub.x} y={hub.y + 30} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="var(--font-display)" fill="var(--color-ink)">
        {projectTitle}
      </text>
      {seats.map((s) => {
        const t = avatarTone(s.userId);
        return (
          <g key={s.userId}>
            <circle cx={s.x} cy={s.y} r={16} fill={t.bg} stroke="var(--color-ink)" strokeWidth={2} />
            <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.fg} fontFamily="var(--font-display)">
              {initials(s.name)}
            </text>
          </g>
        );
      })}
      <g style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 700ms cubic-bezier(0.3, 0.7, 0.2, 1)" }}>
        <circle r={19} fill={tone.bg} stroke="var(--color-ink)" strokeWidth={2.5} />
        <text y={4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={tone.fg} fontFamily="var(--font-display)">
          {initials(joiner.name)}
        </text>
      </g>
    </svg>
  );
}
