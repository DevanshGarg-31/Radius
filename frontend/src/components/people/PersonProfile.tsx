import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { capitalise } from "@/lib/format";
import type { Project, User } from "@/services/api";

/** A profile that reads like a person: who they are, what they care about, what they can help with. */
export function PersonProfile({ user, projects, actions }: { user: User; projects?: Project[]; actions?: React.ReactNode }) {
  return (
    <article className="grid gap-12 pb-10 pt-12 md:grid-cols-[1.3fr_1fr] md:pt-16">
      <div className="animate-rise">
        <Avatar name={user.name} seed={user.userId} src={user.avatarUrl || undefined} size={72} />
        <h1 className="mt-6 text-[36px] font-extrabold leading-tight sm:text-[44px]">{user.name}</h1>
        <p className="mt-1 text-[15px] text-muted">
          @{user.username}
          {user.location && ` · ${user.location}`} · {capitalise(user.experienceLevel)}
        </p>
        {user.bio && <p className="mt-6 max-w-xl font-display text-2xl font-semibold leading-snug text-ink-soft">{user.bio}</p>}
        {actions && <div className="mt-8 flex gap-3">{actions}</div>}
      </div>

      <div className="space-y-10 md:pt-24">
        <section>
          <h2 className="eyebrow mb-3">Can help with</h2>
          <ul className="space-y-1">
            {user.skills.map((s) => (
              <li key={s} className="text-lg font-semibold">
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="eyebrow mb-3">Interested in</h2>
          <p className="text-lg">{user.interests.join(", ") || "Not shared yet"}</p>
        </section>
        <section>
          <h2 className="eyebrow mb-3">Available</h2>
          <p className="text-lg">{user.availability.map(capitalise).join(", ") || "Not shared yet"}</p>
        </section>
        {projects && (
          <section>
            <h2 className="eyebrow mb-3">Projects</h2>
            {projects.length ? (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.projectId}>
                    <Link href={`/projects/${p.projectId}`} className="text-lg underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted">Not on a project yet.</p>
            )}
          </section>
        )}
      </div>
    </article>
  );
}
