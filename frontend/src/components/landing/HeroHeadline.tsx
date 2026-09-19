"use client";

import { motion } from "motion/react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

function Word({ children, index }: { children: string; index: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.15 + index * 0.07 }}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * "You have the idea. Now find the people." Words rise in one by one, then a
 * mustard marker sweeps behind "people" and a scribble underlines it.
 */
export function HeroHeadline() {
  const first = ["You", "have", "the", "idea."];
  const second = ["Now", "find", "the"];
  return (
    <h1 className="text-[46px] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[64px] xl:text-[70px]">
      <span className="sr-only">You have the idea. Now find the people.</span>
      <span aria-hidden="true">
        {first.map((w, i) => (
          <span key={w + i}>
            <Word index={i}>{w}</Word>{" "}
          </span>
        ))}
        <br />
        {second.map((w, i) => (
          <span key={w + i}>
            <Word index={first.length + i}>{w}</Word>{" "}
          </span>
        ))}
        <span className="relative isolate inline-block">
          <motion.span
            className="absolute inset-x-[-0.12em] bottom-[0.06em] top-[0.18em] -z-10 origin-left rounded-[6px] border-2 border-ink bg-mustard"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.85 }}
          />
          <Word index={first.length + second.length}>people.</Word>
          <svg className="absolute -bottom-[0.18em] left-0 h-[0.28em] w-full overflow-visible" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
            <motion.path
              d="M3 12 C 40 3, 70 18, 105 9 S 170 4, 197 12"
              fill="none"
              stroke="var(--color-tomato)"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: "easeInOut", delay: 1.25 }}
            />
          </svg>
        </span>
      </span>
    </h1>
  );
}
