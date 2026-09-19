interface ProgressProps {
  value: number;
  max: number;
  label: string;
  tone?: "ink" | "accent" | "success";
  className?: string;
}

const fills = { ink: "bg-ink", accent: "bg-accent", success: "bg-success" };

export function Progress({ value, max, label, tone = "ink", className = "" }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className={`h-1.5 w-full overflow-hidden rounded-full bg-sunken ${className}`}>
      <div className={`h-full rounded-full ${fills[tone]} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}
