# Overall Implementation Rollout

## Purpose

This is the tracked engineering roadmap for TalkTok.

It links product planning, UI design, Convex backend work, and implementation sequencing into one code-side plan. The broader planning docs remain in ignored `docs/`, but this file should stay versioned with the repository.

## Product Frame

TalkTok is a live discussion intelligence platform for classrooms, workshops, and conference Q&A.

It is not a traditional forum. It combines:

- QR/session-code participation
- participant responses and follow-ups
- AI-assisted private feedback
- response categorisation and synthesis
- instructor orchestration
- structured challenge and debate flows
- participant reflection reports

## Core Stack

- VitePlus
- React
- TanStack Router
- Convex
- Tailwind CSS v4
- Base UI primitives with shadcn-style local components
- Phosphor Icons
- Pretext for display-oriented text surfaces
- Convex components for rate limiting, presence, work queues, action caching, retries, sharded counters, batch processing, and smart tags

Standard commands:

```bash
vp dev
vp check
vp test
vp build
npx convex dev
```

## Route Rules

Public navigation must use readable words, never raw Convex document IDs.

Canonical routes:

```txt
/
/join/:sessionCode
/session/:sessionSlug
/session/:sessionSlug/fight/:fightSlug
/session/:sessionSlug/review
/instructor
/instructor/session/new
/instructor/session/:sessionSlug
/instructor/session/:sessionSlug/projector
/instructor/templates
/instructor/admin/models
/instructor/admin/prompts
/instructor/admin/retrieval
/instructor/admin/protection
/instructor/admin/observability
```

Internal Convex IDs stay internal. Route loaders should resolve slugs/codes to IDs.

## Product Surfaces

### Participant

Mobile-first.

Main UX structure:

- four acts: `Submit`, `Discover`, `Challenge`, `Synthesize`
- persistent bottom tabs: `Main`, `Stream`, `Fight Me`, `My Zone`
- native text input for composition
- Pretext-backed display for responses, quotes, summaries, and personal history

### Instructor

Desktop-first.

Main UX structure:

- session dashboard
- create/edit session
- live command center
- category board
- activity feed
- consensus and response distribution views
- follow-up composer
- recategorisation queue
- moderation queue
- final synthesis and reports
- projector view

### Admin

Instructor-side for the demo.

Main UX structure:

- providers and models
- prompt templates
- behaviour and advanced model settings
- retrieval/context settings
- protection settings
- LLM observability and cost tracking

## Delivery Phases

## Phase 01: App Foundation and Design System

Goal:

Create the UI and routing foundation that can accept final designer components.

Build:

- Tailwind v4 setup
- OKLCH token system
- light-default theme with `.dark`
- core UI primitives
- participant shell
- instructor shell
- admin shell
- projector shell
- route constants/builders
- Pretext display wrapper boundary

Tracked detailed plan:

- `engineering/phase-01-app-foundation-plan.md`

## Phase 02: Session, Slugs, and Identity

Goal:

Create real Convex-backed sessions and low-friction participant join.

Build:

- session create/edit/list
- readable session slug generation
- short session code generation
- session code uniqueness checks
- QR code join surface
- nickname entry and update
- client rejoin token via local storage/cookie
- participant presence baseline
- lobby state

Convex tables likely involved:

- `sessions`
- `participants`
- `sessionTemplates`
- `auditEvents`

Must test:

- slug uniqueness
- session-code lookup
- nickname restore
- rejoin from same browser
- no raw IDs in URL navigation

## Phase 03: Submission, Replies, Stream, and Telemetry

Goal:

Let participants submit ideas and let instructors see activity.

Build:

- top-level response composer
- multiple response support
- follow-up/addendum support
- reply attachment rules
- emoji reactions
- response stream
- My Zone response list
- typing presence aggregate
- composition telemetry summary
- paste detection summary
- duplicate submission protection

Guardrails:

- no raw keystroke history for MVP
- telemetry is summary-only and session-configurable
- telemetry labels are not proof of misconduct

Convex components:

- rate limiter
- presence
- sharded counter if aggregate counters become write-hot

## Phase 04: Protection Layer

Goal:

Prevent obvious abuse and protect live sessions before AI workflows scale up.

Build:

- submission rate limits
- reply rate limits
- reaction rate limits
- recategorisation cooldowns
- Fight Me limits
- content length caps
- duplicate protection
- content moderation status model
- audit log for instructor actions
- AI output safety checks

Admin surface:

- protection settings page
- telemetry disclosure text
- budget limit controls

## Phase 05: AI Platform Foundation

Goal:

Create reusable, observable LLM infrastructure before feature-specific prompts.

Build:

- provider/model registry
- model-per-feature assignment
- prompt template storage and versioning
- instructor/admin prompt editor
- JSON overrides for model settings
- structured output validation
- retries and failure capture
- LLM call telemetry
- token/cost tracking
- budget thresholds

Convex tables likely involved:

- `promptTemplates`
- `llmCalls`
- `modelProviders`
- `modelConfigs`
- `budgetEvents`

Convex components:

- action cache
- action retrier
- workpool
- batch processor where useful

## Phase 06: Private Feedback Pipeline

Goal:

Give participants useful private feedback soon after submission.

Build:

- fast-path AI feedback job
- hidden reference answer generation
- originality/genericness qualitative band
- tone/roast-level controls
- response quality feedback
- private feedback card data contract
- AI pending/failed/retry states

Rules:

- no numeric grading in MVP
- feedback is private to participant and visible to instructor
- telemetry and LLM comparison must not be framed as cheating proof

## Phase 07: Category Mapping and Smart Tag Enrichment

Goal:

Cluster responses into useful live categories without losing instructor control.

Build:

- predefined categories
- AI dynamic categories
- hybrid category assignment
- uncategorized queue
- category confidence/rationale
- instructor rename/merge/split/lock/pin
- overlap detection
- recategorisation request flow
- smart tag candidate mapping as secondary semantic layer

Rules:

- live categories remain source of truth
- smart tags do not replace session category workflow
- soft cap visible categories around 5 to 8

Convex components:

- batch processor for mass categorisation waves
- smart tags for reusable semantic memory
- action cache for stable expensive analysis

## Phase 08: Publish Semantics, Stream, and Shared Synthesis

Goal:

Control what participants can see and when.

Build:

- private feedback publish state
- category summary publish state
- raw response visibility modes
- synthesis artifacts
- representative quotes
- expandable raw responses
- contribution traces
- class synthesis view

Visibility modes:

- private until released
- category summary only
- raw responses visible

Pretext targets:

- stream previews
- quote blocks
- synthesis cards
- category summaries

## Phase 09: Follow-Up Rounds

Goal:

Let instructors push the discussion forward by category or class-wide prompt.

Build:

- follow-up prompt composer
- target all participants
- target one or more categories
- multiple rounds per category
- participant follow-up response flow
- summary gate option
- follow-up analysis rules

Data model likely involved:

- `followUpPrompts`
- `followUpTargets`
- `submissions`
- `submissionThreads`

## Phase 10: Fight Me Mode

Goal:

Create structured, playful argument practice.

Build:

- Fight Me home
- vs AI mode
- vs opposing view mode
- turn limits
- counterargument generation
- participant rebuttal composer
- debrief generation
- save debrief to My Zone
- instructor visibility into activity

Rules:

- tone can be spirited or roast-like, but not personally abusive
- only one active Fight Me thread per participant in MVP
- raw debate turns should be preserved for reflection

## Phase 11: My Zone and Review

Goal:

Give participants a coherent private record of their contribution.

Build:

- response history
- category placement history
- recategorisation status
- Fight Me history
- private feedback archive
- contribution trace
- argument evolution
- position shift tracker
- end-of-session personal report

Report dimensions:

- participation
- reasoning quality
- originality
- responsiveness
- agreement/disagreement engagement
- growth opportunity

## Phase 12: Instructor Command Center

Goal:

Connect live backend contracts to dense instructor orchestration UI.

Build:

- category board
- live metrics
- aggregate presence
- activity feed
- consensus pulse
- response distribution card view
- uncategorized queue
- merge suggestions
- phase/act controls
- publish controls
- projector mode handoff

Performance:

- aggregate counters rather than per-keystroke subscriptions
- avoid streaming every draft to instructor by default
- use single-student monitoring only as explicit optional zoom-in later

## Phase 13: Admin and Observability

Goal:

Expose demo-admin controls without hardcoding prompt or model behavior.

Build:

- providers and models page
- prompt template editor
- behaviour/advanced settings page
- retrieval/context page
- protection page
- observability dashboard
- usage tables
- raw request/response drilldown
- CSV export later

Must track:

- input tokens
- cached input tokens
- output tokens
- reasoning tokens where available
- latency
- retries
- errors
- estimated/actual cost

## Phase 14: Final Synthesis and Reports

Goal:

Close the session with useful shared and private artifacts.

Build:

- final class synthesis
- category-level summaries
- key points
- representative quotes
- unique viewpoints
- opposing views
- participant contribution traces
- instructor report view
- participant review route

Generation:

- background jobs for class-level synthesis
- on-demand generation for personal reports where possible
- cache stable expensive artifacts

## Phase 15: Semantic and Visualization Enhancements

Goal:

Add richer sensemaking without blocking MVP.

Build:

- smart tag hierarchy browser
- tag-based memory across sessions
- category drift view
- novelty radar
- consensus pulse refinements
- argument map card view

Stretch:

- D3 force-directed argument map
- D3 category drift/alluvial view
- D3 novelty radar

Rule:

- D3 graphing remains stretch until the MVP card/CSS version works.

## Phase 16: Hardening and Demo Readiness

Goal:

Make the demo reliable with realistic class sizes.

Build:

- seed demo session
- demo reset tools
- load test for target cohort size
- AI failure simulations
- moderation simulations
- budget exceeded simulation
- end-to-end happy path
- route slug collision tests
- offline/reconnect states

Target:

- 200 participants planned capacity
- bursty submissions do not block core writes
- AI delays degrade gracefully

## Milestone Order

1. App foundation and shells
2. Session identity and slugged routes
3. Submissions, stream, and telemetry
4. Protection and rate limits
5. AI platform foundation
6. Private feedback
7. Category mapping
8. Publish and synthesis
9. Follow-up and Fight Me
10. Command center
11. Admin observability
12. Final reports
13. Semantic/visual stretch
14. Demo hardening

## Verification Gates

Every phase should keep these green:

```bash
vp check
vp test
vp build
```

Every backend-heavy phase should also verify:

```bash
npx convex dev
```

## Current Next Step

Start with:

```txt
engineering/phase-01-app-foundation-plan.md
```

Do not move to session/identity work until Phase 01 has real shells, tokenized styling, and route placeholders in place.
