# Radius

**A collaboration network for turning ideas into teams.** Describe what you want to build. Radius uses AWS and Claude to work out who you need, find those people, score the fit, form the team, and show what is still missing.

```
IDEA → AI ANALYSIS → SEARCH → DETERMINISTIC MATCH → AI EXPLANATION → INVITE → ACCEPT → TEAM → AI GAP ANALYSIS → FIND NEXT PERSON
```

## Architecture

| AWS service | What it does in Radius |
|---|---|
| **Amplify** | Hosts the Next.js frontend |
| **API Gateway (HTTP API)** | Public REST entry point (`ANY /{proxy+}` → Lambda) |
| **Lambda** (Node.js 22, TypeScript) | The whole backend: routing, validation, business logic |
| **DynamoDB** | Users, projects, collaboration requests, teams (transactions for accept → team) |
| **OpenSearch Service** | Finds a candidate pool for a project's skills and topics |
| **Bedrock (Claude Sonnet 4.6)** | Project analysis, match explanations, team-gap analysis (structured outputs) |
| **S3** | Profile and project images (private bucket, signed URLs) |
| **CloudWatch** | Structured logs, custom metrics (Bedrock latency, OpenSearch time), dashboard, alarm |

The core principle: **OpenSearch finds, code scores, Claude explains.** Match scores are computed deterministically in TypeScript ([backend/src/services/matching.ts](backend/src/services/matching.ts)). Claude only receives the computed facts, and its output is schema-validated and checked for invented skills. Every AI feature has a deterministic fallback, and each response says which was used (`source: "bedrock" | "fallback"`).

## Repository

```
backend/    TypeScript Lambda: API, services (DynamoDB, OpenSearch, Bedrock, S3), matching engine, tests
frontend/   Next.js (TypeScript, App Router, Tailwind) app; typed API client in src/lib/api.ts
docs/       aws-setup.md (console steps), api.md (API contract)
Collaboration_Network_Hackathon_Build_Spec.md   product and build spec
```

## Local development

Requires Node.js 22+.

```bash
# backend
cd backend
npm ci
cp .env.example .env      # fill in table names etc.; needs AWS credentials for DynamoDB/Bedrock
npm test                  # unit tests + full demo-flow test (no AWS needed)
npm run dev               # API on http://localhost:4000
npm run build             # dist/lambda.zip for the Lambda console

# frontend
cd frontend
npm ci
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

Setting up AWS for the first time: follow [docs/aws-setup.md](docs/aws-setup.md).

## Demo accounts

Seeded by `npm run seed` (see [backend/scripts/seed-data.ts](backend/scripts/seed-data.ts)):

| Username | Role in the demo |
|---|---|
| `aarav` | Founder (Python/Backend) who creates "AI Football Analytics" |
| `rahuldev` | Top match (ML + React, football + AI). Accepts the invite |
| `priyacv` | Computer vision engineer. Top match once the team's gap is Computer Vision |

## AI disclosure

This project was built with help from AI coding tools (Claude Code). The product itself uses Claude Sonnet 4.6 through Amazon Bedrock at runtime.
