import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Tests never call AWS: in-memory data store, Bedrock fallbacks, DynamoDB-path search.
    env: { AUTH_DEV_TOKENS: "true", COGNITO_USER_POOL_ID: "", COGNITO_CLIENT_ID: "", DATA_STORE: "memory", BEDROCK_ENABLED: "false", OPENSEARCH_ENDPOINT: "", S3_BUCKET: "", AWS_REGION: "us-east-1" },
  },
});
