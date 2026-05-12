# Instructor Workspace Shell Plan

Date: 2026-05-12
Scope: Comprehensive instructor-session interface plan for the live session workspace, including information architecture, shell layout, room/setup/reports responsibilities, right-rail live controls, participant-thread-model impact, and Phase 17 similarity-map integration.

## Purpose

The current instructor live session page is still an all-in-one operations surface.

That was acceptable when the instructor mostly needed:

- a flat recent submission feed
- category controls
- session visibility toggles
- synthesis/report triggers

It is no longer sufficient now that the participant experience has moved to:

- question-scoped threaded messages
- nested replies
- multiple released room views
- category grouping as a participant-facing surface
- a forthcoming similarity-map surface from Phase 17

The instructor interface now needs a real workspace shell, not a single long page.

## Problem Statement

The current instructor session experience is structurally overloaded.

Current shape:

- one large page in [src/pages/instructor-session-page.tsx](../src/pages/instructor-session-page.tsx)
- one broad overview query in [convex/instructorCommandCenter.ts](../convex/instructorCommandCenter.ts)
- a shell scaffold in [src/components/layout/instructor-shell.tsx](../src/components/layout/instructor-shell.tsx), but not a coherent instructor IA

Current problems:

- live room reading, question setup, synthesis, reports, AI jobs, and semantic tooling all compete in one page
- recent submissions are still treated too much like a flat moderation feed rather than thread roots with nested replies
- current-question control is weak compared with the new participant question-centric model
- release and interaction controls are too global and not cleanly organized around live use
- there is no proper home for Phase 17 similarity clusters inside the instructor workflow
- the instructor cannot move cleanly between live moderation, preparation, and post-discussion review

This is now an information-architecture problem, not just a styling problem.

## Locked Product Decisions

These decisions are treated as approved inputs for implementation.

### 1. The instructor session page becomes a real shell

The live instructor route should use a stable three-part shell:

- left rail: navigation
- center: active workspace
- right rail: persistent live control rail

### 2. Top-level instructor tabs are `Room`, `Setup`, and `Reports`

Definitions:

- `Room`: live moderation and room reading
- `Setup`: question/category/follow-up/session preparation and configuration
- `Reports`: synthesis, personal reports, argument map, and AI/semantic review

### 3. The listing page should offer two entry links

The instructor dashboard/session-list page should provide:

- `Open Room`
- `Open Setup`

This allows intent-based entry without creating separate products.

### 4. The right rail is live-only

The persistent right rail is for actions and status that may need to be reached from any tab during a live session.

It should contain:

- selected question context
- question switcher
- live release toggles
- live interaction toggles
- live counters

It should not contain:

- large forms
- category editing forms
- question drafting forms
- deep report-generation controls

### 5. `Room` has internal modes

`Room` should support:

- `Latest`
- `Categories`
- `Similarity`

These are room-reading modes, not separate top-level destinations.

### 6. `Needs Attention` stays inside `Room`

Do not create a separate `Queue` tab by default.

Instead:

- keep unresolved live-action items inside `Room`
- render them as a collapsible `Needs Attention` section
- default that section to open during live use

### 7. Follow-up creation and launch are live actions

The instructor must be able to:

- create a brand-new follow-up from `Room`
- launch a follow-up from `Room`

More complex drafting/editing workflows can still live in `Setup`.

### 8. Phase 17 similarity belongs in `Room`

The similarity map is a live discussion-reading surface.

Therefore:

- `Similarity` mode belongs inside `Room`
- the argument map remains a separate surface in `Reports`

## Design Principles

### Discussion first

The center of `Room` must remain discussion-first, not control-first.

### Live control persistence

The instructor should not need to leave the current workspace just to toggle a live setting.

### Question-centric structure

The instructor IA should follow the same question-centric logic that now drives the participant workspace.

### Separate semantic meanings

Keep these distinct:

- category board
- similarity clusters
- argument map

They answer different questions and should not be merged into one instructor surface.

### Avoid full-page admin sprawl

The instructor session page should feel like a live moderation workspace, not a settings dump or operations console.

## Target Information Architecture

## Shell Layout

### Left rail

Responsibilities:

- session identity
- top-level navigation
- current tab visibility
- room submode switching when on `Room`

Contents:

- session title
- join/session code if still useful
- tabs: `Room`, `Setup`, `Reports`
- when in `Room`, submode switcher:
  - `Latest`
  - `Categories`
  - `Similarity`

### Center workspace

This is the active working surface for the selected tab.

Rules:

- `Room` center is message-thread-first
- `Setup` center is configuration-form-first
- `Reports` center is artifact/review-first

### Right rail

Persistent live control rail.

Default contents:

- selected question summary
- question switcher
- contribution open/closed
- peer responses hidden/released
- category board hidden/released
- synthesis hidden/released
- reports hidden/released
- replies on/off
- upvotes on/off
- fight on/off
- live counters:
  - typing
  - submitted
  - uncategorized
  - pending recategorisation

Optional but valid:

- quick launch saved follow-up
- quick create new follow-up entry point

## URL / Route Contract

Keep one primary live route:

- `/instructor/session/:sessionSlug`

Drive shell state through search params rather than splitting the session into many standalone pages.

Recommended search params:

- `tab=room|setup|reports`
- `mode=latest|categories|similarity`
- `questionId=<sessionQuestionId>`

Rules:

- `tab=room` is the default if omitted
- `mode` is only meaningful when `tab=room`
- `questionId` defaults to current question when omitted

Dashboard/session-list links should resolve to:

- `Open Room` -> `/instructor/session/:sessionSlug?tab=room`
- `Open Setup` -> `/instructor/session/:sessionSlug?tab=setup`

This keeps the IA unified while still supporting intent-based entry.

## Room

Job: moderate what is happening now.

### Room structure

Recommended center order:

1. room header
2. `Needs Attention`
3. active room mode content

### Room header

Shows:

- room title/context
- selected question summary
- current room mode
- live headline counters if useful

Keep it compact.

### Needs Attention

This is the live triage section.

It should surface:

- uncategorized root threads
- pending recategorisation requests
- cluster-promotion opportunities from similarity
- any other unresolved live actions that block moderation flow

This should be:

- collapsible
- open by default
- compact enough to coexist with the room feed

### Room mode: `Latest`

Purpose:

- chronological live reading of threaded discussion

Data model:

- root threads only at the top level
- nested replies underneath
- message metadata kept compact

Each thread item should be able to show:

- author
- body
- category if assigned
- created time
- upvote count
- reply count
- nested replies
- moderation cues such as uncategorized or recat pending

This should consume the same thread semantics the participant UI now uses, but with instructor-specific controls and visibility.

### Room mode: `Categories`

Purpose:

- read the live room as instructor buckets, not as a pure timeline

Display model:

- one container per category
- uncategorized roots in a separate explicit area
- each category contains root threads with nested replies

This is not a category editor.

It is a live reading board with lightweight moderation actions.

### Room mode: `Similarity`

Purpose:

- read discussion through semantic proximity before or alongside formal category assignment

This mode depends on Phase 17.

Display model:

- one visible cluster section per semantic cluster
- representative thread or cluster label
- root threads nested inside
- replies remain visually nested under the root thread
- outlier group if needed

Useful instructor actions here:

- promote cluster into a category
- merge cluster into an existing category
- ignore cluster
- rebuild/refresh cluster assignments if the semantic pipeline supports it

This mode should not replace:

- categories
- argument map

### Room-only actions

These should be reachable inside `Room` and do not need to live permanently in the right rail:

- create brand-new follow-up
- launch follow-up
- triage recategorisation requests
- assign uncategorized roots
- promote similarity clusters

## Setup

Job: prepare and configure the session and question model.

Setup is where configuration and preparation work belongs.

### Setup responsibilities

- question creation/editing
- current question selection
- release order / released-question management
- category creation/editing
- follow-up drafting and editing
- baseline generation controls
- any non-urgent session configuration

### Setup should not contain

- live room feed as the main surface
- synthesis/report reading
- argument map as the main view

### Setup question model

This surface should be question-centric, not session-general.

Recommended structure:

- question list or question switcher
- selected question editor
- per-question capability and release settings
- category configuration for that question
- follow-up drafting for that question

This is the correct destination for anything that feels like “prepare the next discussion state”.

## Reports

Job: review the discussion after or alongside live use.

### Reports responsibilities

- synthesis artifacts
- personal reports
- argument map
- AI job/semantic status panels
- semantic review or observability that is not urgent-live

### Reports sub-surfaces

Recommended sections:

- `Synthesis`
- `Personal Reports`
- `Argument Map`
- `AI / Semantic Ops`

The exact subdivision can be tabbed or sectional, but it should not spill back into `Room`.

### Argument map location

The argument map should stay here, not in `Room`.

Reason:

- argument structure is a post-processed analysis surface
- similarity in `Room` is for live semantic reading
- these are different meanings

## Current File Impact

The current implementation likely changes most in these areas.

### Frontend shell and routing

- [src/pages/instructor-session-page.tsx](../src/pages/instructor-session-page.tsx)
- [src/pages/instructor-dashboard-page.tsx](../src/pages/instructor-dashboard-page.tsx)
- [src/components/layout/instructor-shell.tsx](../src/components/layout/instructor-shell.tsx)
- [src/components/layout/instructor-top-bar.tsx](../src/components/layout/instructor-top-bar.tsx)

Likely new components:

- `src/components/instructor/instructor-workspace-shell.tsx`
- `src/components/instructor/instructor-left-rail.tsx`
- `src/components/instructor/instructor-live-rail.tsx`
- `src/components/instructor/room-tab.tsx`
- `src/components/instructor/setup-tab.tsx`
- `src/components/instructor/reports-tab.tsx`
- `src/components/instructor/room-needs-attention.tsx`
- `src/components/instructor/thread-room-item.tsx`
- `src/components/instructor/similarity-room-board.tsx`

### Existing instructor components likely to be repurposed or narrowed

- [src/components/instructor/question-manager-panel.tsx](../src/components/instructor/question-manager-panel.tsx)
- [src/components/instructor/session-controls-card.tsx](../src/components/instructor/session-controls-card.tsx)
- [src/components/instructor/ai-job-status-panel.tsx](../src/components/instructor/ai-job-status-panel.tsx)
- [src/components/instructor/argument-map-graph.tsx](../src/components/instructor/argument-map-graph.tsx)

### Existing shared components likely affected

- [src/components/submission/submission-card.tsx](../src/components/submission/submission-card.tsx)
- any participant/instructor thread-display primitives created during the participant threaded-message work

## Backend / Query Impact

The current instructor query shape is too monolithic and too flat for the target UI.

### Current backend limitations to fix

The current overview in [convex/instructorCommandCenter.ts](../convex/instructorCommandCenter.ts):

- is centered on one large response payload
- is still current-question-heavy
- includes flat recent submissions instead of explicit room-thread models
- does not cleanly separate room/setup/reports data concerns

### Recommended query split

Do not keep growing one oversized overview query.

Instead split instructor data into tab-scoped queries.

Recommended backend contracts:

#### 1. session shell query

Purpose:

- shared shell frame data used by every tab

Suggested output:

- session summary
- current question summary
- released question list
- selected question fallback data
- right-rail live counters
- right-rail release/interaction state

#### 2. room query

Purpose:

- data needed for `Room`

Suggested output:

- selected question
- latest root threads with nested replies
- category-grouped room view
- uncategorized roots
- pending recategorisation summary
- room-level follow-up opportunities or status
- similarity summary if available
- similarity clusters when `mode=similarity`

#### 3. setup query

Purpose:

- data needed for `Setup`

Suggested output:

- question list
- selected question full settings
- category definitions
- follow-up drafts/prompts
- baseline status
- question-level release configuration

#### 4. reports query

Purpose:

- data needed for `Reports`

Suggested output:

- synthesis artifacts
- personal report summary
- argument map readiness/data
- AI job summaries
- semantic pipeline status

### Mutation / action implications

The shell also needs cleaner action boundaries.

Recommended action groups:

- live control mutations
- room moderation mutations
- setup/configuration mutations
- report-generation actions

Examples:

- release peer responses for selected question
- toggle replies/upvotes/fight for selected question or session, depending on the real control model
- assign category to root thread
- approve/reject recategorisation request
- create follow-up draft
- launch follow-up
- generate synthesis
- generate reports
- refresh similarity clusters

## Participant Thread Model Impact

The instructor room must now consume the same conceptual thread model that participants see.

That means:

- top-level room objects should be thread roots
- replies should remain nested under roots in default views
- categories should belong to root threads, not reply rows
- instructor moderation should operate on roots plus nested reply context

The instructor page should no longer treat “recent submissions” as the main conceptual unit for live room reading.

That is now too low-level for the product model.

## Phase 17 Integration

This instructor plan must align with [engineering/phase-17-threaded-similarity-map-plan.md](./phase-17-threaded-similarity-map-plan.md).

### Integration rules

- `Similarity` is a `Room` mode
- visible clustering still defaults to thread mode
- replies remain nested under their root thread
- semantic clusters remain separate from app categories
- argument map remains a separate `Reports` surface

### If Phase 17 is not fully ready

The shell can still ship before full similarity implementation.

Fallback:

- render `Similarity` as a not-ready or limited-readiness mode
- keep the tab slot and IA stable
- avoid redesigning the instructor shell again later just to introduce semantic clusters

## Implementation Strategy

### 13-1: Route and shell-state foundation

Goals:

- add `tab`, `mode`, and `questionId` shell state
- add `Open Room` and `Open Setup` links from the instructor dashboard page
- keep one unified instructor session route

Acceptance:

- instructor can deep-link into `Room` or `Setup`
- URL reflects the active workspace state

### 13-2: Real instructor shell layout

Goals:

- evolve the current shell into:
  - left rail
  - center workspace
  - persistent right live rail
- stop rendering the current page as one stacked monolith

Acceptance:

- instructor session route visibly behaves like a workspace shell
- the right rail remains available across all top-level tabs

### 13-3: Room tab extraction

Goals:

- extract live moderation into a dedicated `Room` tab
- replace flat recent-submission thinking with thread-root-first rendering
- add `Needs Attention`

Acceptance:

- the instructor can read live room activity without scrolling through setup/reports sections
- room data is visibly thread-based

### 13-4: Category and recategorisation live flow

Goals:

- make uncategorized and recategorisation work feel structurally integrated into `Room`
- ensure category board view is a room-reading mode, not a detached admin widget

Acceptance:

- the instructor can resolve category problems inside `Room`
- `Categories` mode feels like a live board, not a settings page

### 13-5: Setup tab extraction

Goals:

- move question/category/follow-up/configuration work out of the live room
- center setup on selected-question management

Acceptance:

- the instructor no longer edits question structure inside the live room feed
- `Setup` becomes the clear pre-live and in-between-round destination

### 13-6: Reports tab extraction

Goals:

- move synthesis/report/argument-map/job-review concerns into `Reports`
- preserve or improve existing artifact visibility

Acceptance:

- `Reports` becomes the clear destination for post-discussion review
- `Room` no longer carries argument map and AI job panels as first-class live clutter

### 13-7: Right rail live controls

Goals:

- keep fast live controls reachable from any tab
- avoid forcing tab switches for simple live-release changes

Acceptance:

- instructor can change live room state from `Setup` or `Reports` without losing context
- the rail stays compact and does not become a full form panel

### 13-8: Similarity mode integration

Goals:

- add `Similarity` mode in `Room`
- wire it to Phase 17 semantic clusters when available

Acceptance:

- semantic cluster view fits the same shell and room conventions as `Latest` and `Categories`
- no argument-map/similarity conflation occurs

### 13-9: Cleanup and deprecation of the all-in-one page model

Goals:

- remove old duplicated sections and placeholder groupings
- narrow legacy components that were only useful in the monolithic page

Acceptance:

- the live instructor route is no longer a stitched-together dashboard page

## Acceptance Checklist

The plan is implemented correctly when all of the following are true.

### Shell

- one instructor session route owns the full live workspace
- the shell exposes `Room`, `Setup`, and `Reports`
- the right rail persists across those tabs

### Room

- `Room` defaults to live discussion reading
- `Room` supports `Latest`, `Categories`, and `Similarity`
- `Needs Attention` exists inside `Room`
- room content is thread-root-first with nested replies

### Setup

- question/category/follow-up preparation no longer competes with the live room feed
- setup work is clearly question-centric

### Reports

- synthesis, personal reports, argument map, and AI/semantic review are consolidated under `Reports`

### Live controls

- selected question and live release/interaction toggles are reachable from any tab
- the right rail does not become a deep configuration surface

### Semantic separation

- categories, similarity clusters, and argument map remain distinct concepts in the UI and backend contracts

## Execution Doc Pattern

For this initiative, do not split planning into multiple sibling frontend/backend/spec files.

Use:

- this plan as the single source of truth
- one execution checklist companion if implementation tracking is needed

Recommended companion:

- `ui-phase-13a-instructor-workspace-execution-checklist.md`
