import { initials } from "@/lib/format";

/** The retro palette: flat, bright fills with ink initials. */
const TONES = [
  ["#FFC233", "#121212"],
  ["#FF9EC7", "#121212"],
  ["#A8ECC8", "#121212"],
  ["#8FD3FF", "#121212"],
  ["#B9A2FF", "#121212"],
  ["#FF8A6E", "#121212"],
] as const;

function toneFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length]!;
}

interface AvatarProps {
  name: string;
  seed?: string;
  src?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, seed, src, size = 40, className = "" }: AvatarProps) {
  const [bg, fg] = toneFor(seed ?? name);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from our own signed S3 redirect
    return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full border-2 border-ink object-cover ${className}`} />;
  }
  return (
    <span role="img" aria-label={name} style={{ ...style, background: bg, color: fg }} className={`inline-flex shrink-0 select-none items-center justify-center rounded-full border-2 border-ink font-display font-extrabold ${className}`}>
      {initials(name)}
    </span>
  );
}

export function avatarTone(seed: string): { bg: string; fg: string } {
  const [bg, fg] = toneFor(seed);
  return { bg, fg };
}
