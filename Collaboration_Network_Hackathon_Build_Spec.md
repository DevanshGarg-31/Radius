# Collaboration Network Hackathon
## AWS-Powered Collaboration Intelligence Platform
### Build Specification, Architecture, API Contract, Agent Instructions, Demo Plan

**Purpose:** This document is the single source of truth for the hackathon team and coding agents.

---

# 1. Executive Summary

We are building a collaboration network that helps people turn an idea into a team.

The user describes what they want to build or organize. The platform uses AI to understand the project, extracts required skills and roles, searches the collaboration network for relevant people, calculates an explainable match score, explains the match, handles collaboration requests, forms a team, and identifies missing team capabilities.

### One-line pitch

> **Describe what you want to build, and AI + AWS help you find the right people, form the team, and identify what's still missing.**

### Core product loop

```text
IDEA
  ↓
CREATE PROJECT
  ↓
AI UNDERSTANDS PROJECT
  ↓
REQUIRED SKILLS / ROLES
  ↓
AWS SEARCH
  ↓
DETERMINISTIC MATCHING
  ↓
MATCH EXPLANATION
  ↓
COLLABORATION REQUEST
  ↓
ACCEPT
  ↓
TEAM FORMED
  ↓
AI TEAM GAP ANALYSIS
  ↓
FIND NEXT PERSON
```

The hackathon priority is a working, reliable end-to-end demo. Do not turn the MVP into LinkedIn + Discord + project management + chat.

---

# 2. Problem

People often have an idea but lack the right people to execute it.

Examples:

- Build an AI product but need a developer or designer.
- Organize an event but need marketing or operations.
- Start a startup project but need technical co-founders.
- Build a sports + technology project but need people interested in both.
- Execute an idea but do not know who in the existing network is suitable.

The platform connects the **opportunity** to the **people required to execute it**.

This is not positioned as a generic developer teammate finder.

It is a:

> **Collaboration network for turning ideas into teams.**

---

# 3. Hackathon Constraints

The project is being built for an AWS-focused hackathon.

Important constraints:

- AWS usage must be meaningful.
- The demo should visibly demonstrate AWS usage.
- The project must be built during the hackathon period.
- AI coding tools must be disclosed if required by the event.
- Demo video maximum: 3 minutes.
- Repository history may be checked.
- The final system must be demoable and stable.

The AWS architecture must be part of the actual product, not merely hosting.

---

# 4. Product Scope

## MVP

The MVP must support:

1. Demo login or authentication.
2. User profiles.
3. Project creation.
4. AI project analysis.
5. Required skill/role extraction.
6. Candidate discovery.
7. Deterministic candidate scoring.
8. AI match explanation.
9. Collaboration request.
10. Accept/reject request.
11. Team creation.
12. AI team-gap analysis.
13. S3 asset upload if time permits.
14. AWS-powered deployment.
15. Monitoring/logging.

## Explicitly out of scope

Do NOT build:

- Real-time chat.
- Video calls.
- Social feed.
- Mobile app.
- Payments.
- Complex notifications.
- Full project management.
- Gamification.
- Complex reputation system.
- Complex vector search before the core flow works.
- Large recommendation research systems.
- Overly complicated authentication.
- Microservices for the sake of microservices.

Before adding any feature, ask:

> **Does this improve IDEA → MATCH → TEAM?**

If not, it probably does not belong in the MVP.

---

# 5. AWS Strategy

AWS must power real product functionality.

## Core AWS services

| Service | Responsibility |
|---|---|
| AWS Amplify | React hosting/deployment |
| API Gateway | REST API entry point |
| AWS Lambda | Backend compute |
| DynamoDB | Core application data |
| Amazon OpenSearch Service | Candidate/project discovery |
| Amazon Bedrock | AI project understanding, explanations and team-gap analysis |
| Amazon S3 | Profile/project assets |
| Amazon CloudWatch | Logs and monitoring |
| IAM | Permissions |
| Cognito | Optional authentication if time permits |

## Optional

SQS may be added only after the core flow is stable.

Possible use:

```text
Create Project
     ↓
DynamoDB
     ↓
SQS
     ↓
Analysis Lambda
     ↓
Amazon Bedrock
     ↓
DynamoDB
```

Do not add SQS merely to increase the AWS service count.

---

# 6. AI Model

Use:

> **Amazon Bedrock with Claude Sonnet 4.6**

Use it for:

1. Project analysis.
2. Match explanation.
3. Team-gap analysis.

Do not use the LLM to calculate the match score.

### Architecture principle

```text
OpenSearch = FIND
Python = SCORE
Claude = EXPLAIN / ANALYZE
```

This makes the system more explainable and reduces hallucination risk.

If cost or latency becomes a concern, Claude Haiku 4.5 can be used as a fallback. The hackathon does not require massive model traffic, so Sonnet should be the default.

---

# 7. Final Architecture

```text
                         USER
                           │
                           ▼
                    React Web App
                           │
                           ▼
                    AWS Amplify
                           │
                           ▼
                     API Gateway
                           │
                           ▼
                        Lambda
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
      DynamoDB         OpenSearch            S3
          │                │
          │                ▼
          │         Candidate Search
          │                │
          │                ▼
          │        Python Matching
          │                │
          └────────────────┼──────────────┐
                           ▼              │
                    Amazon Bedrock        │
                    Claude Sonnet         │
                           │              │
              ┌────────────┼───────────┐  │
              ▼            ▼           ▼  │
         Project AI    Match Reason   Team Gap
          Analysis      Analysis      Analysis
```

---

# 8. Technology Stack

> **Amendment (2026-09-19): team decision.** The stack below is superseded:
> - **Backend:** TypeScript on Node.js 22 (AWS Lambda), zod for validation instead of Pydantic, AWS SDK v3, Anthropic Bedrock SDK (`@anthropic-ai/bedrock-sdk`) for Claude. One Lambda behind an API Gateway **HTTP API** (`ANY /{proxy+}`), with routing in code. The layout follows section 16 under `backend/src/` (handlers, services, models, utils).
> - **Frontend:** Next.js (TypeScript, App Router, Tailwind) instead of React + Vite, hosted on Amplify.
> - **API contract:** section 15 is extended (not changed) by the endpoints marked ➕ in [docs/api.md](docs/api.md), such as `GET /users/{userId}/requests` for the invitee's inbox and the demo login.
> - AWS setup steps: [docs/aws-setup.md](docs/aws-setup.md).

## Frontend

- React
- Vite
- JavaScript or TypeScript
- Tailwind CSS if already comfortable
- React Router
- Fetch/Axios

Keep the UI clean and demo-friendly.

## Backend

- Python
- AWS Lambda
- API Gateway
- boto3
- Pydantic for validation
- Small modular service layer

Do not create an unnecessarily complicated FastAPI deployment if Lambda handlers are simpler.

## Database

- DynamoDB

Core entities:

- Users
- Projects
- Collaboration Requests
- Teams

## Search

- Amazon OpenSearch

Initial search can be keyword/structured matching.

Do not begin with complicated embeddings/vector search.

## AI

- Amazon Bedrock
- Claude Sonnet 4.6

## Storage

- Amazon S3

## Hosting

- AWS Amplify

---

# 9. Data Model

## User

```json
{
  "userId": "u123",
  "name": "Rahul",
  "username": "rahuldev",
  "email": "rahul@example.com",
  "bio": "Backend and AI developer",
  "avatarUrl": "",
  "skills": [
    "Python",
    "React",
    "Machine Learning"
  ],
  "interests": [
    "Football",
    "AI"
  ],
  "availability": [
    "weekends"
  ],
  "experienceLevel": "intermediate",
  "location": "Bengaluru",
  "githubUrl": "",
  "createdAt": "",
  "updatedAt": ""
}
```

## Project

```json
{
  "projectId": "p123",
  "ownerId": "u001",
  "title": "AI Football Analytics",
  "description": "Build a platform that analyzes football matches using computer vision and machine learning.",
  "category": "AI/Sports",
  "requiredSkills": [
    "Python",
    "Machine Learning",
    "Computer Vision",
    "React"
  ],
  "preferredSkills": [],
  "requiredRoles": [
    "ML Engineer",
    "Frontend Developer",
    "Computer Vision Engineer"
  ],
  "teamSize": 4,
  "currentTeamSize": 1,
  "location": "Bengaluru",
  "remote": true,
  "status": "open",
  "aiRequirements": {},
  "createdAt": "",
  "updatedAt": ""
}
```

## Collaboration Request

```json
{
  "requestId": "r123",
  "projectId": "p123",
  "fromUserId": "u001",
  "toUserId": "u456",
  "message": "We think your ML and football interests are a strong fit.",
  "status": "pending",
  "createdAt": ""
}
```

Statuses:

- pending
- accepted
- rejected

## Team

```json
{
  "teamId": "t123",
  "projectId": "p123",
  "members": [
    "u001",
    "u456"
  ],
  "roles": [
    {
      "userId": "u001",
      "role": "Founder"
    },
    {
      "userId": "u456",
      "role": "ML Engineer"
    }
  ],
  "createdAt": "",
  "updatedAt": ""
}
```

---

# 10. OpenSearch

Create at minimum:

```text
users-index
projects-index
```

User search document:

```json
{
  "userId": "u456",
  "name": "Rahul",
  "skills": [
    "Python",
    "React",
    "Machine Learning"
  ],
  "interests": [
    "Football",
    "AI"
  ],
  "availability": [
    "weekends"
  ],
  "experienceLevel": "intermediate"
}
```

Project search document:

```json
{
  "projectId": "p123",
  "requiredSkills": [
    "Python",
    "Machine Learning",
    "Computer Vision"
  ],
  "category": "AI/Sports",
  "description": "AI football analytics platform",
  "requirements": []
}
```

Initial OpenSearch goal:

> Given project requirements, retrieve a small set of relevant candidates.

Do not attempt sophisticated recommendation science.

---

# 11. Matching Algorithm

The deterministic matching engine calculates the score.

Suggested weights:

```text
Skills        50%
Interests     20%
Availability  15%
Experience    10%
Location       5%
```

Formula:

```text
score =
    skillMatch * 0.50
  + interestMatch * 0.20
  + availabilityMatch * 0.15
  + experienceMatch * 0.10
  + locationMatch * 0.05
```

Normalize the final result to 0-100.

Example:

```json
{
  "userId": "u456",
  "matchScore": 91,
  "matchedSkills": [
    "Python",
    "React",
    "Machine Learning"
  ],
  "matchedInterests": [
    "Football",
    "AI"
  ]
}
```

The score must be deterministic and reproducible.

---

# 12. Bedrock Feature 1: Project Analysis

Endpoint:

```http
POST /projects/{projectId}/analyze
```

Input:

```json
{
  "title": "AI Football Analytics",
  "description": "Build a platform that analyzes football matches using computer vision and machine learning."
}
```

Expected output:

```json
{
  "category": "AI/Sports",
  "skills": [
    "Python",
    "Machine Learning",
    "Computer Vision",
    "React"
  ],
  "roles": [
    "ML Engineer",
    "Frontend Developer",
    "Computer Vision Engineer"
  ],
  "requirements": [
    "Machine learning",
    "Computer vision",
    "Frontend development"
  ]
}
```

Use structured output / strict schema validation.

Never blindly trust raw model output.

---

# 13. Bedrock Feature 2: Match Explanation

The model receives only factual information.

Example:

```json
{
  "project": {
    "title": "AI Football Analytics",
    "requiredSkills": [
      "Python",
      "Machine Learning",
      "Computer Vision"
    ]
  },
  "candidate": {
    "name": "Rahul",
    "skills": [
      "Python",
      "React",
      "Machine Learning"
    ],
    "interests": [
      "Football",
      "AI"
    ]
  },
  "match": {
    "score": 91,
    "matchedSkills": [
      "Python",
      "Machine Learning"
    ],
    "matchedInterests": [
      "Football",
      "AI"
    ]
  }
}
```

Expected output:

```json
{
  "reason": "Strong match because the candidate has relevant Python and machine learning skills and shares interests in football and AI."
}
```

The model must not invent qualifications.

---

# 14. Bedrock Feature 3: Team Gap Analysis

Input:

```json
{
  "projectRequirements": {
    "skills": [
      "Python",
      "Machine Learning",
      "Computer Vision",
      "React"
    ],
    "roles": [
      "ML Engineer",
      "Frontend Developer",
      "Computer Vision Engineer"
    ]
  },
  "currentTeam": [
    {
      "name": "Founder",
      "skills": [
        "Python",
        "Backend"
      ]
    },
    {
      "name": "Frontend Developer",
      "skills": [
        "React"
      ]
    }
  ]
}
```

Output:

```json
{
  "missingSkills": [
    "Computer Vision"
  ],
  "missingRoles": [
    "Computer Vision Engineer"
  ],
  "recommendation": "Find a Computer Vision Engineer."
}
```

Again, do not allow the model to invent team member skills.

---

# 15. API Contract

Freeze this contract before frontend/backend teams work independently.

## Create project

```http
POST /projects
```

Request:

```json
{
  "title": "AI Football Analytics",
  "description": "Build an AI football analytics platform.",
  "teamSize": 4
}
```

Response:

```json
{
  "projectId": "p123",
  "title": "AI Football Analytics"
}
```

## Analyze project

```http
POST /projects/{projectId}/analyze
```

Response:

```json
{
  "skills": [
    "Python",
    "React",
    "Machine Learning"
  ],
  "roles": [
    "ML Engineer",
    "Frontend Developer"
  ],
  "category": "AI/Technology"
}
```

## Find matches

```http
GET /projects/{projectId}/matches
```

Response:

```json
{
  "matches": [
    {
      "userId": "u456",
      "score": 91,
      "matchedSkills": [
        "Python",
        "React"
      ],
      "reason": "Strong technical and interest overlap."
    }
  ]
}
```

## Collaboration

```http
POST /projects/{projectId}/requests
GET /projects/{projectId}/requests
PUT /requests/{requestId}
```

## Team

```http
POST /teams
GET /projects/{projectId}/team
```

## Team gap

```http
GET /projects/{projectId}/team-gaps
```

---

# 16. Backend Structure

Recommended:

```text
backend/
  app/
    handlers/
      projects.py
      users.py
      matches.py
      requests.py
      teams.py

    services/
      dynamodb.py
      opensearch.py
      bedrock.py
      matching.py
      s3.py

    models/
      user.py
      project.py
      request.py
      team.py

    utils/
      validation.py
      response.py

    config.py

  requirements.txt
```

Keep services independent.

Example:

```text
projects handler
       ↓
project service
       ↓
DynamoDB

matches handler
       ↓
OpenSearch service
       ↓
matching service
       ↓
Bedrock explanation service
```

---

# 17. Frontend Pages

Build only the pages needed for the demo.

```text
/
landing

/login

/dashboard

/profile

/projects/new

/projects/:id

/projects/:id/matches

/projects/:id/team
```

Important components:

```text
Navbar
ProjectCard
UserCard
MatchCard
SkillBadge
TeamMemberCard
GapAnalysisCard
LoadingState
ErrorState
```

Priority screens:

1. Create Project
2. Matches
3. Team

These must look polished.

Other screens can be simple.

---

# 18. Frontend Demo Flow

The exact happy path:

```text
Login
 ↓
Dashboard
 ↓
Create Project
 ↓
Enter project description
 ↓
Analyze with AI
 ↓
Show extracted skills/roles
 ↓
Find Matches
 ↓
Show candidate cards
 ↓
Open candidate
 ↓
Show match score + explanation
 ↓
Invite
 ↓
Switch to candidate/demo account
 ↓
Accept
 ↓
Team page
 ↓
Analyze Team
 ↓
Show missing Computer Vision Engineer
```

This should work repeatedly.

---

# 19. Seed Data

Do not depend on real users.

Create deterministic demo data.

At least:

```text
20-30 users
10-15 projects
```

For the final demo, use:

```text
5-10 users
3-5 projects
```

Example candidate profiles:

### User A

```text
Skills:
Python
Machine Learning
Computer Vision

Interests:
Football
AI
```

### User B

```text
Skills:
React
TypeScript
Next.js

Interests:
Football
Design
```

### User C

```text
Skills:
Go
Backend
PostgreSQL

Interests:
AI
Startups
```

### User D

```text
Skills:
UI/UX
Figma
Product Design

Interests:
Sports
Startups
```

### User E

```text
Skills:
Python
OpenCV
PyTorch

Interests:
Football
Computer Vision
```

The demo should reliably produce an obvious high-match candidate.

---

# 20. AWS Resource Checklist

Create and verify:

```text
[ ] IAM roles
[ ] DynamoDB tables
[ ] S3 bucket
[ ] Lambda functions
[ ] API Gateway API
[ ] OpenSearch domain/index
[ ] Bedrock model access
[ ] CloudWatch logs
[ ] Amplify application
[ ] Optional Cognito user pool
```

Use least-privilege IAM where practical.

Never commit AWS credentials.

Never commit:

```text
.env
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
Bedrock credentials
API keys
```

---

# 21. Environment Variables

Example:

```env
AWS_REGION=
DYNAMODB_USERS_TABLE=
DYNAMODB_PROJECTS_TABLE=
DYNAMODB_REQUESTS_TABLE=
DYNAMODB_TEAMS_TABLE=
S3_BUCKET=
OPENSEARCH_ENDPOINT=
BEDROCK_MODEL_ID=
```

Frontend:

```env
VITE_API_BASE_URL=
```

Do not put AWS secret credentials into the frontend.

---

# 22. Agent Coding Rules

This section is specifically for coding agents.

## Rule 1

Do not redesign the architecture without team approval.

## Rule 2

Do not add dependencies unless necessary.

## Rule 3

Do not introduce a new AWS service merely to increase service count.

## Rule 4

Do not modify API contracts without updating this document and notifying the team.

## Rule 5

Do not hardcode secrets.

## Rule 6

Do not replace deterministic matching with an LLM.

## Rule 7

Do not invent user/project attributes in AI responses.

## Rule 8

Validate all Bedrock structured outputs.

## Rule 9

Keep functions small.

## Rule 10

Write code that can be deployed to AWS Lambda.

## Rule 11

Do not create unnecessary abstractions.

## Rule 12

Before implementing a feature, check whether it improves:

```text
IDEA → MATCH → TEAM
```

## Rule 13

Prefer the simplest implementation that can survive the demo.

## Rule 14

Every significant change should be committed.

## Rule 15

Do not rewrite working code without a concrete reason.

---

# 23. Git Strategy

Branches:

```text
main

feature/backend
feature/ai
feature/frontend
feature/aws
```

Workflow:

```text
branch
 ↓
commit
 ↓
push
 ↓
PR
 ↓
review
 ↓
merge
```

Merge frequently.

Do not allow a team member to work for many hours without integration.

Commit messages should be clear:

```text
feat: add project creation API
feat: integrate Bedrock project analyzer
feat: add OpenSearch candidate search
feat: implement deterministic matching
feat: add team gap analysis
fix: handle empty match results
```

---

# 24. Team Responsibilities

## Person 1: Backend + AWS

Own:

- Lambda
- API Gateway
- DynamoDB
- Backend APIs
- Requests
- Teams
- IAM

Deliverable:

> Complete backend workflow.

## Person 2: AI + Search

Own:

- Bedrock
- Project analysis
- OpenSearch
- Matching engine
- Match explanation
- Team-gap analysis

Deliverable:

> Intelligent and explainable matching.

## Person 3: Frontend

Own:

- React
- Landing
- Dashboard
- Create Project
- Matches
- Project Details
- Team
- API integration

Deliverable:

> Clean demo experience.

## Person 4: DevOps + QA + Product

Own:

- Amplify
- S3
- CloudWatch
- Environment setup
- Seed data
- Deployment
- QA
- Architecture diagram
- Demo preparation
- README

Deliverable:

> Stable live system and demo.

---

# 25. Execution Plan

## Phase 1: Foundation

Target:

```text
React
 ↓
API Gateway
 ↓
Lambda
 ↓
DynamoDB
```

Must return:

```text
200 OK
```

Do not continue until this works.

---

## Phase 2: Project Analysis

Implement:

```http
POST /projects
POST /projects/{id}/analyze
```

Flow:

```text
Project
 ↓
Lambda
 ↓
Bedrock
 ↓
Structured JSON
 ↓
DynamoDB
```

---

## Phase 3: Search

Implement:

```text
users
 ↓
OpenSearch
```

Then:

```text
project requirements
 ↓
OpenSearch
 ↓
candidate IDs
```

---

## Phase 4: Matching

Implement deterministic scoring.

Target:

```text
Candidate A: 91%
Candidate B: 84%
Candidate C: 76%
```

---

## Phase 5: Explanation

Pass the factual score and matched attributes to Bedrock.

Return a short explanation.

---

## Phase 6: Collaboration

Implement:

```text
Invite
 ↓
Request
 ↓
Accept
 ↓
Team
```

No chat.

---

## Phase 7: Team Gap

Implement:

```text
Project requirements
        +
Current team
        ↓
Bedrock
        ↓
Missing capabilities
```

---

## Phase 8: Deployment

Deploy:

```text
React → Amplify
API → API Gateway + Lambda
Data → DynamoDB
Search → OpenSearch
AI → Bedrock
Assets → S3
Logs → CloudWatch
```

---

# 26. Checkpoints

## Early checkpoint

Must have:

```text
[ ] AWS account configured
[ ] Lambda working
[ ] API Gateway working
[ ] DynamoDB working
[ ] React running
[ ] Bedrock test working
```

## MVP checkpoint

Must have:

```text
Create Project
 ↓
AI Analysis
 ↓
Matches
 ↓
Invite
 ↓
Accept
 ↓
Team
```

## Final checkpoint

Must have:

```text
[ ] Live URL
[ ] Complete demo flow
[ ] No critical bugs
[ ] README
[ ] Architecture
[ ] API documentation
[ ] AI disclosure
[ ] No secrets in GitHub
[ ] Demo video
```

Once the final checkpoint is reached:

> **STOP ADDING FEATURES.**

---

# 27. Failure Fallbacks

## OpenSearch fails

Fallback:

```text
DynamoDB
 ↓
Python filtering/scoring
```

Do not allow OpenSearch to prevent the demo.

Bring OpenSearch back if time permits.

## Bedrock fails

Have a development/demo fallback:

```text
Pre-generated structured analysis
```

But the live demo should use Bedrock whenever possible.

## Authentication fails

Use controlled demo login.

## S3 fails

Remove profile image upload from the critical path.

## Deployment fails

Use the simplest working AWS deployment.

The demo must prioritize reliability over architectural perfection.

---

# 28. Cost Control

The AWS account has approximately $100 in credits.

Do not assume every AWS resource is free.

Monitor:

- OpenSearch
- Bedrock usage
- Any continuously running provisioned services
- Storage
- Data transfer

Set an AWS Budget alert.

Recommended development budget:

```text
Alert at $10
Alert at $20
Alert at $50
Alert at $80
```

Avoid unnecessary Bedrock calls.

Do not send hundreds of users to the model when OpenSearch can reduce the candidate set first.

Correct:

```text
OpenSearch
 ↓
Top 5 candidates
 ↓
Bedrock
```

Incorrect:

```text
500 users
 ↓
Bedrock
 ↓
Pick candidate
```

---

# 29. Demo Story

The demo should tell a story, not just show screens.

## 0:00-0:20

Problem:

> "People have ideas, but finding the right people to execute those ideas is difficult."

## 0:20-0:45

Create:

**AI Football Analytics**

## 0:45-1:05

Show Bedrock understanding:

```text
Python
Machine Learning
Computer Vision
React

ML Engineer
Frontend Developer
Computer Vision Engineer
```

## 1:05-1:30

Show AWS OpenSearch finding candidates.

## 1:30-1:50

Show deterministic match:

```text
91% Match
```

Then show AI-generated explanation.

## 1:50-2:10

Send invitation.

Accept invitation.

Show team.

## 2:10-2:30

Run team analysis.

Show:

```text
Missing:
Computer Vision Engineer
```

## 2:30-3:00

Show AWS architecture.

Explain:

> "Amplify delivers the application, API Gateway exposes the API, Lambda runs the backend, DynamoDB stores the collaboration data, OpenSearch finds candidates, Bedrock provides project and team intelligence, S3 stores assets, and CloudWatch provides monitoring."

Finish:

> **"We don't use AWS just to host the product. AWS is part of how the product stores, searches, computes and understands collaboration."**

---

# 30. Architecture Presentation

Use this exact visual:

```text
                     COLLABORATION NETWORK

                              USER
                               │
                               ▼
                         React / Amplify
                               │
                               ▼
                          API Gateway
                               │
                               ▼
                             Lambda
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
      DynamoDB             OpenSearch               S3
          │                    │
          │                    ▼
          │              Candidate Search
          │                    │
          │                    ▼
          │             Matching Engine
          │                    │
          └────────────────────┼──────────────┐
                               ▼              │
                          Amazon Bedrock      │
                         Claude Sonnet       │
                               │              │
                    ┌──────────┼──────────┐   │
                    ▼          ▼          ▼   │
                 Project     Match      Team │
                 Analysis   Explanation   Gap │
                                             │
                                             ▼
                                          CloudWatch
```

---

# 31. Product Differentiation

Do not pitch:

> "An AI platform for finding developers."

Pitch:

> **"A collaboration network for turning ideas into teams."**

The AI is the intelligence layer.

AWS is the data, compute, search, AI and infrastructure layer.

The product is:

```text
IDEA
 ↓
PEOPLE
 ↓
COLLABORATION
 ↓
TEAM
```

The long-term differentiator can eventually become collaboration reputation based on actual collaboration history.

That is not part of the hackathon MVP.

---

# 32. Future Scope

Possible future features:

- Collaboration reputation.
- Smarter recommendations.
- Embedding/vector search.
- Project lifecycle management.
- Tasks and milestones.
- Chat.
- Calls.
- Events.
- Co-founder discovery.
- Mentor discovery.
- Freelancer/volunteer matching.
- Collaboration graph.
- Team capability intelligence.

Do not build these during the core hackathon unless the MVP is already stable.

---

# 33. Definition of Done

The project is DONE when a judge can:

1. Open the live application.
2. Create/open a project.
3. See AI understand the project.
4. See required skills and roles.
5. See candidates found through AWS-powered search.
6. See an objective match score.
7. See an AI explanation.
8. Send an invitation.
9. Accept the invitation.
10. See the resulting team.
11. Run team-gap analysis.
12. See a missing capability.
13. Understand where AWS is used.

If these work reliably, the project is ready.

---

# 34. Final Rule

Do not optimize for number of features.

Optimize for:

```text
RELIABLE DEMO
       +
REAL AWS USAGE
       +
CLEAR PRODUCT STORY
       +
EXPLAINABLE AI
```

The winning implementation is not the one with the most services.

It is the one where every major service has a clear reason to exist and the entire journey works from:

> **IDEA → MATCH → TEAM.**
