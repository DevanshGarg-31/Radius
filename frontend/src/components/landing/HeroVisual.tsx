"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HeroGraph } from "@/components/network/HeroGraph";

/** The dotLottie player draws on a canvas with WebAssembly, so it only ever runs in the browser. */
const DotLottieReact = dynamic(() => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact), { ssr: false });

/** Where the landing animation lives: drop hero.json or hero.lottie into public/lottie/. */
const LOTTIE_CANDIDATES = ["/lottie/hero.json", "/lottie/hero.lottie"];

type LottieState = { status: "loading" } | { status: "ready"; src: string } | { status: "missing" };

/** Finds the first animation file that exists, without downloading it twice. */
function useLottieSource(candidates: readonly string[]): LottieState {
  const [state, setState] = useState<LottieState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    (async () => {
      for (const url of candidates) {
        const res = await fetch(url, { method: "HEAD" }).catch(() => null);
        if (res?.ok) {
          if (active) setState({ status: "ready", src: url });
          return;
        }
      }
      if (active) setState({ status: "missing" });
    })();
    return () => {
      active = false;
    };
  }, [candidates]);
  return state;
}

interface StickerProps {
  children: React.ReactNode;
  className: string;
  delay: number;
  rotate: number;
}

/** A skill "sticker" that pops on, then drifts gently. */
function Sticker({ children, className, delay, rotate }: StickerProps) {
  return (
    <motion.div
      className={`absolute z-20 ${className}`}
      initial={{ opacity: 0, scale: 0.4, rotate: rotate - 12 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
        className="rounded-btn border-2 border-ink px-3 py-1.5 font-mono text-[13px] font-bold shadow-brutal-sm"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * The right side of the hero: a retro app window holding the Lottie animation
 * (or the collaboration graph until one is added), with skill stickers around it.
 */
export function HeroVisual() {
  const lottie = useLottieSource(LOTTIE_CANDIDATES);
  const reduced = useReducedMotion();
  // A file that exists but fails to play (corrupt, wrong format) falls back to the graph too.
  const [playerFailed, setPlayerFailed] = useState(false);
  const showAnimation = lottie.status === "ready" && !playerFailed;

  return (
    <div className="relative mx-auto w-full max-w-[560px] px-3 pb-10 pt-6 sm:px-6">
      <motion.div
        className="relative z-10 overflow-hidden rounded-panel border-[2.5px] border-ink bg-surface shadow-brutal-lg"
        initial={{ opacity: 0, y: 40, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.25 }}
      >
        <div className="flex items-center gap-2 border-b-[2.5px] border-ink bg-lilac px-4 py-2.5">
          <span className="size-3 rounded-full border-2 border-ink bg-tomato" />
          <span className="size-3 rounded-full border-2 border-ink bg-mustard" />
          <span className="size-3 rounded-full border-2 border-ink bg-teal" />
          <span className="ml-3 min-w-0 truncate font-mono text-xs font-bold">radius.app / finding-your-people</span>
        </div>
        <div className="dot-grid relative aspect-video bg-[#eef8ef]">
          {showAnimation ? (
            <DotLottieReact
              src={lottie.src}
              autoplay={!reduced}
              loop
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label="People connecting around an idea"
              dotLottieRefCallback={(player) => player?.addEventListener("loadError", () => setPlayerFailed(true))}
            />
          ) : lottie.status === "missing" || playerFailed ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <HeroGraph />
            </div>
          ) : null}
        </div>
      </motion.div>

      <Sticker className="-left-1 top-16 [&>div]:bg-mint sm:-left-4" delay={0.9} rotate={-6}>
        Python ✓
      </Sticker>
      <Sticker className="-right-1 top-24 [&>div]:bg-sky sm:-right-5" delay={1.05} rotate={5}>
        React ✓
      </Sticker>
      <Sticker className="bottom-24 -right-2 [&>div]:border-dashed [&>div]:bg-mustard sm:-right-6" delay={1.2} rotate={-4}>
        Computer Vision?
      </Sticker>

      <motion.div
        className="absolute bottom-0 left-0 z-20 flex items-center gap-3 rounded-card border-2 border-ink bg-surface py-2.5 pl-2.5 pr-4 shadow-brutal sm:-left-6"
        initial={{ opacity: 0, x: -30, rotate: -3 }}
        animate={{ opacity: 1, x: 0, rotate: -3 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 1.4 }}
      >
        <span className="flex size-10 items-center justify-center rounded-full border-2 border-ink bg-pink font-display text-sm font-extrabold">RS</span>
        <span>
          <span className="block text-sm font-bold leading-tight">Rahul fits your idea</span>
          <span className="block font-mono text-[11px] text-muted">ML · React · loves football</span>
        </span>
      </motion.div>
    </div>
  );
}
