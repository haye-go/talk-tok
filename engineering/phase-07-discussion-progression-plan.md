# Phase 07: Discussion Progression Backend

## Purpose

Add backend-only support for instructor-led follow-up rounds and richer participant My Zone history.

This combines the useful backend parts of rollout Phase 09 and light Phase 11. It deliberately does not touch frontend UI files; the designer can connect to these contracts later.

## Scope

- Add follow-up prompt and targeting tables.
- Let instructors create, activate, close, and list follow-up rounds.
- Support class-wide and category-targeted follow-ups.
- Let participants fetch only follow-ups that apply to them.
- Let participants submit follow-up responses through the existing submission pipeline.
- Extend participant workspace data with active follow-ups and My Zone history groupings.
- Extend instructor command-center data with follow-up round status.

## Backend Contracts

### `api.followUps.create`

Creates an instructor follow-up prompt.

Inputs:

- `sessionSlug`
- optional `title`
- `prompt`
- optional `instructions`
- `targetMode`: `all` or `categories`
- optional `categoryIds`
- optional `activateNow`

Rules:

- Category-targeted prompts must include at least one active category.
- Follow-up slugs are readable and unique inside the session.
- A prompt starts as `draft` unless `activateNow` is true.

### `api.followUps.setStatus`

Changes follow-up status.

Statuses:

- `draft`
- `active`
- `closed`
- `archived`

Rules:

- Activation records `activatedAt`.
- Closing records `closedAt`.
- Every status change writes an audit event.

### `api.followUps.listForSession`

Instructor-facing list of follow-up prompts with targets and response counts.

### `api.followUps.activeForParticipant`

Participant-facing list of active follow-ups relevant to their category assignments.

Rules:

- Class-wide follow-ups are visible to every participant.
- Category-targeted follow-ups are visible only when the participant has at least one submission assigned to a targeted category.

### `api.followUps.submitResponse`

Creates a follow-up response and optionally queues private AI feedback.

Rules:

- Follow-up must be active.
- Participant must be eligible for the target.
- The response is linked through `submissions.followUpPromptId`.
- Uses existing submission protections and telemetry.

## Schema Changes

Additive only:

- `followUpPrompts`
- `followUpTargets`
- optional `submissions.followUpPromptId`
- `submissions.by_follow_up_prompt` index

No data migration is required because existing submissions do not need a follow-up link.

## Participant Workspace Additions

Extend `api.participantWorkspace.overview` with:

- `activeFollowUps`
- `myZoneHistory.initialResponses`
- `myZoneHistory.followUpResponses`
- `myZoneHistory.timeline`

## Instructor Command Center Additions

Extend `api.instructorCommandCenter.overview` with:

- active follow-up count
- recent follow-up prompt summaries
- follow-up response counts

## Non-Goals

- No frontend wiring.
- No AI-generated follow-up suggestions yet.
- No Fight Me mode.
- No final synthesis/personal report generation.
- No D3 argument map.

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

- Instructors can create and manage follow-up rounds via Convex APIs.
- Participants only receive relevant active follow-ups.
- Follow-up submissions are stored, protected, and linked to the prompt.
- Participant workspace returns follow-up and My Zone history data.
- Instructor overview returns follow-up round status.
- No designer-owned frontend files are changed.
- Gates pass.
