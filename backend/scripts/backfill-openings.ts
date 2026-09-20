/**
 * Gives roles to ideas created before the idea board existed.
 *
 * An idea only appears on the board once it lists the roles it wants. Projects
 * saved earlier have none, so this turns each one's analysed roles into
 * openings (one place each, with the skills that belong to that role). Founders
 * can edit them afterwards like any other.
 *
 *   npx tsx scripts/backfill-openings.ts            # show what would change
 *   npx tsx scripts/backfill-openings.ts --apply    # write it
 *   npx tsx scripts/backfill-openings.ts --apply --ids p001,p002
 *
 * Ideas that already list roles are never touched, and neither are ones whose
 * analysis found nothing more specific than "Collaborator".
 */
import "dotenv/config";
import { db } from "../src/services/store.js";
import { suggestOpenings } from "../src/utils/openings.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const only = args.find((a) => a.startsWith("--ids="))?.slice("--ids=".length).split(",").filter(Boolean);

const projects = await db.listProjects();
const candidates = projects.filter((project) => {
  if (only && !only.includes(project.projectId)) return false;
  if (project.openings?.length) return false;
  const roles = (project.aiRequirements?.roles ?? project.requiredRoles ?? []).filter((r) => r && r !== "Collaborator");
  return roles.length > 0;
});

console.log(`${projects.length} projects, ${candidates.length} to give roles to${apply ? "" : " (dry run)"}\n`);

for (const project of candidates) {
  const roles = (project.aiRequirements?.roles ?? project.requiredRoles).filter((r) => r && r !== "Collaborator");
  const skills = project.aiRequirements?.skills ?? project.requiredSkills;
  const openings = suggestOpenings(roles, skills);
  console.log(`${project.projectId}  ${project.title}`);
  for (const opening of openings) console.log(`   · ${opening.role}${opening.skills.length ? ` — ${opening.skills.join(", ")}` : ""}`);
  if (apply) await db.saveOpenings(project.projectId, openings);
}

console.log(apply ? "\nDone. These ideas are now on the board." : "\nNothing was changed. Run again with --apply to write it.");
