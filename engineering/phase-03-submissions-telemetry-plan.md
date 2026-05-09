# Phase 03: Submissions, Response Threading, and Lightweight Input Telemetry

## Purpose

Add the first real discussion activity on top of Phase 02:

- participants submit top-level responses
- participants can add follow-up points or replies
- responses appear in participant and instructor views
- input telemetry captures composition behavior without degrading typing performance
- instructors get early live activity and submission signals

This phase should make the product usable for a basic live session before AI categorisation begins in Phase 04.

## Current Baseline

Already available:

- Convex sessions, readable slugs, join codes, and participant restore
- participant local browser identity
- lobby presence aggregate
- instructor session command center shell
- participant bottom-tab shell
- Pretext display boundary
- submission table in `convex/schema.ts`

## Scope

Included:

- top-level response submission mutation
- optional follow-up/additional-point submission mutation
- optional reply-to-submission mutation
- participant submission list
- session submission stream query
- instructor live activity feed
- word count and soft word limit display
- client-side lightweight typing metrics
- paste event count
- first-character and submit timestamps
- derived input pattern classification
- basic submission protection: size cap, per-participant rate limit placeholder, duplicate guard
- Pretext display for submitted text

Excluded:

- AI feedback
- AI categorisation
- embeddings/vector search
- Fight Me turns
- moderation model calls
- instructor grading/review workflows
- editing after submission

## Product Rules

### Response Model

Participants may submit more than one top-level response.

Reason:

- this supports Q&A, conferences, and multi-point discussions
- it avoids forcing students into one long blended answer
- later categorisation can treat each point separately

Submission kinds:

- `initial`: top-level response
- `additional_point`: follow-up attached to the participant's own thinking
- `reply`: response to another submission

For this phase:

- allow `initial` and `additional_point`
- keep `reply` available in the backend but expose only lightly if UI permits
- no editing after submit
- "add follow-up" is the clean correction/extension path

### Word Limit

Use `sessions.responseSoftLimitWords`.

Rules:

- client shows live word count
- backend stores word count
- backend does not reject just because it exceeds the soft limit
- backend rejects clearly abusive size, e.g. over 8000 characters for MVP

### Visibility

For Phase 03, keep raw submitted responses visible to:

- the participant in `My Zone`
- instructor in command center

Participant peer visibility should respect the session visibility mode:

- `private_until_released`: show only counts/status in Stream
- `category_summary_only`: no raw peer stream yet
- `raw_responses_visible`: show peer response stream

Because categorisation is not implemented yet, default `private_until_released` means participant Stream can show "responses collected, awaiting release".

## Lightweight Input Telemetry

The key rule: do not send per-keystroke events to Convex.

Telemetry is collected locally in React state/refs and submitted once with the response.

### Captured Locally

Use refs, not state, for high-frequency counters:

- `typingStartedAt`: timestamp when first non-empty character is entered
- `typingFinishedAt`: timestamp at submit
- `compositionMs`: submit time minus first-character time
- `pasteEventCount`: increment on paste
- `keystrokeCount`: approximate local keydown counter
- `lastInputLength`: local ref for heuristics

### Keystroke Count Policy

Keystroke count is approximate and intentionally low-cost.

Rules:

- increment a ref on `keydown`
- do not update React state for every keydown
- do not send keydown events to Convex
- do not attempt detailed key timing or biometric typing analysis
- ignore modifier-only keys where practical
- use the count only as one signal for broad pattern detection

This avoids lag and avoids building invasive typing surveillance.

### Paste Detection

Capture:

- `pasteEventCount`
- approximate pasted character length if cheap from clipboard event

Do not store clipboard contents separately.

### Input Pattern Classification

Derive on client and verify/recompute on server where practical:

- `composed_gradually`: non-trivial composition time, low/no paste count
- `likely_pasted`: paste event present, very short composition time, or large text jump
- `mixed`: paste plus meaningful editing/typing
- `unknown`: not enough telemetry

The label is descriptive, not punitive.

Instructor copy should avoid accusing students. Use terms like:

- "likely pasted"
- "composed gradually"
- "mixed composition"
- "unknown"

## Convex Backend

Create module:

```txt
convex/submissions.ts
```

### `submissions.create`

Mutation.

Input:

- `sessionSlug`
- `clientKey`
- `body`
- `kind`: `initial | additional_point | reply`
- optional `parentSubmissionId`
- telemetry:
  - `typingStartedAt`
  - `typingFinishedAt`
  - `compositionMs`
  - `pasteEventCount`
  - `keystrokeCount`
  - optional client-derived `inputPattern`

Behavior:

- resolve session by slug
- resolve participant by session/client key
- validate body:
  - trim whitespace
  - min length, e.g. 5 characters
  - hard max length, e.g. 8000 characters
- validate kind/parent relationship:
  - `initial` has no parent
  - `additional_point` may optionally point to the participant's earlier top-level submission
  - `reply` must point to an existing submission in same session
- compute word count server-side
- derive or verify input pattern
- insert submission
- set participant `presenceState` to `submitted`
- return public submission view model

### `submissions.listForSession`

Query.

Input:

- `sessionSlug`
- optional `limit`

Return:

- recent submissions, newest first
- participant nickname or anonymous label based on session anonymity
- kind
- body
- word count
- telemetry label
- timestamps

Use for instructor activity and, conditionally, participant stream.

### `submissions.listMine`

Query.

Input:

- `sessionSlug`
- `clientKey`

Return:

- participant's own submissions
- follow-ups
- input pattern
- word count
- created time

Use in My Zone.

### `submissions.getThread`

Optional query for this phase.

Input:

- `submissionId`

Return:

- root submission
- direct replies/follow-ups

Can be deferred if the UI does not need thread expansion yet.

## Schema Notes

Existing `submissions` table already includes:

- `sessionId`
- `participantId`
- `body`
- `parentSubmissionId`
- `kind`
- `wordCount`
- `typingStartedAt`
- `typingFinishedAt`
- `compositionMs`
- `pasteEventCount`
- `keystrokeCount`
- `inputPattern`
- `createdAt`

Potential useful additions:

- index `by_session_and_created_at` is not directly possible as a sorted compound field unless `createdAt` is in the index.
- add `.index("by_session_and_created_at", ["sessionId", "createdAt"])`.
- add `.index("by_parent_submission", ["parentSubmissionId"])` if thread expansion is implemented.

Recommended for Phase 03:

- add `by_session_and_created_at`
- add `by_parent_submission`

## Protection Baseline

### Submission Size

Backend must reject:

- empty/near-empty submissions
- submissions above hard character cap

### Rate Limiting

For this phase, implement a simple guard before adding Convex Rate Limiter wiring:

- query recent submissions by participant
- reject if too many in a short window, e.g. more than 5 submissions in 30 seconds

Later, replace or reinforce with `@convex-dev/rate-limiter`.

### Duplicate Guard

Avoid accidental double submits:

- client disables submit while pending
- backend can reject same participant same normalized body within a short window

### Content Filter

Do not add full LLM moderation yet.

For Phase 03:

- reserve function boundary for moderation
- add a simple local blocked-term placeholder only if needed
- avoid false confidence

Full moderation belongs in Phase 04/05 when AI pipeline infrastructure exists.

## Frontend Work

### Response Composer Component

Create:

```txt
src/components/session/response-composer.tsx
```

Props:

- `softWordLimit`
- `onSubmit`
- `disabled`
- optional `placeholder`
- optional `submitLabel`

Responsibilities:

- native textarea input
- word count
- local telemetry refs
- paste counter
- low-cost keydown counter
- returns `{ body, telemetry }` on submit

Do not use Pretext for text input.

### Submission Display Component

Create:

```txt
src/components/session/submission-card.tsx
```

Responsibilities:

- display response body using `PretextDisplay`
- show nickname if allowed
- show kind
- show word count
- show input pattern label
- expose optional "Add follow-up" action

### Participant Session Page

Update `/session/:sessionSlug`.

Main tab:

- show session prompt
- show composer
- submit top-level response
- after submit, clear composer and show success/last submission

Stream tab:

- if raw visibility disabled, show aggregate collection state
- if raw visibility enabled, show recent response stream

My Zone:

- list participant's own submissions
- show telemetry labels
- allow add follow-up

### Instructor Session Page

Update `/instructor/session/:sessionSlug`.

Center:

- show submitted count
- show recent submissions stream
- show input pattern aggregate:
  - composed gradually
  - likely pasted
  - mixed
  - unknown

Right activity:

- include submission events
- show nickname, kind, category placeholder, input pattern

Keep category board placeholders until Phase 04.

## Client Telemetry Implementation Detail

Use a hook:

```txt
src/hooks/use-input-telemetry.ts
```

API:

- `onKeyDown`
- `onPaste`
- `onChange`
- `snapshot(body)`
- `reset()`

Implementation:

- use refs for counters/timestamps
- no server writes while typing
- no high-frequency state updates
- optional state update only for word count from textarea change

## Tests

Add pure tests for:

- word counting
- input pattern derivation
- telemetry snapshot defaults
- duplicate normalization helper

Do not attempt full Convex integration tests yet unless the project adds a test harness.

## Acceptance Criteria

Phase 03 is complete when:

- participant can submit a top-level response
- response persists in Convex
- participant can see own responses in My Zone
- instructor can see recent submissions
- participant stream respects visibility mode
- word count uses session soft limit
- telemetry is captured locally and stored on submit
- keystroke tracking does not trigger React state updates per key
- paste events are counted without storing clipboard content separately
- duplicate/double-submit protection exists
- basic rate protection exists
- `pnpm exec tsc -b` passes
- `vp check` passes
- `vp test` passes
- `vp build` passes
- implementation is committed and pushed

## Implementation Order

1. Add schema indexes for submission stream/thread reads
2. Add pure telemetry helper functions and tests
3. Add Convex `submissions.ts`
4. Add `useInputTelemetry`
5. Add response composer component
6. Add submission card component
7. Wire participant submit and My Zone
8. Wire instructor recent submissions and aggregates
9. Add duplicate/rate guards
10. Run gates, commit, push

## Deferred To Phase 04

- immediate AI feedback
- originality comparison against LLM baseline
- categorisation
- embeddings
- smart tags integration
- AI moderation
- instructor release controls for category summaries
