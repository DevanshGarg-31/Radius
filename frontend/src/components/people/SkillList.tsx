interface SkillListProps {
  items: readonly string[];
  /** Items highlighted in mustard; the rest are plain chips. */
  emphasise?: readonly string[];
  /** Maximum shown before "+N". */
  limit?: number;
  className?: string;
}

/** Skills as retro chips: outlined in ink, the relevant ones filled in mustard. */
export function SkillList({ items, emphasise = [], limit, className = "" }: SkillListProps) {
  const strong = new Set(emphasise.map((s) => s.toLowerCase()));
  const shown = limit ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {shown.map((item) => (
        <li key={item} className={`whitespace-nowrap rounded-btn border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold ${strong.has(item.toLowerCase()) ? "bg-mustard" : "bg-surface"}`}>
          {item}
        </li>
      ))}
      {rest > 0 && <li className="px-1 font-mono text-xs font-bold text-muted">+{rest}</li>}
    </ul>
  );
}

/** A labelled checklist: "Skills ✓ Python ✓ Machine Learning". */
export function CheckList({ label, items, note }: { label: string; items: readonly string[]; note?: string }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[15px] font-medium">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-mint text-[11px] font-bold" aria-hidden="true">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted">{note ?? "No overlap"}</p>
      )}
    </div>
  );
}
