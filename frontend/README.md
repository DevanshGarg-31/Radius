# radius frontend

Next.js (App Router, TypeScript, Tailwind v4). Design brief: [../frontend-instruction.md](../frontend-instruction.md) (see "Revision 2" at the top).

## Run it locally with no AWS

```bash
# terminal 1: the real API with in-memory demo data
cd backend && npm ci && npm run dev:memory     # http://localhost:4000

# terminal 2
cd frontend && npm ci && npm run dev           # http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to point at the deployed API Gateway URL instead.

## Demo path

Sign in as **Aarav** → Start a project → "Use an example" → **Find my people** → **Why this person?** on Rahul → **Invite** → **Switch to Rahul's account** → **Accept and join** → **Back to Aarav's view** → **Analyze the team** → **Find them** (Priya, Computer Vision).

## Layout

```
src/app/            routes: / (landing), /login, and the signed-in (app) group
src/components/     ui/ (design system), layout/, network/ (collaboration graph),
                    people/, projects/, team/, brand/
src/services/api.ts the only place that calls the API
src/hooks/          useAsync, useProject, useCountUp, usePrefersReducedMotion
src/lib/            session (demo sign-in), formatting, human error messages
```

Scores, match reasons and team gaps always come from the API; the frontend never computes them.
