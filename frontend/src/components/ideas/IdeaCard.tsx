import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { Idea } from "@/services/api";

const ACCENTS = ["bg-mustard", "bg-mint", "bg-sky", "bg-pink", "bg-lilac"];

/** One idea on the board: what it is, who's behind it, and the roles still open. */
export function IdeaCard({ idea, accent = 0 }: { idea: Idea; accent?: number }) {
  const open = idea.openings.filter((o) => o.taken < o.count);
  const shown = open.slice(0, 3);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-panel border-[2.5px] border-ink bg-surface shadow-brutal transition-transform hover:-translate-y-0.5">
      <div className={`h-2 ${ACCENTS[accent % ACCENTS.length]}`} />
      <div className="flex flex-1 flex-col p-5">
        {idea.category && <p className="eyebrow mb-2">{idea.category}</p>}
        <h3 className="font-display text-xl font-extrabold leading-tight">
          <Link href={`/ideas/${idea.projectId}`} className="after:absolute after:inset-0 hover:underline">
            {idea.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[15px] text-muted">{idea.description}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {shown.map((opening) => (
            <li key={opening.openingId} className="rounded-btn border-2 border-ink bg-canvas px-2 py-0.5 text-[13px] font-medium">
              {opening.role}
              {opening.count > 1 && <span className="text-muted"> ×{opening.count - opening.taken}</span>}
            </li>
          ))}
          {open.length > shown.length && <li className="px-1 py-0.5 text-[13px] text-muted">+{open.length - shown.length} more</li>}
        </ul>

        <div className="mt-auto flex items-center gap-2 pt-5">
          {idea.owner && <Avatar name={idea.owner.name} seed={idea.owner.userId} src={idea.owner.avatarUrl || undefined} size={26} />}
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{idea.owner?.name ?? "Someone"}</span>
          <span className="shrink-0 rounded-full border-2 border-ink bg-mint px-2 py-0.5 font-mono text-[11px] font-bold uppercase">
            {idea.spotsLeft > 0 ? `${idea.spotsLeft} open` : "Team full"}
          </span>
        </div>
      </div>
    </article>
  );
}
