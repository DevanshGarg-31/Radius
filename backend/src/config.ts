const env = (name: string, fallback = ""): string => process.env[name]?.trim() || fallback;

export const config = {
  region: env("AWS_REGION", "us-east-1"),
  tables: {
    users: env("DYNAMODB_USERS_TABLE", "radius-users"),
    projects: env("DYNAMODB_PROJECTS_TABLE", "radius-projects"),
    requests: env("DYNAMODB_REQUESTS_TABLE", "radius-requests"),
    teams: env("DYNAMODB_TEAMS_TABLE", "radius-teams"),
  },
  s3Bucket: env("S3_BUCKET"),
  opensearch: {
    endpoint: env("OPENSEARCH_ENDPOINT"),
    usersIndex: env("OPENSEARCH_USERS_INDEX", "users-index"),
    projectsIndex: env("OPENSEARCH_PROJECTS_INDEX", "projects-index"),
  },
  bedrock: {
    modelId: env("BEDROCK_MODEL_ID", "global.anthropic.claude-sonnet-4-6"),
    enabled: env("BEDROCK_ENABLED", "true") !== "false",
  },
  corsOrigin: env("CORS_ORIGIN", "*"),
  matching: {
    candidatePoolSize: 20,
    topN: 5,
  },
} as const;
