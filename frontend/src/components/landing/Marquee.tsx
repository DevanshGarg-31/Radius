import type { CSSProperties } from "react";

interface MarqueeProps {
  items: readonly string[];
  className?: string;
  /** Seconds for one full loop. */
  duration?: number;
  separator?: string;
}

/**
 * A retro ticker band. The list is rendered twice and slid by half its width,
 * so the loop is seamless. It stops entirely under reduced motion.
 */
export function Marquee({ items, className = "", duration = 36, separator = "✦" }: MarqueeProps) {
  const run = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap">
          <span className="px-5">{item}</span>
          <span aria-hidden="true">{separator}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${duration}s` } as CSSProperties}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
