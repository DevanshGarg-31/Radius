import Link from "next/link";
import { Progress } from "@/components/ui/Progress";
import type { Project } from "@/services/api";

/** The single most useful next step for a project. */
export function nextStep(project: Project, isOwner: boolean): { label: string; href: string } {
  const base = `/projects/${project.projectId}`;
  if (!project.requiredSkills.length) return { label: isOwner ? "Understand what it needs" : "View project", href: base };
  if (project.status === "full") return { label: "View the team", href: `${base}/team` };
  const open = project.teamSize - project.currentTeamSize;
  if (!isOwner) return { label: "View the team", href: `${base}/team` };
  return { label: open === 1 ? "Find one more person" : `Find ${open} more people`, href: `${base}/people` };
}

/** A project as an editorial row: title, one line, team progress, next step. */
export function ProjectRow({ project, isOwner }: { project: Project; isOwner: boolean }) {
  const step = nextStep(project, isOwner);
  return (
    <li className="grid gap-4 py-6 sm:grid-cols-[1fr_220px] sm:items-center">
      <div className="min-w-0">
        {project.category && <p className="eyebrow mb-1.5">{project.category}</p>}
        <Link href={`/projects/${project.projectId}`} className="font-display text-xl font-bold hover:underline">
          {project.title}
        </Link>
        <p className="mt-1 line-clamp-2 max-w-2xl text-[15px] text-muted">{project.description}</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted">
          <strong className="font-semibold text-ink">{project.currentTeamSize}</strong> / {project.teamSize} collaborators
        </p>
        <Progress value={project.currentTeamSize} max={project.teamSize} label={`${project.title} team filled`} />
        <Link href={step.href} className="inline-block pt-1 text-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {step.label} →
        </Link>
      </div>
    </li>
  );
}
