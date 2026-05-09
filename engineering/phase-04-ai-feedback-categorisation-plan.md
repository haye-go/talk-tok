# Phase 04: AI Feedback, Categorisation, and LLM Runtime

## Purpose

Add the first AI-assisted product loop:

- private feedback after participant submissions
- instructor-triggered categorisation
- editable prompt templates
- model/provider configuration
- LLM telemetry and cost tracking
- job-safe processing for multi-submission workflows

This phase turns the app from a live response collector into the first version of the discussion intelligence platform.

## Current Baseline

Already available:

- sessions, readable slugs, join codes, participant identity
- top-level submissions and follow-ups
- lightweight input telemetry
- instructor command center shell
- participant My Zone and Stream wiring
- categories and submission-category schema tables
- prompt template and LLM call telemetry tables
- installed Convex packages for future pipeline work:
  - `@convex-dev/workpool`
  - `convex-batch-processor`
  - `@convex-dev/action-retrier`
  - `@convex-dev/action-cache`
  - `convex-smart-tags`

## OpenAI Key Placement

When implementation starts, the OpenAI API key should be stored in Convex environment variables, not in `.env.local` and not in git.

Use:

```bash
npx convex env set OPENAI_API_KEY "sk-..."
```

For local frontend code, only `VITE_CONVEX_URL` belongs in `.env.local`.

Rules:

- never expose `OPENAI_API_KEY` to Vite/client code
- LLM calls must run in Convex actions
- only Convex server-side actions read `process.env.OPENAI_API_KEY`
- if later supporting multiple providers, use provider-specific env vars, e.g. `ANTHROPIC_API_KEY`, `GROQ_API_KEY`

## Scope

Included:

- prompt template seed/default functions
- admin prompt template read/update functions
- model/provider settings foundation
- OpenAI action wrapper
- LLM call telemetry logging
- private AI feedback generation after submission
- feedback persistence
- instructor-triggered categorisation
- category creation/merge basics
- submission-category assignment
- job status tracking for AI workflows
- simple moderation placeholder boundary

Excluded:

- full Fight Me AI debate
- class synthesis reports
- embeddings/vector retrieval
- smart-tags production dependency
- advanced prompt version comparison
- full budget enforcement
- multi-provider UI polish

## Product Decisions

### Prompt Editing

No prompt custom instructions should be hardcoded as hidden behavior.

Implementation rule:

- prompts live in Convex `promptTemplates`
- actions load prompts by key
- seed defaults only if missing
- admin can inspect/edit prompts
- each LLM call records the prompt key and template version

Fallback behavior:

- functions can error clearly if required prompt template is missing
- do not silently use a hidden hardcoded prompt except during an explicit seeding function

### Private Feedback Timing

After a participant submits:

- submission is saved immediately
- UI shows submitted response immediately
- AI feedback job starts asynchronously
- participant sees "feedback pending"
- when done, feedback appears in My Zone

Do not block the submission mutation on model latency.

### Categorisation Timing

Categorisation is instructor-triggered in Phase 04.

Reason:

- gives instructor control over when students see categories
- avoids model work on every submission while discussion is still forming
- makes demo behavior predictable

Later phases can add automatic thresholds/timers.

### Category Source Model

Categorisation should support:

- instructor preset categories
- LLM-created categories
- hybrid categories

Category soft cap:

- default 5-8 active categories
- allow `Uncategorized`
- LLM should prefer merging into existing categories over creating too many new ones

### Student Feedback Tone

Feedback tone comes from session defaults and/or participant selected tone.

Allowed tone bands:

- gentle
- direct
- spicy
- roast

Safety rule:

- "roast" can be playful and sharp, but should critique the response, not the student identity
- no insults based on protected traits or personal characteristics
- avoid discouraging language

## Data Model

Existing tables:

- `promptTemplates`
- `llmCalls`
- `categories`
- `submissionCategories`

Recommended additions:

### `submissionFeedback`

Stores private participant-facing feedback per submission.

Fields:

- `sessionId`
- `submissionId`
- `participantId`
- `status`: `queued | processing | success | error`
- `tone`
- `reasoningBand`: `emerging | solid | strong | exceptional`
- `originalityBand`: `common | above_average | distinctive | novel`
- `specificityBand`: `basic | clear | detailed | nuanced`
- `summary`
- `strengths`
- `improvement`
- `nextQuestion`
- `llmCallId`
- `error`
- `createdAt`
- `updatedAt`

Indexes:

- `by_submission`
- `by_participant`
- `by_session`

### `aiJobs`

Tracks asynchronous AI workflows.

Fields:

- `sessionId`
- optional `submissionId`
- `type`: `feedback | categorisation | moderation | synthesis`
- `status`: `queued | processing | success | error`
- `requestedBy`: `system | instructor | participant`
- optional `progressTotal`
- optional `progressDone`
- optional `error`
- `createdAt`
- `updatedAt`

Indexes:

- `by_session`
- `by_type_and_status`
- `by_submission`

### `modelSettings`

Stores provider/model runtime settings editable by instructor-admin.

Fields:

- `key`
- `provider`
- `model`
- `enabled`
- `features`
- `inputCostPerMillion`
- `cachedInputCostPerMillion`
- `outputCostPerMillion`
- `reasoningCostPerMillion`
- `variablesJson`
- `createdAt`
- `updatedAt`

Indexes:

- `by_key`
- `by_provider`

This can be kept minimal if Phase 04 only uses OpenAI at first.

## Prompt Templates

Seed these prompt keys:

### `feedback.private.v1`

Purpose:

- produce private feedback for one submission
- return strict JSON

Inputs:

- session title
- opening prompt
- participant submission
- optional prior participant submissions
- tone
- word count
- input telemetry summary

Output JSON:

- `reasoningBand`
- `originalityBand`
- `specificityBand`
- `summary`
- `strengths`
- `improvement`
- `nextQuestion`

### `categorisation.session.v1`

Purpose:

- categorise many submissions into preset and/or generated categories
- return strict JSON

Inputs:

- session title
- opening prompt
- preset categories
- category soft cap
- submissions with stable submission ids

Output JSON:

- categories to create/update
- assignments by submission id
- confidence
- rationale
- uncategorized list if needed

### `moderation.light.v1`

Purpose:

- placeholder moderation boundary
- can initially run only for AI outputs or not at all

### `category.merge.v1`

Purpose:

- detect overlapping categories and recommend merge/rename
- can be stretch within Phase 04

## Convex Modules

Create or update:

```txt
convex/promptTemplates.ts
convex/modelSettings.ts
convex/llm.ts
convex/aiFeedback.ts
convex/categorisation.ts
```

### `promptTemplates.seedDefaults`

Mutation.

Behavior:

- inserts default prompt templates only when missing
- does not overwrite custom templates
- sets version `1`

### `promptTemplates.list`

Query.

Returns admin-editable prompt template list.

### `promptTemplates.update`

Mutation.

Behavior:

- updates prompt fields
- increments version
- updates timestamp

### `modelSettings.seedDefaults`

Mutation.

Behavior:

- creates OpenAI default model rows
- stores pricing metadata
- stores JSON variables such as:
  - temperature
  - max output tokens
  - response format

### `llm.runJson`

Internal action or shared server helper.

Responsibilities:

- load model settings
- load prompt template
- interpolate variables
- call OpenAI
- enforce JSON output
- record `llmCalls`
- record latency
- record token usage and estimated cost
- return parsed JSON

### `aiFeedback.enqueueForSubmission`

Mutation.

Behavior:

- create `aiJobs` row
- mark feedback as queued
- schedule action

### `aiFeedback.generateForSubmission`

Action.

Behavior:

- load submission/session/participant
- call `llm.runJson`
- write `submissionFeedback`
- update job status

### `aiFeedback.getMine`

Query.

Input:

- `sessionSlug`
- `clientKey`

Returns feedback for participant's submissions.

### `categorisation.runForSession`

Mutation/action pair.

Behavior:

- instructor triggers categorisation
- job is queued
- action loads session submissions and existing categories
- calls categorisation prompt
- creates/updates categories
- writes `submissionCategories`
- updates job status

## OpenAI Runtime Notes

Recommended package:

- use direct `fetch` first to avoid adding SDK complexity
- or use official `openai` package if structured output ergonomics are better

Recommended initial model:

- choose a small/fast model for feedback and categorisation during demo
- model name should be configurable in `modelSettings`, not hardcoded in actions

If using OpenAI Responses API:

- request JSON schema / JSON object where supported
- store raw response safely in `llmCalls.responseJson`
- do not expose raw request with API keys

## LLM Telemetry

Every model call should log:

- provider
- model
- feature
- status
- prompt template key
- input tokens
- cached input tokens
- output tokens
- reasoning tokens if provided
- estimated cost
- latency
- request JSON without secrets
- response JSON or error

Cost calculation:

- `inputTokens * inputCostPerMillion / 1_000_000`
- `cachedInputTokens * cachedInputCostPerMillion / 1_000_000`
- `outputTokens * outputCostPerMillion / 1_000_000`
- `reasoningTokens * reasoningCostPerMillion / 1_000_000`

## UI Work

### Admin Prompts

Wire `/instructor/admin/prompts`.

Build:

- list prompt templates
- select prompt
- edit system/user template
- edit model override
- edit variables JSON
- save

### Admin Models

Wire `/instructor/admin/models`.

Build:

- list model settings
- enable/disable model
- set default model per feature
- edit pricing fields
- edit runtime variables JSON
- show key availability status, without showing key value

### Participant My Zone

Update:

- show feedback pending/success/error per submission
- display bands and qualitative feedback
- preserve submitted response display

### Instructor Session

Update:

- add "Run categorisation" button
- show job status
- show categories once created
- show assignment counts
- show uncategorized count

## Batch Processing Decision

Use a simple action queue first.

Recommended Phase 04 approach:

- use `aiJobs` table for app-level job state
- for categorisation, process submissions in batches inside an action
- if large sessions become slow or unreliable, introduce `convex-batch-processor`

Where `convex-batch-processor` may help:

- mass categorisation of 100-300 submissions
- personal feedback regeneration
- report generation

Do not over-adopt it before we have one successful linear pipeline.

## Smart Tags Decision

Use `convex-smart-tags` as a stretch/adapter in Phase 04.

Recommended approach:

- categories remain first-class app records
- optionally create smart tags from active categories
- use smart-tags descendant/overlap logic only behind a `categoryTags` adapter
- do not make smart-tags the source of truth yet

Reason:

- app categories need instructor semantics, colors, counts, and session-specific lifecycle
- smart-tags may help with hierarchy/overlap later, but should not block categorisation MVP

## Protection

### Prompt Safety

- prompt editor is instructor/admin only
- validate prompt key uniqueness
- validate variables JSON
- show template version

### Output Validation

- all AI outputs must parse as JSON
- validate required fields before writing
- on invalid output, mark job/error and log raw error

### Rate/Budget

For Phase 04:

- prevent duplicate feedback jobs for same submission
- prevent concurrent categorisation job for same session
- display estimated cost in observability

Budget hard stops can wait for Phase 05.

## Acceptance Criteria

Phase 04 is complete when:

- OpenAI key is read only from Convex env
- prompt defaults can be seeded
- prompts can be listed/updated from admin functions
- model settings defaults can be seeded
- submission feedback can be queued and generated
- participant sees feedback in My Zone
- LLM calls are logged with tokens/cost/latency where available
- instructor can trigger categorisation
- categories and submission assignments persist
- instructor sees category counts
- invalid model outputs become visible job errors
- no hidden prompt instructions are required for normal operation
- `pnpm exec tsc -b` passes
- `vp check` passes
- `vp test` passes
- `vp build` passes
- changes are committed and pushed in slices

## Implementation Order

1. Add schema tables for feedback, jobs, and model settings
2. Add prompt template seed/list/update functions
3. Add model settings seed/list/update functions
4. Add LLM telemetry/cost helpers
5. Add OpenAI JSON action wrapper
6. Add feedback queue and generation pipeline
7. Wire participant feedback display
8. Add categorisation queue and action
9. Wire instructor categorisation controls and category counts
10. Run full gates, commit, push each slice

## Deferred To Phase 05

- embeddings and retrieval memory
- smart-tags production integration
- category merge/split UI
- recategorisation requests
- class synthesis
- personal end-of-session report
- Fight Me AI debate
