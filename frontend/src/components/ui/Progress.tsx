interface ProgressProps {
  value: number;
  max: number;
  label: string;
  tone?: "ink" | "accent" | "success" | "mustard" | "tomato" | "teal";
  className?: string;
}

const fills = { ink: "bg-ink", accent: "bg-accent", success: "bg-success", mustard: "bg-mustard", tomato: "bg-tomato", teal: "bg-teal" };

export function Progress({ value, max, label, tone = "mustard", className = "" }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className={`h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-surface ${className}`}>
      <div className={`h-full ${pct > 0 && pct < 100 ? "border-r-2 border-ink" : ""} ${fills[tone]} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}
