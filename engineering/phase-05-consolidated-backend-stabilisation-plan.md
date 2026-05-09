# Phase 05: Consolidated Backend Stabilisation

## Purpose

Compress the missing backend foundation from the original rollout into one practical phase before more feature work.

This phase combines the remaining critical parts of:

- Phase 04 protection layer
- Phase 05 AI platform foundation hardening
- Phase 06 private feedback operational states
- Phase 07 category mapping control surface

It should make the current AI feedback and categorisation work safe enough to wire into the UI without rework.

## Scope

Backend-only unless a compile gate requires a mechanical frontend fix.

## Build

### Protection And Limits

- Add configurable protection settings.
- Keep existing lightweight submission duplicate/rate protection.
- Add protection defaults for submission, reply, reaction, recategorisation, Fight Me, and LLM budget limits.
- Expose instructor/admin functions to list and update protection settings.
- Keep telemetry summary-only; do not store raw keystroke history.

### Audit Trail

- Add audit events for instructor/system/participant actions.
- Record significant backend operations:
  - category create/update/archive
  - recategorisation request/decision
  - feedback retry
  - categorisation trigger
  - protection setting update
- Provide bounded session audit query for instructor surfaces.

### AI Job And Feedback Status

- Add job status queries by session and submission.
- Add retry path for failed private feedback.
- Keep LLM calls observable through existing `llmCalls`.
- Avoid exposing raw OpenAI keys or secrets.

### Category Management

- Add category CRUD basics:
  - create
  - update/rename
  - archive
  - list
- Keep live `categories` as source of truth.
- Keep smart-tag integration deferred; do not block UI wiring on it.

### Recategorisation Requests

- Add request table and functions.
- Participant can request recategorisation for their own submission.
- Instructor can approve/reject.
- Approval updates the submission-category assignment.

### Observability Summary

- Add bounded LLM call queries and aggregate summary:
  - calls
  - errors
  - token totals
  - estimated cost
  - average latency
- This supports the admin page later without needing a full rollup system yet.

## Non-Goals

- No full Convex Rate Limiter component wiring yet.
- No Smart Tags hierarchy implementation yet.
- No Fight Me mode yet.
- No final synthesis/report generation yet.
- No frontend redesign work.

## Implementation Notes

- Prefer small Convex modules:
  - `audit.ts`
  - `protection.ts`
  - `jobs.ts`
  - `categoryManagement.ts`
  - `recategorisation.ts`
  - `llmObservability.ts`
- Keep public functions bounded and validator-backed.
- Use readable session slugs at public boundaries.
- Use internal mutations for cross-feature audit writes.

## Verification

Run:

```bash
npx convex codegen
vp check
vp test
pnpm exec tsc -b --pretty false
pnpm run build
```

## Acceptance Criteria

- Instructor/admin backend has settings and observability contracts.
- Participant can request recategorisation.
- Instructor can decide recategorisation requests.
- Categories can be managed without direct table edits.
- Failed feedback can be retried.
- AI jobs are queryable for pending/success/error states.
- All gates pass.
