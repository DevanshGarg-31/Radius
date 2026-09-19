# Radius API

Base URL: the API Gateway invoke URL (for example `https://abc123.execute-api.us-east-1.amazonaws.com`), or `http://localhost:4000` when running `npm run dev` in `backend/`.

**Auth (demo):** send the logged-in user's id in the `X-User-Id` header. "Auth" in the table below means the header is required.
**Errors:** `{ "error": "message", "details"?: ... }` with status 400 (validation), 401, 403, 404, 409 (conflict or wrong state), 500 or 503.
The typed client for the frontend is `frontend/src/lib/api.ts`.

This contract extends section 15 of the build spec. Endpoints marked ➕ were added because the demo flow needs them.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| ➕ GET | `/health` | | Status of the services the API uses |
| ➕ POST | `/auth/demo-login` | | `{ username }` or `{ userId }` → `{ user }` |
| ➕ GET | `/users` | | Everyone's summary (demo account switcher) |
| ➕ POST | `/users` | | Create a profile → `{ user }` (also indexed in OpenSearch) |
| ➕ GET | `/users/{userId}` | | Full profile |
| ➕ PUT | `/users/{userId}` | self | Update your own profile (re-indexed) |
| ➕ GET | `/users/{userId}/requests[?status=pending]` | self | **Invitations received**, including project and sender |
| ➕ GET | `/projects[?ownerId=][&memberId=][&status=]` | | List projects |
| POST | `/projects` | ✔ | Create a project. Its team is created too, with the owner as Founder |
| ➕ GET | `/projects/{projectId}` | | `{ project, owner }` |
| POST | `/projects/{projectId}/analyze` | owner | Bedrock analysis → skills, roles, category |
| GET | `/projects/{projectId}/matches` | ✔ | Search → deterministic score → Bedrock explanation |
| POST | `/projects/{projectId}/requests` | owner | Invite `{ toUserId, message?, role? }` |
| GET | `/projects/{projectId}/requests` | owner | Invitations sent |
| PUT | `/requests/{requestId}` | invitee | `{ status: "accepted" \| "rejected" }`. Accepting adds the person to the team |
| POST | `/teams` | owner | `{ projectId }`. Idempotent (teams are normally auto-created) |
| GET | `/projects/{projectId}/team` | | Team with member profiles and roles |
| GET | `/projects/{projectId}/team-gaps` | ✔ | Missing skills (computed) and roles plus advice (Bedrock) |
| ➕ POST | `/uploads/presign` | ✔ | `{ kind: "avatar"\|"project", contentType }` → signed S3 upload URL |
| ➕ GET | `/assets/{key}` | | Redirects to a short-lived S3 download URL |

## Key responses

### `POST /projects`
Request: `{ "title": "AI Football Analytics", "description": "...", "teamSize": 4, "location"?: "", "remote"?: true }`
Response `201`: `{ "projectId": "p_…", "title": "…", "project": { … } }`

### `POST /projects/{projectId}/analyze`
```json
{
  "projectId": "p_…",
  "category": "AI/Sports",
  "skills": ["Python", "Machine Learning", "Computer Vision", "React"],
  "roles": ["ML Engineer", "Frontend Developer", "Computer Vision Engineer"],
  "requirements": ["Machine learning", "Computer vision", "Frontend development"],
  "topics": ["AI", "Sports", "Computer Vision"],
  "source": "bedrock"
}
```
`source` is `"fallback"` when Bedrock was unavailable or its output failed validation.

### `GET /projects/{projectId}/matches`
Returns `409` until the project has been analysed.
```json
{
  "projectId": "p_…",
  "requiredSkills": ["Python", "Machine Learning", "Computer Vision", "React"],
  "missingSkills": ["Machine Learning", "Computer Vision", "React"],
  "weights": { "skills": 0.5, "interests": 0.2, "availability": 0.15, "experience": 0.1, "location": 0.05 },
  "searchMeta": { "source": "opensearch", "tookMs": 12, "candidatesConsidered": 14 },
  "matches": [
    {
      "userId": "u002", "name": "Rahul Sharma", "username": "rahuldev", "avatarUrl": "", "bio": "…",
      "skills": ["Python", "React", "Machine Learning"], "interests": ["Football", "AI"],
      "availability": ["weekends"], "experienceLevel": "advanced", "location": "Bengaluru",
      "score": 83,
      "matchedSkills": ["Python", "Machine Learning", "React"],
      "gapSkills": ["Machine Learning", "React"],
      "matchedInterests": ["Football", "AI"],
      "breakdown": { "skills": 0.67, "interests": 1, "availability": 1, "experience": 1, "location": 1 },
      "reason": "Rahul brings machine learning and React, two skills the team is missing, and shares your interest in football and AI.",
      "reasonSource": "bedrock",
      "suggestedRole": "Frontend Developer",
      "requestStatus": null,
      "requestId": null
    }
  ]
}
```
- `gapSkills`: required skills the candidate has that the current team lacks. The skills score counts only these, so after someone joins, "find next person" ranks people who fill the remaining gaps first.
- `requestStatus`: `null`, `pending`, `accepted` or `rejected`. Use it to show an "Invited" state on the card.

### `PUT /requests/{requestId}`
Request: `{ "status": "accepted" }` → `{ "request": {…}, "team": { "members": ["u001", "u002"], "roles": [...] } }`

### `GET /projects/{projectId}/team-gaps`
```json
{
  "projectId": "p_…",
  "requiredSkills": ["Python", "Machine Learning", "Computer Vision", "React"],
  "coveredSkills": ["Python", "Machine Learning", "React"],
  "missingSkills": ["Computer Vision"],
  "missingRoles": ["Computer Vision Engineer"],
  "recommendation": "Find a Computer Vision Engineer to build the video analysis pipeline.",
  "source": "bedrock"
}
```
`missingSkills` is computed in code. Bedrock only picks `missingRoles` from the project's own role list and writes the recommendation.

### Upload flow
1. `POST /uploads/presign` `{ "kind": "avatar", "contentType": "image/png" }` → `{ uploadUrl, assetPath, headers }`
2. Browser: `PUT uploadUrl` with the file as the body and the returned `Content-Type` header.
3. `PUT /users/{id}` with `{ "avatarUrl": API_BASE_URL + assetPath }`.

## Matching score

```
score = 100 × (0.50·skills + 0.20·interests + 0.15·availability + 0.10·experience + 0.05·location)
```

| Component | How it's calculated |
|---|---|
| skills | Share of the skills the team still needs that the candidate has. Implied skills count: OpenCV → Computer Vision, Next.js → React, PyTorch → Machine Learning, … |
| interests | Shared project topics ÷ 2, capped at 1. Topics come from the project text and category (Football counts as Sports). |
| availability | 1 if it overlaps the project's preferred availability. With no preference: 1 if the candidate lists any availability, else 0.5. |
| experience | beginner 0.5, intermediate 0.75, advanced 1. If the project states a preferred level: exact match 1, one level off 0.5, otherwise 0. |
| location | 1 if the project is remote or in the same city, else 0 |

Same inputs always give the same score. Ties are broken by skills score, then `userId`.
