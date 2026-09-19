/**
 * Pushes room events to everyone connected to a team room.
 *
 * In AWS the WebSocket API delivers them (PostToConnection). Locally,
 * scripts/local-server.ts plugs in its own sender. With neither, nothing is
 * pushed and the frontend falls back to polling.
 */
import { ApiGatewayManagementApiClient, GoneException, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { config } from "../config.js";
import type { RoomEvent } from "../models/room.js";
import { errorFields, log } from "../utils/logger.js";
import { db } from "./store.js";

/** Delivers data to one connection; resolves false if that connection is gone. */
type Sender = (connectionId: string, data: string) => Promise<boolean>;

let client: ApiGatewayManagementApiClient | undefined;

const awsSender: Sender = async (connectionId, data) => {
  client ??= new ApiGatewayManagementApiClient({ region: config.region, endpoint: config.realtime.managementUrl });
  try {
    await client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: new TextEncoder().encode(data) }));
    return true;
  } catch (err) {
    if (err instanceof GoneException) return false;
    throw err;
  }
};

let sender: Sender | undefined = config.realtime.managementUrl ? awsSender : undefined;

/** Used by the local dev server to deliver over its own WebSocket server. */
export function setRealtimeSender(custom: Sender): void {
  sender = custom;
}

export const isRealtimeEnabled = (): boolean => Boolean(sender);

/** Best effort: a failed push never fails the request that caused it (clients also re-sync). */
export async function broadcast(projectId: string, event: RoomEvent): Promise<void> {
  if (!sender) return;
  const send = sender;
  try {
    const connections = await db.listConnectionsByProject(projectId);
    const data = JSON.stringify(event);
    await Promise.all(
      connections.map(async ({ connectionId }) => {
        try {
          if (!(await send(connectionId, data))) await db.deleteConnection(connectionId);
        } catch (err) {
          log.warn("push to connection failed", { connectionId, ...errorFields(err) });
        }
      }),
    );
  } catch (err) {
    log.warn("broadcast failed", { projectId, ...errorFields(err) });
  }
}
