"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Progress } from "@/components/ui/Progress";
import { firstName } from "@/lib/format";
import type { Project, UserSummary } from "@/services/api";

interface ProjectHeaderProps {
  project: Project;
  owner?: UserSummary;
  /** Hide the description on sub-pages to keep focus on the task. */
  compact?: boolean;
}

/** Project title, one-line facts and the Overview / People / Team tabs. */
export function ProjectHeader({ project, owner, compact = false }: ProjectHeaderProps) {
  const pathname = usePathname();
  const base = `/projects/${project.projectId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/people`, label: "People" },
    { href: `${base}/team`, label: "Team" },
  ];
  return (
    <div className="border-b border-line">
      <PageContainer>
        <div className={`animate-rise ${compact ? "pt-8" : "pt-12"}`}>
          {project.category && <p className="eyebrow mb-3">{project.category}</p>}
          <h1 className={`font-extrabold leading-[1.08] ${compact ? "text-[28px] sm:text-[32px]" : "text-[34px] sm:text-[44px]"}`}>{project.title}</h1>
          {!compact && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">{project.description}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-muted">
            <span className="flex items-center gap-3">
              <span className="whitespace-nowrap">
                Team <strong className="font-semibold text-ink">{project.currentTeamSize}</strong> / {project.teamSize}
              </span>
              <Progress value={project.currentTeamSize} max={project.teamSize} label="Team filled" className="w-24" />
            </span>
            <span>{project.remote ? "Remote" : project.location || "In person"}</span>
            {owner && <span>Started by {firstName(owner.name)}</span>}
            {project.status === "full" && <span className="font-medium text-success-ink">Team complete</span>}
          </div>
        </div>
        <nav aria-label="Project" className="mt-8 flex gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 pb-3 pt-1 text-[15px] ${active ? "font-semibold text-ink after:absolute after:inset-x-3 after:bottom-[-1px] after:h-0.5 after:bg-ink" : "text-muted hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </PageContainer>
    </div>
  );
}
