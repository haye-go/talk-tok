# Participant Threaded Message Execution Plan

Date: 2026-05-12
Scope: Concrete implementation plan for the participant threaded-message redesign, incorporating:

- `engineering/ui-phase-12-participant-threaded-message-model-plan.md`
- `engineering/ui-phase-11-participant-tab-ux-audit.md`
- `engineering/ui-phase-11h-participant-ux-master-summary.md`
- `engineering/phase-13a-question-centric-session-model-spec.md`
- `engineering/phase-13b-backend-question-foundation-correctness-plan.md`

This document does not replace the existing Phase 12 model plan. It is the execution-grade companion plan for the approved newer logic and the concrete code findings from the current implementation.

## Relationship To Phase 12

Read this document together with `engineering/ui-phase-12-participant-threaded-message-model-plan.md`.

The relationship is:

- `ui-phase-12-participant-threaded-message-model-plan.md`
  - product and UX model
  - defines the intended participant-facing behavior
  - captures the high-level thread/message direction
- `ui-phase-12b-participant-threaded-message-execution-plan.md`
  - implementation companion
  - translates the approved model into backend work, frontend file changes, rollout order, and verification steps
  - records the concrete issues found in the current implementation that must be corrected during execution

If there is any conflict:

- Phase 12 remains the primary product-direction document
- Phase 12b should be updated to match it unless a later approved decision explicitly changes the product direction

## Purpose

The existing participant implementation has moved in the right direction, but it still reflects an older split:

- `Contribute` is still contribution-record centric
- `Explore` is still flat-stream centric
- shared participant message behavior is still reconstructed differently per tab

The product direction is now stricter:

- participant-owned messages and peer messages should use the same base thread card model
- one selected question should scope the active workspace at a time
- `Contribute` should behave like a personal message-thread workbench
- `Explore` should behave like a room, with multiple room-view modes
- replies should render as nested thread content, not as a separate conceptual surface

This plan turns that direction into an implementation sequence with backend and frontend changes called out explicitly.

## Locked Product Decisions

These decisions should be treated as fixed for this implementation pass.

### 1. Shared thread-card system

`Contribute` and `Explore` must use the same base participant-facing message card structure.

Allowed variation:

- own vs peer emphasis
- compact vs expanded state
- optional own-only insights section

Not allowed:

- one card system for own messages and a separate unrelated visual grammar for peer messages

### 2. One selected question at a time

Participant tabs should scope active content to one selected question at a time.

Rules:

- current question selected by default
- released-question switcher available across tabs
- all active tab content filtered to selected question
- question switching changes the scoped room, not the overall app shell

### 3. `Contribute` is a live own-thread workspace

`Contribute` should show:

- compact question context
- compact presence/status row
- persistent compact composer
- the participant's own top-level messages for the selected question
- nested replies beneath those messages
- expandable private insights

It should not show:

- a special-cased "primary contribution"
- a generic "Your contributions" summary card
- a separate archive-like "earlier points" model as the primary structure

### 4. `Explore` supports three room modes

`Explore` should support:

1. `Latest`
2. `By category`
3. `Synthesis`

These are local view modes over released content for the selected question.

### 5. Presence belongs in `Contribute`, not above the room

Participant-facing aggregate presence is more useful while deciding whether to post than while reading the room.

The participant surface should show:

- `typing`
- `submitted`

Do not foreground:

- `idle`

### 6. Replies nest below parent messages

Replies should render beneath their parent message in both `Contribute` and `Explore`.

This includes:

- peer replies
- participant follow-up additions that function as threaded continuation

Instructor follow-up prompts may remain a distinct prompt object in the backend, but student-facing rendering should still feel like continuation of the relevant thread where possible.

### 7. Current question first, older released questions after

Ordering rules for question selection and cross-question history:

- current question first
- remaining released questions newest first
- no mixed multi-question feed by default

## Current Implementation Findings To Carry Forward

These are not abstract design critiques. They are current code-level issues that must shape the implementation.

### `Contribute` findings

- `src/pages/participant-workspace-page.tsx` still computes `primaryContribution` and treats other contributions as an expandable secondary set.
- `expandedContributionId` falls back to the first contribution, which keeps the analysis-first model too close to the default surface.
- the top state card is still centered on submission status rather than the participant's current thread list and next best action.

### `Explore` findings

- `src/components/stream/stream-tab.tsx` still renders a duplicate nickname label in demo mode above `ResponseStreamItem`.
- `Reply` and `Fight` are still full button affordances with too much visual weight for a feed.
- `ReactionBar` in `upvote` mode still renders a large pill with label and count, which is too heavy for stream interaction.
- `Explore` still spends too much top-of-tab space on summary, presence, filters, and notices before the room itself.

### Shared/shell findings

- `src/components/layout/participant-question-bar.tsx` uses the same cream family as the shell top bar, so the question context does not read as a distinct content surface.
- `src/components/layout/participant-status-banner.tsx` is lightweight enough now, but presence and question context are not yet deliberately composed together.

### `Me` findings

- `src/components/myzone/my-zone-tab.tsx` still duplicates follow-up/detail behavior that should no longer compete with `Contribute`.
- contribution history is still closer to a secondary contribution workspace than a clearly archival/reflection-first surface.

### Backend findings

- `convex/participantWorkspace.ts` still returns participant data in a split shape that forces too much client-side stitching.
- peer responses are still emitted as a flat list rather than a question-scoped threaded structure.
- learner presence aggregate is not part of the participant workspace contract yet, even though the UI has a presence component.
- grouped category rendering for `Explore` is not supported as a first-class query shape.

## Implementation Principles

### Principle 1: backend owns thread assembly where it matters

The frontend should not have to reconstruct the participant's active room model from:

- `initialResponses`
- `followUpResponses`
- `recentPeerResponses`
- assignment maps
- feedback maps
- ad hoc reply grouping

The backend should return thread-oriented structures for the selected question.

### Principle 2: one message model, multiple presentation modes

The same message-thread object should support:

- own-thread rendering in `Contribute`
- peer-thread rendering in `Explore`
- compact archival history in `Me`

### Principle 3: use the existing submission model unless a real backend gap appears

Current `submissions` already support:

- top-level contributions
- additional points
- replies via `parentSubmissionId`

Do not create a new message table for this pass.

### Principle 4: preserve question-centric architecture

All new participant-thread behavior should remain question-scoped and align with the multi-question room model from Phase 13.

## Required Backend Changes

This redesign is not frontend-only. Clean implementation requires backend contract work.

## Backend Phase A: Thread-Oriented Learner Workspace Contract

### Goal

Make `participantWorkspace.overview` return selected-question thread data directly instead of forcing the page to rebuild it.

### Files

- `convex/participantWorkspace.ts`
- optionally small helpers in new backend utility files if extraction improves clarity

### Required changes

Return a selected-question-scoped structure with:

- `selectedQuestion`
- `releasedQuestionsOrdered`
- `presenceAggregate`
- `myThreads`
- `peerThreads`
- `peerThreadsByCategory`
- `synthesisView`
- `myArchiveByQuestion`

### Suggested thread shape

Each thread should contain:

- root submission
- replies sorted oldest-to-newest
- reply count
- upvote count
- whether the current participant upvoted
- category assignment summary
- own/peer ownership markers
- compact feedback summary where relevant
- capability flags where relevant

Example categories of fields:

- `thread.root`
- `thread.replies`
- `thread.stats`
- `thread.assignment`
- `thread.viewerState`

### Why this is needed

The current page logic in `src/pages/participant-workspace-page.tsx` is doing too much shape-reconstruction:

- splitting initial vs non-initial responses
- deriving top-level additional points
- regrouping follow-ups by parent
- separately matching feedback and assignment maps

That logic becomes brittle once `Explore` also needs grouped-by-category threads and nested replies from the same data source.

## Backend Phase B: Selected-Question Peer Thread Query

### Goal

Return peer content for the selected question as real threads rather than a flat feed.

### Files

- `convex/participantWorkspace.ts`
- `convex/submissions.ts`

### Required changes

For the selected question:

- query top-level peer submissions only
- query replies by parent
- assemble thread trees
- order top-level roots newest first for `Latest`
- order replies oldest first within each thread

### Required correctness rules

- no cross-question reply inclusion
- no parent/child relationship that spans questions
- no own messages mixed into peer thread results

## Backend Phase C: Grouped-By-Category Explore Contract

### Goal

Support `Explore` mode `By category` without rebuilding the room model expensively in the client.

### Files

- `convex/participantWorkspace.ts`

### Required changes

Return grouped category sections for the selected question:

- category metadata
- message count
- top-level peer threads in that category
- reply counts per thread

This may coexist with flat `peerThreads`. It does not need to replace it.

### Notes

If a thread's root belongs to category `X`, its replies should remain under that root even when individual replies are not independently categorized.

## Backend Phase D: Learner Presence Aggregate

### Goal

Expose lightweight presence aggregate to the participant workspace.

### Files

- `convex/participantWorkspace.ts`
- optionally helper reuse from `convex/participants.ts`

### Required changes

Add learner-facing aggregate counts:

- `typing`
- `submitted`
- `idle`
- optionally `offline` internally if already cheap to compute

Frontend will display:

- `typing`
- `submitted`

### Notes

This should reuse the existing participant state model rather than introducing a second presence system in this pass.

## Backend Phase E: Question-Grouped Archive Support For `Me`

### Goal

Make `Me` question-aware without forcing `Contribute` to become cross-question archive UI.

### Files

- `convex/participantWorkspace.ts`

### Required changes

Return question-grouped own history:

- question metadata
- top-level contributions
- threaded continuation beneath each contribution
- archived summary ordering by question recency

This lets `Me` become archival and reflective while keeping `Contribute` tightly scoped to the selected question.

## Backend Phase F: Index And Helper Support

### Goal

Make selected-question thread assembly efficient and explicit.

### Files

- `convex/schema.ts`
- possibly `convex/submissions.ts`

### Required changes

Review whether current indexes are enough for:

- top-level submissions by question ordered by created time
- replies by parent within a question

If needed, add an index that supports thread assembly more directly.

Possible example:

- question + parent + createdAt

Only add this if the existing `by_questionId_and_createdAt` plus `by_parent_submission` path is too awkward or too expensive.

## Required Frontend Changes

## Frontend Phase A: Shared Thread Card System

### Goal

Replace the split visual grammar between own-message cards and peer-message cards.

### Files

- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/stream/response-stream-item.tsx`
- new shared component under a neutral directory such as:
  - `src/components/messages/participant-thread-card.tsx`
  - `src/components/messages/thread-replies.tsx`
  - `src/components/messages/thread-stats-row.tsx`

### Required changes

Create a shared thread-card system with:

- author row
- body
- timestamp/meta row
- compact interaction row
- collapsible replies section
- optional own-only insights expansion

### Variants

- own thread
- peer thread
- compact archive row

### Explicit requirement

The participant should feel that they are looking at the same kind of object in `Contribute` and `Explore`, not two different product surfaces.

## Frontend Phase B: Compact Interaction Controls

### Goal

Reduce the visual weight of reply/fight/upvote affordances.

### Files

- `src/components/reactions/reaction-bar.tsx`
- `src/components/stream/stream-tab.tsx`

### Required changes

For upvote mode:

- support compact icon+count treatment
- remove large pill-button feel
- preserve active state clearly

For reply and fight:

- compress to small icon-first or chip-like controls
- keep them visually subordinate to message body

### Current issue to fix

The current feed controls look like action toolbars. They should feel like compact thread affordances.

## Frontend Phase C: `Contribute` Restructure

### Goal

Replace the current primary-contribution model with a real own-thread list for the selected question.

### Files

- `src/pages/participant-workspace-page.tsx`
- `src/components/submission/response-composer.tsx`
- shared message components from earlier phases

### Required changes

Remove:

- generic submission-state card as the main framing device
- `primaryContribution`
- `Earlier points`

Add:

- compact presence/status row near the top
- persistent collapsed composer at top
- newest-first own top-level message list for selected question
- nested replies under each own message
- `Open insights` as secondary expansion

### Composer behavior

Keep the composer available at top at all times.

Behavior:

- compact by default
- expands on focus
- remains expanded while text exists
- collapses on blur if empty

### Notes

The current `ResponseComposer` card shell can be adapted, but its layout will likely need a compact mode rather than always rendering as a full open form.

## Frontend Phase D: `Explore` Restructure

### Goal

Turn `Explore` into a question-scoped room surface with explicit view modes.

### Files

- `src/components/stream/stream-tab.tsx`
- shared message components

### Required changes

Add:

- compact room summary row
- mode switch:
  - `Latest`
  - `By category`
  - `Synthesis`
- secondary category filter
- inline nested replies

Remove or reduce:

- duplicate nickname display
- large pre-stream presence block
- action-heavy button rows
- oversized upvote UI

### Mode behavior

#### `Latest`

- top-level peer threads
- newest first
- replies nested below root

#### `By category`

- category containers
- thread lists within each category
- replies remain under their root message

#### `Synthesis`

- synthesis-first rendering only when user selects it
- show supporting snippets/comments in collapsed form if available

## Frontend Phase E: Question Surface And Shell Cleanup

### Goal

Make question context visually distinct from shell chrome and integrate presence more intentionally.

### Files

- `src/components/layout/participant-question-bar.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-top-bar.tsx`
- `src/styles/globals.css`

### Required changes

Add a distinct question-surface token set in CSS.

Rule:

- top bar reads as shell/navigation
- question context reads as active content context

### Presence placement

Move participant-facing presence out of `Explore`.

Preferred placement:

- compact top status row in `Contribute`
- compact block in desktop context rail if helpful

## Frontend Phase F: `Me` Consolidation

### Goal

Make `Me` clearly archival and reflective, not a second active-thread workspace.

### Files

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Required changes

Shift `Me` toward:

- report summary first
- activity summary second
- question-grouped own history
- fight history
- position shifts
- identity/settings

Reduce:

- duplicated active-thread detail behavior
- standalone follow-up duplication that no longer adds distinct value

## Frontend Phase G: Desktop Adaptation

### Goal

Preserve the same product logic across breakpoints while using desktop width more effectively.

### Files

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/stream/stream-tab.tsx`
- `src/pages/participant-workspace-page.tsx`
- `src/components/myzone/my-zone-tab.tsx`

### Required changes

Desktop may keep open more persistent context:

- question rail
- category navigation
- synthesis support panel
- own-thread insights panel

Desktop must not reintroduce:

- repeated large prompt cards
- duplicated content between tabs
- dense toolbars ahead of content

## Detailed File-Level Corrections

## `src/pages/participant-workspace-page.tsx`

Required corrections:

- stop deriving UI around `primaryContribution`
- stop using `Earlier points` as the main multi-message model
- consume backend thread-oriented shape instead of stitching local maps where possible
- order released questions current-first then newest-first
- pass learner presence aggregate into `Contribute`, not `Explore`

## `src/components/stream/stream-tab.tsx`

Required corrections:

- remove demo-mode duplicate nickname label
- remove top-heavy presence block
- replace flat feed/filter structure with explicit room modes
- support inline nested replies
- reduce capability notices to lighter, more contextual states

## `src/components/reactions/reaction-bar.tsx`

Required corrections:

- add compact mode suitable for feed/thread usage
- keep active state legible without oversized pills
- preserve a path for richer reaction modes later if needed

## `src/components/contribute/contribution-thread-card.tsx`

Required corrections:

- retire the current eyebrow/title framing
- stop treating analysis as the defining card model
- support own-thread card composition rather than contribution-record semantics

## `src/components/myzone/my-zone-tab.tsx`

Required corrections:

- stop acting like a second contribution workspace
- group archive history by question
- keep detail lighter than `Contribute`

## `src/components/layout/participant-question-bar.tsx`

Required corrections:

- move away from top-bar-matching cream treatment
- keep compact expandable prompt behavior
- support better distinction between current question and older released questions

## Testing And Verification

## Backend verification

- selected-question thread results do not mix questions
- replies do not cross question boundaries
- grouped-by-category thread results are consistent with flat thread results
- learner presence aggregate returns expected counts

## Frontend verification

- `Contribute` and `Explore` use the same base thread-card system
- multiple top-level participant messages render naturally for one question
- reply/fight/upvote affordances are visually compact
- `Explore` no longer duplicates usernames
- `Explore` can switch between `Latest`, `By category`, and `Synthesis`
- presence appears in `Contribute`, not as the top of the room
- question context is visually distinct from shell header

## Project verification

At minimum after implementation:

- `pnpm lint`
- `pnpm check`
- `pnpm test`

If lint still has unrelated pre-existing failures, note them explicitly and separate them from this change set.

## Rollout Order

Implement in this order:

1. backend selected-question thread contract
2. backend grouped category and presence contract
3. shared thread-card system
4. compact interaction controls
5. `Contribute` restructure
6. `Explore` restructure
7. question-surface and shell cleanup
8. `Me` consolidation
9. desktop adaptation
10. QA and cross-breakpoint cleanup

## Acceptance Criteria

This plan is complete when all of the following are true.

### `Contribute`

- the participant always sees a compact composer at the top
- multiple top-level messages per selected question are first-class
- replies nest under own messages
- private insights are available without dominating the default thread card

### `Explore`

- the room defaults to a message-first mode
- usernames are not duplicated
- reply/fight/upvote controls are compact
- nested replies open inline
- category grouping is a first-class viewing mode

### Cross-question

- current question is selected by default
- other released questions are easy to switch to
- active tab content is scoped to one question at a time

### Shell

- question context is visually distinct from header chrome
- presence appears in the contribution workspace, not as room clutter

### Backend

- learner workspace returns thread-oriented selected-question data
- frontend no longer has to rebuild the main room model from fragmented arrays and maps

## Summary

The main shift in this execution plan is not cosmetic.

It is a structural move:

- from contribution records to shared participant-facing message threads
- from a flat feed plus filters to explicit room-view modes
- from fragmented frontend reconstruction to backend-shaped thread contracts
- from repeated context chrome to compact persistent question context

The implementation should preserve the existing question-centric architecture while finally making the participant UI behave like one coherent product.
