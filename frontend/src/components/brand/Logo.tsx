import Link from "next/link";

/**
 * The radius mark: three people connected. The lower-right node is hollow,
 * the person the team is still looking for.
 */
export function LogoMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 5.2 5.6 17.4M12 5.2l6.4 12.2M5.6 17.4h12.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="5.2" r="3" fill="currentColor" />
      <circle cx="5.6" cy="17.4" r="3" fill="currentColor" />
      <circle cx="18.4" cy="17.4" r="2.4" fill="var(--color-canvas)" stroke="var(--color-warm)" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 text-ink ${className}`} aria-label="radius home">
      <LogoMark />
      <span className="font-display text-[19px] font-extrabold tracking-[-0.03em]">radius</span>
    </Link>
  );
}
