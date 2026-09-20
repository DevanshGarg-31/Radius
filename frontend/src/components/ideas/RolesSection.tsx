"use client";

import Link from "next/link";
import { useState } from "react";
import { OpeningList } from "@/components/ideas/OpeningList";
import { OpeningsEditor, toDrafts, toPayload, type OpeningDraft } from "@/components/ideas/OpeningsEditor";
import { Button, ButtonLink } from "@/components/ui/Button";
import { humanError } from "@/lib/errors";
import { api, type Opening, type PublicOpening } from "@/services/api";

const asPublic = (opening: Opening): PublicOpening => ({
  openingId: opening.openingId,
  role: opening.role,
  skills: opening.skills,
  count: opening.count,
  taken: opening.filledBy.length,
});

/**
 * The roles an idea is looking for, on its own project page: what it asks for
 * now, and for the founder, the way to change it. An idea with no roles isn't
 * on the board yet, so this is also how it gets there.
 */
export function RolesSection({
  projectId,
  openings,
  suggested = [],
  isOwner,
  skills = [],
  onSaved,
}: {
  projectId: string;
  openings: Opening[];
  /** What the analysis would suggest, offered when no roles are listed yet. */
  suggested?: Opening[];
  isOwner: boolean;
  skills?: string[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<OpeningDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const published = openings.length > 0;

  function startEditing() {
    setDrafts(toDrafts(openings.length ? openings : suggested));
    setError(undefined);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await api.setOpenings(projectId, toPayload(drafts));
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(humanError(err, "We couldn't save the roles. Your changes are still here; try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="roles" className="mt-16 border-t-[2.5px] border-ink pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="roles" className="text-xl font-bold">
            Roles it&apos;s looking for
          </h2>
          <p className="mt-1 max-w-xl text-[15px] text-muted">
            {published ? (
              <>
                On the{" "}
                <Link href={`/ideas/${projectId}`} className="font-medium text-ink underline underline-offset-4">
                  idea board
                </Link>
                , people can apply for these.
              </>
            ) : isOwner ? (
              "Say which roles you need and this idea goes on the board, where people can find it and apply."
            ) : (
              "The founder hasn't said which roles they need yet."
            )}
          </p>
        </div>
        {isOwner && !editing && (
          <Button variant={published ? "secondary" : "pop"} onClick={startEditing}>
            {published ? "Edit roles" : "Add roles →"}
          </Button>
        )}
      </div>

      <div className="mt-6 max-w-2xl">
        {editing ? (
          <>
            {!published && suggested.length > 0 && <p className="mb-4 text-[15px] text-muted">These came from your description. Change anything before you publish.</p>}
            <OpeningsEditor drafts={drafts} onChange={setDrafts} suggestions={skills} />
            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="pop" busy={saving} onClick={save}>
                {toPayload(drafts).length ? "Save roles" : "Save (takes it off the board)"}
              </Button>
              <Button variant="quiet" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        ) : published ? (
          <>
            <OpeningList openings={openings.map(asPublic)} />
            <div className="mt-5">
              <ButtonLink href={`/ideas/${projectId}`} variant="secondary">
                See it on the board →
              </ButtonLink>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
