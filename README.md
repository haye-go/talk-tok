# TalkTok

Live preview: https://talk-tok.up.railway.app

- Participant demo: https://talk-tok.up.railway.app/demo/personas
- Instructor demo screen: https://talk-tok.up.railway.app/instructor/session/teach-anything-university-demo

TalkTok turns forum-style discussion posts into live, instructor-led discussion sessions. Instead of asking students to post into a chronological thread, TalkTok collects the cohort's responses first, organizes them into categories, gives students private feedback, lets the instructor control what becomes visible, and keeps the discussion moving through follow-up rounds, structured challenges, synthesis, and personal reports.

## Why This Is Different From A Forum

Traditional education forums often produce isolated submissions that happen to share a page. TalkTok is designed around a different discussion loop:

- Students respond before seeing others, reducing anchoring, pile-ons, and performative replies.
- The cohort's responses become a live organized board instead of a chronological pile.
- AI helps surface categories, recurring patterns, originality, weak reasoning, and distinctive ideas.
- The instructor controls when raw responses, category summaries, or synthesis artifacts are released.
- Follow-up rounds can target the whole class or a specific category of responses.
- Students can contest their categorization and challenge ideas through structured debate.
- The session closes with synthesis and personal reports, not just an archived thread.

## Key Features

- **Live sessions and join codes**: instructors create sessions, students join by code, and projector views provide a shared classroom entry point.
- **Instructor-controlled phases and visibility**: sessions move through submit, discover, challenge, and synthesize phases, with release controls for private, summary-only, or raw-response visibility.
- **AI feedback and categorization**: submissions can receive private AI feedback and be grouped into instructor-visible categories.
- **Category board and recategorisation workflow**: instructors can create, rename, and manage categories while students can request recategorisation when their response is placed incorrectly.
- **Follow-up rounds**: instructors can send new prompts to everyone or to students in specific categories, creating new rounds of discussion.
- **Fight Me debates**: students can challenge another response or debate an AI challenger, with turns, drafts, timeouts, and debriefs.
- **Synthesis and personal reports**: instructors can generate class synthesis, category summaries, opposing-view summaries, and individual participant reports.
- **Semantic analysis**: embeddings, novelty signals, category drift, and argument maps help reveal how ideas relate across the cohort.
- **Demo and admin tooling**: seeded demos, model settings, prompt templates, protection settings, AI observability, and demo failure toggles support testing and presentation.

## How Convex Powers The Product

TalkTok depends on a kind of state that ordinary forum software rarely has to manage: a live room whose structure is changing while people are inside it. A session has phases, release rules, participants, presence, submissions, categories, synthesis artifacts, reports, semantic signals, and AI jobs all evolving at once.

Convex is the shared substrate for that room. The instructor dashboard, participant view, projector, stream, category board, semantic panels, and report surfaces all read from the same backend state, so the conversation can move as one coordinated system rather than a collection of refreshed pages.

### Realtime Session State

The classroom lifecycle is represented directly in Convex: lobby, submit, discover, challenge, synthesize, and closed. Phase changes, join codes, participant presence, response counts, category counts, and release state are all live backend data.

That is what lets an instructor move the class forward, reveal responses, trigger categorisation, or publish synthesis while connected student views update around the same source of truth.

### Command-Oriented Mutations

TalkTok treats user actions as discussion commands, not isolated database writes. Joining restores a participant identity. Submitting records the response, typing telemetry, presence state, and feedback queue. Recategorisation requests alter both the student-facing assignment state and the instructor queue. Follow-up prompts can reopen the discussion for everyone or only for a category. Fight Me turns carry ownership, deadlines, drafts, and completion rules.

Those product rules live in Convex mutations, close to the records they modify, instead of being scattered through the browser.

### AI As Durable Product State

AI output is not treated as a temporary response to a button click. Feedback, categorisation, synthesis, personal reports, AI debate turns, fight debriefs, embeddings, novelty signals, and argument maps become durable records in the session.

That makes AI visible as a workflow. The UI can show queued, processing, failed, and completed states because the jobs and results are persisted. Long-running work runs through Convex internal actions, scheduled functions, and workpool-backed execution, while the frontend stays reactive to the changing records.

### Semantic Memory

TalkTok needs to understand the shape of the cohort's thinking, not just store the order of posts. Embeddings are stored in Convex with a vector index, then used to produce novelty signals, category drift, and argument relationships.

This semantic layer is what lets the instructor ask better questions of the room: which ideas are common, which are distinctive, how thinking moved between rounds, and which claims support, extend, question, or contradict one another.

### Release Gates And Instructor Control

Visibility is part of the backend model. A session can keep responses private, release category summaries, or expose raw peer responses. Synthesis artifacts move through draft, published, final, archived, and error states.

Participant-facing queries respect those states before returning peer responses or synthesis content, so release decisions are enforced as product logic rather than cosmetic UI hiding.

### Observability And Runtime Configuration

The AI layer is inspectable because its configuration and activity are stored as data. Model settings, prompt templates, protection settings, AI jobs, LLM calls, audit events, token usage, estimated cost, latency, and errors are all available to the application.

That matters in a teaching tool. AI behavior can be reviewed, prompts can be adjusted, failures can be diagnosed, and cost can be tracked without treating the model layer as an invisible external service.

### Guardrails

A live class can create sudden bursts of joins, submissions, reactions, recategorisation requests, debate turns, draft saves, and AI jobs. Rate limits, protection settings, and budget checks sit in the backend path for those operations.

The result is a realtime experience that can stay interactive while still placing boundaries around spam, accidental overload, and expensive AI workflows.

### Reproducible Demos

The demo environment is seeded through backend data, not mocked screens. Reset and seed functions create complete sessions with participants, submissions, categories, feedback, synthesis artifacts, reports, Fight Me threads, semantic signals, and argument links.

That makes the demos useful for testing the real system: the live classroom state, the instructor controls, the AI workflow states, and the semantic surfaces all come from the same backend mechanisms used by normal sessions.

## Tech Stack

- VitePlus
- React 19
- TypeScript
- TanStack Router
- Tailwind CSS v4
- Base UI
- Convex
- Convex components for rate limiting, workpool-backed background jobs, and action caching
- OpenAI API calls from Convex backend actions
- D3 force layout for argument-map visualization
- QR code rendering with `qrcode.react`
- Phosphor Icons
- Pretext for display-oriented text surfaces
- Vitest and ESLint

## Development

Install dependencies:

```bash
vp install
```

Start Convex in one terminal:

```bash
npx convex dev
```

Start the frontend in another terminal:

```bash
vp dev
```

Run checks:

```bash
vp check
vp test
```

Build:

```bash
vp build
```

## Convex Setup

The app is wired so it can render before Convex is connected. Running `npx convex dev` creates the development deployment and writes `VITE_CONVEX_URL` into `.env.local`.

Convex AI guidance files are installed in `convex/_generated/ai/`. Before changing Convex backend code, read:

```txt
convex/_generated/ai/guidelines.md
```

## Repository Notes

Implementation plans, rollout notes, route registry, and UI handoff documents live in `engineering/`.
