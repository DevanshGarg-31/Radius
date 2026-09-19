/**
 * Deterministic demo data. IDs and content are fixed so the demo produces the same
 * matches every time. The demo story (see docs/demo-script.md):
 *
 *   Aarav (u001, Python/Backend) creates "AI Football Analytics"
 *   -> Rahul (u002) is the top match (ML + React, loves football and AI)
 *   -> Rahul accepts -> team gap: Computer Vision -> "Computer Vision Engineer"
 *   -> Find next person: Priya (u003, OpenCV/PyTorch) jumps to the top.
 *
 * test/demo-story.test.ts asserts this ranking; if you change a demo user, run the tests.
 */
import type { AiRequirements, Project } from "../src/models/project.js";
import type { Team } from "../src/models/team.js";
import type { ExperienceLevel, User } from "../src/models/user.js";

const CREATED = "2026-09-01T09:00:00.000Z";

type UserSeed = [
  userId: string,
  name: string,
  username: string,
  bio: string,
  skills: string[],
  interests: string[],
  availability: string[],
  experienceLevel: ExperienceLevel,
  location: string,
];

const USER_SEEDS: UserSeed[] = [
  // --- demo cast ---
  ["u001", "Aarav Mehta", "aarav", "Backend engineer and first-time founder. Loves football on weekends.", ["Python", "Backend", "FastAPI"], ["AI", "Sports", "Startups"], ["weekends", "evenings"], "advanced", "Bengaluru"],
  ["u002", "Rahul Sharma", "rahuldev", "Full-stack ML developer building web apps around models.", ["Python", "React", "Machine Learning"], ["Football", "AI"], ["weekends"], "advanced", "Bengaluru"],
  ["u003", "Priya Nair", "priyacv", "Computer vision engineer working on video analytics.", ["Python", "OpenCV", "PyTorch"], ["Football", "Photography"], ["weekends"], "intermediate", "Kochi"],
  ["u004", "Arjun Rao", "arjunui", "Frontend developer who cares about fast, clean interfaces.", ["React", "TypeScript", "Next.js"], ["Football", "Design"], ["evenings"], "intermediate", "Hyderabad"],
  ["u005", "Kabir Singh", "kabirgo", "Backend engineer focused on APIs and databases.", ["Go", "Backend", "PostgreSQL"], ["AI", "Startups"], ["weekdays"], "advanced", "Pune"],
  ["u006", "Meera Iyer", "meeradesigns", "Product designer who has shipped two consumer apps.", ["UI/UX", "Figma", "Product Design"], ["Sports", "Startups"], ["weekends"], "intermediate", "Chennai"],
  ["u007", "Vikram Joshi", "vikramrobotics", "Robotics student experimenting with vision models.", ["Computer Vision", "C++"], ["Robotics", "AI"], ["weekdays"], "beginner", "Mumbai"],
  // --- wider network ---
  ["u008", "Ishita Kapoor", "ishitaml", "NLP researcher interested in health applications.", ["Python", "NLP", "TensorFlow"], ["Healthcare", "AI"], ["weekdays"], "advanced", "Delhi"],
  ["u009", "Rohan Gupta", "rohanmobile", "Android and Flutter developer.", ["Flutter", "Kotlin", "Firebase"], ["Fintech", "Gaming"], ["evenings"], "intermediate", "Noida"],
  ["u010", "Sneha Reddy", "snehadata", "Data analyst who turns messy sports data into dashboards.", ["SQL", "Data Analysis", "Tableau"], ["Cricket", "Education"], ["weekends"], "intermediate", "Hyderabad"],
  ["u011", "Aditya Verma", "adityacloud", "DevOps engineer, AWS certified.", ["AWS", "Docker", "Kubernetes"], ["Startups", "Climate"], ["weekdays", "evenings"], "advanced", "Bengaluru"],
  ["u012", "Neha Pillai", "nehamarketing", "Growth marketer for early-stage startups.", ["Marketing", "Social Media", "Content Writing"], ["Startups", "Music"], ["weekends"], "intermediate", "Mumbai"],
  ["u013", "Farhan Qureshi", "farhanevents", "Runs college fests and community meetups.", ["Event Management", "Operations", "Public Speaking"], ["Events", "Sports"], ["weekends"], "advanced", "Lucknow"],
  ["u014", "Ananya Das", "ananyads", "Data scientist in healthcare analytics.", ["Python", "Machine Learning", "Data Science"], ["Healthcare", "Education"], ["weekdays"], "intermediate", "Kolkata"],
  ["u015", "Karthik Menon", "karthikfs", "Full-stack developer, Node and React.", ["Node.js", "React", "MongoDB"], ["Startups", "Gaming"], ["evenings"], "intermediate", "Chennai"],
  ["u016", "Tanvi Shah", "tanviux", "UX researcher and illustrator.", ["UI/UX", "Figma"], ["Design", "Education"], ["weekends"], "beginner", "Ahmedabad"],
  ["u017", "Dev Malhotra", "devweb3", "Smart contract developer.", ["Solidity", "Blockchain", "TypeScript"], ["Web3", "Fintech"], ["evenings"], "intermediate", "Gurugram"],
  ["u018", "Pooja Bhat", "poojaiot", "Embedded engineer building low-cost sensors.", ["Arduino", "C++", "IoT"], ["Agriculture", "Climate"], ["weekdays"], "advanced", "Mysuru"],
  ["u019", "Siddharth Jain", "sidllm", "Builds LLM apps and RAG pipelines.", ["Python", "LLMs", "FastAPI"], ["AI", "Education"], ["evenings"], "advanced", "Bengaluru"],
  ["u020", "Riya Chatterjee", "riyacontent", "Writer and video editor for sports channels.", ["Content Writing", "Video Editing", "Social Media"], ["Football", "Travel"], ["weekends"], "intermediate", "Kolkata"],
  ["u021", "Manav Desai", "manavpm", "Product manager, ex-founder.", ["Product Management", "Marketing"], ["Startups", "Fintech"], ["weekdays"], "advanced", "Mumbai"],
  ["u022", "Lakshmi Krishnan", "lakshmijava", "Java backend developer at a bank.", ["Java", "SQL", "Backend"], ["Fintech", "Music"], ["evenings"], "intermediate", "Chennai"],
  ["u023", "Zoya Khan", "zoyadesign", "Brand and motion designer.", ["Product Design", "Video Editing"], ["Design", "Music"], ["weekends"], "intermediate", "Delhi"],
  ["u024", "Harsh Patel", "harshswift", "iOS developer.", ["Swift", "Firebase"], ["Healthcare", "Sports"], ["evenings"], "intermediate", "Surat"],
  ["u025", "Nikita Rao", "nikitaops", "Operations lead for a social enterprise.", ["Operations", "Event Management", "Sales"], ["Social Impact", "Education"], ["weekdays"], "advanced", "Pune"],
];

export const DEMO_USERS: User[] = USER_SEEDS.map(([userId, name, username, bio, skills, interests, availability, experienceLevel, location]) => ({
  userId,
  name,
  username,
  email: `${username}@radius.demo`,
  bio,
  avatarUrl: "",
  skills,
  interests,
  availability,
  experienceLevel,
  location,
  githubUrl: "",
  createdAt: CREATED,
  updatedAt: CREATED,
}));

type ProjectSeed = [
  projectId: string,
  ownerId: string,
  title: string,
  description: string,
  analysis: Omit<AiRequirements, "source" | "analyzedAt" | "modelId">,
  teamSize: number,
  extraMembers: Array<[userId: string, role: string]>,
];

const PROJECT_SEEDS: ProjectSeed[] = [
  ["p001", "u008", "MedAssist Symptom Checker", "An NLP assistant that helps rural clinics triage patient symptoms in local languages.", { category: "AI/Healthcare", skills: ["NLP", "Python", "React", "UI/UX"], roles: ["NLP Engineer", "Frontend Developer", "Product Designer"], requirements: ["Language models", "Accessible UI"], topics: ["AI", "Healthcare"] }, 4, []],
  ["p002", "u013", "Inter-College Sports Fest", "Organise a three-day inter-college sports festival with live score tracking.", { category: "Sports/Events", skills: ["Event Management", "Marketing", "Operations", "React"], roles: ["Event Coordinator", "Marketing Lead", "Frontend Developer"], requirements: ["Logistics", "Promotion", "Live scoreboard"], topics: ["Sports", "Events"] }, 5, [["u012", "Marketing Lead"]]],
  ["p003", "u011", "Carbon Footprint Tracker", "A mobile app that estimates personal carbon footprint from receipts and travel.", { category: "Climate/Mobile", skills: ["Flutter", "Backend", "Data Analysis", "UI/UX"], roles: ["Mobile Developer", "Backend Developer", "Product Designer"], requirements: ["Receipt parsing", "Emission models"], topics: ["Climate"] }, 4, []],
  ["p004", "u017", "Campus Micro-Payments", "A blockchain wallet for campus canteen and event payments.", { category: "Web3/Fintech", skills: ["Solidity", "React", "Backend", "Product Design"], roles: ["Blockchain Developer", "Frontend Developer", "Product Designer"], requirements: ["Smart contracts", "Wallet UX"], topics: ["Web3", "Fintech"] }, 4, []],
  ["p005", "u019", "AI Study Buddy", "An LLM tutor that builds personalised revision plans from lecture notes.", { category: "AI/Education", skills: ["LLMs", "Python", "Next.js", "UI/UX"], roles: ["AI Engineer", "Frontend Developer", "Product Designer"], requirements: ["RAG pipeline", "Study planner UI"], topics: ["AI", "Education"] }, 4, [["u016", "Product Designer"]]],
  ["p006", "u018", "Smart Irrigation Kit", "Low-cost soil sensors that tell small farmers when to water crops.", { category: "IoT/Agriculture", skills: ["IoT", "Embedded Systems", "Mobile Development", "Data Analysis"], roles: ["Hardware Engineer", "Mobile Developer", "Data Analyst"], requirements: ["Sensor hardware", "Farmer app"], topics: ["Agriculture", "Climate"] }, 4, []],
  ["p007", "u010", "Cricket Stats Dashboard", "Interactive dashboards for local cricket leagues with player analytics.", { category: "Sports/Data", skills: ["Data Analysis", "SQL", "React", "Python"], roles: ["Data Analyst", "Frontend Developer"], requirements: ["Stats pipeline", "Dashboards"], topics: ["Sports", "Data"] }, 3, []],
  ["p008", "u021", "Freelancer Invoice Tool", "A simple invoicing and payment reminder tool for Indian freelancers.", { category: "Fintech/Startups", skills: ["Next.js", "Backend", "Product Design", "Marketing"], roles: ["Full Stack Developer", "Product Designer", "Marketing Lead"], requirements: ["Invoices", "Payment reminders"], topics: ["Fintech", "Startups"] }, 4, []],
  ["p009", "u025", "Community Food Bank Network", "Coordinate volunteers and donations across neighbourhood food banks.", { category: "Social Impact", skills: ["Operations", "React", "Backend", "Social Media"], roles: ["Operations Lead", "Full Stack Developer", "Marketing Lead"], requirements: ["Volunteer scheduling", "Donation tracking"], topics: ["Social Impact", "Food"] }, 5, []],
  ["p010", "u009", "Indie Mobile Game", "A casual multiplayer cricket game for Android and iOS.", { category: "Gaming/Sports", skills: ["Flutter", "Backend", "Product Design"], roles: ["Mobile Developer", "Backend Developer", "Game Designer"], requirements: ["Multiplayer backend", "Game art"], topics: ["Gaming", "Sports"] }, 4, []],
  ["p011", "u020", "Football Highlights Channel", "A YouTube channel producing short tactical breakdowns of Indian football.", { category: "Sports/Media", skills: ["Video Editing", "Content Writing", "Social Media"], roles: ["Video Editor", "Content Writer"], requirements: ["Editing", "Scripts"], topics: ["Sports"] }, 3, []],
  ["p012", "u014", "Hospital Bed Forecasting", "Forecast hospital bed demand from admissions data to help planning.", { category: "AI/Healthcare", skills: ["Machine Learning", "Python", "Data Analysis", "React"], roles: ["ML Engineer", "Data Analyst", "Frontend Developer"], requirements: ["Forecasting models", "Planning dashboard"], topics: ["AI", "Healthcare"] }, 4, []],
];

export const DEMO_PROJECTS: Project[] = PROJECT_SEEDS.map(([projectId, ownerId, title, description, analysis, teamSize, extra]) => ({
  projectId,
  ownerId,
  title,
  description,
  category: analysis.category,
  requiredSkills: analysis.skills,
  preferredSkills: [],
  requiredRoles: analysis.roles,
  teamSize,
  currentTeamSize: 1 + extra.length,
  location: DEMO_USERS.find((u) => u.userId === ownerId)!.location,
  remote: true,
  status: "open",
  preferredAvailability: [],
  aiRequirements: { ...analysis, source: "seed", analyzedAt: CREATED },
  explanationCache: {},
  createdAt: CREATED,
  updatedAt: CREATED,
}));

export const DEMO_TEAMS: Team[] = PROJECT_SEEDS.map(([projectId, ownerId, , , , , extra]) => ({
  teamId: `t_${projectId}`,
  projectId,
  members: [ownerId, ...extra.map(([id]) => id)],
  roles: [{ userId: ownerId, role: "Founder" }, ...extra.map(([userId, role]) => ({ userId, role }))],
  createdAt: CREATED,
  updatedAt: CREATED,
}));
