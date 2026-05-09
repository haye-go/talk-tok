# Phase 12A: Observability and Demo Ops Backend

## Purpose

Upgrade the existing LLM observability and demo readiness backend enough for a live demo and post-demo debugging.

This phase is backend-only. The frontend/admin UI can wire these contracts later.

## Current Baseline

Already available:

- `llmCalls` records provider, model, feature, status, tokens, latency, estimated cost, request JSON, response JSON, and error.
- `api.llmObservability.summary` returns bounded aggregate usage.
- `api.llmObservability.recentCalls` returns recent call rows.
- `api.budget.getSessionSpend` returns session spend against the budget setting.
- `api.demo.health` returns demo readiness counts and component flags.
- `api.demo.setToggle` supports AI failure, slow AI, and budget-exceeded simulation.

## Scope

### 1. Observability Drilldown

Add call-level detail for admin debugging:

- `api.llmObservability.getCall`
- lookup by `llmCallId`
- include raw request JSON and raw response/error JSON
- include normalized prompt template key, feature, provider, model, status, tokens, latency, and estimated cost

Rules:

- bounded to one call by ID
- no participant-facing access path
- raw request/response is admin-only demo tooling

### 2. Export-Ready Data

Add export-shaped queries without implementing file download UI:

- `api.llmObservability.exportCalls`
- optional filters:
  - `sessionSlug`
  - `feature`
  - `status`
  - `sinceMs`
  - `untilMs`
  - `limit`
- return flat rows that frontend can convert to CSV

Recommended row fields:

- `createdAt`
- `sessionId`
- `feature`
- `provider`
- `model`
- `status`
- `promptTemplateKey`
- `inputTokens`
- `cachedInputTokens`
- `outputTokens`
- `reasoningTokens`
- `estimatedCostUsd`
- `latencyMs`
- `error`

### 3. Budget Dashboard Contracts

Add richer budget summaries:

- by session
- by feature
- by model
- by status
- warning/hard-stop state from `protectionSettings`

Candidate query:

- `api.llmObservability.budgetSummary`

Use bounded recent sample reads for MVP. Do not build persistent rollup tables until actual data volume needs it.

### 4. Demo Ops Status

Add an admin-facing operational status query that combines:

- default model settings count
- prompt template count
- protection setting count
- demo toggles
- OpenAI key availability
- latest AI failures
- latest queued/processing jobs
- latest semantic jobs
- latest synthesis/report jobs

Candidate query:

- `api.demo.opsStatus`

### 5. Simulation Controls

Keep existing demo toggles:

- `simulateAiFailure`
- `simulateBudgetExceeded`
- `simulateSlowAi`

Add if needed:

- `simulateModerationFlag`
- `simulateEmbeddingFailure`

Only add new toggles if the implementation has a direct backend branch that uses them.

## Non-Goals

- No frontend admin UI.
- No CSV file generation on the server.
- No persistent rollup tables unless needed.
- No auth model overhaul.
- No changes to participant flows.

## Implementation Notes

- Prefer bounded indexed queries.
- Do not use `.collect()` for potentially unbounded data.
- Keep raw request/response drilldown separate from summary queries.
- Keep estimates as estimates; do not present them as provider invoices.
- If pagination is needed, prefer Convex pagination rather than large `limit` values.

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec tsc -b
```

Optional after implementation:

```bash
pnpm run build
```

## Acceptance Criteria

- Admin can retrieve a single failed LLM call with raw request/response details.
- Admin can retrieve export-shaped recent LLM usage rows.
- Admin can retrieve usage breakdowns by feature, model, and status.
- Demo ops status exposes enough backend health to diagnose missing defaults, stuck jobs, and AI failures.
- No frontend files are touched.

