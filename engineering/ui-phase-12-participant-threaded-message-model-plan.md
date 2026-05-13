# Participant Threaded Message Model Plan

Date: 2026-05-12
Scope: Revised participant-facing UX plan for `Contribute`, `Explore`, `Fight`, and `Me`, with a shared message/thread model, compact composer behavior, multi-question handling, and the concrete frontend/backend changes required to support it.

## Purpose

The current participant workspace still reflects two competing models:

- a contribution-centric model in `Contribute`
- a stream-centric model in `Explore`

That split is now causing visible UX problems:

- the participant sees their own ideas rendered differently across tabs
- action hierarchy is unclear in `Contribute`
- `Explore` still spends too much space on chrome before the room itself
- replies, upvotes, and category context are not presented consistently
- multiple-question behavior is under-specified for mobile use

This plan replaces that split with a single participant-facing message/thread model.

## Product Decisions Locked

These decisions are now the baseline for the participant experience.

### 1. Shared message card model

Participant messages and peer messages should use the same base visual container and thread structure.

Variants may differ in emphasis, but not in information architecture.

### 2. `Contribute` always shows a composer

The top-level composer remains visible at the top of `Contribute` at all times.

Behavior:

- collapsed by default to a compact single-line or near-single-line height
- expands on focus
- once text exists, it stays expanded until submit or explicit cancellation
- after blur with no text, it collapses again

This composer is for adding another top-level point to the selected question.

### 3. Presence moves to `Contribute`

Presence is more useful while the participant is deciding whether to post than while reading the room.

Participant-facing presence should be compact and ambient.

Show:

- `typing`
- `submitted`

Do not show:

- `idle`

### 4. `Explore` has three modes

`Explore` should support:

1. `Latest`
2. `By category`
3. `Synthesis`

These are presentation modes for released content, not different permission layers.

### 5. Replies nest under messages

Replies should appear beneath the parent message in both `Contribute` and `Explore`.

This applies to:

- replies to peer messages
- follow-up additions on the participant’s own message

Instructor-issued follow-up prompts can remain a distinct prompt type, but participant-facing rendering should still feel like a threaded continuation when the student answers them.

### 6. One selected question at a time

To avoid cross-question feed complexity, the participant workspace should scope tab content to one selected question at a time.

Rules:

- the current question is selected by default
- a released-question switcher is available everywhere
- all tab content is filtered to the selected question
- cross-question archive behavior belongs in `Me`, not mixed into `Contribute` or `Explore`

### 7. Instructor controls release, participant controls view

The instructor should control what is released:

- raw responses
- category grouping
- synthesis visibility

The participant should control how released content is viewed:

- `Latest`
- `By category`
- `Synthesis`

The instructor may set the default `Explore` mode on release, but the participant should be able to switch locally.

## UX Problems Being Solved

### `Contribute`

- the current top card is too generic and not action-driving
- the participant’s own message does not look like the stream
- analysis surfaces dominate too early
- multiple top-level points do not feel like a natural list

### `Explore`

- duplicate nickname display in some states
- reply and fight actions are visually too large
- upvote affordance is oversized and noisy
- too much support chrome appears before the room
- category filtering is too primitive for clustered discussion

### Cross-cutting

- question card blends too closely with header chrome
- replies are not surfaced consistently
- repeated metadata competes with the content itself

## Revised Participant Information Architecture

## Global Shell

### Top of every tab

Every participant tab should show:

- compact active question bar
- current question title or label
- one-line prompt preview
- tap to expand full prompt
- released question switcher when more than one released question exists

This should replace repeated large prompt cards in the tab body.

### Question card styling

The question surface must be visually distinct from the app header.

Rule:

- header/navigation chrome should read as app structure
- question card should read as content context

They should not share the same background treatment.

## Contribute

Job: post and refine my own ideas for the selected question.

### Mobile-first structure

1. Compact question bar
2. Compact status row
3. Persistent compact composer
4. My message list for the selected question
5. Collapsed older detail or insights as needed

### Top status row

This row should be compact, not a full instructional block.

Contents:

- `typing` count with icon
- `submitted` count with icon
- optional own status chip like `You’ve posted`

Avoid:

- large full-width presence bar
- `idle`
- bulky explanatory copy

### Composer behavior

Default state:

- placeholder such as `Add another point...`
- collapsed height

Focused state:

- expands into writing surface
- reveals tone selector if kept
- reveals word count and submit action

If empty on blur:

- collapse

If text exists:

- remain expanded

### Message list model

`Contribute` should show the participant’s messages for the selected question as a chronological thread list.

Message ordering:

- newest top-level message first
- replies under each message in thread order

Each own message card should show:

- message body
- timestamp
- category badge if assigned
- compact upvote count
- compact reply count
- collapsible replies
- compact own-only actions

Preferred own-only actions:

- `Add follow-up`
- `Open insights`

Avoid:

- `View in Explore` on every message
- `Go to Fight` on every message
- large generic contribution summary cards

### Insights panel

Each own message may expose a secondary expandable insights panel.

This panel can contain:

- AI feedback
- originality/reasoning bands
- category placement detail
- re-categorisation request UI

This must not dominate the default message card.

### Multiple top-level points

The participant should be able to add multiple top-level messages for the selected question without the UI making one message feel “special” and the others “secondary.”

The current “primary contribution plus earlier points” model should be removed from the participant-facing presentation.

## Explore

Job: inspect the room and respond to others for the selected question.

### Mobile-first structure

1. Compact question bar
2. Small room summary row
3. Explore mode switch
4. Secondary category filter
5. Content area for the selected mode

### Room summary row

Keep this compact.

Possible contents:

- response count
- category count
- synthesis available indicator

This should not consume more vertical space than one compact row.

### Explore modes

#### `Latest`

Use as default room-reading mode.

Behavior:

- all top-level messages for the selected question
- sorted in posting order
- replies nested below parent messages
- compact interactions only

Recommended ordering:

- newest top-level first
- replies oldest-to-newest within each thread for readability

#### `By category`

Use to browse clustered viewpoints.

Behavior:

- category sections as separate containers
- section header includes category name and message count
- messages within each category retain nested replies
- messages remain individual posts, not flattened summaries

This mode should feel like room structure, not filtering alone.

#### `Synthesis`

Use for AI roll-up after release.

Behavior:

- show class synthesis header if available
- show category synthesis cards
- each category card includes:
  - short summary
  - key points
  - optional opposing viewpoint summary
  - supporting comment count

If supporting comments are long:

- show 1-2 representative snippets
- collapse the rest behind `View supporting comments`

Synthesis should not be mixed into the default feed above raw peer discussion.

### Category filter

The category filter should remain, but as a secondary control.

Role by mode:

- `Latest`: narrow the feed
- `By category`: jump to or isolate a section
- `Synthesis`: jump to a category synthesis card

Do not use category filtering as the only exploration model.

### Peer message card

Peer messages should use the same base thread card pattern as own messages.

Each card should show:

- nickname once
- body
- timestamp
- category badge if visible
- compact reaction count
- compact reply count
- nested replies when opened

Avoid:

- duplicate nickname outside and inside the card
- oversized action buttons
- telemetry-heavy labels

### Action compression

Reply, fight, and upvote should become compact controls.

Recommended presentation:

- icon-first actions
- small inline chips or icon buttons
- count values integrated with the affordance

Specifically:

- the current full-width or large-labeled `Upvote` control should be reduced
- `Reply` and `Fight` should not visually dominate each message card

## Fight

Job: structured challenge flow.

No major model change is required here, but `Fight` should inherit the same question-scoped message semantics.

Expectations:

- active fight and challenge targeting should reflect the selected question
- if the selected question changes, the tab should only show relevant fights for that question

The main additional requirement is visual consistency with the message/thread model where message excerpts are shown.

## Me

Job: history, reflection, private analysis.

`Me` should now become more clearly cross-question and archival.

Recommended structure:

1. Personal report status or summary
2. My activity summary
3. Question-grouped contribution history
4. Fight history
5. Position shifts
6. Settings

Question-grouped history should help the participant navigate older questions without polluting `Contribute` or `Explore`.

## Desktop Adaptation

Desktop should preserve the same logic, not invent a different product model.

What desktop can keep open more often:

- question context rail
- room summary
- category navigation
- synthesis side panel or adjacent panel
- contribution insights panel

What desktop should still avoid:

- duplicated content between tabs
- multiple competing primary actions
- repeated large prompt cards

Recommended desktop-specific differences:

- `Contribute`: composer and latest own messages can sit in a wider primary column, with compact insights or status in a side column
- `Explore`: mode switch and category navigation can be persistent above or beside the feed
- `Synthesis`: category synthesis cards can display more supporting detail before collapsing
- `Me`: report summary and history can use two-column balance

## Required Frontend Changes

These are the main frontend changes implied by the revised model.

## Shared components

### Replace split card model with shared thread card model

Current issue:

- `ContributionThreadCard` and `ResponseStreamItem` encode different visual grammars

Required change:

- introduce one shared participant-facing thread card component or shared card composition layer
- support variants:
  - own
  - peer
  - compact
  - expanded with replies

Likely affected files:

- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/stream/response-stream-item.tsx`
- new shared card component under a neutral directory such as `src/components/messages/`

### Compress reaction/action controls

Required change:

- reduce `ReactionBar` visual weight for stream usage
- support compact icon-count mode

Likely affected files:

- `src/components/reactions/reaction-bar.tsx`

### Compact question context pattern

Required change:

- keep compact question bar across tabs
- reduce body-level repeated question cards

Likely affected files:

- `src/components/layout/participant-question-bar.tsx`
- `src/components/layout/participant-shell.tsx`
- `src/pages/participant-workspace-page.tsx`

## `Contribute` tab

Required changes:

- remove generic “your contributions” intro pattern
- introduce compact status/presence row
- keep always-available collapsed composer at top
- render own message list instead of primary/earlier split
- nest replies below own messages
- move insights behind expansion

Likely affected files:

- `src/pages/participant-workspace-page.tsx`
- `src/components/submission/response-composer.tsx`
- `src/components/contribute/contribution-thread-card.tsx`

## `Explore` tab

Required changes:

- add explicit mode switch:
  - `Latest`
  - `By category`
  - `Synthesis`
- reduce pre-stream chrome
- support grouped category containers
- remove duplicate nickname display
- nest replies inline
- compress `Reply`, `Fight`, and upvote affordances

Likely affected files:

- `src/components/stream/stream-tab.tsx`
- `src/components/stream/response-stream-item.tsx`
- `src/components/reactions/reaction-bar.tsx`

## `Me` tab

Required changes:

- clarify that `Me` is archive/reflection, not another active thread workspace
- group contribution history by question
- avoid re-showing full active-workflow chrome inline by default

Likely affected files:

- `src/components/myzone/my-zone-tab.tsx`

## Desktop shell

Required changes:

- keep desktop context rail but align it to the revised single-question model
- ensure desktop panels do not reintroduce duplicate prompt/context surfaces

Likely affected files:

- `src/components/layout/participant-shell.tsx`

## Required Backend Changes

Some of the revised UX can be implemented on top of existing data, but a clean version likely needs backend contract changes.

## 1. Unified participant-thread query shape

Current issue:

- participant data is split into `initialResponses`, `followUpResponses`, peer responses, assignment maps, and feedback maps
- the frontend has to reconstruct too much

Required change:

- add a unified thread-oriented query shape for the selected question

Suggested contract for participant workspace data:

- `myThreads`
  - top-level own messages
  - nested replies
  - counts
  - category assignment
  - compact feedback summary
- `peerThreads`
  - top-level peer messages
  - nested replies
  - counts
  - category assignment

Likely affected backend files:

- `convex/participantWorkspace.ts`

## 2. Explore grouped-by-category shape

Current issue:

- the frontend can filter flat peer responses, but grouped rendering becomes awkward if every category container must be rebuilt client-side

Required change:

- provide grouped category sections or enough normalized structure to render them cheaply

Suggested shape:

- `peerThreadsByCategory`
  - category metadata
  - top-level threads per category
  - reply counts

This does not need to replace the flat feed shape, but it should be available.

## 3. Synthesis-supporting comments shape

Required change:

- synthesis artifacts should include representative quotes or supporting messages in a form the participant UI can collapse/expand

Suggested additions:

- snippet list
- source message ids
- count of supporting comments

Likely affected files:

- `convex/participantWorkspace.ts`
- synthesis-related Convex modules already used for participant report/synthesis delivery

## 4. Presence summary shape

Current issue:

- current participant presence display includes `idle`, which is not useful for the intended compact row

Required change:

- either reuse existing shape and hide `idle` in the frontend
- or add a participant-optimized presence summary contract

Frontend-only hiding is acceptable if backend change is not worth it.

## 5. Question-scoped archive support for `Me`

Required change:

- return contribution history grouped by question, or at least sortable by question and timestamp without awkward client stitching

Likely affected files:

- `convex/participantWorkspace.ts`

## Rollout Sequence

Implement in this order.

### Phase A: data contract alignment

- confirm selected-question scope
- add thread-oriented data contracts
- add grouped category support
- add synthesis support-comment shape

### Phase B: shared message/thread component

- create shared message card
- move reaction and reply affordances to compact mode
- remove duplicate author display patterns

### Phase C: `Contribute` restructure

- compact question header
- compact presence/status row
- always-available expanding composer
- own message list
- nested replies
- insights expansion

### Phase D: `Explore` restructure

- mode switch
- latest feed
- grouped category feed
- synthesis mode
- secondary category filter behavior

### Phase E: `Me` archive adjustment

- question-grouped history
- report-first reflection structure

### Phase F: desktop adaptation

- widen and stabilize desktop layout
- keep logic identical to mobile
- use larger real estate to persist context, not duplicate content

## Acceptance Criteria

The redesign is successful when the participant can do the following without confusion.

### `Contribute`

- immediately recognize whether they have already posted for the selected question
- see a compact composer at the top at all times
- add another top-level point without opening a secondary workflow
- open replies and message insights without leaving the card

### `Explore`

- understand the current question immediately
- switch between `Latest`, `By category`, and `Synthesis`
- see peer messages without duplicate nickname labels
- use compact reply/fight/upvote controls
- open nested replies inline

### Cross-question

- switch cleanly between released questions
- never see a mixed multi-question feed by default

### Desktop

- gain more visible context without reintroducing duplicated prompt surfaces or multi-panel clutter

## Notes

This plan supersedes the simpler participant tab cleanup assumptions in the earlier phase-11 UI docs where they conflict with the newer message-thread decisions.

The most important shift is conceptual:

- from contribution records to participant-facing message threads
- from flat filtered room views to selectable room modes
- from repeated large context cards to compact persistent question context
