"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import type { ExperienceLevel, ProfileInput } from "@/services/api";
import { AvatarUpload } from "./AvatarUpload";
import { TagInput } from "./TagInput";

const AVAILABILITY = ["weekdays", "evenings", "weekends"] as const;
const SKILL_SUGGESTIONS = ["Python", "React", "Machine Learning", "UI/UX", "Backend", "Marketing", "Data Analysis", "Mobile Development", "Product Design", "Event Management"];
const INTEREST_SUGGESTIONS = ["AI", "Sports", "Startups", "Design", "Healthcare", "Education", "Climate", "Fintech", "Gaming", "Social Impact"];

export interface ProfileValues extends ProfileInput {
  username: string;
}

interface ProfileFormProps {
  mode: "create" | "edit";
  initial: Partial<ProfileValues>;
  submitLabel: string;
  onSubmit: (values: ProfileValues) => Promise<void>;
  onCancel?: () => void;
  /** Error from the server, e.g. a taken username. */
  serverError?: string;
}

const clean = (s: string) => s.trim();

/** One form for creating a profile at sign-up and editing it later. */
export function ProfileForm({ mode, initial, submitLabel, onSubmit, onCancel, serverError }: ProfileFormProps) {
  const [v, setV] = useState<ProfileValues>({
    name: initial.name ?? "",
    username: initial.username ?? "",
    bio: initial.bio ?? "",
    avatarUrl: initial.avatarUrl ?? "",
    skills: initial.skills ?? [],
    interests: initial.interests ?? [],
    availability: initial.availability ?? [],
    experienceLevel: initial.experienceLevel ?? "intermediate",
    location: initial.location ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => setV((prev) => ({ ...prev, [key]: value }));

  function validate(): boolean {
    const next: typeof errors = {};
    if (!clean(v.name)) next.name = "Tell people what to call you.";
    if (mode === "create" && !/^[a-z0-9_.-]{2,40}$/i.test(clean(v.username))) next.username = "2–40 characters: letters, numbers, dots, dashes or underscores.";
    if (!v.skills.length) next.skills = "Add at least one skill so people can find you.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ ...v, name: clean(v.name), username: clean(v.username).toLowerCase(), bio: clean(v.bio), location: clean(v.location) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <AvatarUpload name={v.name} value={v.avatarUrl} onChange={(url) => set("avatarUrl", url)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Your name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} error={errors.name} autoComplete="name" />
        {mode === "create" ? (
          <Input label="Username" value={v.username} onChange={(e) => set("username", e.target.value)} maxLength={40} error={errors.username} hint="How people find you, e.g. @maya.builds" autoComplete="username" />
        ) : (
          <Input label="Location" value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder="City" />
        )}
      </div>

      <Textarea label="About you" hint="One or two sentences, in your own words." rows={3} value={v.bio} onChange={(e) => set("bio", e.target.value)} maxLength={500} />

      <TagInput label="Can help with" hint="Skills you'd bring to a team. Press Enter after each." values={v.skills} onChange={(s) => set("skills", s)} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. Python" error={errors.skills} />
      <TagInput label="Interested in" hint="Topics you care about." values={v.interests} onChange={(s) => set("interests", s)} suggestions={INTEREST_SUGGESTIONS} placeholder="e.g. Football" />

      <fieldset>
        <legend className="mb-2 font-mono text-xs font-bold uppercase">Available</legend>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => {
            const on = v.availability.includes(a);
            return (
              <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-btn border-2 border-ink px-3 py-1.5 text-[15px] font-semibold shadow-brutal-sm has-focus-visible:outline-2 has-focus-visible:outline-accent ${on ? "bg-mint" : "bg-surface"}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={(e) => set("availability", e.target.checked ? [...v.availability, a] : v.availability.filter((x) => x !== a))} />
                {on ? "✓ " : ""}
                {a[0]!.toUpperCase() + a.slice(1)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Experience" value={v.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value as ExperienceLevel)}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        {mode === "create" && <Input label="Location" value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder="City" autoComplete="address-level2" />}
      </div>

      {serverError && (
        <p role="alert" className="rounded-card border-2 border-ink bg-warm-soft px-4 py-3 text-[15px]">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" size="lg" variant="pop" busy={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="quiet" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
