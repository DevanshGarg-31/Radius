import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DeleteCommand,
  type BatchGetCommandOutput,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config.js";
import type { CachedExplanation, Project } from "../models/project.js";
import type { CollaborationRequest } from "../models/request.js";
import type { ChatMessage, RoomConnection } from "../models/room.js";
import type { Team, TeamMeeting, TeamRole } from "../models/team.js";
import type { User } from "../models/user.js";
import { conflict } from "../utils/http.js";
import { nowIso } from "../utils/ids.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }), {
  marshallOptions: { removeUndefinedValues: true },
});

const T = config.tables;

/** Index names. Create these GSIs exactly as named (see docs/aws-setup.md). */
export const INDEXES = {
  projectsByOwner: "ownerId-index",
  requestsByProject: "projectId-index",
  requestsByInvitee: "toUserId-index",
  connectionsByProject: "projectId-index",
} as const;

async function scanAll<T>(input: ScanCommandInput): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(new ScanCommand({ ...input, ExclusiveStartKey }));
    items.push(...((res.Items ?? []) as T[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function queryIndex<T>(table: string, index: string, key: string, value: string): Promise<T[]> {
  const res = await doc.send(
    new QueryCommand({
      TableName: table,
      IndexName: index,
      KeyConditionExpression: "#k = :v",
      ExpressionAttributeNames: { "#k": key },
      ExpressionAttributeValues: { ":v": value },
    }),
  );
  return (res.Items ?? []) as T[];
}

async function getItem<T>(table: string, key: Record<string, string>): Promise<T | undefined> {
  const res = await doc.send(new GetCommand({ TableName: table, Key: key }));
  return res.Item as T | undefined;
}

function isConditionFailure(err: unknown): boolean {
  return err instanceof Error && (err.name === "ConditionalCheckFailedException" || err instanceof TransactionCanceledException);
}

// ---------- Users ----------

export const getUser = (userId: string) => getItem<User>(T.users, { userId });

export async function putUser(user: User): Promise<void> {
  await doc.send(new PutCommand({ TableName: T.users, Item: user }));
}

export const listUsers = () => scanAll<User>({ TableName: T.users });

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const matches = await scanAll<User>({
    TableName: T.users,
    FilterExpression: "username = :u",
    ExpressionAttributeValues: { ":u": username },
  });
  return matches[0];
}

export async function getUsers(userIds: readonly string[]): Promise<User[]> {
  const unique = [...new Set(userIds)];
  const users: User[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    let keys: Record<string, unknown>[] | undefined = unique.slice(i, i + 100).map((userId) => ({ userId }));
    // BatchGet may return some keys as unprocessed under load; retry those.
    for (let attempt = 0; keys && keys.length > 0 && attempt < 5; attempt++) {
      const res: BatchGetCommandOutput = await doc.send(new BatchGetCommand({ RequestItems: { [T.users]: { Keys: keys } } }));
      users.push(...((res.Responses?.[T.users] ?? []) as User[]));
      keys = res.UnprocessedKeys?.[T.users]?.Keys;
    }
  }
  const order = new Map(unique.map((id, idx) => [id, idx]));
  return users.sort((a, b) => (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0));
}

// ---------- Projects ----------

export const getProject = (projectId: string) => getItem<Project>(T.projects, { projectId });

export async function putProject(project: Project): Promise<void> {
  await doc.send(new PutCommand({ TableName: T.projects, Item: project }));
}

export const listProjects = () => scanAll<Project>({ TableName: T.projects });

export const listProjectsByOwner = (ownerId: string) => queryIndex<Project>(T.projects, INDEXES.projectsByOwner, "ownerId", ownerId);

/** Creates the project and its team (owner as Founder) atomically. */
export async function createProjectWithTeam(project: Project, team: Team): Promise<void> {
  await doc.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: T.projects, Item: project, ConditionExpression: "attribute_not_exists(projectId)" } },
        { Put: { TableName: T.teams, Item: team, ConditionExpression: "attribute_not_exists(teamId)" } },
      ],
    }),
  );
}

export async function saveProjectAnalysis(
  projectId: string,
  fields: Pick<Project, "category" | "requiredSkills" | "requiredRoles" | "aiRequirements">,
): Promise<void> {
  await doc.send(
    new UpdateCommand({
      TableName: T.projects,
      Key: { projectId },
      // Requirements changed, so cached match explanations are stale.
      UpdateExpression: "SET category = :c, requiredSkills = :s, requiredRoles = :r, aiRequirements = :a, explanationCache = :empty, updatedAt = :u",
      ExpressionAttributeValues: {
        ":c": fields.category,
        ":s": fields.requiredSkills,
        ":r": fields.requiredRoles,
        ":a": fields.aiRequirements,
        ":empty": {},
        ":u": nowIso(),
      },
    }),
  );
}

export async function saveExplanationCache(projectId: string, cache: Record<string, CachedExplanation>): Promise<void> {
  await doc.send(
    new UpdateCommand({
      TableName: T.projects,
      Key: { projectId },
      UpdateExpression: "SET explanationCache = :c",
      ExpressionAttributeValues: { ":c": cache },
    }),
  );
}

// ---------- Teams ----------

export const getTeam = (teamId: string) => getItem<Team>(T.teams, { teamId });

export async function putTeam(team: Team): Promise<void> {
  await doc.send(new PutCommand({ TableName: T.teams, Item: team }));
}

/** Creates the team if it does not exist yet; returns false if it already existed. */
export async function createTeamIfMissing(team: Team): Promise<boolean> {
  try {
    await doc.send(new PutCommand({ TableName: T.teams, Item: team, ConditionExpression: "attribute_not_exists(teamId)" }));
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

/** Records the team's current call, or clears it when meeting is undefined. */
export async function setTeamMeeting(teamId: string, meeting: TeamMeeting | undefined): Promise<void> {
  await doc.send(
    new UpdateCommand({
      TableName: T.teams,
      Key: { teamId },
      UpdateExpression: meeting ? "SET meeting = :m, updatedAt = :u" : "REMOVE meeting SET updatedAt = :u",
      ExpressionAttributeValues: meeting ? { ":m": meeting, ":u": nowIso() } : { ":u": nowIso() },
    }),
  );
}

export const listTeamsForMember = (userId: string) =>
  scanAll<Team>({
    TableName: T.teams,
    FilterExpression: "contains(members, :u)",
    ExpressionAttributeValues: { ":u": userId },
  });

// ---------- Collaboration requests ----------

export const getRequest = (requestId: string) => getItem<CollaborationRequest>(T.requests, { requestId });

export const listRequestsByProject = (projectId: string) =>
  queryIndex<CollaborationRequest>(T.requests, INDEXES.requestsByProject, "projectId", projectId);

export const listRequestsForUser = (toUserId: string) =>
  queryIndex<CollaborationRequest>(T.requests, INDEXES.requestsByInvitee, "toUserId", toUserId);

/** Creates an invite. A previously rejected invite may be re-sent; a pending/accepted one may not. */
export async function createRequest(request: CollaborationRequest): Promise<void> {
  try {
    await doc.send(
      new PutCommand({
        TableName: T.requests,
        Item: request,
        ConditionExpression: "attribute_not_exists(requestId) OR #s = :rejected",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":rejected": "rejected" },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw conflict("This person has already been invited to this project");
    throw err;
  }
}

export async function rejectRequest(requestId: string, toUserId: string): Promise<void> {
  try {
    await doc.send(
      new UpdateCommand({
        TableName: T.requests,
        Key: { requestId },
        UpdateExpression: "SET #s = :rejected, updatedAt = :u",
        ConditionExpression: "#s = :pending AND toUserId = :uid",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":rejected": "rejected", ":pending": "pending", ":uid": toUserId, ":u": nowIso() },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw conflict("This request is no longer pending");
    throw err;
  }
}

/**
 * Accepts an invite in one transaction: marks the request accepted, adds the
 * member to the team and bumps the project's team size. Any concurrent change
 * (double accept, team already full) cancels the whole transaction.
 */
export async function acceptRequest(request: CollaborationRequest, project: Project, teamId: string, role: TeamRole): Promise<void> {
  const now = nowIso();
  const newSize = project.currentTeamSize + 1;
  try {
    await doc.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T.requests,
              Key: { requestId: request.requestId },
              UpdateExpression: "SET #s = :accepted, updatedAt = :u",
              ConditionExpression: "#s = :pending AND toUserId = :uid",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: { ":accepted": "accepted", ":pending": "pending", ":uid": request.toUserId, ":u": now },
            },
          },
          {
            Update: {
              TableName: T.teams,
              Key: { teamId },
              UpdateExpression: "SET members = list_append(members, :m), #r = list_append(#r, :r), updatedAt = :u",
              ConditionExpression: "attribute_exists(teamId) AND NOT contains(members, :uid)",
              ExpressionAttributeNames: { "#r": "roles" },
              ExpressionAttributeValues: { ":m": [request.toUserId], ":r": [role], ":uid": request.toUserId, ":u": now },
            },
          },
          {
            Update: {
              TableName: T.projects,
              Key: { projectId: project.projectId },
              UpdateExpression: "SET currentTeamSize = :new, #s = :status, updatedAt = :u",
              ConditionExpression: "currentTeamSize = :old AND currentTeamSize < teamSize",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: {
                ":new": newSize,
                ":old": project.currentTeamSize,
                ":status": newSize >= project.teamSize ? "full" : project.status,
                ":u": now,
              },
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (err instanceof TransactionCanceledException) {
      const reasons = err.CancellationReasons?.map((r) => r.Code ?? "None");
      throw conflict(`Could not accept: request is not pending, user is already on the team, or the team is full (${reasons?.join(", ")})`);
    }
    throw err;
  }
}

// ---------- Team room: messages and live connections ----------

export async function putMessage(message: ChatMessage): Promise<void> {
  await doc.send(new PutCommand({ TableName: T.messages, Item: message }));
}

/** Newest messages first from DynamoDB, returned oldest-first for display. after = only messages with a later sort key. */
export async function listMessages(projectId: string, opts: { limit: number; after?: string }): Promise<ChatMessage[]> {
  const res = await doc.send(
    new QueryCommand({
      TableName: T.messages,
      KeyConditionExpression: opts.after ? "projectId = :p AND sortKey > :a" : "projectId = :p",
      ExpressionAttributeValues: opts.after ? { ":p": projectId, ":a": opts.after } : { ":p": projectId },
      ScanIndexForward: false,
      Limit: opts.limit,
    }),
  );
  return ((res.Items ?? []) as ChatMessage[]).reverse();
}

export async function putConnection(connection: RoomConnection): Promise<void> {
  await doc.send(new PutCommand({ TableName: T.connections, Item: connection }));
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await doc.send(new DeleteCommand({ TableName: T.connections, Key: { connectionId } }));
}

export const listConnectionsByProject = (projectId: string) =>
  queryIndex<RoomConnection>(T.connections, INDEXES.connectionsByProject, "projectId", projectId);
