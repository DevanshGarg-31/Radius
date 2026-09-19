"use client";

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { PersonRow } from "@/components/people/PersonCard";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/lib/session";
import { api } from "@/services/api";

/** The network directory. Filtering here is a plain text filter; matching lives on project pages. */
export default function DiscoverPage() {
  const me = useCurrentUser();
  const people = useAsync(() => api.listUsers().then((r) => r.users), []);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (people.status !== "success") return [];
    const q = query.trim().toLowerCase();
    const others = people.data.filter((p) => p.userId !== me.userId);
    if (!q) return others;
    return others.filter((p) => [p.name, p.bio, p.location, ...p.skills, ...p.interests].some((field) => field.toLowerCase().includes(q)));
  }, [people, query, me.userId]);

  return (
    <PageContainer>
      <PageHeader eyebrow="Discover" title="People in the network" lede="Builders, designers, organizers and researchers. Find someone by what they do or what they care about." />
      <div className="max-w-md pb-8">
        <Input label="Filter people" hideLabel type="search" placeholder="Try “computer vision”, “football” or “Bengaluru”" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {people.status === "loading" && <LoadingState message="Gathering the network…" />}
      {people.status === "error" && <ErrorState title="We couldn't load the network." error={people.error} onRetry={people.reload} />}
      {people.status === "success" &&
        (filtered.length ? (
          <>
            <p className="pb-3 text-sm text-muted" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "person" : "people"}
            </p>
            <ul className="-mx-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <PersonRow key={p.userId} person={p} />
              ))}
            </ul>
          </>
        ) : (
          <EmptyState title={`No one matches “${query}”.`} body="Try a broader skill or an interest instead." />
        ))}
    </PageContainer>
  );
}
