# Participant Threaded Implementation Sequence

Date: 2026-05-12
Scope: Recommended implementation and commit sequence for the participant threaded-message redesign.

Use this together with:

- `engineering/ui-phase-12-participant-threaded-message-model-plan.md`
- `engineering/ui-phase-12b-participant-threaded-message-execution-plan.md`
- `engineering/ui-phase-12c-participant-thread-model-frontend-checklist.md`
- `engineering/ui-phase-12d-participant-thread-model-backend-checklist.md`

## Purpose

This document records the recommended execution order for implementing the participant threaded-message redesign.

It exists to answer a narrower question than the other Phase 12 documents:

- what should be built first
- what should be grouped into commits
- what should remain compatible while the transition is in progress

This sequence is designed to:

- stabilize backend contracts before the frontend depends on them
- keep commits reviewable and isolated
- avoid breaking the current participant workspace mid-refactor
- preserve compatibility until the new UI is fully switched over

## Execution Protocol

Use this protocol for every implementation slice under Phase 12.

Before starting a slice, explicitly identify:

- current `12e` step
- matching `12b` section or sections
- matching checklist:
  - `12c` for frontend work
  - `12d` for backend work
- target commit message
- compatibility constraints that must remain intact during this slice

### Required per-slice workflow

1. Start from `12e`

   Determine which single step is being implemented now.

2. Narrow to the matching `12b` detail

   Read only the relevant execution-detail section in:

   - `engineering/ui-phase-12b-participant-threaded-message-execution-plan.md`

   Do not treat all of `12b` as active scope if only one slice is being implemented.

3. Validate scope with the relevant checklist

   Use:

   - `engineering/ui-phase-12c-participant-thread-model-frontend-checklist.md`
   - or `engineering/ui-phase-12d-participant-thread-model-backend-checklist.md`

   depending on the slice.

4. Inspect only the code needed for that slice

   Read the directly affected files and nearby helpers. Avoid widening implementation scope just because related files exist.

5. Implement only that slice

   Do not mix:

   - backend contract changes with major tab rewrites
   - shared UI primitive work with desktop adaptation
   - question-surface styling cleanup with archival/history redesign

6. Verify against the matching checklist

   Before closing the slice, confirm the relevant checklist items for that step are satisfied.

7. Commit using the step-aligned commit message

   The commit should represent exactly one step or one tightly related sub-slice from `12e`.

### Control rule

If a new idea or required fix appears during implementation, classify it before acting:

- if it belongs to the current `12e` step, include it
- if it belongs to a later `12e` step, record it and defer it
- if it conflicts with `12b`, resolve the conflict in planning first instead of silently changing direction in code

## Execution Principles

### 1. Backend before major UI rewrites

Do not start large `Contribute` and `Explore` rewrites until the participant workspace contract can provide:

- selected-question scoped data
- threaded own-message data
- threaded peer-message data
- grouped-by-category room data

### 2. Shared UI primitives before tab rewrites

Do not rewrite `Contribute` and `Explore` separately using two different component systems.

Create the shared thread-card and compact interaction primitives first.

### 3. Keep compatibility fields until the new UI is fully switched

Do not remove older workspace fields while the old participant page logic still depends on them.

Old fields can remain temporarily as compatibility output while the frontend migrates.

### 4. Keep backend and frontend refactors in separate commits

Do not combine:

- backend contract changes
- major tab rewrites

in the same commit.

That makes debugging, rollback, and review materially worse.

## Recommended Implementation Sequence

## Step 1: Backend selected-question foundation

### Goal

Stabilize question ordering, selected-question normalization, and learner presence support before thread-model work begins.

### Main work

- update `convex/participantWorkspace.ts`
- ensure selected question remains normalized to current or valid released question
- expose released questions in stable frontend-friendly order:
  - current question first
  - remaining released questions newest first
- add learner presence aggregate to the workspace contract

### Keep compatible

- existing frontend workspace fields
- current participant page should still load with no behavior regression

### Commit

`feat(participant): add question-scoped workspace ordering and presence aggregate`

## Step 2: Backend threaded workspace contract

### Goal

Provide first-class thread data for own messages and peer messages while preserving old compatibility output.

### Main work

- add `myThreads`
- add `peerThreads`
- assemble replies server-side
- include compact stats:
  - reply count
  - upvote count
  - viewer upvote state if needed
- include compact assignment summary
- include compact own-message feedback summary where relevant

### Files likely touched

- `convex/participantWorkspace.ts`
- `convex/submissions.ts`
- small helper extraction files if useful

### Keep compatible

- old split arrays such as `initialResponses`, `followUpResponses`, and flat peer response fields

### Commit

`feat(participant): add threaded workspace contract for own and peer messages`

## Step 3: Backend grouped Explore and synthesis support

### Goal

Support `Explore` room modes cleanly before the frontend mode switch is implemented.

### Main work

- add `peerThreadsByCategory`
- add participant-friendly synthesis view shape
- include supporting snippet counts and expandable references where needed
- add any small schema/index support required for efficient grouped retrieval

### Files likely touched

- `convex/participantWorkspace.ts`
- `convex/schema.ts`
- synthesis-related backend helpers as needed

### Keep compatible

- existing participant `synthesis` output
- existing category summary output until the new `Explore` UI is switched

### Commit

`feat(participant): add grouped category and synthesis contracts for explore`

## Step 4: Shared frontend thread primitives

### Goal

Create the shared UI foundation for both `Contribute` and `Explore`.

### Main work

- add shared participant thread-card components
- add nested reply rendering primitives
- add compact stats row
- add compact action row
- update `ReactionBar` to support a compact feed/thread mode

### Files likely touched

- new shared message components under `src/components/messages/` or equivalent
- `src/components/reactions/reaction-bar.tsx`
- possibly light wrapper adjustments in:
  - `src/components/contribute/contribution-thread-card.tsx`
  - `src/components/stream/response-stream-item.tsx`

### Keep compatible

- tab layouts stay mostly intact in this step
- avoid full `Contribute` or `Explore` rewrites yet

### Commit

`feat(participant-ui): add shared thread card and compact feed actions`

## Step 5: Shell and question-surface cleanup

### Goal

Fix question-context presentation before the major tab rewrites land.

### Main work

- update `participant-question-bar`
- update `participant-context-rail`
- update `participant-shell`
- refine question-surface tokens in `src/styles/globals.css`
- make question context visually distinct from top-bar chrome
- ensure released-question ordering is correct everywhere

### Files likely touched

- `src/components/layout/participant-question-bar.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-shell.tsx`
- `src/styles/globals.css`

### Commit

`feat(participant-ui): refine question context shell and styling`

## Step 6: `Contribute` tab rewrite

### Goal

Replace the contribution-record model with the selected-question own-thread workspace.

### Main work

- rewrite the `Contribute` branch in `src/pages/participant-workspace-page.tsx`
- remove `primaryContribution` as the defining UI model
- remove `Earlier points` as the primary multi-message structure
- add compact presence/status row
- keep persistent compact composer at the top
- render own top-level messages newest first
- nest replies under each message
- surface own-only insights as secondary expansion

### Files likely touched

- `src/pages/participant-workspace-page.tsx`
- `src/components/submission/response-composer.tsx`
- shared message components

### Notes

At this point the page should begin consuming the new thread-oriented backend shape.

### Commit

`feat(participant-ui): convert contribute tab to threaded own-message workspace`

## Step 7: `Explore` tab rewrite

### Goal

Convert `Explore` into an explicit room surface with `Latest`, `By category`, and `Synthesis` modes.

### Main work

- add room mode switch
- render `Latest` from `peerThreads`
- render `By category` from `peerThreadsByCategory`
- render `Synthesis` from the participant-friendly synthesis contract
- remove duplicate nickname display
- remove the large presence bar from the top of `Explore`
- compress reply/fight/upvote affordances
- keep replies nested inline

### Files likely touched

- `src/components/stream/stream-tab.tsx`
- shared message components
- `src/components/reactions/reaction-bar.tsx`

### Commit

`feat(participant-ui): convert explore tab to threaded room modes`

## Step 8: `Me` and `Fight` consistency pass

### Goal

Align secondary participant surfaces to the new thread model and tab responsibilities.

### Main work

- make `Me` more clearly archival and reflective
- group history by question where appropriate
- reduce duplicated active-workflow detail in `Me`
- tighten `Fight` rules placement and message-excerpt consistency
- ensure `Fight` remains question-scoped where relevant

### Files likely touched

- `src/components/myzone/my-zone-tab.tsx`
- `src/components/fight/*`
- `src/pages/participant-workspace-page.tsx`

### Commit

`feat(participant-ui): align me and fight surfaces with threaded model`

## Step 9: Desktop adaptation pass

### Goal

Use desktop width for persistent context and better scanning without changing product logic.

### Main work

- keep desktop behavior aligned with mobile
- improve layout density and side-by-side scanning
- persist context where helpful
- avoid reintroducing:
  - repeated large question cards
  - duplicated content between tabs
  - oversized action rows

### Files likely touched

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/stream/stream-tab.tsx`
- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Commit

`feat(participant-ui): adapt threaded participant workspace for desktop`

## Step 10: Verification and cleanup

### Goal

Remove transitional clutter, update tests, and confirm the redesign behaves correctly.

### Main work

- remove compatibility paths that are no longer needed
- remove dead or transitional UI logic
- update tests or add missing ones
- verify question ordering and thread rendering across tabs
- confirm backend and frontend contracts are aligned

### Validation commands

- `pnpm lint`
- `pnpm check`
- `pnpm test`

If pre-existing failures remain, separate them clearly from failures introduced by this work.

### Commit

`test(participant): cover threaded workspace flows and cleanup compatibility paths`

## Suggested File Change Grouping By Commit

This is the intended grouping discipline.

### Backend-only commits

Use for:

- Step 1
- Step 2
- Step 3

Do not mix major React layout rewrites into these commits.

### Shared-UI commit

Use for:

- Step 4

This commit should be small enough to review as a component-system change rather than a product rewrite.

### Tab-level UI commits

Use one commit per major tab rewrite:

- Step 6 for `Contribute`
- Step 7 for `Explore`
- Step 8 for `Me` and `Fight`

This keeps review and rollback clean.

### Layout/density commit

Use for:

- Step 9

Keep it focused on desktop adaptation rather than product logic changes.

## Things Not To Do

- Do not remove old participant workspace fields before the new page consumes the new thread contract.
- Do not rewrite `Contribute` and `Explore` against different data models.
- Do not combine backend query-shape changes and major UI-mode changes into one commit.
- Do not let the desktop pass reintroduce duplication that mobile cleanup removed.

## Summary

The correct sequence is:

1. backend selected-question foundation
2. backend thread contract
3. backend grouped Explore and synthesis support
4. shared thread UI primitives
5. shell and question-surface cleanup
6. `Contribute` rewrite
7. `Explore` rewrite
8. `Me` and `Fight` alignment
9. desktop adaptation
10. verification and cleanup

This order minimizes breakage, keeps the migration understandable, and preserves clean commit boundaries throughout the redesign.
