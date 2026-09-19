import { initials } from "@/lib/format";

/** Muted, warm tones so a room full of avatars still feels calm. */
const TONES = [
  ["#E9E2D3", "#5C4B2E"],
  ["#DCE6DC", "#34513A"],
  ["#E7DAD4", "#6A3D2E"],
  ["#DAE1EA", "#2F4661"],
  ["#E5DDE8", "#4E3A5A"],
  ["#E3E4D5", "#4C4F2A"],
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
    return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span role="img" aria-label={name} style={{ ...style, background: bg, color: fg }} className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold ${className}`}>
      {initials(name)}
    </span>
  );
}

export function avatarTone(seed: string): { bg: string; fg: string } {
  const [bg, fg] = toneFor(seed);
  return { bg, fg };
}
