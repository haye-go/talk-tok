# Phase 11C: University Demo Seed Refresh

## Purpose

Refresh the seeded demo session around a more social, accessible prompt:

> What's the most useless thing you learned in university?

The goal is to make the demo feel immediately relatable while still exercising the product's core flows: submission, categorisation, instructor overview, synthesis, feedback, and participant discussion surfaces.

## Current State

The demo backend already exists in `convex/demo.ts`.

Current seed content:

- slug: `ethics-ai-healthcare-demo`
- join code: `SPARK`
- title: `[Demo] Ethics of AI in Healthcare`
- prompt: AI medical diagnosis without human oversight
- categories: liability, autonomy, cost/access, trust/accuracy
- seeded participants, submissions, assignments, feedback, synthesis, and audit event

Current deployment note: the demo session is not seeded yet. `api.demo.getDemoSession` returns `null`.

## Proposed Demo Identity

Keep the join code stable for demos:

- join code: `SPARK`

Use a new readable slug:

- slug: `useless-university-lessons-demo`

Use a clear title:

- title: `[Demo] Useless Things We Learned in University`

Opening prompt:

- `What's the most useless thing you learned in university, and did it become useful later in an unexpected way?`

Starting phase:

- `discover`, matching the current demo pattern so instructors immediately see seeded responses and categories.

## Category Model

Seed categories should support funny answers without losing analytical shape.

Recommended categories:

1. **Memorized and Forgotten**
   - Facts, formulas, definitions, or exam content retained only long enough to pass.
2. **Bureaucracy and Admin**
   - Registration systems, citation rules, formatting requirements, paperwork rituals.
3. **Theory With No Obvious Use**
   - Abstract frameworks that felt detached from practical work.
4. **Accidentally Useful**
   - Things that seemed useless at the time but later helped unexpectedly.
5. **Social Survival Skills**
   - Group projects, presentations, networking, conflict management, office-hours etiquette.

## Seeded Responses

Create 8-10 participant responses with varied tone, specificity, and telemetry.

Response requirements:

- Each response should be plausible for a university student or recent graduate.
- Responses should include enough detail for categorisation and synthesis.
- Include light humor but avoid punching down at specific identities, institutions, or protected groups.
- Use varied input patterns:
  - `composed_gradually`
  - `mixed`
  - `likely_pasted`
- Keep response lengths similar to real participant submissions, roughly 25-60 words.

Example response directions:

- Memorizing the Krebs cycle and never using it again.
- Learning a citation style more deeply than the actual topic.
- A very abstract theory module that only became useful for spotting bad arguments.
- Group projects teaching conflict management more than the course did.
- Learning to sound confident in presentations with incomplete information.
- A statistics formula that felt useless until reading workplace dashboards.
- Formatting lab reports with more precision than the experiment.
- A required elective that unexpectedly helped with explaining ideas to non-specialists.

## Feedback Seed Updates

The existing generic feedback can work, but demo quality improves if seeded feedback references the new prompt.

Recommended feedback style:

- Keep the current `spicy` tone.
- Mention whether the response is just a joke or has a sharper insight.
- Encourage the participant to explain why the lesson felt useless and whether it later transferred.

## Synthesis Seed Updates

Replace the class synthesis text with university-theme output.

Recommended synthesis themes:

- Many "useless" lessons were really about memorization for exams.
- Admin and formatting tasks felt pointless but taught institutional fluency.
- Group work and presentations were disliked but often transferred into workplace skills.
- Some abstract theory became useful later as a way to frame problems or spot weak reasoning.
- The class splits between "truly useless content" and "useful but badly taught content."

## Optional Mock Data Updates

`src/lib/mock-data.ts` still contains AI-healthcare mock data. If any mock-only surfaces remain visible, update it to the new university demo theme.

This is optional for the seeded Convex demo, because the live app should use data from `convex/demo.ts`.

## Route and Constant Alignment

Current frontend constants still include:

- `DEMO_SESSION_CODE = "SPARK"`
- `DEMO_SESSION_SLUG = "demo-discussion"`

Because homepage navigation now uses `/join` and `/instructor`, this is not blocking. If direct demo shortcuts are reintroduced later, either:

- update `DEMO_SESSION_SLUG` to `useless-university-lessons-demo`, or
- fetch `api.demo.getDemoSession` instead of hard-coding the slug.

## Implementation Steps

1. Update constants in `convex/demo.ts`:
   - `DEMO_SLUG`
   - title
   - opening prompt
2. Replace `DEMO_CATEGORIES`.
3. Replace `DEMO_RESPONSES` with 8-10 university-themed responses.
4. Update seeded `submissionFeedback` text to fit the new prompt.
5. Update seeded `synthesisArtifacts` content.
6. Run targeted validation:
   - `pnpm exec convex codegen`
   - `pnpm exec convex run demo:seed -- '{ "resetExisting": true }'` only when ready to seed the deployment
   - `pnpm exec convex run demo:getDemoSession`
   - `pnpm exec convex run demo:health`

## Risks

- Existing generated Convex types may be out of date while other backend work is active.
- `convex/demo.ts` currently references newer semantic/argument tables, so schema and generated API state must stay aligned.
- If an old demo session exists under the previous slug, `resetExisting` will only affect the current `DEMO_SLUG`; manual cleanup may be needed for abandoned demo sessions.

## Acceptance Criteria

- `api.demo.seed` creates a demo session with the university prompt.
- The seeded session appears in the instructor dashboard.
- Participants can enter `SPARK` from `/join` and reach the demo session.
- Instructor overview shows populated categories, submissions, activity, and synthesis.
- No hard-coded homepage demo route is required for the demo to be usable.
