# Explore Room Feed Unification Plan

Date: 2026-05-13
Scope: Implementation plan to ensure the participant’s own top-level posts also appear in `Explore`, so the room view reflects the actual shared discussion rather than “everyone except me.”

## Problem

Right now the participant experience is split incorrectly:

- `Contribute` shows `myThreads`
- `Explore` shows `peerThreads`

The backend currently defines `peerThreads` by explicitly excluding the current participant.

That means the room feed is incomplete from the participant’s perspective:

- they cannot see their own post in the shared stream
- they cannot see their own post in category grouping
- they cannot understand how their post sits inside the room unless they mentally merge `Contribute` and `Explore`

This breaks the intended discussion-room model.

## Goal

`Explore` should show the actual room for the selected question.

That room should include:

- the participant’s own top-level messages
- other participants’ top-level messages
- nested replies beneath each top-level message

The participant’s own messages should be visibly recognizable as their own, but they should still appear in the same shared thread list and category grouping as everyone else.

## Decision

Do not “fix” this by merging `myThreads` and `peerThreads` only in the frontend.

That would create fragile duplication and leave the backend model conceptually wrong.

Instead:

- keep `myThreads` for `Contribute`
- add a room-level thread contract for `Explore`

## New Backend Contract

## 1. Introduce room-scoped thread collections

Add new participant workspace outputs for the selected question:

- `roomThreads`
- `roomThreadsByCategory`

These should represent the actual room, not “others only.”

### `roomThreads`

Contains all top-level message threads visible in the selected question:

- own top-level threads
- peer top-level threads
- nested replies beneath each root thread

Each thread should include the same thread-level structure already used in `myThreads` and `peerThreads`:

- `root`
- `replies`
- `assignment`
- `feedbackSummary` where relevant
- `recategorisationRequest` where relevant

For `Explore`, only the frontend should decide what to show from this structure.

### `roomThreadsByCategory`

Contains category-grouped room threads for the selected question.

Each section should include:

- category metadata
- thread count
- all visible room threads in that category

This replaces the current peer-only grouping model.

## 2. Keep existing `myThreads`

`myThreads` should remain for `Contribute`.

It still serves a different job:

- my personal posting workspace
- my own message list
- my own expandable insights

No change in intent is needed there.

## 3. Preserve `peerThreads` only if still needed

If any current frontend paths still rely on `peerThreads`, they may be preserved temporarily during migration.

But the long-term target should be:

- `Explore` uses room-level contracts
- `Contribute` uses own-thread contracts

If possible, deprecate `peerThreads` once migration is complete.

## Backend Implementation Steps

### Step 1: build room-level top-level thread source

In `convex/participantWorkspace.ts`:

- locate the current `peerThreads` filter
- replace the selected-question feed source with a room-level top-level thread source for visible messages

Current problematic condition:

- excludes `submission.participantId === participant._id`

New behavior:

- include all top-level visible messages for the selected question

### Step 2: generate `roomThreads`

Use the existing thread-construction helper logic to build:

- `roomThreads`

This should reuse the same `toThread` and nested-reply logic where possible.

### Step 3: generate `roomThreadsByCategory`

Build category sections from `roomThreads`, not `peerThreads`.

This ensures:

- category grouping includes the participant’s own messages
- uncategorized grouping also includes own messages where relevant

### Step 4: keep visibility semantics intact

Do not change existing release logic.

If raw responses are not visible, the room feed should still remain hidden according to instructor/session rules.

This fix is about completeness of the visible room, not loosening access control.

## Frontend Changes

## 1. Switch `Explore` from peer-only data to room-level data

In the participant workspace page and `StreamTab` wiring:

- pass `roomThreads`
- pass `roomThreadsByCategory`

Do not keep the tab conceptually peer-only.

`Explore` is a room tab.

## 2. Render own posts with shared thread card styling

When rendering a room thread in `Explore`:

- if `thread.root.viewerState.isOwn` is true
- render it with own-post styling or ownership flag

This should make the participant’s own message recognizable without moving it outside the room.

## 3. Adjust actions for own posts in `Explore`

Own posts should not expose the same action set as peer posts.

Recommended behavior for own posts in `Explore`:

- hide or disable `Fight`
- hide or disable `Reply` to the top-level own post from the explore stream
- hide or disable self-upvote

Optional:

- show a lightweight own-message label such as `You`
- allow a compact `View in Contribute` or `Open insights` only if it is genuinely useful

But do not overload the room feed with own-only management controls.

## 4. Preserve nested replies

If another participant replies to the participant’s post:

- those replies should appear nested under the participant’s own top-level thread in `Explore`

This is one of the main reasons the participant needs to see their own post in the room view.

## 5. Keep all three Explore modes aligned

This fix must apply consistently across:

- `Latest`
- `By category`
- `Synthesis` support-comment expansion where relevant

At minimum:

- `Latest` must include own messages
- `By category` must include own messages

`Synthesis` does not need to highlight own messages specially unless the artifact view expands into source comments.

## UX Rules

The following interaction rules should hold after the fix.

### Latest mode

- participant sees the full room feed
- own top-level messages appear in posting order alongside others
- own messages remain visually identifiable

### By category mode

- own messages appear in the relevant category container
- own uncategorized messages appear in uncategorized if applicable

### Contribute vs Explore separation

- `Contribute` remains the place to write, follow up, and inspect message insights
- `Explore` becomes the place to see how the participant’s message sits in the room

This is the correct distinction.

## Files Likely Affected

### Backend

- `convex/participantWorkspace.ts`

### Frontend

- `src/pages/participant-workspace-page.tsx`
- `src/components/stream/stream-tab.tsx`
- `src/components/messages/participant-thread-card.tsx`

Potentially:

- any type definitions for room thread props

## Validation

## Functional checks

- participant enters `Explore` after posting and can see their own post in the room feed
- participant can see their own post in category grouping
- replies to their post are visible beneath it in `Explore`
- participant cannot start a fight against their own post
- participant cannot upvote their own post

## UX checks

- own posts do not look hidden or “out of room”
- own posts remain visually distinct enough to recognize
- room feed still feels coherent and not like two merged lists

## Success Criteria

This change is successful when:

- `Explore` reflects the actual visible room, not an “others only” feed
- the participant can see their own contributions in context
- `Contribute` and `Explore` have distinct jobs without forcing the participant to mentally combine them

## Relationship To Existing Docs

This plan is a concrete implementation slice of:

- `engineering/ui-phase-12-participant-threaded-message-model-plan.md`
- `engineering/ui-phase-12b-participant-thread-model-frontend-checklist.md`
- `engineering/ui-phase-12c-participant-thread-model-backend-checklist.md`

It exists because the missing-own-posts behavior is a user-visible correctness issue, not just a later refinement.
