# Phase 11A: Demo Readiness Backend

## Purpose

Make the demo reliable and inspectable without touching frontend UI.

This phase is backend-only. It adds seed/reset utilities, health/debug queries, load-safe counters, and simulation toggles that the frontend can wire later.

## Scope

- Demo seed session with realistic participants, submissions, categories, feedback, and synthesis artifacts.
- Safe demo reset tools guarded by explicit confirmation strings.
- Health/debug query for deployment readiness.
- Load-safe bounded counters for session command center and demo dashboards.
- Failure simulation toggles for AI and budget scenarios.

## Backend Contracts

### Demo Tools

Expose:

- `api.demo.seed`
- `api.demo.resetSession`
- `api.demo.getDemoSession`
- `api.demo.health`
- `api.demo.setToggle`
- `api.demo.listToggles`

Rules:

- `resetSession` requires an exact confirmation phrase.
- Demo reset deletes only the selected demo session data.
- Seeded data must use readable slugs and normal production tables.
- Seeded submissions should include varied telemetry patterns.

### Health Debug

Expose:

- model settings count
- prompt templates count
- protection settings count
- active Convex components generated state
- OpenAI key availability via existing model settings action
- session data counts for a selected session

### Failure Simulation

Use `demoToggles` table:

- `simulateAiFailure`
- `simulateBudgetExceeded`
- `simulateSlowAi`

Do not apply simulations globally unless explicitly enabled.

## Non-Goals

- No frontend UI.
- No destructive global database reset.
- No real load test runner.
- No auth-gated admin model.

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec tsc -b --pretty false --force
```

Full TypeScript may still report unrelated frontend work-in-progress errors.

