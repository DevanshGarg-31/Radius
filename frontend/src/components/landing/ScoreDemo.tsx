"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * An illustrated match card for the landing page. The numbers are what the real
 * scoring engine gives Rahul for the demo project (see backend demo-story test);
 * the app itself always shows scores from the API.
 */
const EXAMPLE = {
  name: "Rahul Sharma",
  initials: "RS",
  score: 83,
  factors: [
    { label: "Skills", value: 0.67, weight: 50, colour: "bg-tomato" },
    { label: "Interests", value: 1, weight: 20, colour: "bg-mustard" },
    { label: "Availability", value: 1, weight: 15, colour: "bg-teal" },
    { label: "Experience", value: 1, weight: 10, colour: "bg-lilac" },
    { label: "Location", value: 1, weight: 5, colour: "bg-sky" },
  ],
};

export function ScoreDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      const frame = requestAnimationFrame(() => setShown(EXAMPLE.score));
      return () => cancelAnimationFrame(frame);
    }
    const controls = animate(0, EXAMPLE.score, { duration: 1.2, ease: [0.2, 0.7, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduced]);

  const r = 46;
  const circumference = 2 * Math.PI * r;

  return (
    <div ref={ref} className="relative rounded-panel border-[2.5px] border-ink bg-surface p-6 shadow-brutal-lg sm:p-8">
      <span className="absolute -top-4 right-6 rotate-3 rounded-btn border-2 border-ink bg-pink px-3 py-1 font-mono text-xs font-bold shadow-brutal-sm">EXAMPLE</span>
      <div className="flex items-center gap-5">
        <div className="relative size-[116px] shrink-0" role="img" aria-label={`Match score ${EXAMPLE.score} percent`}>
          <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-sunken)" strokeWidth="12" />
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-ink)" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - shown / 100)} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[34px] font-extrabold tabular-nums" aria-hidden="true">
            {shown}
            <span className="mt-2 text-sm">%</span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-ink bg-mint font-display text-sm font-extrabold">{EXAMPLE.initials}</span>
            <p className="font-display text-xl font-extrabold">{EXAMPLE.name}</p>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">Brings machine learning and React, two skills your team is missing, and shares your love of football.</p>
        </div>
      </div>

      <dl className="mt-7 space-y-3">
        {EXAMPLE.factors.map((f, i) => (
          <div key={f.label} className="grid grid-cols-[92px_1fr_44px] items-center gap-3">
            <dt className="font-mono text-xs font-bold uppercase">{f.label}</dt>
            <dd className="m-0 h-4 overflow-hidden rounded-full border-2 border-ink bg-canvas">
              <motion.div
                className={`h-full ${f.colour} border-r-2 border-ink`}
                initial={{ width: 0 }}
                animate={inView ? { width: `${f.value * 100}%` } : undefined}
                transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 + i * 0.1 }}
              />
            </dd>
            <dd className="m-0 text-right font-mono text-xs text-muted">×{f.weight}%</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
