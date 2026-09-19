import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Tests never call AWS: Bedrock uses fallbacks, search uses the DynamoDB path (faked in tests).
    env: { BEDROCK_ENABLED: "false", OPENSEARCH_ENDPOINT: "", S3_BUCKET: "", AWS_REGION: "us-east-1" },
  },
});
