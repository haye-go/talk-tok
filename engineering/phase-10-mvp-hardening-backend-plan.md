# Phase 10: MVP Hardening and Convex Components Backend

## Purpose

Harden the core backend now that the live discussion loop, Fight Me, synthesis, and personal reports exist.

This phase is backend-only. It introduces Convex components where they reduce risk and fills remaining MVP backend contracts that the frontend can connect to later.

## Scope

- Register Convex components.
- Enforce application-level rate limits for participant and heavy instructor actions.
- Route heavy AI workloads through a bounded workpool.
- Add lightweight reactions.
- Add position shift tracking.
- Add session templates.
- Enforce summary-gate eligibility for follow-up responses.
- Add basic AI budget guardrails before expensive AI jobs are queued.
- Explicitly exclude `convex-smart-tags`; category hierarchy remains first-party through `categories.parentCategoryId`.

## Convex Components

Register:

- `@convex-dev/rate-limiter` as `components.rateLimiter`
- `@convex-dev/workpool` as `components.aiWorkpool`
- `@convex-dev/action-cache` as `components.actionCache`
  Do not register:

- `convex-smart-tags`

Initial usage:

- Rate limiter is active in public mutations.
- AI workpool is active for categorisation, synthesis, and personal report generation.
- Action cache is registered for later reference-answer and embedding cache work.

Decision note: `convex-smart-tags@0.1.1` currently fails Convex component bundling because the published package references missing generated component files. We will not use it for the MVP.

## Backend Contracts

### Rate Limits

Add a central `convex/components.ts` helper with named limits:

- `submitResponse`
- `followUpResponse`
- `recategorisationRequest`
- `fightMeAction`
- `heavyAiAction`
- `sessionJoin`

Apply rate limits to:

- submissions
- follow-up responses
- recategorisation requests
- Fight Me challenge/turn/draft mutations
- synthesis generation
- personal report generation
- categorisation trigger

### Workpool

Replace direct immediate scheduling for heavier AI jobs with `aiWorkpool.enqueueAction`:

- categorisation session runs
- synthesis artifact generation
- personal report generation

Keep very small or latency-sensitive jobs on current scheduler if needed.

### Reactions

Add `reactions` table and APIs:

- `api.reactions.toggle`
- `api.reactions.listForSubmission`
- `api.reactions.listForSession`

Rules:

- one reaction of the same kind per participant per submission
- peers may see aggregate counts
- instructor can see participant-level activity later if needed

### Position Shifts

Add `positionShiftEvents` table and APIs:

- `api.positionShifts.record`
- `api.positionShifts.listMine`
- `api.positionShifts.listForSession`

Track:

- participant
- optional source submission
- optional category
- reason
- influencedBy text
- createdAt

### Session Templates

Add `sessionTemplates` table and APIs:

- `api.sessionTemplates.createFromSession`
- `api.sessionTemplates.list`
- `api.sessionTemplates.createSessionFromTemplate`
- `api.sessionTemplates.archive`

Store reusable session setup:

- title
- opening prompt
- mode preset
- visibility mode
- anonymity mode
- soft word limit
- category soft cap
- critique tone default
- telemetry/Fight Me/summary gate flags
- preset category definitions

### Summary Gate Enforcement

If `session.summaryGateEnabled` is true and a follow-up prompt targets categories, participant follow-up response should require at least one published or final synthesis artifact relevant to the session.

MVP enforcement:

- require at least one published/final synthesis artifact for the session
- later can require category-specific artifact acknowledgement

### AI Budget Guardrails

Before queueing expensive AI actions:

- read `protectionSettings.aiBudget`
- sum recent `llmCalls.estimatedCostUsd` for the session
- if hard stop is enabled and budget is exceeded, reject new expensive AI queueing
- if warning threshold is exceeded, allow but write an audit event

Apply to:

- categorisation trigger
- synthesis generation
- personal report generation
- Fight Me AI generation where practical

## Non-Goals

- No frontend UI changes.
- No smart-tags component integration.
- No full taxonomy hierarchy browser.
- No D3 visualization backend.
- No real auth/role provider.
- No CSV export.
- No invasive live draft monitoring.

## Implementation Order

1. Add `convex/convex.config.ts`.
2. Add `convex/components.ts`.
3. Add schema tables for reactions, position shifts, and session templates.
4. Add budget guardrail helper.
5. Apply rate limits and budget checks to high-value mutations.
6. Route heavy AI jobs through workpool.
7. Add reactions APIs.
8. Add position shift APIs.
9. Add session template APIs.
10. Run codegen and verification gates.

## Verification

Run:

```bash
npx convex codegen
vp check
vp test
pnpm exec tsc -b --pretty false
pnpm run build
```

If frontend has active work, use targeted backend checks and report any unrelated frontend blockers separately.

## Acceptance Criteria

- Convex components are registered and generated under `components`.
- Public mutations have component-backed rate limits where relevant.
- Heavy AI jobs for categorisation, synthesis, and reports go through `aiWorkpool`.
- Reactions can be toggled and queried.
- Position shifts can be recorded and queried.
- Session templates can be created, listed, used, and archived.
- Summary gate blocks targeted follow-up responses until synthesis has been published/finalized.
- AI budget hard stop can prevent expensive AI work.
- Convex smart-tags is not registered; category relationships use the existing category parent/child structure.
- No frontend files are changed.
