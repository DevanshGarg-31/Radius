import Link from "next/link";
import { SkillList } from "@/components/people/SkillList";
import { Avatar } from "@/components/ui/Avatar";
import type { TeamResponse } from "@/services/api";

type Member = TeamResponse["members"][number];

export function TeamMemberList({ members, highlight }: { members: Member[]; highlight?: string }) {
  return (
    <ul className="divide-y divide-line">
      {members.map((m, i) => (
        <li key={m.userId} className={`flex animate-rise items-center gap-4 py-4 ${m.userId === highlight ? "bg-accent-soft/50 -mx-3 rounded-btn px-3" : ""}`} style={{ animationDelay: `${i * 80}ms` }}>
          <Avatar name={m.name} seed={m.userId} src={m.avatarUrl || undefined} size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              <Link href={`/people/${m.userId}`} className="hover:underline">
                {m.name}
              </Link>
            </p>
            <p className="text-[15px] text-muted">{m.role}</p>
          </div>
          <SkillList items={m.skills} emphasise={m.skills} limit={3} className="hidden max-w-[45%] text-right !text-sm sm:block" />
        </li>
      ))}
    </ul>
  );
}
