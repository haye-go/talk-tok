# Phase 11C: Judge Demo Seed and Persona Switching

## Purpose

Create a reliable hackathon judge demo that is already populated with realistic discussion data, while still allowing judges to interact with the live Convex deployment.

Demo question:

> If you had to teach a university course on any topic, what would it be?

The demo should let judges do two things quickly:

- Join as a normal participant and contribute their own answer.
- Switch into seeded demo personas to inspect a richer participant experience, including prior responses, feedback, Fight Me history, and personal review state.

## Core Demo Contract

Keep the demo simple and stable:

- join code: `SPARK`
- slug: `teach-anything-university-demo`
- title: `[Demo] Teach Any University Course`
- opening prompt: `If you had to teach a university course on any topic, what would it be, and why should people take it?`
- starting phase: `discover`
- anonymity: `nicknames_visible`
- Fight Me: enabled
- telemetry: enabled

All seeded data should use normal production tables. This means the demo is live:

- If one judge acts as a participant, the action is written to Convex.
- If another judge has the instructor dashboard open, they should see the new submission, reaction, follow-up, Fight Me action, or report state through normal subscriptions.
- Demo persona switching must not create fake local-only state.

## Homepage Demo Entry Points

Frontend can wire these later, but the backend seed must support them:

- `Try demo as yourself` -> `/join/SPARK`
- `Explore demo personas` -> `/join/SPARK` or `/session/teach-anything-university-demo` with a demo persona switcher
- `Open instructor demo` -> `/instructor/session/teach-anything-university-demo`

Recommended UI behavior:

- A normal judge participant enters a nickname and receives a fresh participant record.
- A seeded persona switcher lets judges pick `Maya`, `Sam`, `Priya`, `Jake`, `Rina`, `Alex`, `Noah`, or `Leah`.
- Switching persona changes the active browser `clientKey` to the seeded key, such as `demo-maya`.
- The app then loads the real Convex participant tied to that client key.

Strict rule:

- Persona switching is demo-only and must be gated to `teach-anything-university-demo`.
- It should never appear in normal live sessions.

## Seeded Participants

Seed 6-8 participants with varied response styles and telemetry:

1. `Maya`
   - Course: reading contracts and real-world small print.
   - Category: Life Skills.
   - Telemetry: composed gradually.
2. `Sam`
   - Course: arguing with algorithms and AI literacy.
   - Category: Technology and AI.
   - Telemetry: fast draft with revisions.
3. `Priya`
   - Course: why people do not change their minds.
   - Category: Human Behaviour.
   - Telemetry: composed gradually.
4. `Jake`
   - Course: office politics for basically decent people.
   - Category: Work and Money.
   - Telemetry: mixed.
5. `Rina`
   - Course: memes as modern literature.
   - Category: Creativity and Culture.
   - Telemetry: likely pasted or fast entry.
6. `Alex`
   - Course: the history of bad ideas.
   - Category: Playful but Serious.
   - Telemetry: composed gradually.
7. `Noah`
   - Course: cooking when tired and broke.
   - Category: Life Skills.
   - Telemetry: mixed.
8. `Leah`
   - Course: explaining boring things beautifully.
   - Category: Creativity and Culture.
   - Telemetry: composed gradually.

Each participant should have:

- readable `participantSlug`
- deterministic demo `clientKeyHash` from `demo-{nickname}`
- one top-level seeded submission
- seeded AI feedback
- category assignment
- at least one activity event visible to instructor surfaces

## Categories

Recommended seeded categories:

1. **Life Skills**
   - Practical courses for adulthood, survival, household systems, documents, food, and everyday decisions.
2. **Technology and AI**
   - Courses about AI literacy, algorithms, tools, data, and digital judgment.
3. **Human Behaviour**
   - Courses about persuasion, psychology, disagreement, relationships, and communication.
4. **Creativity and Culture**
   - Courses about storytelling, media, taste, design, memes, and cultural analysis.
5. **Work and Money**
   - Courses about careers, negotiation, workplace dynamics, productivity, and finances.
6. **Playful but Serious**
   - Courses that sound funny or strange but reveal deeper intellectual value.

Keep the category count around 5-6 so the demo dashboard feels readable.

## Seeded Feedback

Seed feedback should demonstrate the product's tone controls without being abusive.

For each response, include:

- originality band
- reasoning quality band
- genericness or AI-likeness warning where appropriate
- one concrete suggestion for strengthening the idea
- composition signal summary, such as `composed gradually`, `revised actively`, or `possibly pasted`

Example direction:

- Maya's contract course: praise practical specificity, suggest adding a final project.
- Sam's algorithm course: praise relevance, challenge him to define what students can do after the course.
- Rina's meme course: note that it sounds playful but can be rigorous if tied to culture, platforms, and context collapse.

## Seeded Fight Me Data

Seed pseudo Fight Me activity using real production tables.

Recommended completed real 1v1:

- slug: `sam-vs-rina-algorithms-vs-memes`
- attacker: `Sam`
- defender: `Rina`
- attacker position: algorithms shape what people see, so AI literacy is more urgent.
- defender position: memes reveal how culture travels through platforms, so content and distribution must be studied together.
- status: `completed`
- mode: `real_1v1`
- turn count: 4 submitted turns
- debrief: include strengths for both sides, missed opportunity, and stronger rebuttal suggestion.

Recommended second completed real 1v1:

- slug: `priya-vs-jake-minds-vs-office-politics`
- attacker: `Priya`
- defender: `Jake`
- theme: whether teaching office politics normalizes manipulation or helps decent people survive power structures.
- status: `completed`
- mode: `real_1v1`
- turn count: 4 submitted turns
- debrief: note values clash and practical implications.

Optional seeded vs AI:

- slug: `alex-vs-ai-history-of-bad-ideas`
- participant: `Alex`
- theme: whether "bad ideas" is just trivia or a method for studying incentives, evidence, and overconfidence.
- status: `completed`
- mode: `vs_ai`
- turn count: 4 turns
- debrief: emphasize how the participant defended the course design.

Important:

- Seeded fights are live records. If a judge switches into `Sam`, they are acting as the real seeded `Sam` participant.
- This is acceptable for demo mode because the demo can be reset.

## Seeded Synthesis and Semantic Data

Seed enough backend artifacts so dashboards are meaningful before new judge activity arrives:

- class synthesis artifact
- category summaries
- representative quotes
- contribution trace hints
- novelty signals for selected submissions
- argument links between related or opposing submissions
- optional follow-up prompt targeting one category
- optional follow-up response from one seeded participant

The goal is not to fake every future feature. The goal is to make the demo feel populated and coherent immediately.

## Demo Reset and Safety

The demo must remain resettable:

- Keep using `api.demo.seed` with `resetExisting: true`.
- `api.demo.resetSession` should delete only the seeded demo session and its related rows.
- Reset must include fights, turns, debriefs, drafts, semantic signals, argument links, synthesis artifacts, quotes, reports, follow-ups, reactions, position shifts, telemetry, and audit rows.
- Do not create global destructive reset tools.

Because persona switching lets judges mutate seeded personas, reset is important before a formal presentation.

## Implementation Steps

1. Update `convex/demo.ts` constants:
   - `DEMO_SLUG`
   - title
   - opening prompt
   - seeded category list
   - seeded response list
2. Add seeded participant response content for the new question.
3. Seed feedback with topic-specific analysis.
4. Seed class/category synthesis and representative quotes.
5. Seed semantic signals and argument links for novelty radar and argument map contracts.
6. Seed completed Fight Me threads, turns, and debriefs.
7. Ensure demo reset covers all newly seeded tables.
8. Optionally expose a backend query returning demo personas:
   - nickname
   - participant slug
   - demo client key label, for frontend mapping
   - short description of what the persona has already done
9. Keep frontend persona-switching implementation separate from backend seed work.

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec convex run demo:seed -- '{ "resetExisting": true }'
pnpm exec convex run demo:getDemoSession
pnpm exec convex run demo:health
pnpm run build
```

Manual checks:

- `/join/SPARK` opens the seeded demo session.
- `/instructor/session/teach-anything-university-demo` shows seeded categories, responses, synthesis, Fight Me records, and activity.
- A newly joined judge participant can submit a response and it appears in instructor views.
- Switching to a seeded persona loads that participant's real seeded state.
- Actions taken as a seeded persona appear live in the instructor dashboard.

## Risks

- If multiple judges use the same seeded persona at the same time, they share that identity. This is acceptable for demo mode but should be clearly labeled.
- Direct persona switching requires frontend access to deterministic demo client keys. This must be gated to the demo slug.
- If direct homepage shortcuts use constants, update `DEMO_SESSION_SLUG` to `teach-anything-university-demo`; otherwise prefer `api.demo.getDemoSession`.
- Seeded data should not rely on live LLM calls during the presentation. Any expensive AI generation should be pre-seeded or manually triggered.

## Acceptance Criteria

- The seeded demo uses the "teach a university course" question.
- The seeded demo includes 6-8 participants with realistic responses.
- The seeded demo includes completed pseudo 1v1 Fight Me records and at least one debrief.
- Judges can join as themselves and create live data.
- Judges can switch into seeded personas for a richer participant view.
- Instructor dashboard sees seeded and judge-created activity through normal live Convex data.
