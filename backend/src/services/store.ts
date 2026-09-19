import { config } from "../config.js";
import * as dynamo from "./dynamodb.js";
import { memoryStore } from "./memory-store.js";

/** The data store handlers use: DynamoDB, or the in-memory store when DATA_STORE=memory (local dev/tests). */
export const db: Omit<typeof dynamo, "INDEXES"> = config.dataStore === "memory" ? memoryStore : dynamo;
