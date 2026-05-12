# Phase 16: Participant Workspace Shell Consolidation Plan

## Purpose

Phase 16 removes the remaining participant-route splits that still behave like separate learner modes.

After Phase 14, the learner IA is already centered on four stable tabs:

- `Contribute`
- `Explore`
- `Fight`
- `Me`

But the routing layer still breaks that model in two places:

- `/session/:sessionSlug/fight/:fightSlug`
- `/session/:sessionSlug/review`

Both routes currently mount their own `ParticipantShell`, which means the learner can enter a sub-route that still shows the bottom tabs while no longer sharing the same tab content, question context, or workspace state as the main session route.

This phase fixes that at the root.

## Problem Statement

The current participant session architecture has one real workspace owner and two shell exceptions:

- `src/pages/participant-session-page.tsx` owns the real tabbed workspace.
- `src/pages/fight-page.tsx` mounts a separate `ParticipantShell` with only `fight`.
- `src/pages/review-page.tsx` mounts a separate `ParticipantShell` with only `me`.

Consequences:

- tab clicks stop meaning "switch within the same learner workspace"
- fight/review routes become pseudo-modes instead of detail states
- placeholder content appears when a stripped-down shell receives a tab switch
- the browser history model is weaker than the UI implies
- fight and review state drift from the active question/session shell

This is a structural bug, not just a fight-route bug.

## Approved Direction

Use one participant workspace shell for the entire in-session learner experience.

Keep fight thread view and review view as child-route states that render inside that workspace shell.

That means:

- there is exactly one owner of `ParticipantShell` for in-session participant routes
- learner tabs always refer to the same workspace
- child routes refine the content inside a tab, not the existence of the shell

## Scope

Phase 16 covers participant-facing in-session routing and shell ownership only.

In scope:

- `/session/:sessionSlug`
- `/session/:sessionSlug/fight/:fightSlug`
- `/session/:sessionSlug/review`
- participant tab routing behavior
- shared participant top bar, question header, and tab-state ownership
- removal of placeholder-producing split shell behavior

Out of scope:

- join flow
- demo persona picker
- instructor routes
- projector routes
- backend schema changes
- a redesign of the learner tab IA from Phase 14

## Target Architecture

### Single Shell Owner

Introduce one participant workspace route component that owns:

- `ParticipantShell`
- active tab selection
- selected released question override
- shared participant/session/workspace queries
- shared top bar
- shared session/question header
- navigation between tab state and child-route detail state

This route becomes the only place that mounts `ParticipantShell` for in-session participant use.

### Child-Route Model

Keep fight and review as real routes, but render them within the participant workspace rather than as standalone shell pages.

Target behavior:

- `/session/:sessionSlug`
  - standard workspace
- `/session/:sessionSlug/fight/:fightSlug`
  - same workspace shell, `Fight` tab active, thread view rendered inside `Fight`
- `/session/:sessionSlug/review`
  - same workspace shell, `Me` tab active, review/report view rendered inside `Me`

### Tab Semantics

Tabs must always mean:

- `Contribute`: learner writing and contribution management
- `Explore`: room-facing exploration and interaction
- `Fight`: structured challenge workspace and fight thread detail
- `Me`: private archive, analysis, report, and report-detail view

Tabs must never mean:

- local state inside a shell fragment that happens to be mounted on a sub-route

## Route Contract Changes

Phase 16 should preserve readable participant URLs, but change how they are rendered.

### Keep

- `routes.session(sessionSlug)`
- `routes.sessionFight(sessionSlug, fightSlug)`
- `routes.sessionReview(sessionSlug)`

### Change

- `FightPage` should stop owning a separate shell.
- `ReviewPage` should stop owning a separate shell.
- the route tree should have a parent participant workspace route or equivalent shared wrapper so child routes render into the same shell context.

### Route-State Rule

When a learner is on a child route:

- `fight/:fightSlug` implies active tab `fight`
- `review` implies active tab `me`

When a learner taps another bottom tab from those child routes:

- navigate back to the relevant workspace state
- do not switch internal shell state on a stripped-down page

## File-Level Direction

Expected files to change:

- `src/router.tsx`
- `src/lib/routes.ts`
- `src/pages/participant-session-page.tsx`
- `src/pages/fight-page.tsx`
- `src/pages/review-page.tsx`
- `src/components/layout/participant-shell.tsx`
- `src/components/layout/bottom-tab-bar.tsx`

Likely new files:

- a participant workspace route container or layout component under `src/pages/` or `src/components/layout/`
- optional participant-route state helper under `src/lib/` or `src/hooks/`

Possible follow-on component extraction if it helps keep the page sane:

- `ParticipantWorkspaceContent`
- `FightTabView`
- `MeTabView`
- `ParticipantQuestionHeader`

Do not extract aggressively unless it clearly reduces confusion.

## Implementation Strategy

### 16-1: Introduce A Single In-Session Workspace Owner

Create or refactor a participant workspace route/container that owns:

- shell mounting
- active tab
- shared route params
- shared session/participant/workspace data
- question selection state

Acceptance:

- there is only one in-session `ParticipantShell` owner
- fight and review pages no longer mount independent shell instances

### 16-2: Convert Fight Route To In-Shell Child Content

Move fight-thread rendering into the workspace-owned `Fight` tab.

Implementation direction:

- when a `fightSlug` child route is present, the `Fight` tab renders `FightThread`
- when no `fightSlug` is present, the `Fight` tab renders `FightHome`
- `onNavigateToThread` continues to deep-link via route helpers

Acceptance:

- a fight thread keeps the learner inside the same shell
- tapping `Contribute`, `Explore`, or `Me` from a fight thread no longer reveals placeholder content

### 16-3: Convert Review Route To In-Shell `Me` Detail Content

Move report/review rendering into the workspace-owned `Me` tab.

Implementation direction:

- when the `review` child route is active, `Me` shows the report-focused detail surface
- when not active, `Me` shows the normal private workspace and its existing report entry point
- report generation/loading/error states remain real and intact

Acceptance:

- review is accessible as a route, but no longer behaves as a separate shell mode
- the learner remains inside the same `Me` context before, during, and after review navigation

### 16-4: Make Bottom Tabs Route-Aware

Update tab switching so it respects route state rather than only local shell state.

Implementation direction:

- from the workspace root route, tab changes may stay local if that remains clean
- from `fight/:fightSlug` and `review`, tab changes must navigate to the corresponding workspace route state
- tab behavior should be deterministic under browser back/forward

Acceptance:

- bottom tabs never strand the learner in a detail route with the wrong content surface
- tab clicks feel like workspace navigation, not local page toggles

### 16-5: Remove Placeholder Fallbacks As Navigation Crutches

`ParticipantShell` can keep placeholder support for early development if necessary, but it must not be relied on by real participant navigation paths.

Implementation direction:

- ensure all live participant routes pass real content for the active tabs they expose
- if useful, tighten `ParticipantShell` so production routes cannot silently fall back during normal use

Acceptance:

- placeholder cards are no longer reachable through standard participant session navigation

### 16-6: Align Docs And Regression Coverage

Update route and participant-shell contracts after the consolidation.

Files likely include:

- `engineering/route-registry.md`
- `src/lib/routes.test.ts`
- participant route/page tests where practical

Recommended smoke coverage:

- participant root route renders normal shell
- fight route renders fight thread inside shell
- review route renders report view inside shell
- tab switch from fight route returns to correct workspace content
- tab switch from review route returns to correct workspace content

Acceptance:

- docs reflect the real route ownership model
- the original fight-placeholder bug is covered by tests or at least route-aware smoke checks

## Product Rules To Preserve

Phase 16 must preserve these approved behaviors:

- released questions remain browseable even when not current
- current question is a nudge, not a hard gate
- tabs stay visible at all times
- private feedback remains inline in `Contribute`
- `Explore` remains separate from `Fight`
- `Fight` remains a structured challenge flow, not normal replies
- `Me` remains the private archive and report hub
- review remains accessible by URL
- fight thread remains accessible by URL

## Risks And Watchpoints

### Route-State Duplication

Do not let active tab live independently in:

- route path
- local page state
- child page defaults

There should be one clear source of truth with explicit derivation for child routes.

### Query Duplication

Do not duplicate participant/session/workspace subscriptions across:

- root participant page
- fight page
- review page

The new parent workspace should centralize these where practical.

### Oversized Workspace Component

The shell must be unified, but do not turn the participant workspace into an unreadable monolith.

If the file becomes too large, extract view-level tab sections without reintroducing route-owned shells.

### Review State Drift

The mixed-mode report policy from Phase 15 must remain intact:

- learners can still self-request reports
- instructors can still control report visibility in-session
- review route detail should not bypass that logic

## Suggested Order

1. establish single shell owner
2. move fight route into in-shell child content
3. move review route into in-shell child content
4. make tabs route-aware
5. remove real-navigation dependence on placeholders
6. update docs and smoke coverage

## Verification Checklist

- only one participant in-session route tree owns `ParticipantShell`
- `/session/:sessionSlug/fight/:fightSlug` renders inside the shared workspace shell
- `/session/:sessionSlug/review` renders inside the shared workspace shell
- switching tabs from a fight thread does not show placeholders
- switching tabs from review does not show placeholders
- browser back/forward preserves sensible workspace behavior
- fight thread deep links still work
- review deep links still work
- selected question context remains available while moving between tabs and child routes
- no new full-page reload behavior is introduced
- `pnpm exec tsc -b` still passes
- route docs and route helpers remain aligned

## Non-Goals

- redesign the learner tabs again
- remove fight or review routes entirely
- rewrite participant backend queries
- merge Fight into Explore
- expose private report content in public learner surfaces
- change instructor workflow or dashboard structure
