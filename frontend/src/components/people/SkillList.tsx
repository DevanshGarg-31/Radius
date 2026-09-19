import { Fragment } from "react";

interface SkillListProps {
  items: readonly string[];
  /** Items shown in ink and bold; the rest are muted. */
  emphasise?: readonly string[];
  /** Maximum shown before "+N more". */
  limit?: number;
  className?: string;
}

/** Skills as typography ("Python · Machine Learning · React"), not a row of pills. */
export function SkillList({ items, emphasise = [], limit, className = "" }: SkillListProps) {
  const strong = new Set(emphasise.map((s) => s.toLowerCase()));
  const shown = limit ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;
  return (
    <p className={`text-[15px] leading-relaxed ${className}`}>
      {shown.map((item, i) => (
        <Fragment key={item}>
          {i > 0 && (
            <span className="text-line-strong" aria-hidden="true">
              {" · "}
            </span>
          )}
          <span className={`whitespace-nowrap ${strong.has(item.toLowerCase()) ? "font-semibold text-ink" : "text-muted"}`}>{item}</span>
        </Fragment>
      ))}
      {rest > 0 && <span className="pl-2 text-muted">+{rest} more</span>}
    </p>
  );
}

/** A labelled checklist: "Skills ✓ Python ✓ Machine Learning". */
export function CheckList({ label, items, note }: { label: string; items: readonly string[]; note?: string }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[15px]">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 text-success">
                <path d="m3 7.2 2.6 2.6L11 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
