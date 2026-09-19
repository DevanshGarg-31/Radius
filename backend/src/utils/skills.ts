/**
 * Skill and interest normalisation. Everything that compares skills or interests
 * (search, scoring, validation of AI output) goes through these helpers, so
 * "ML", "machine learning" and "Machine Learning" are the same thing everywhere.
 */

/** Pure renames: lowercase variant -> canonical name. */
const SKILL_ALIASES: Record<string, string> = {
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  "machine-learning": "Machine Learning",
  "deep learning": "Deep Learning",
  dl: "Deep Learning",
  cv: "Computer Vision",
  "computer vision": "Computer Vision",
  opencv: "OpenCV",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  nlp: "NLP",
  "natural language processing": "NLP",
  llm: "LLMs",
  llms: "LLMs",
  "generative ai": "LLMs",
  "gen ai": "LLMs",
  genai: "LLMs",
  "data science": "Data Science",
  "data analysis": "Data Analysis",
  "data analytics": "Data Analysis",
  analytics: "Data Analysis",
  python: "Python",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  react: "React",
  reactjs: "React",
  "react.js": "React",
  "react native": "React Native",
  "next.js": "Next.js",
  nextjs: "Next.js",
  next: "Next.js",
  vue: "Vue",
  "vue.js": "Vue",
  angular: "Angular",
  "node.js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  express: "Express",
  django: "Django",
  fastapi: "FastAPI",
  flask: "Flask",
  go: "Go",
  golang: "Go",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  flutter: "Flutter",
  rust: "Rust",
  "c++": "C++",
  sql: "SQL",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
  aws: "AWS",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  devops: "DevOps",
  backend: "Backend",
  "back-end": "Backend",
  "back end": "Backend",
  "backend development": "Backend",
  frontend: "Frontend",
  "front-end": "Frontend",
  "front end": "Frontend",
  "frontend development": "Frontend",
  "web development": "Frontend",
  "full stack": "Full Stack",
  "full-stack": "Full Stack",
  fullstack: "Full Stack",
  mobile: "Mobile Development",
  "mobile development": "Mobile Development",
  "ui/ux": "UI/UX",
  "ux/ui": "UI/UX",
  "ui ux": "UI/UX",
  "ui/ux design": "UI/UX",
  "ux design": "UI/UX",
  "ui design": "UI/UX",
  figma: "Figma",
  "product design": "Product Design",
  "product management": "Product Management",
  marketing: "Marketing",
  "digital marketing": "Marketing",
  "social media": "Social Media",
  "content writing": "Content Writing",
  copywriting: "Content Writing",
  "event management": "Event Management",
  "event planning": "Event Management",
  operations: "Operations",
  sales: "Sales",
  "public speaking": "Public Speaking",
  "video editing": "Video Editing",
  blockchain: "Blockchain",
  solidity: "Solidity",
  iot: "IoT",
  "embedded systems": "Embedded Systems",
  arduino: "Arduino",
};

/** Capabilities implied by a more specific skill (applied to candidates, not to requirements). */
const SKILL_IMPLIES: Record<string, string[]> = {
  OpenCV: ["Computer Vision"],
  PyTorch: ["Machine Learning", "Deep Learning"],
  TensorFlow: ["Machine Learning", "Deep Learning"],
  "Deep Learning": ["Machine Learning"],
  "Computer Vision": ["Machine Learning"],
  NLP: ["Machine Learning"],
  LLMs: ["Machine Learning"],
  "Next.js": ["React", "Frontend"],
  React: ["Frontend"],
  Vue: ["Frontend"],
  Angular: ["Frontend"],
  "React Native": ["Mobile Development", "React"],
  Flutter: ["Mobile Development"],
  Swift: ["Mobile Development"],
  Kotlin: ["Mobile Development"],
  "Node.js": ["Backend"],
  Express: ["Node.js", "Backend"],
  Django: ["Python", "Backend"],
  FastAPI: ["Python", "Backend"],
  Flask: ["Python", "Backend"],
  Go: ["Backend"],
  Java: ["Backend"],
  "Full Stack": ["Frontend", "Backend"],
  Figma: ["UI/UX"],
  "Product Design": ["UI/UX"],
  Kubernetes: ["DevOps"],
  Docker: ["DevOps"],
  Solidity: ["Blockchain"],
  Arduino: ["IoT", "Embedded Systems"],
};

/** Interest vocabulary: lowercase variant -> canonical topic. */
const INTEREST_ALIASES: Record<string, string> = {
  ai: "AI",
  "artificial intelligence": "AI",
  "machine learning": "AI",
  ml: "AI",
  llms: "AI",
  "generative ai": "AI",
  "deep learning": "AI",
  "computer vision": "Computer Vision",
  sports: "Sports",
  sport: "Sports",
  football: "Sports",
  soccer: "Sports",
  cricket: "Sports",
  basketball: "Sports",
  tennis: "Sports",
  fitness: "Sports",
  esports: "Gaming",
  gaming: "Gaming",
  games: "Gaming",
  design: "Design",
  "product design": "Design",
  "ui/ux": "Design",
  art: "Design",
  startups: "Startups",
  startup: "Startups",
  entrepreneurship: "Startups",
  health: "Healthcare",
  healthcare: "Healthcare",
  medtech: "Healthcare",
  "mental health": "Healthcare",
  education: "Education",
  edtech: "Education",
  learning: "Education",
  finance: "Fintech",
  fintech: "Fintech",
  music: "Music",
  climate: "Climate",
  sustainability: "Climate",
  environment: "Climate",
  "social impact": "Social Impact",
  nonprofit: "Social Impact",
  community: "Social Impact",
  web3: "Web3",
  blockchain: "Web3",
  crypto: "Web3",
  events: "Events",
  hackathons: "Events",
  photography: "Photography",
  travel: "Travel",
  food: "Food",
  agriculture: "Agriculture",
  robotics: "Robotics",
  space: "Space",
  analytics: "Data",
  data: "Data",
};

/** Short or common-English tokens that must not be picked up when scanning free text. */
const SCAN_EXCLUDE = new Set(["go", "ts", "js", "ml", "dl", "cv", "node", "next", "mobile", "learning", "data", "art", "space", "food", "travel", "community", "environment", "health", "design", "events", "analytics", "sales", "operations", "marketing"]);

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

export const keyOf = (s: string): string => collapse(s).toLowerCase();

export function canonicalSkill(raw: string): string {
  const cleaned = collapse(raw);
  return SKILL_ALIASES[cleaned.toLowerCase()] ?? cleaned;
}

export function canonicalInterest(raw: string): string {
  const cleaned = collapse(raw);
  return INTEREST_ALIASES[cleaned.toLowerCase()] ?? cleaned;
}

/** Canonicalises and de-duplicates (case-insensitively), preserving first-seen order. */
export function uniqueCanonical(values: readonly string[], canon: (s: string) => string = canonicalSkill): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || !value.trim()) continue;
    const c = canon(value);
    const k = keyOf(c);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/**
 * A person's skills plus everything those skills imply, as lowercase key -> depth
 * (0 = listed directly, 1 = implied by a listed skill, ...). Breadth-first, so the
 * shallowest depth wins.
 */
export function skillDepths(skills: readonly string[]): Map<string, number> {
  const depths = new Map<string, number>();
  let frontier = uniqueCanonical(skills);
  for (let depth = 0; frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const skill of frontier) {
      const k = keyOf(skill);
      if (depths.has(k)) continue;
      depths.set(k, depth);
      next.push(...(SKILL_IMPLIES[skill] ?? []));
    }
    frontier = next;
  }
  return depths;
}

/** A person's skills plus everything those skills imply, as lowercase keys. */
export const expandedSkillKeys = (skills: readonly string[]): Set<string> => new Set(skillDepths(skills).keys());

/** Canonical interest keys for a person. */
export function interestKeys(interests: readonly string[]): Set<string> {
  return new Set(interests.map((i) => keyOf(canonicalInterest(i))));
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

function scan(text: string, aliases: Record<string, string>, extraTerms: string[] = []): string[] {
  const terms = new Map<string, string>();
  for (const [variant, canonical] of Object.entries(aliases)) {
    if (!SCAN_EXCLUDE.has(variant)) terms.set(variant, canonical);
  }
  for (const term of extraTerms) {
    const k = keyOf(term);
    if (!SCAN_EXCLUDE.has(k) && !terms.has(k)) terms.set(k, term);
  }
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [variant, canonical] of terms) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(variant)}(?![a-z0-9])`);
    if (re.test(lower)) found.push(canonical);
  }
  return uniqueCanonical(found, (s) => s);
}

/** Every canonical skill name the platform knows about. */
export const KNOWN_SKILLS: string[] = uniqueCanonical([...Object.values(SKILL_ALIASES), ...Object.keys(SKILL_IMPLIES), ...Object.values(SKILL_IMPLIES).flat()], (s) => s);

/** Skills mentioned in free text (used for the no-Bedrock fallback and to validate AI text). */
export const scanSkills = (text: string): string[] => scan(text, SKILL_ALIASES, KNOWN_SKILLS);

/** Topics (interest categories) mentioned in free text. */
export const scanTopics = (text: string): string[] => scan(text, INTEREST_ALIASES);

/** Role keywords -> skills that role is about. Used to suggest roles and to find missing roles. */
const ROLE_SKILLS: Array<[RegExp, string[]]> = [
  [/front[- ]?end|web dev|ui engineer/, ["Frontend", "React"]],
  [/back[- ]?end|api|server/, ["Backend"]],
  [/full[- ]?stack/, ["Frontend", "Backend", "Full Stack"]],
  [/\bml\b|machine learning|data scien|ai engineer|\bai\b/, ["Machine Learning"]],
  [/vision|\bcv\b/, ["Computer Vision"]],
  [/nlp|language/, ["NLP", "LLMs"]],
  [/design|\bux\b|\bui\b/, ["UI/UX", "Product Design", "Figma"]],
  [/mobile|android|ios|app developer/, ["Mobile Development"]],
  [/devops|cloud|infra|platform/, ["DevOps", "AWS"]],
  [/data (engineer|analyst)|analytics/, ["Data Analysis", "SQL"]],
  [/market|growth|social media|community/, ["Marketing", "Social Media"]],
  [/product manager|product owner/, ["Product Management"]],
  [/event|operations|ops\b/, ["Event Management", "Operations"]],
  [/content|writer/, ["Content Writing"]],
  [/blockchain|web3|smart contract/, ["Blockchain"]],
  [/hardware|iot|embedded/, ["IoT", "Embedded Systems"]],
];

/** Lowercase skill keys a role needs. */
export function roleSkillKeys(role: string): Set<string> {
  const lower = role.toLowerCase();
  const keys = new Set<string>();
  for (const [pattern, skills] of ROLE_SKILLS) {
    if (pattern.test(lower)) skills.forEach((s) => keys.add(keyOf(s)));
  }
  for (const skill of scanSkills(role)) keys.add(keyOf(skill));
  return keys;
}

export interface RoleContext {
  /** Roles already held by team members; used only if nothing else fits. */
  takenRoles?: readonly string[];
  /** Skills the team still lacks; roles covering them are preferred. */
  missingSkills?: readonly string[];
}

/**
 * Picks the project role that best fits a person's skills, or "Collaborator".
 * Directly listed skills count more than implied ones (OpenCV points to
 * "Computer Vision Engineer" before "ML Engineer"), and roles that cover the
 * team's missing skills win over roles someone already holds.
 */
export function suggestRole(requiredRoles: readonly string[], skills: readonly string[], context: RoleContext = {}): string {
  const depths = skillDepths(skills);
  const missing = new Set((context.missingSkills ?? []).map((s) => keyOf(canonicalSkill(s))));
  const taken = new Set((context.takenRoles ?? []).map(keyOf));
  let best = { role: "Collaborator", score: 0 };
  for (const role of requiredRoles) {
    let score = 0;
    for (const k of roleSkillKeys(role)) {
      const depth = depths.get(k);
      if (depth === undefined) continue;
      score += 1 / (depth + 1) + (missing.has(k) ? 2 : 0);
    }
    if (score > 0 && taken.has(keyOf(role))) score /= 10;
    if (score > best.score) best = { role, score };
  }
  return best.role;
}
