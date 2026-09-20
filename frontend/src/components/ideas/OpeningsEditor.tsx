"use client";

import { useState } from "react";
import { TagInput } from "@/components/profile/TagInput";
import type { Opening } from "@/services/api";

/** A role while it's being edited; `openingId` is absent until it's saved. */
export interface OpeningDraft {
  key: string;
  openingId?: string;
  role: string;
  count: number;
  skills: string[];
  /** How many people already hold this role, so it can't be cut below that. */
  taken: number;
}

export const toDrafts = (openings: Opening[]): OpeningDraft[] =>
  openings.map((o) => ({ key: o.openingId, openingId: o.openingId, role: o.role, count: o.count, skills: o.skills, taken: o.filledBy.length }));

export const toPayload = (drafts: OpeningDraft[]) =>
  drafts.filter((d) => d.role.trim().length >= 2).map(({ openingId, role, count, skills }) => ({ openingId, role: role.trim(), count, skills }));

let nextKey = 0;
const blank = (): OpeningDraft => ({ key: `new-${nextKey++}`, role: "", count: 1, skills: [], taken: 0 });

function Stepper({ value, min, onChange }: { value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-9 items-center rounded-btn border-2 border-ink bg-surface">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-full px-2.5 text-muted hover:text-ink" aria-label="One fewer">
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(10, value + 1))} className="h-full px-2.5 text-muted hover:text-ink" aria-label="One more">
        +
      </button>
    </div>
  );
}

/**
 * The roles an idea is looking for: what each is called, how many are wanted
 * and the skills it needs. This is what people see on the board and apply to.
 */
export function OpeningsEditor({ drafts, onChange, suggestions = [] }: { drafts: OpeningDraft[]; onChange: (drafts: OpeningDraft[]) => void; suggestions?: readonly string[] }) {
  const [touched, setTouched] = useState(false);
  const update = (key: string, patch: Partial<OpeningDraft>) => onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <div key={draft.key} className="rounded-card border-2 border-ink bg-surface p-4 shadow-brutal-sm">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={draft.role}
              onChange={(e) => update(draft.key, { role: e.target.value })}
              onBlur={() => setTouched(true)}
              placeholder="Role, e.g. Backend Developer"
              maxLength={60}
              aria-label="Role"
              className="min-w-0 flex-1 border-b-2 border-line-strong bg-transparent pb-1 font-display text-lg font-bold placeholder:font-normal placeholder:text-muted/60 focus:border-ink focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase text-muted">How many</span>
              <Stepper value={draft.count} min={Math.max(1, draft.taken)} onChange={(count) => update(draft.key, { count })} />
            </div>
            <button
              type="button"
              onClick={() => onChange(drafts.filter((d) => d.key !== draft.key))}
              disabled={draft.taken > 0}
              title={draft.taken > 0 ? "Someone already has this role" : "Remove this role"}
              className="rounded-btn px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Remove
            </button>
          </div>
          <div className="mt-3">
            <TagInput
              label="Skills for this role"
              values={draft.skills}
              onChange={(skills) => update(draft.key, { skills })}
              suggestions={suggestions}
              placeholder="Add a skill and press Enter"
              max={10}
            />
          </div>
          {draft.taken > 0 && (
            <p className="mt-2 text-[13px] text-muted">
              {draft.taken} {draft.taken === 1 ? "person has" : "people have"} this role already.
            </p>
          )}
          {touched && draft.role.trim().length > 0 && draft.role.trim().length < 2 && <p className="mt-2 text-[13px] text-danger">Give the role a name.</p>}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...drafts, blank()])}
        disabled={drafts.length >= 12}
        className="rounded-btn border-2 border-dashed border-line-strong px-4 py-2 font-mono text-[12px] font-bold uppercase text-muted hover:border-ink hover:text-ink disabled:opacity-40"
      >
        + Add a role
      </button>
    </div>
  );
}
