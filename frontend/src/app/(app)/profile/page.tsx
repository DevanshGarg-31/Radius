"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PersonProfile } from "@/components/people/PersonProfile";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useAsync } from "@/hooks/useAsync";
import { humanError } from "@/lib/errors";
import { useCurrentUser, useSession } from "@/lib/session";
import { api, type ExperienceLevel, type User } from "@/services/api";

const AVAILABILITY = ["weekdays", "evenings", "weekends"];
const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function ProfileForm({ user, onSaved, onCancel }: { user: User; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    location: user.location,
    skills: user.skills.join(", "),
    interests: user.interests.join(", "),
    availability: user.availability,
    experienceLevel: user.experienceLevel,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await api.updateUser(user.userId, {
        name: form.name.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        skills: toList(form.skills),
        interests: toList(form.interests),
        availability: form.availability,
        experienceLevel: form.experienceLevel,
      });
      onSaved();
    } catch (err) {
      setError(humanError(err, "We couldn't save your profile. Your changes are still here; try again."));
      setSaving(false);
    }
  }

  return (
    <form
      className="max-w-xl space-y-6 pb-10 pt-12"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h1 className="text-[32px] font-extrabold">Edit your profile</h1>
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
      <Textarea label="About you" hint="One or two sentences, in your own words." rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} />
      <Input label="Can help with" hint="Skills, separated by commas." value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
      <Input label="Interested in" hint="Topics you care about, separated by commas." value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Available</legend>
        <div className="flex gap-5">
          {AVAILABILITY.map((a) => (
            <label key={a} className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                className="size-4 accent-ink"
                checked={form.availability.includes(a)}
                onChange={(e) => setForm({ ...form, availability: e.target.checked ? [...form.availability, a] : form.availability.filter((x) => x !== a) })}
              />
              {a[0]!.toUpperCase() + a.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Experience" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as ExperienceLevel })}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="submit" busy={saving}>
          Save profile
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const me = useCurrentUser();
  const { refresh } = useSession();
  const [editing, setEditing] = useState(false);
  const projects = useAsync(() => api.listProjects({ memberId: me.userId }).then((r) => r.projects), [me.userId]);

  return (
    <PageContainer>
      {editing ? (
        <ProfileForm
          user={me}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            await refresh();
            setEditing(false);
          }}
        />
      ) : (
        <PersonProfile
          user={me}
          projects={projects.status === "success" ? projects.data : undefined}
          actions={
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          }
        />
      )}
    </PageContainer>
  );
}
