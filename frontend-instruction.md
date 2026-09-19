# FRONTEND BUILD PROMPT
## Collaboration Network: Human-Centered Collaboration Platform

> ## Revision 2: changes to this brief (2026-09-19)
>
> The original brief below still applies. These changes fix gaps found while mapping it to the real backend and the demo script. **Where they conflict, this section wins.**
>
> 1. **Next.js App Router, not a React SPA.** Use `src/app/` routes instead of `src/pages/`. Put API calls in `src/services/api.ts`. Routes:
>    `/` landing · `/login` · `/dashboard` · `/discover` · `/projects` · `/projects/new` · `/projects/[id]` (overview) · `/projects/[id]/people` (matches) · `/projects/[id]/team` (team + gaps) · `/people/[id]` · `/profile` · `/invitations`.
> 2. **The "Accept" step needs the invitee's side.** The brief skipped it. Add an **Invitations** page and an **account switcher** in the nav. After sending an invite, offer "Switch to Rahul →", and after accepting, offer "Back to Aarav →", so the demo runs without the presenter typing anything.
> 3. **Navigation:** Discover · Projects · Invitations (with a count) · Profile in the account menu. The primary action is "+ Start a project". "My Team" is dropped because a person can be on several teams; each project has its own Team tab.
> 4. **Create project:** keep the writing experience, but add a small **working title** field (the API requires a title). "Find my people →" creates the project and runs the analysis in one step. The analysis steps only tick off when the real Bedrock response arrives. Progress is never faked on a timer. Offer one clickable example idea so the demo text is never mistyped.
> 5. **Match score shows all five factors, with their weights.** Location is included (the brief listed four). The frontend only displays `score` and `breakdown` from the API; it never calculates anything.
> 6. **Show where results come from, quietly.** On the People page, one caption line reads "14 people found · searched with OpenSearch in 12 ms". This makes the AWS search visible inside the product without a dashboard look.
> 7. **"Find them →" (team gap) goes to `/projects/[id]/people?focus=Computer Vision`.** The backend already ranks people who fill the remaining gaps first. The focus parameter only highlights people who cover that skill; it never re-ranks.
> 8. **Team graph:** covered and missing skills come from `/team-gaps`. The frontend doesn't work out which member covers which skill, because implied skills (OpenCV → Computer Vision) are backend logic. Missing skills are drawn as empty, dashed orange nodes.
> 9. **No mock layer inside the frontend.** Instead, `backend` has `npm run dev:memory`: the real API with in-memory demo data and no AWS. The frontend always calls a real API, so no mock data can leak into production code.
> 10. **No stock photography.** The landing page uses the collaboration graph and real product components. If you want photos, use real photos of your team (add them to `public/`).
> 11. **Colour and accessibility:** the orange `#F59E0B` fails contrast as text on light backgrounds, so use it only for fills and icons, and `#B45309` for orange text. Primary buttons are charcoal and blue is reserved for focus, links and the score. Light theme only, and all motion is disabled under `prefers-reduced-motion`.
> 12. **The dashboard's "People you may want to meet" uses real matches** for your newest analysed open project. With no such project, it invites you to start one instead of showing made-up numbers.

You are the lead frontend engineer and product designer for this hackathon project.

Build a **production-quality, visually distinctive React frontend** for a collaboration network where people turn ideas into teams.

The frontend must feel like a **real startup product designed by a strong human product designer**, not an AI-generated dashboard or a generic SaaS template.

The core product loop is:

**IDEA → UNDERSTAND → DISCOVER PEOPLE → MATCH → INVITE → TEAM → FIND WHAT'S MISSING**

---

# 1. PRODUCT CONCEPT

The platform solves this problem:

> "I have an idea, but I need the right people to make it happen."

Users can:

1. Describe an idea/project.
2. Let AI understand the project.
3. See required skills and roles.
4. Discover relevant people.
5. Understand why someone matches.
6. Invite them to collaborate.
7. Form a team.
8. Analyze the team.
9. Discover missing capabilities.
10. Find the next collaborator.

This is NOT a generic developer teammate finder.

Position the product as:

> **A collaboration network for turning ideas into teams.**

AI is an intelligence layer.

The actual product is:

**IDEA → PEOPLE → COLLABORATION → TEAM**

---

# 2. VERY IMPORTANT DESIGN PRINCIPLE

DO NOT make the application look AI-generated.

Avoid the common AI-generated SaaS aesthetic:

- Dark background everywhere.
- Purple/blue neon gradients.
- Excessive glassmorphism.
- Excessive rounded cards.
- Huge glowing blobs.
- "✨ AI Powered" labels everywhere.
- Robot icons.
- AI sparkle icons on every button.
- Excessive gradient text.
- Excessive shadows.
- Excessive animations.
- Generic dashboard layouts.
- Every piece of content inside a card.
- Huge numbers with meaningless analytics.
- Generic stock illustrations.
- Overuse of pills.
- "Welcome to your AI-powered collaboration workspace" type copy.

The design should feel **human, editorial, calm, confident and intentional**.

---

# 3. VISUAL DIRECTION

Use this concept:

## "Human Network × Intelligent Workspace"

Visual references in spirit:

- Editorial product design.
- Modern creative communities.
- High-quality developer products.
- Clean workspace applications.
- Human-centered social products.

Do NOT copy another product.

The interface should feel like its own product.

---

# 4. COLOR SYSTEM

Primary background:

```text
#F7F6F2
```

Alternative surface:

```text
#FFFFFF
```

Primary text:

```text
#171717
```

Secondary text:

```text
#6B6B6B
```

Border:

```text
#E5E3DE
```

Primary accent:

```text
#2563EB
```

Secondary accent:

```text
#F59E0B
```

Success:

```text
#16A34A
```

Use colors sparingly.

The interface should mostly be:

**warm white + charcoal + subtle blue + occasional orange.**

Do NOT turn the entire application blue.

Do NOT use neon colors.

---

# 5. TYPOGRAPHY

Use:

### Headings

Prefer:

```text
Manrope
```

or:

```text
Plus Jakarta Sans
```

### Body

```text
Inter
```

If the project already has a typography system, adapt it rather than unnecessarily replacing everything.

Typography should carry much of the visual identity.

Use:

- Large confident headings.
- Strong hierarchy.
- Generous whitespace.
- Short paragraphs.
- Clear section labels.

Do not make every heading huge.

---

# 6. SPACING

Use an 8-point spacing system:

```text
4
8
12
16
24
32
48
64
96
128
```

Maintain consistent spacing throughout the application.

Avoid cramped interfaces.

---

# 7. BORDER RADIUS

Do NOT use `rounded-2xl` everywhere.

Recommended:

```text
Buttons: 10px
Inputs: 10px
Cards: 14px
Large panels: 18px
```

Some containers can have sharp or lightly rounded corners.

Visual variety is intentional.

---

# 8. SHADOWS

Use extremely subtle shadows.

Prefer:

```text
border + slight shadow
```

over floating giant shadows.

The interface should feel grounded.

---

# 9. BRAND / LOGO

Create a minimal custom brand mark based on connected nodes.

Concept:

```text
     ●
    / \
   ●───●
```

The mark represents:

- People.
- Skills.
- Projects.
- Connections.

Do NOT use a generic network icon from an icon library as the final logo.

Create a small custom SVG mark.

Keep the brand name simple and lowercase if the project name allows it.

---

# 10. SIGNATURE VISUAL LANGUAGE

The most important visual element of the application should be a **collaboration graph**.

The graph represents relationships between:

- People.
- Skills.
- Interests.
- Projects.
- Teams.

Example:

```text
                  Machine Learning
                         ●
                        / \
                       /   \
                      /     \
                 ● Python   ● Football
                /             \
               /               \
          ● Rahul ─────────── ● Ananya
             \                 /
              \               /
               ●─────────────●
                  React
```

This visual language should appear subtly across the product.

Examples:

### Landing page

People connected to skills.

### Project page

Project connected to required skills.

### Match page

Candidate connected to project.

### Team page

Team members connected to project requirements.

### Team gap

A missing capability appears as an empty node.

Do not overuse the graph.

It should be the product's signature visual identity.

---

# 11. LANDING PAGE

Build a premium landing page.

Do not make it look like a typical SaaS landing page.

## Hero

Use:

```text
You have the idea.
Now find the people.
```

Supporting copy:

```text
Describe what you want to build.
Find people who can help make it happen.
Build the team you need.
```

Primary CTA:

```text
Start building →
```

Secondary CTA:

```text
Explore people
```

Below the hero, show:

```text
IDEA → PEOPLE → TEAM
```

with a subtle animated network visualization.

---

# 12. LANDING PAGE MEDIA

Do NOT fill the page with stock photos.

Use:

1. One or two high-quality human collaboration photographs.
2. Custom collaboration/network graphics.
3. Real screenshots of the product UI.

Photography should feel:

- Natural.
- Documentary.
- Human.
- Creative.
- Real.

Avoid:

- Fake corporate handshake imagery.
- Obvious AI-generated people.
- Overly staged startup stock photos.

---

# 13. NAVIGATION

Keep navigation simple.

Example:

```text
[LOGO]

Discover
Projects
Teams

                 Profile
```

Do not create 15 navigation items.

On the authenticated application, prioritize:

```text
Discover
Projects
My Team
Profile
```

Primary action:

```text
+ Start a project
```

---

# 14. DASHBOARD

The dashboard should NOT look like an analytics dashboard.

It should answer:

> "What can I build or contribute to?"

Example:

```text
Good morning, Rahul.

What are you working on?

┌─────────────────────────────────────────┐
│ + Start a new project                   │
│                                         │
│ Describe what you're trying to build... │
└─────────────────────────────────────────┘
```

Then:

```text
Your active projects

AI Football Analytics
3 / 4 collaborators

████████░░

Find one more person →
```

Then:

```text
People you may want to meet

Rahul       91%
Ananya      86%
Arjun       81%
```

Keep the page calm.

---

# 15. CREATE PROJECT

This is one of the most important screens.

Make it feel like a focused writing experience.

Do NOT create a giant form.

Start with:

```text
What are you trying to build?
```

Large textarea:

```text
I want to build an AI system that analyzes
football matches using computer vision...
```

Optional small controls:

```text
Team size
Remote / In-person
Location
```

Primary CTA:

```text
Find my people →
```

The user should feel like they are describing an idea, not filling out a database form.

---

# 16. AI ANALYSIS EXPERIENCE

Do NOT show:

```text
🤖 AI is thinking...
✨ Generating...
```

Instead:

```text
Understanding your project

✓ Project type
✓ Skills needed
✓ Roles needed
✓ Team requirements

Finding people who fit...
```

Use subtle progress transitions.

The AI should feel like an invisible intelligent system.

---

# 17. PROJECT ANALYSIS RESULT

Example:

```text
AI Football Analytics

Your idea needs

Python
Machine Learning
Computer Vision
React

Roles

ML Engineer
Computer Vision Engineer
Frontend Developer

Team size
4 people
```

Primary CTA:

```text
Find collaborators →
```

Use visual hierarchy rather than putting everything into pills.

---

# 18. DISCOVER / MATCH RESULTS

Header:

```text
People for your project

24 people found

Based on:
AI · Football · Machine Learning
```

Candidates should appear as human profiles.

Example:

```text
┌─────────────────────────────────────────────┐
│                                             │
│  [avatar]  Rahul Swain              91%     │
│            ML Engineer                      │
│                                             │
│            Python · ML · React              │
│                                             │
│            Football · AI                    │
│                                             │
│            Strong technical + interest      │
│            overlap for your project.        │
│                                             │
│            View profile    Invite →         │
│                                             │
└─────────────────────────────────────────────┘
```

Do NOT use:

```text
🔥 91% PERFECT MATCH 🔥
```

Use calm typography.

---

# 19. MATCH SCORE

Make the match score visually meaningful.

Use a clean circular score:

```text
       ╭───────╮
      │   91   │
      │   %    │
       ╰───────╯
```

Then show contributing factors:

```text
Skills        ██████████
Interests     ████████
Availability  ██████
Experience    ███████
```

The visualization must remain subtle.

The score comes from the deterministic backend.

Never calculate the score in the frontend.

---

# 20. MATCH EXPLANATION

Show:

```text
Why this person?

91% match

Skills
✓ Python
✓ Machine Learning
✓ React

Interests
✓ Football
✓ AI

Availability
✓ Weekends
```

Then:

```text
Strong technical and interest overlap
for your project.
```

The explanation is generated by Bedrock, but do not repeatedly label it as "AI generated."

---

# 21. PROFILE PAGE

Make the profile feel like a person.

Example:

```text
Rahul Swain

Backend engineer building at the
intersection of AI and systems.

Interested in

Football
AI
Open Source

Can help with

Backend
Machine Learning
React
```

Then:

```text
Projects

AI Football Analytics
StreakIt
StreetGuard
```

Profiles should have personality.

Avoid database-style layouts.

---

# 22. PROJECT PAGE

Project page should show:

```text
AI Football Analytics

Build an AI platform that analyzes
football matches using computer vision.

Team
3 / 4

Required capabilities
Python
Machine Learning
Computer Vision
React

[ Find collaborators ]
```

Then show current team members.

---

# 23. INVITATION UX

When clicking:

```text
Invite →
```

Do not immediately show a boring browser alert.

Use a clean modal:

```text
Invite Rahul

Why you'd like to collaborate

┌─────────────────────────────────────────┐
│ Your ML experience looks like a strong │
│ fit for what we're building.            │
└─────────────────────────────────────────┘

             Cancel     Send invite →
```

After sending:

```text
Invitation sent ✓
```

Keep it simple.

---

# 24. TEAM FORMATION

When an invitation is accepted, create a satisfying but restrained transition.

Candidate avatar/node moves into the team.

Then:

```text
Team formed ✓
```

Show:

```text
AI Football Analytics

Rahul
ML Engineer

Ananya
Frontend Developer

Arjun
Founder
```

No confetti.

No giant celebration animation.

---

# 25. TEAM GAP ANALYSIS

This is one of the main "wow" screens.

Design it visually.

Example:

```text
Your team is taking shape.

                PROJECT
                   │
       ┌───────────┼───────────┐
       │           │           │
    Backend        ML       Frontend
       ✓           ✓            ✓

                   │
                   ▼

             ONE GAP REMAINS

          Computer Vision
                 ⚠

      Your project needs someone
      who can bridge ML + CV.

             Find them →
```

The missing capability should visually appear as a missing node in the collaboration graph.

---

# 26. DISCOVERY LOOP

After team-gap analysis:

```text
Find them →
```

should take the user directly back to:

```text
People for your project
```

with the search focused on:

```text
Computer Vision
```

This creates the product loop:

```text
IDEA
 ↓
MATCH
 ↓
TEAM
 ↓
GAP
 ↓
MATCH AGAIN
```

This loop is central to the product.

---

# 27. ANIMATION RULES

Use animation to communicate product behavior.

Good animations:

- Network nodes connecting.
- Candidates appearing.
- Match score counting from 0 → final value.
- AI analysis steps completing.
- Candidate joining team.
- Missing team capability appearing.
- Page transitions.

Avoid:

- Constant floating elements.
- Huge parallax effects.
- Cursor trails.
- Excessive 3D.
- Infinite gradient animation.
- Every card moving.
- Every button bouncing.

Animation should feel deliberate.

---

# 28. RESPONSIVE DESIGN

Desktop is the primary hackathon demo target.

Still support:

- Laptop.
- Tablet.
- Mobile.

Desktop:

```text
max-width: 1280px
```

Use generous whitespace.

Do not stretch content across the entire monitor.

---

# 29. ACCESSIBILITY

Implement:

- Semantic HTML.
- Keyboard navigation.
- Visible focus states.
- Proper button labels.
- Form labels.
- Sufficient contrast.
- Alt text for images.
- Loading states.
- Error states.

---

# 30. LOADING STATES

Every network operation must have a deliberate loading state.

Examples:

```text
Understanding project...
```

```text
Finding collaborators...
```

```text
Building your team...
```

Do not use generic:

```text
Loading...
```

everywhere.

---

# 31. ERROR STATES

Errors should be human.

Bad:

```text
500 Internal Server Error
```

Good:

```text
We couldn't find collaborators right now.

Your project is safe.
Try again in a moment.
```

Include a retry button.

---

# 32. EMPTY STATES

Example:

```text
No collaborators yet.

Your project is ready.
Let's find someone who fits.

[ Find collaborators → ]
```

---

# 33. COMPONENT ARCHITECTURE

Use reusable components.

```text
components/
  layout/
    Navbar
    Sidebar
    PageContainer

  ui/
    Button
    Input
    Textarea
    Modal
    Badge
    Avatar
    Progress
    Skeleton

  people/
    PersonCard
    PersonProfile
    MatchScore
    SkillList

  projects/
    ProjectCard
    ProjectHeader
    ProjectRequirements
    CreateProject

  team/
    TeamMember
    TeamGraph
    TeamGap
    TeamAnalysis

  network/
    CollaborationGraph
    NetworkNode
    NetworkEdge
```

Do not put the entire application into one giant component.

---

# 34. FRONTEND ARCHITECTURE

Use:

```text
src/
  components/
  pages/
  hooks/
  services/
  lib/
  types/
  assets/
  styles/
```

API calls should be centralized.

Example:

```text
services/api.ts
```

Do not scatter raw fetch calls throughout components.

---

# 35. API INTEGRATION

The frontend must consume the existing backend contract.

Important endpoints:

```http
POST /projects

POST /projects/{projectId}/analyze

GET /projects/{projectId}/matches

POST /projects/{projectId}/requests

GET /projects/{projectId}/requests

PUT /requests/{requestId}

GET /projects/{projectId}/team

GET /projects/{projectId}/team-gaps
```

Do not invent new endpoints unless absolutely necessary.

If an endpoint is missing, create a clear interface and tell the backend team.

---

# 36. DEMO DATA

The frontend should support deterministic demo data.

Important demo project:

```text
AI Football Analytics
```

Expected requirements:

```text
Python
Machine Learning
Computer Vision
React
```

Expected candidate:

```text
Strong ML + Python + Football overlap
```

The demo should reliably show a high match.

---

# 37. AWS VISIBILITY

Do not make the entire UI look like an AWS dashboard.

AWS should be visible through the actual product architecture.

Optionally add a small architecture section:

```text
Powered by

AWS Amplify
API Gateway
Lambda
DynamoDB
OpenSearch
Amazon Bedrock
S3
CloudWatch
```

The actual application should still feel like a real product.

---

# 38. IMPORTANT: DO NOT FAKE BACKEND BEHAVIOR

Do not permanently hardcode:

```text
91% match
```

or:

```text
Computer Vision Engineer missing
```

The frontend should consume the real API.

For local development only, create a clearly separated mock API layer if the backend is unavailable.

Do not mix mock data into production logic.

---

# 39. DEVELOPMENT ORDER

Build in this order:

## Phase 1

Design system.

Build:

- Colors.
- Typography.
- Buttons.
- Inputs.
- Cards.
- Avatar.
- Modal.
- Layout.

## Phase 2

Build:

- Landing.
- Navigation.
- Dashboard.

## Phase 3

Build:

- Create Project.
- AI analysis state.
- Project requirements.

## Phase 4

Build:

- Match results.
- Match score.
- Match explanation.
- Profile.

## Phase 5

Build:

- Invite modal.
- Team.
- Team formation.

## Phase 6

Build:

- Team gap analysis.
- Find next collaborator.

## Phase 7

Integrate real backend APIs.

## Phase 8

Polish animations and transitions.

## Phase 9

Test the complete demo repeatedly.

---

# 40. DEFINITION OF DONE

The frontend is ready when a judge can:

```text
Landing
  ↓
Start building
  ↓
Describe idea
  ↓
AI analysis
  ↓
See requirements
  ↓
Find people
  ↓
See match score
  ↓
Understand why
  ↓
Invite
  ↓
Accept
  ↓
See team
  ↓
Analyze team
  ↓
See missing capability
  ↓
Find next person
```

without confusion.

The user should always know:

1. Where they are.
2. What the system just did.
3. What they can do next.

---

# 41. FINAL DESIGN TEST

Before considering a page finished, ask:

### Does it look like an AI-generated SaaS template?

If yes, simplify it.

### Is there too much purple/blue?

Remove it.

### Are there too many cards?

Remove some.

### Are there too many pills?

Convert some into plain typography.

### Is everything rounded?

Introduce sharper containers.

### Is everything animated?

Remove most animations.

### Does the page communicate a human story?

If not, improve the content hierarchy.

### Can a user understand what to do next?

If not, fix the UX.

---

# 42. MOST IMPORTANT PRODUCT PRINCIPLE

The interface should make the user feel:

> **"This understands what I'm trying to do and helps me find the people I need."**

Not:

> "This is an AI demo."

The AI should be felt through the experience.

It should not dominate the visual language.

---

# 43. FINAL FRONTEND EXPERIENCE

The finished application should feel like:

```text
             HUMAN IDEA
                  │
                  ▼
           Describe it
                  │
                  ▼
        Intelligent understanding
                  │
                  ▼
          Discover people
                  │
                  ▼
           Understand fit
                  │
                  ▼
             Connect
                  │
                  ▼
           Build a team
                  │
                  ▼
        Discover what's missing
                  │
                  ▼
           Find the next person
```

Build the frontend around this experience.

**Do not optimize for visual complexity.**

Optimize for:

**clarity + personality + human feel + strong interaction design + memorable visual identity.**

The final result should look like a product that a real team could launch, not a hackathon template.