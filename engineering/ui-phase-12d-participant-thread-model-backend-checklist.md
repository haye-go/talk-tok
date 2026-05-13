# Participant Thread Model Backend Checklist

Date: 2026-05-12
Scope: Backend contract checklist for supporting the revised participant threaded message model.

Use this together with:

- `engineering/ui-phase-12-participant-threaded-message-model-plan.md`
- `engineering/ui-phase-12b-participant-threaded-message-execution-plan.md`

## Goal

Provide frontend-friendly participant workspace data that supports:

- one selected question at a time
- own message threads
- peer message threads
- grouped category exploration
- synthesis with expandable supporting comments
- question-grouped participant history

The backend should reduce client-side stitching and eliminate the need for each tab to reconstruct its own incompatible model.

## Query Scope

### Selected question contract

- [ ] Confirm that participant workspace queries remain scoped to one selected question at a time.
- [ ] Ensure current question is easily discoverable by the frontend.
- [ ] Ensure released questions are available in a stable order for the question switcher.
- [ ] Ensure released-question ordering is explicit:
  - [ ] current question first
  - [ ] remaining released questions newest first
- [ ] Ensure question metadata is sufficient for:
  - [ ] current-question label
  - [ ] expanded prompt
  - [ ] question ordering

## Thread-Oriented Participant Data

### Own threads

- [ ] Add or expose a frontend-friendly `myThreads` shape for the selected question.
- [ ] Each own top-level thread should include:
  - [ ] submission id
  - [ ] body
  - [ ] timestamp
  - [ ] category assignment summary
  - [ ] compact feedback summary
  - [ ] reaction/upvote count
  - [ ] viewer upvote state if the frontend should render an active compact affordance
  - [ ] reply count
  - [ ] nested replies
- [ ] Nested replies should be directly attached to their parent thread.

### Peer threads

- [ ] Add or expose a frontend-friendly `peerThreads` shape for the selected question.
- [ ] Each peer top-level thread should include:
  - [ ] submission id
  - [ ] nickname
  - [ ] body
  - [ ] timestamp
  - [ ] category assignment summary if visible
  - [ ] reaction/upvote count
  - [ ] viewer upvote state if the frontend should render an active compact affordance
  - [ ] reply count
  - [ ] nested replies

### Reply modeling

- [ ] Ensure replies can be rendered as nested threads without frontend ambiguity.
- [ ] Preserve parent-child relationships clearly.
- [ ] Ensure reply ordering is stable.
- [ ] Confirm whether instructor-issued follow-up answers need a distinct reply kind or can be rendered as normal nested replies with metadata.

## Explore Mode Contracts

### `Latest`

- [ ] Ensure the frontend can fetch top-level peer threads in a stable posting order for the selected question.
- [ ] Ensure nested replies are included or can be fetched without N+1 query patterns.

### `By category`

- [ ] Add or expose a grouped category-thread structure for the selected question.
- [ ] Each category group should include:
  - [ ] category id
  - [ ] category label
  - [ ] count of top-level messages
  - [ ] top-level threads in that category
- [ ] Preserve nested replies under each top-level thread.

### `Synthesis`

- [ ] Ensure synthesis artifacts for the selected question are available in a participant-friendly shape.
- [ ] For each category synthesis card, expose:
  - [ ] summary
  - [ ] key points
  - [ ] optional opposing-view summary
  - [ ] supporting comment count
  - [ ] representative supporting comment snippets
  - [ ] source message references if needed for expansion
- [ ] Ensure supporting comments can be expanded without awkward client reconstruction.

## Category and Feedback Data

### Category summaries

- [ ] Expose category assignment in a compact message-card-ready form.
- [ ] Avoid forcing the frontend to dereference multiple maps to show a simple badge.

### Compact feedback summary

- [ ] Expose a compact own-message feedback summary for the thread list.
- [ ] Keep deeper feedback detail available for expandable insights.
- [ ] Avoid forcing the frontend to treat feedback as a separate primary object.

### Recategorisation support

- [ ] Ensure recategorisation request state remains available per own top-level message.
- [ ] Keep the request state compact enough for an expandable insights panel.

## Presence

- [ ] Confirm whether existing presence data can be reused without backend change.
- [ ] If not, add a participant-optimized presence summary contract.
- [ ] Preferred participant-facing contract should provide:
  - [ ] typing count
  - [ ] submitted count
- [ ] `idle` does not need to be emphasized for participant use.

## `Me` Tab History Support

### Question-grouped archive

- [ ] Add or expose contribution history grouped by question, or sortable in a way that makes question grouping trivial for the frontend.
- [ ] Preserve timestamps and relationship to replies/follow-ups.
- [ ] Keep report references attached cleanly enough for a report-first `Me` tab.

### Fight history

- [ ] Ensure fight history can be filtered or grouped by question when needed.

## Performance and Query Hygiene

- [ ] Avoid N+1 stitching for replies, assignments, and compact feedback.
- [ ] Keep thread payloads bounded so participant workspace queries remain lightweight enough for live use.
- [ ] Avoid duplicating large synthesis bodies in every mode if a lighter summary shape can be returned.
- [ ] Keep ordering deterministic.
- [ ] Do not return a flat session-wide peer feed as the primary participant-room contract once thread data is available.

## Likely Backend Files To Touch

- [ ] `convex/participantWorkspace.ts`
- [ ] relevant submission/thread helper modules
- [ ] synthesis artifact query helpers
- [ ] reaction/upvote helpers if compact counts are not already exposed cleanly

## Validation

- [ ] Frontend can render `Contribute` without reconstructing top-level vs follow-up state manually.
- [ ] Frontend can render `Explore` in `Latest` mode directly from thread data.
- [ ] Frontend can render `By category` without rebuilding category containers expensively on the client.
- [ ] Frontend can render `Synthesis` with expandable supporting comments.
- [ ] Frontend can build a question-scoped archive in `Me` without custom cross-map stitching.

## Done Criteria

- [ ] Backend contracts support one coherent participant message/thread model.
- [ ] The frontend no longer needs separate incompatible models for own contributions vs peer stream items.
- [ ] Replies, categories, compact feedback, and synthesis support the revised UX directly.
