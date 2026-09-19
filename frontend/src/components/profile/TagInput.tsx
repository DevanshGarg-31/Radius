"use client";

import { useId, useState, type KeyboardEvent } from "react";

interface TagInputProps {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  max?: number;
  error?: string;
}

/** Type a skill and press Enter (or comma) to add it; click a suggestion; remove with ×. */
export function TagInput({ label, hint, values, onChange, suggestions = [], placeholder, max = 20, error }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());

  function add(raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value || value.length > 60 || has(value) || values.length >= max) return;
    onChange([...values, value]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  const unused = suggestions.filter((s) => !has(s)).slice(0, 10);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-xs font-bold uppercase text-ink">
        {label}
      </label>
      <div className={`flex flex-wrap items-center gap-1.5 rounded-btn border-2 bg-surface p-2 shadow-brutal-sm focus-within:shadow-brutal ${error ? "border-danger" : "border-ink"}`}>
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-btn border-2 border-ink bg-mustard py-0.5 pl-2 pr-1 font-mono text-xs font-bold">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded px-1 hover:bg-ink hover:text-canvas" aria-label={`Remove ${v}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          placeholder={values.length ? "" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-[15px] focus:outline-none"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      </div>
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
      {unused.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5" aria-label={`Suggestions for ${label}`}>
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-btn border-2 border-dashed border-ink/40 px-2 py-0.5 font-mono text-xs hover:border-ink hover:bg-surface">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
