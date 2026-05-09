# Phase 06b: Participant Data Contracts

## Purpose

Expose stable Convex backend contracts for participant Discover and My Zone surfaces so the frontend designer can connect AI feedback, category placement, response history, and visibility-aware peer context.

This phase is backend-only.

## Scope

- Add a participant workspace overview query.
- Add a convenience submission mutation that creates a submission and queues private AI feedback in one call.
- Preserve existing raw APIs for more granular UI interactions.
- Do not edit participant page or component UI files.

## Backend Contracts

### `api.participantWorkspace.overview`

Input:

- `sessionSlug`
- `clientKey`

Returns:

- participant identity and session snapshot
- my submissions
- feedback by submission
- category assignments by submission
- recategorisation requests
- visibility-aware category summaries
- visibility-aware recent peer responses
- recent personal jobs

### `api.participantWorkspace.submitAndQueueFeedback`

Input:

- same core fields as `api.submissions.create`
- optional critique tone

Purpose:

- creates a participant submission
- queues AI feedback automatically
- returns both submission and initial feedback job state

## Existing APIs For UI To Use

- `api.participants.join`
- `api.participants.restore`
- `api.participants.updateNickname`
- `api.participants.touchPresence`
- `api.submissions.create`
- `api.submissions.listMine`
- `api.aiFeedback.enqueueForSubmission`
- `api.aiFeedback.retryFailed`
- `api.recategorisation.request`

## Visibility Rules

- `private_until_released`: participant sees their own work and private feedback only.
- `category_summary_only`: participant sees category names and counts, but not raw peer responses.
- `raw_responses_visible`: participant can see recent peer responses as well as category summaries.

## Non-Goals

- No frontend page wiring.
- No final personal report.
- No Fight Me history.
- No follow-up rounds beyond existing additional-point/reply submission support.
- No synthesis cards.

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

- Participant UI can get Discover/My Zone state from one query.
- Submission can optionally queue feedback through one backend call.
- Visibility mode is enforced by the returned data shape.
- All new reads are bounded.
- No designer-owned frontend files are changed.
- Gates pass.
