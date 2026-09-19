import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws-v3";
import { config } from "../config.js";
import type { Project } from "../models/project.js";
import type { User } from "../models/user.js";
import { canonicalSkill, expandedSkillKeys, interestKeys, keyOf, scanTopics, uniqueCanonical } from "../utils/skills.js";

const { endpoint, usersIndex, projectsIndex } = config.opensearch;

export const isSearchEnabled = (): boolean => Boolean(endpoint);

let client: Client | undefined;

function getClient(): Client {
  if (!client) {
    const credentials = defaultProvider();
    client = new Client({
      ...AwsSigv4Signer({ region: config.region, service: "es", getCredentials: () => credentials() }),
      node: endpoint.startsWith("http") ? endpoint : `https://${endpoint}`,
      requestTimeout: 5000,
    });
  }
  return client;
}

const keyword = { type: "keyword" } as const;
const text = { type: "text" } as const;

export const INDEX_MAPPINGS: Record<string, { properties: Record<string, { type: "keyword" | "text" }> }> = {
  [usersIndex]: {
    properties: {
      userId: keyword,
      name: text,
      skills: text,
      skillKeys: keyword,
      interestKeys: keyword,
      availability: keyword,
      experienceLevel: keyword,
      location: keyword,
    },
  },
  [projectsIndex]: {
    properties: {
      projectId: keyword,
      ownerId: keyword,
      title: text,
      description: text,
      category: keyword,
      requiredSkillKeys: keyword,
      topicKeys: keyword,
      status: keyword,
    },
  },
};

/** Creates both indices if they do not exist. Used by scripts/create-indices.ts. */
export async function createIndices(): Promise<string[]> {
  const created: string[] = [];
  for (const [index, mappings] of Object.entries(INDEX_MAPPINGS)) {
    const exists = await getClient().indices.exists({ index });
    if (exists.body) continue;
    await getClient().indices.create({ index, body: { settings: { number_of_shards: 1, number_of_replicas: 0 }, mappings } });
    created.push(index);
  }
  return created;
}

export function userDocument(user: User) {
  return {
    userId: user.userId,
    name: user.name,
    skills: user.skills.join(", "),
    skillKeys: [...expandedSkillKeys(user.skills)],
    interestKeys: [...interestKeys(user.interests)],
    availability: user.availability.map(keyOf),
    experienceLevel: user.experienceLevel,
    location: keyOf(user.location),
  };
}

export function projectDocument(project: Project) {
  const topics = uniqueCanonical([...(project.aiRequirements?.topics ?? []), ...scanTopics(`${project.title} ${project.description} ${project.category}`)], (s) => s);
  return {
    projectId: project.projectId,
    ownerId: project.ownerId,
    title: project.title,
    description: project.description,
    category: project.category,
    requiredSkillKeys: project.requiredSkills.map((s) => keyOf(canonicalSkill(s))),
    topicKeys: topics.map(keyOf),
    status: project.status,
  };
}

export async function indexUser(user: User): Promise<void> {
  if (!isSearchEnabled()) return;
  await getClient().index({ index: usersIndex, id: user.userId, body: userDocument(user), refresh: true });
}

export async function indexProject(project: Project): Promise<void> {
  if (!isSearchEnabled()) return;
  await getClient().index({ index: projectsIndex, id: project.projectId, body: projectDocument(project), refresh: true });
}

export interface CandidateQuery {
  skillKeys: string[];
  topicKeys: string[];
  excludeUserIds: string[];
  size: number;
}

/**
 * Retrieves a small candidate pool: anyone with at least one wanted skill or
 * shared topic, ranked by OpenSearch relevance (skills weighted over interests).
 * Final ordering is done by the deterministic matching engine, not here.
 */
export async function searchCandidates(q: CandidateQuery): Promise<{ userIds: string[]; tookMs: number }> {
  const should: object[] = [];
  if (q.skillKeys.length) should.push({ terms: { skillKeys: q.skillKeys, boost: 3 } });
  if (q.topicKeys.length) should.push({ terms: { interestKeys: q.topicKeys, boost: 1 } });
  if (!should.length) return { userIds: [], tookMs: 0 };

  const res = await getClient().search({
    index: usersIndex,
    body: {
      size: q.size,
      _source: ["userId"],
      query: {
        bool: {
          should,
          minimum_should_match: 1,
          must_not: q.excludeUserIds.length ? [{ ids: { values: q.excludeUserIds } }] : [],
        },
      },
    },
  });
  const body = res.body as unknown as { took: number; hits: { hits: Array<{ _id: string }> } };
  return { userIds: body.hits.hits.map((h) => h._id), tookMs: body.took };
}
