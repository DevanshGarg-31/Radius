import Link from "next/link";
import { SkillList } from "@/components/people/SkillList";
import { Avatar } from "@/components/ui/Avatar";
import type { TeamResponse } from "@/services/api";

type Member = TeamResponse["members"][number];

export function TeamMemberList({ members, highlight, showSkills = true }: { members: Member[]; highlight?: string; showSkills?: boolean }) {
  return (
    <ul className="space-y-3">
      {members.map((m, i) => (
        <li key={m.userId} className={`flex animate-rise items-center gap-4 rounded-card border-2 border-ink px-4 py-3 shadow-brutal-sm ${m.userId === highlight ? "bg-mint" : "bg-surface"}`} style={{ animationDelay: `${i * 80}ms` }}>
          <Avatar name={m.name} seed={m.userId} src={m.avatarUrl || undefined} size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              <Link href={`/people/${m.userId}`} className="hover:underline">
                {m.name}
              </Link>
            </p>
            <p className="text-[15px] text-muted">{m.role}</p>
          </div>
          {showSkills && <SkillList items={m.skills} limit={3} className="hidden max-w-[50%] justify-end sm:flex" />}
        </li>
      ))}
    </ul>
  );
}
