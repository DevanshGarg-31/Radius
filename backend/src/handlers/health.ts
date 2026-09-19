import type { Handler } from "../router.js";
import { config } from "../config.js";
import { isSearchEnabled } from "../services/opensearch.js";
import { isStorageEnabled } from "../services/s3.js";
import { json } from "../utils/http.js";

export const health: Handler = async () =>
  json(200, {
    ok: true,
    time: new Date().toISOString(),
    region: config.region,
    services: {
      dynamodb: config.tables,
      opensearch: isSearchEnabled() ? "enabled" : "disabled (DynamoDB fallback)",
      bedrock: config.bedrock.enabled ? config.bedrock.modelId : "disabled (fallbacks)",
      s3: isStorageEnabled() ? "enabled" : "disabled",
    },
  });
