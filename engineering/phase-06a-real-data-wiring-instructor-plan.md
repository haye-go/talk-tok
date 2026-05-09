# Phase 06a: Instructor Data Contracts

## Purpose

Expose stable Convex backend contracts for the instructor command center so the frontend designer can connect the UI without needing to understand raw table joins.

This replaces the earlier frontend-wiring interpretation of Phase 06a. The implementation is backend-only.

## Scope

- Add a bounded instructor overview query for command-center data.
- Add instructor-safe session controls needed by the shell.
- Keep category CRUD, categorisation trigger, recategorisation decisions, audit, jobs, and observability as separate existing APIs.
- Do not edit instructor page or component UI files.

## Backend Contracts

### `api.instructorCommandCenter.overview`

Input:

- `sessionSlug`

Returns:

- session metadata and current phase/act
- participant presence aggregate
- response and input-pattern aggregates
- active categories with recent assignment counts
- uncategorized count
- pending recategorisation count
- latest jobs grouped by type/status
- recent submissions
- recent audit activity

### `api.instructorControls.updatePhase`

Input:

- `sessionSlug`
- `phase`
- optional `currentAct`

Purpose:

- lets instructor move the session through lobby, submit, discover, challenge, synthesize, and closed states.

### `api.instructorControls.updateVisibility`

Input:

- `sessionSlug`
- `visibilityMode`

Purpose:

- controls whether participants see private-only, category-summary-only, or raw-response-visible surfaces.

## Existing APIs For UI To Use

- `api.categorisation.triggerForSession`
- `api.categoryManagement.listForSession`
- `api.categoryManagement.create`
- `api.categoryManagement.update`
- `api.categoryManagement.archive`
- `api.recategorisation.listForSession`
- `api.recategorisation.decide`
- `api.jobs.listForSession`
- `api.audit.listForSession`
- `api.llmObservability.summary`
- `api.llmObservability.recentCalls`

## Non-Goals

- No frontend page wiring.
- No D3 graphing.
- No Fight Me workflow.
- No follow-up composer.
- No final synthesis report.

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

- The instructor UI can get command-center state from one query.
- Instructor phase and visibility controls have backend mutations.
- All new reads are bounded.
- No designer-owned frontend files are changed.
- Gates pass.
