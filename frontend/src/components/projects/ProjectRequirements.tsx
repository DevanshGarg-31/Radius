import { CollaborationGraph } from "@/components/network/CollaborationGraph";
import { hubLayout } from "@/components/network/layouts";

interface ProjectRequirementsProps {
  title: string;
  skills: string[];
  roles: string[];
  requirements?: string[];
  teamSize: number;
}

/** "Your idea needs…": the project connected to the skills it requires. */
export function ProjectRequirements({ title, skills, roles, requirements = [], teamSize }: ProjectRequirementsProps) {
  const graph = hubLayout({ id: "project", label: title, kind: "project" }, skills.map((label) => ({ label, kind: "skill" as const })), { width: 420, height: 320, radius: 118, startDeg: -135 });
  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="order-2 md:order-1">
        <CollaborationGraph {...graph} width={420} height={320} title={`${title} needs ${skills.join(", ")}`} />
      </div>
      <div className="order-1 space-y-8 md:order-2">
        <div>
          <p className="eyebrow mb-3">Your idea needs</p>
          <ul className="space-y-1">
            {skills.map((skill) => (
              <li key={skill} className="font-display text-2xl font-bold leading-snug">
                {skill}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="eyebrow mb-2">Roles</p>
            <ul className="space-y-1 text-[15px]">
              {roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-2">Team size</p>
            <p className="text-[15px]">{teamSize} people</p>
          </div>
        </div>
        {requirements.length > 0 && (
          <div>
            <p className="eyebrow mb-2">To succeed, the team needs</p>
            <ul className="list-disc space-y-1 pl-5 text-[15px] text-ink-soft marker:text-line-strong">
              {requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
