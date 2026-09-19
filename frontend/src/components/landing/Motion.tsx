"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Honours the visitor's reduced-motion setting for every animation inside. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  /** How far the element travels up as it appears. */
  distance?: number;
}

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ delay = 0, distance = 28, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A card that tilts slightly and lifts on hover, like a sticker being picked up. */
export function Tilt({ rotate = 0, children, className = "", ...rest }: HTMLMotionProps<"div"> & { rotate?: number }) {
  return (
    <motion.div
      initial={{ rotate }}
      whileHover={{ rotate: 0, y: -6, x: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
