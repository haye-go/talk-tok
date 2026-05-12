# UI Phase 13c: Instructor Frontend Designer Handoff

Date: 2026-05-13
Audience: frontend UI designer / frontend implementation developer
Primary visual reference: [docs/codex-instructor-v3.html](../docs/codex-instructor-v3.html)
Implementation plan: [ui-phase-13b-instructor-reference-repair-implementation-plan.md](./ui-phase-13b-instructor-reference-repair-implementation-plan.md)

## Purpose

This handoff explains how to redesign the instructor session dashboard without losing existing functionality.

The prior mistake was using the new three-column shell as a container for old dashboard panels. Do not repeat that. The reference design is an information architecture change, not just a layout change.

The new interface must feel like a live instructor workspace:

- left rail: navigation
- center: active workspace
- right rail: live controls available from any tab

## Reference Priority

Use `docs/codex-instructor-v3.html` as the visual and structural reference.

Use the current app only as the capability inventory. Existing capabilities must be preserved, but their current placement is not authoritative.

## Design Intent

The instructor should be able to answer three questions quickly:

- What is happening in the room right now?
- What can I change quickly while live?
- Where do I go to prepare or review deeper work?

The answer should be:

- `Room` answers what is happening now.
- The right rail answers what can be changed quickly.
- `Setup` answers where preparation lives.
- `Reports` answers where review and generated artifacts live.

## Shell Layout

### Left Rail

Design role: structural navigation.

It should feel like a dark, stable application rail. It is not a content board.

Contents:

- session identity
- top-level nav:
  - `Room`
  - `Setup`
  - `Reports`
- Room modes when Room is active:
  - `Latest`
  - `Categories`
  - `Similarity`
- short note explaining Room, Setup, and Reports

Do not put these in the left rail:

- category cards
- category edit forms
- follow-up buttons
- summarize buttons
- QR code
- template controls
- release controls
- metrics
- live activity feed

If any of those currently exist in the left rail, relocate them. Do not delete them.

### Center Workspace

Design role: the main working surface.

The center should not be one long dashboard. It must switch between three clear workspaces:

- `Room`
- `Setup`
- `Reports`

Each workspace should have a compact header, clear primary content, and only the controls that belong to that mode.

### Right Rail

Design role: persistent live control.

The right rail should be usable from Room, Setup, and Reports. It should be compact and row-based, not a second dashboard.

Contents:

- selected question
- question switcher
- live release state
- interaction state
- live counters
- quick live actions
- compact live activity if retained

Do not put deep setup or reports content here.

## Workspace Definitions

### Room

Room is for live reading and intervention.

The center of Room should be message-first. Controls should support the discussion, not dominate it.

Required sections:

- active question context
- mode switch: Latest / Categories / Similarity
- live stat chips
- `Needs Attention`, default-open but collapsible
- active mode content

Latest mode:

- show thread roots in live chronological order
- nest replies under the root thread
- show compact metadata: category, upvotes, replies, recategorisation state
- avoid large administrative cards

Categories mode:

- show category containers
- show root threads inside each category
- show uncategorized roots explicitly
- keep replies nested under roots
- this is a live room board, not the category settings editor

Similarity mode:

- belongs inside Room
- use Phase 17 semantic clusters
- show thread roots inside clusters
- keep replies nested under roots
- do not visually merge this with category board or argument map

Needs Attention:

- keep it visible during live sessions
- make it collapsible structurally
- default it open
- show row-level actions such as assign, review, or inspect
- include uncategorized roots, pending recategorisation, and similarity opportunities when available

### Setup

Setup is for preparation and configuration.

Required content:

- question manager
- question release and selection controls
- session settings
- category creation and editing
- follow-up drafting and editing
- baseline generation
- prompt template and AI readiness checks
- join link and QR code
- save as template

Setup should not show the live room stream as primary content.

### Reports

Reports is for review and generated artifacts.

Required content:

- synthesis panel
- synthesis artifact cards
- class synthesis generation
- opposing views generation
- personal report generation
- personal report summary
- recent report previews
- AI job status for review workflows
- embeddings status/generation
- novelty signals
- novelty radar
- category drift
- argument map

Reports should not contain setup forms as primary content.

## Preservation Rules

Do not remove current instructor dashboard capabilities.

You may reorganize, restyle, rename sections, and reduce visual weight. You may not silently drop a capability.

Preserve these current surfaces:

- question manager
- session controls
- visibility/release controls
- current question controls
- category creation
- category rename/edit
- category follow-up drafting
- category summary generation
- recategorisation review
- run categorisation
- generate synthesis
- synthesis artifacts
- generate personal reports
- personal report summary and recent reports
- AI job status
- baseline generation
- prompt template readiness
- QR/join link
- save as template
- presence
- recent submissions, redesigned as thread roots where applicable
- input patterns
- consensus pulse placeholder, unless explicitly deprecated
- embeddings
- novelty signals
- novelty radar
- category drift
- argument map
- fight status
- reports gate
- live activity

If something appears obsolete, flag it separately. Do not delete it inside this redesign.

## Visual Direction

Follow the flatter v3 reference.

Use:

- dark blue structural left rail
- pale field background
- mostly open center workspace
- white surfaces only for real grouping
- compact right rail groups
- row-based controls
- clear dividers and spacing instead of card-on-card stacks

Avoid:

- generic dashboard card stacks
- everything boxed in cards
- duplicated labels
- large metric tiles in the live rail
- old content squeezed into side columns
- same background treatment for active question and page/header
- controls appearing before the live discussion when in Room

## Active Question Treatment

The active question should be visually distinct from the header and page background.

It should not look like part of the app chrome.

Use it as a workspace context surface:

- title
- prompt text
- release/status marker
- selected question relationship

Keep it compact enough that Room content appears quickly.

## Interaction Density

Room actions should be compact.

Use row actions, small chips, and restrained buttons. Avoid big primary buttons repeated across every thread unless the action is truly primary.

Thread cards should prioritize:

- author/context
- message body
- category/status
- upvote count
- reply count
- nested replies
- instructor action only where relevant

## Similarity, Categories, And Argument Map

Keep these visually and conceptually separate.

Categories:

- instructor-defined or system-assigned buckets
- live room grouping
- belongs in Room Categories mode and Setup category configuration

Similarity:

- semantic proximity from Phase 17
- live room reading mode
- belongs in Room Similarity mode

Argument map:

- post-processed reasoning/relationship artifact
- belongs in Reports

Do not collapse these into one "analysis" surface.

## Mobile And Responsive Guidance

Desktop is the primary target for this instructor shell.

For narrower widths:

- collapse left rail into top/side navigation if needed
- keep right rail accessible as a drawer or stacked live-control section
- keep Room discussion before secondary controls
- do not hide core live actions without another reachable entry

The desktop reference should still be the source of truth for hierarchy.

## Review Checklist For The Designer

Before handing implementation back, verify:

- left rail contains navigation only
- Room is message/thread-first
- Setup owns preparation/configuration
- Reports owns review/artifacts
- right rail is compact live control only
- no current capability disappeared
- active question looks distinct from header/page chrome
- Similarity is inside Room
- Argument Map is inside Reports
- Category editing is in Setup, not Room Categories mode
- Room Categories mode reads like a live board
- Needs Attention is default-open and row-based
- the UI does not rely on generic card stacks

## Red Flag Examples

These are signs the implementation has drifted:

- category cards appear in the left rail
- QR code appears in the left rail
- Setup shows a live stream as its main content
- Reports shows setup forms as its main content
- right rail contains long forms
- Room begins with many controls before showing discussion
- Similarity appears under Reports instead of Room
- Argument Map appears under Room instead of Reports
- existing controls disappear because they did not fit the new layout

## Practical Instruction

When unsure where a piece goes, use this routing rule:

- Navigation or mode selection goes in the left rail.
- Live discussion reading goes in Room.
- Fast live toggles available from any tab go in the right rail.
- Preparation, drafting, editing, or configuration goes in Setup.
- Generated artifacts, review, analysis, and export go in Reports.

