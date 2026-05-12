# UI Phase 13b: Instructor Reference Repair Implementation Plan

Date: 2026-05-13
Status: implementation reference
Primary reference: [docs/codex-instructor-v3.html](../docs/codex-instructor-v3.html)
Companion docs:

- [ui-phase-13-instructor-workspace-shell-plan.md](./ui-phase-13-instructor-workspace-shell-plan.md)
- [ui-phase-13a-instructor-workspace-execution-checklist.md](./ui-phase-13a-instructor-workspace-execution-checklist.md)
- [phase-17-threaded-similarity-map-plan.md](./phase-17-threaded-similarity-map-plan.md)

## Purpose

This plan corrects the failed interpretation of UI Phase 13 where old instructor dashboard panels were placed into a new shell without following the actual reference design.

The target is not "same content in three columns".

The target is the information architecture and visual contract shown in `codex-instructor-v3.html`:

- left rail is structural navigation
- center is the active workspace
- right rail is persistent live control
- `Room` is message/thread-first
- `Setup` owns preparation and configuration
- `Reports` owns review and generated artifacts
- `Similarity` is a `Room` mode and plugs into Phase 17

## Current Failure To Fix

The current implementation is wrong in these ways:

- Left rail contains old category cards, follow-up buttons, summarize buttons, QR/template controls, and setup-like actions.
- Room center still behaves like a summary dashboard rather than a live discussion workspace.
- Setup still exposes a long old all-in-one control page rather than a focused setup workspace.
- Reports is not cleanly separated from live/session setup concerns.
- Right rail duplicates controls and uses large metric-card-like blocks instead of compact persistent live-control rows.
- The shell uses some reference labels but not the reference hierarchy, ownership, or visual style.

## Non-Negotiable Product Rules

- Do not overwrite `docs/codex-instructor-v3.html`.
- Do not create more sibling plan/checklist files for this repair.
- Do not hide old UI inside new columns as a shortcut.
- Every old panel must be assigned a correct owner: `Room`, `Setup`, `Reports`, or right live rail.
- No existing instructor dashboard capability should be deleted as part of this redesign.
- "Remove from left rail" or "remove from right rail" means relocate to the correct workspace, not delete the component or feature.
- `Room` must be discussion-first, not control-first.
- `Setup` must be preparation/configuration-first.
- `Reports` must be artifact/review-first.
- Right rail is for fast live controls reachable from any tab.
- Left rail is navigation only.

## Existing Instructor Surface Preservation Inventory

The redesign may reorganize and restyle these surfaces, but it must not drop them.

### Preserve In Setup

- Question manager and question release/selection controls.
- Session controls currently exposed through `QuestionManagerPanel` / `SessionControlsCard`.
- Session title, opening prompt, word limit, category cap, anonymity, critique tone, and related settings.
- Category creation.
- Category rename/edit description.
- Category taxonomy display.
- Category-scoped follow-up drafting.
- Baseline generation and baseline status.
- Prompt template readiness / AI configuration checks.
- Join URL and QR code.
- Save as Template.

### Preserve In Room

- Live thread/recent submission reading, converted to thread-root-first display.
- Presence status, if still useful for live moderation.
- Recategorisation request review and approve/reject actions.
- Uncategorized response/root-thread visibility.
- Category summary generation as a lightweight Room or Reports action depending on context.
- Follow-up launch/create actions that are live facilitation actions.
- Fight status as a live interaction state.
- Live Activity feed if it remains compact.

### Preserve In Right Live Rail

- Current/selected question context.
- Question switcher.
- Release summaries action/status.
- Release responses action/status.
- Raw responses visible/private state.
- Fight enabled/disabled state.
- Reports gate state.
- Run categorisation action.
- Generate synthesis quick action.
- Live counters for typing, submitted, idle, uncategorized, and pending recategorisation where available.

### Preserve In Reports

- Synthesis panel and synthesis artifact cards.
- Class synthesis generation.
- Opposing views synthesis generation.
- Personal report generation.
- Personal reports summary and recent report previews.
- AI job status panel/history where it supports review.
- Embeddings generation/status.
- Novelty signals readiness.
- Novelty Radar.
- Category Drift.
- Argument Map graph and generation/status.
- Any semantic/observability review currently visible on the instructor page.

### Preserve Or Rehome Deliberately

- Consensus Pulse placeholder.
- Input Patterns.
- Recent Submissions.

These can be moved or redesigned, but cannot silently disappear. If a surface is genuinely obsolete, that requires an explicit separate deletion decision.

## Final Placement Map

### Left Rail

Owns:

- session identity
- top-level nav: `Room`, `Setup`, `Reports`
- `Room` mode links when Room is active:
  - `Latest`
  - `Categories`
  - `Similarity`
- short note explaining the three workspace responsibilities

Must not contain:

- category cards
- category edit controls
- recategorisation controls
- follow-up launch buttons
- summarize buttons
- QR code
- save-template button
- release controls
- metrics

Implementation note:

- These items must be relocated to `Room`, `Setup`, `Reports`, or the right live rail according to the inventory above.

### Room Center

Owns:

- active question context
- room mode switch
- live stat chips
- `Needs Attention`, default-open but collapsible
- `Latest` mode: chronological thread-root-first stream
- `Categories` mode: category-grouped live reading board
- `Similarity` mode: Phase 17 semantic cluster view
- live room actions that operate on discussion content:
  - assign category to root thread
  - review recategorisation request
  - launch follow-up
  - create brand-new follow-up
  - inspect/promote similarity cluster

Must not contain:

- deep category editing forms
- session setup forms
- report generation/review panels as primary content
- argument map as a Room surface

### Setup Center

Owns:

- question manager
- question release/order controls
- current question selection and editing
- category taxonomy setup/editing
- follow-up drafting and editing
- baseline/category generation controls
- join links and QR code
- save-as-template controls
- non-urgent session configuration
- AI readiness/configuration checks that prepare the session

Must not contain:

- live thread stream as primary content
- synthesis/report artifacts as primary content
- argument map

### Reports Center

Owns:

- synthesis artifacts
- category summaries
- personal reports
- report release/gating review
- argument map
- semantic/novelty/AI review panels that are not urgent live moderation
- AI job history/status where it supports review

Must not contain:

- question/category setup forms
- live thread stream as primary content
- live moderation queue as primary content

### Right Live Rail

Owns:

- selected question summary
- question switcher
- release/visibility rows:
  - contributions
  - peer responses
  - category board
  - synthesis
  - reports
- interaction rows:
  - replies
  - upvotes
  - fight
- live counters:
  - typing now
  - submitted
  - uncategorized
  - pending recategorisation
- quick live actions available from any tab:
  - run categorisation
  - generate synthesis
  - launch saved follow-up
  - create brand-new follow-up entry point if it is lightweight
- live activity feed if it remains compact

Must not contain:

- large setup forms
- category edit forms
- full report surfaces
- duplicate center-workspace content

## Backend And Data Contract Changes

The instructor page should stop relying on one oversized all-purpose overview payload for the main workspace.

### Shell Query

Purpose: data shared by every tab and the persistent rail.

Required output:

- session summary
- active/current question
- released question list
- selected question fallback
- right-rail counters
- live visibility state
- live interaction state

### Room Query

Purpose: live discussion workspace.

Required output:

- selected question
- latest root threads
- nested replies under each root
- category assignment per root
- root-level reply count
- root-level upvote/reaction count
- uncategorized root threads
- pending recategorisation count and rows
- category-grouped root threads
- similarity readiness summary
- similarity clusters when available

Rules:

- root threads are the primary unit
- replies are nested context, not top-level feed rows
- category assignment belongs to root threads
- room data should be question-scoped

### Setup Query

Purpose: preparation and configuration.

Required output:

- question list
- selected question full configuration
- category definitions
- follow-up drafts/prompts
- baseline generation status
- join/session access information
- template readiness
- AI readiness/configuration state

### Reports Query

Purpose: review and generated artifacts.

Required output:

- synthesis status and artifacts
- category summaries
- personal report status and artifacts
- argument map status/data
- semantic/novelty review status
- report release status
- relevant AI job status/history

### Mutation Boundary Review

Group existing mutations/actions by product responsibility:

- live control mutations: visibility, releases, replies, upvotes, fight
- room moderation mutations: categorize root, handle recategorisation, launch follow-up
- setup mutations: edit questions, edit categories, draft follow-ups, configure session
- report actions: generate synthesis, generate reports, refresh analysis

If existing mutations are broad session-level actions but the UI now acts on a selected question, either confirm that behavior is intended or add question-scoped variants.

## Implementation Sequence And Commits

### Commit 1: Repair Shell Ownership

Suggested commit message:

`fix(instructor-ui): align workspace shell ownership with reference`

Changes:

- Replace left rail content with reference-style navigation only.
- Add Room mode links in left rail only when `tab=room`.
- Relocate category board, QR, template, summarize, and follow-up controls out of the left rail into their correct owners.
- Keep center as the only full workspace surface.
- Keep right rail as the only persistent live control area.

Acceptance:

- Left rail has no operational cards.
- The page no longer looks like old panels squeezed into a sidebar.

### Commit 2: Split Center Workspaces

Suggested commit message:

`refactor(instructor-ui): split room setup and reports workspaces`

Changes:

- Make explicit center workspace renderers:
  - `roomWorkspace`
  - `setupWorkspace`
  - `reportsWorkspace`
- Move old blocks into the correct owner instead of duplicating them.
- Ensure `Setup` does not show Room stream/triage as primary content.
- Ensure `Reports` does not show Setup forms as primary content.

Acceptance:

- `Room`, `Setup`, and `Reports` feel like separate workspaces within one shell.
- No top-level tab renders the old monolithic page.

### Commit 3: Rebuild Room As Thread-First

Suggested commit message:

`feat(instructor-ui): rebuild room around live thread roots`

Changes:

- Use the room/thread data contract as the Room source.
- Latest mode renders root threads in post order.
- Replies nest under their root.
- Metadata is compact: category, upvotes, replies, recat state.
- Add default-open `Needs Attention`.
- Needs Attention rows include:
  - uncategorized root threads
  - pending recategorisation
  - similarity cluster opportunities if available

Acceptance:

- Room reads as a live discussion surface.
- No flat recent-submission feed drives the primary experience.

### Commit 4: Rebuild Category Mode As Live Board

Suggested commit message:

`feat(instructor-ui): make category mode a live room board`

Changes:

- Render category containers from root-thread groups.
- Render uncategorized roots as a first-class section.
- Keep nested replies under their root thread.
- Keep category mode reading-first.
- Keep deep category editing in Setup.

Acceptance:

- Categories mode is not a category editor.
- It is a room-reading board grouped by category.

### Commit 5: Replace Right Rail With Persistent Live Rail

Suggested commit message:

`fix(instructor-ui): replace right rail with compact live controls`

Changes:

- Replace metric-card-heavy rail with reference-style rail groups.
- Add selected question surface.
- Add release/visibility rows.
- Add interaction rows.
- Add compact counters.
- Add quick live actions.
- Relocate deep setup/report forms out of the rail into `Setup` or `Reports`.

Acceptance:

- Right rail remains useful from Room, Setup, and Reports.
- It does not duplicate each page.

### Commit 6: Move Setup-Owned Controls Properly

Suggested commit message:

`refactor(instructor-ui): move preparation controls into setup workspace`

Changes:

- Place question manager in Setup.
- Place category taxonomy editor in Setup.
- Place follow-up drafting/editing in Setup.
- Place QR/join/template controls in Setup.
- Place baseline and AI readiness controls in Setup.

Acceptance:

- Setup is the obvious place to prepare or adjust the session.
- These controls are no longer scattered across left/right rails.

### Commit 7: Move Reports-Owned Surfaces Properly

Suggested commit message:

`refactor(instructor-ui): move review surfaces into reports workspace`

Changes:

- Place synthesis artifacts in Reports.
- Place personal reports in Reports.
- Place argument map in Reports.
- Place semantic/novelty/AI review status in Reports.
- Keep report release state visible in right rail, but not the full report workspace.

Acceptance:

- Reports is the only primary review/artifact workspace.
- Argument map is not confused with Room Similarity.

### Commit 8: Wire Phase 17 Similarity Into Room

Suggested commit message:

`feat(instructor-ui): wire similarity mode into instructor room`

Changes:

- Keep `Similarity` as a Room mode.
- Use Phase 17 data contracts.
- Render semantic clusters as live room-reading clusters.
- Preserve root/reply nesting.
- Add cluster action states only where supported:
  - promote to category
  - merge into category
  - ignore
  - refresh/rebuild if backend supports it

Acceptance:

- Similarity has a stable home under Room.
- Similarity does not replace category board.
- Similarity does not replace argument map.

### Commit 9: Apply Reference Visual Contract

Suggested commit message:

`style(instructor-ui): match instructor v3 shell visual contract`

Changes:

- Apply the flatter reference style from `codex-instructor-v3.html`.
- Use dark blue structural left rail.
- Use pale field background.
- Keep center mostly open.
- Use white surfaces only where they clarify grouping.
- Use rail groups instead of card stacks.
- Make active question background distinct from the app/header background.
- Reduce generic carding.

Acceptance:

- The implementation visually resembles the v3 reference.
- The UI no longer reads as a generic dashboard/card stack.

### Commit 10: Verification And Cleanup

Suggested commit message:

`chore(instructor-ui): verify shell repair and remove leftovers`

Changes:

- Remove unused imports and orphaned helper state.
- Remove old duplicate monolithic sections only after their capabilities are present in the correct workspace.
- Do not delete any existing instructor dashboard component or capability without an explicit product decision.
- Verify routes:
  - `tab=room&mode=latest`
  - `tab=room&mode=categories`
  - `tab=room&mode=similarity`
  - `tab=setup`
  - `tab=reports`
- Run typecheck/lint where available.
- Document any unrelated existing failures separately.

Acceptance:

- No old panel appears in the wrong owner.
- No hidden duplicate UI remains as implementation debt.

## Required Code Areas

Expected frontend files:

- [src/pages/instructor-session-page.tsx](../src/pages/instructor-session-page.tsx)
- [src/components/instructor/instructor-session-shell.tsx](../src/components/instructor/instructor-session-shell.tsx)
- [src/hooks/use-instructor-room.ts](../src/hooks/use-instructor-room.ts)
- [src/hooks/use-instructor-similarity-map.ts](../src/hooks/use-instructor-similarity-map.ts)

Expected backend files if query fields are missing:

- [convex/instructorCommandCenter.ts](../convex/instructorCommandCenter.ts)
- [convex/schema.ts](../convex/schema.ts)
- Phase 17 semantic/similarity files referenced by [phase-17-threaded-similarity-map-plan.md](./phase-17-threaded-similarity-map-plan.md)

Before touching Convex files, read:

- [convex/_generated/ai/guidelines.md](../convex/_generated/ai/guidelines.md)

## Design Acceptance Checklist

- Left rail is navigation only.
- Room center is thread-root-first.
- Needs Attention is inside Room and default-open.
- Category mode is a grouped room board, not setup.
- Similarity mode is inside Room.
- Setup owns configuration and preparation.
- Reports owns synthesis, reports, argument map, and review.
- Right rail owns persistent live control only.
- Active question surface is visually distinct from header/background.
- The page uses fewer generic cards and more structural sections/rows.

## Data Acceptance Checklist

- Room query returns root threads with nested replies.
- Category grouping uses root threads.
- Uncategorized queue is root-thread based.
- Recategorisation queue is visible in Needs Attention.
- Similarity data is question-scoped.
- Shell state is URL-addressable through `tab`, `mode`, and `questionId`.
- Right rail state is available from any top-level tab.

## Verification Checklist

- Open Room from listing lands in `tab=room`.
- Open Setup from listing lands in `tab=setup`.
- Browser back/forward preserves tab and room mode.
- `Latest` shows thread roots and nested replies.
- `Categories` shows grouped roots and nested replies.
- `Similarity` shows Phase 17 data or a stable not-ready state.
- `Setup` has no primary live stream.
- `Reports` has no setup forms.
- Right rail remains visible across all tabs.
- Typecheck/lint is run, or unrelated blockers are recorded.

## Implementation Guardrail

If a section feels hard to place, do not put it in the nearest available column.

Use this rule:

- Is it needed during live facilitation of the current discussion? Put it in `Room`.
- Is it a fast live toggle needed from any tab? Put it in the right rail.
- Is it preparation, editing, drafting, or configuration? Put it in `Setup`.
- Is it generated output, analysis, review, export, or post-discussion evidence? Put it in `Reports`.
- Is it navigation or mode selection? Put it in the left rail.
