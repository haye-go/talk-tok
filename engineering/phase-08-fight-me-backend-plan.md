# Phase 08: Fight Me Backend

## Purpose

Add backend-only support for Fight Me Mode, including real 1v1 challenges, bounded turn-taking, draft autosave, timeouts, and AI debrief generation.

This phase exposes Convex APIs for the frontend designer to connect later. It does not implement UI.

## Locked MVP Decisions

- Support `vs_ai` and `real_1v1`.
- Real 1v1 is the key workflow for this phase.
- A participant can be in only one pending or active real 1v1 at a time.
- Attacker selects a defender by choosing an opposing response/card.
- Defender must explicitly accept; no auto-accept.
- Pending challenge acceptance timeout is `20s`.
- While pending, attacker can draft the opening attack.
- If accepted and the pending attacker draft is non-empty, that draft becomes Turn 1 immediately.
- If accepted with no attacker draft, attacker gets the normal Turn 1 window.
- If declined or expired, attacker draft is preserved for reuse/editing.
- Active real duel is 4 turns total: attacker attack, defender rebuttal, attacker final, defender final.
- Active turn deadline is `60s`.
- On timeout, auto-submit only if the current participant has a non-empty saved draft.
- If no draft exists on timeout, record a missed turn and complete the duel as timed out.
- Debrief is generated after completion, timeout, or forfeit when enough content exists.
- Draft saving is throttled by the frontend; backend exposes a safe `saveDraft` mutation.

## Schema Changes

Additive only:

- `fightThreads`
- `fightTurns`
- `fightDrafts`
- `fightDebriefs`
- add fight-related `aiJobs.type` values

No data migration is required.

## Backend Contracts

### `api.fightMe.createChallenge`

Creates a pending real 1v1 challenge.

Inputs:

- `sessionSlug`
- `clientKey`
- `defenderSubmissionId`
- optional `attackerSubmissionId`
- optional `openingDraft`

Rules:

- Session must have Fight Me enabled.
- Defender submission must belong to the same session.
- Attacker cannot challenge themselves.
- Attacker and defender must not already be in another pending or active real 1v1.
- Challenge status starts as `pending_acceptance`.
- Acceptance deadline is `now + 20s`.

### `api.fightMe.createVsAi`

Creates a vs-AI fight thread.

Inputs:

- `sessionSlug`
- `clientKey`
- `sourceSubmissionId`

Rules:

- The source submission must belong to the participant.
- AI challenger generation is queued.

### `api.fightMe.saveDraft`

Saves the latest draft for the current participant and thread.

Rules:

- Drafts are latest-state only, not keystroke history.
- Works for pending attacker opening drafts and active turn drafts.
- Frontend should throttle calls to every 2-3 seconds.

### `api.fightMe.acceptChallenge`

Defender accepts a real 1v1 challenge.

Rules:

- Must be accepted before the 20s deadline.
- If attacker has a non-empty opening draft, it becomes Turn 1 immediately.
- Otherwise the active turn is assigned to attacker with a 60s deadline.

### `api.fightMe.declineChallenge`

Defender declines a pending real 1v1.

Rules:

- Status becomes `declined`.
- Attacker draft remains stored for possible reuse.

### `api.fightMe.cancelChallenge`

Attacker cancels a pending challenge.

### `api.fightMe.submitTurn`

Submits the current participant's active turn.

Rules:

- Only current participant can submit.
- Turn order is attacker, defender, attacker, defender.
- After the fourth turn, the thread is completed and debrief generation is queued.

### Timeout Internals

Scheduled internal functions:

- expire pending challenge after 20s
- check active turn after 60s

Timeout behavior:

- If current participant has non-empty draft, auto-submit it.
- If no draft, insert missed turn, mark thread timed out, and queue debrief if possible.

### Queries

- `api.fightMe.listMine`
- `api.fightMe.getThread`
- `api.fightMe.listForSession`
- `api.fightMe.findAvailableTargets`

## View-Model Additions

Extend participant workspace with:

- `fightMe.mine`
- `fightMe.availableTargets`

Extend instructor command center with:

- fight activity counts
- recent fight threads

## Non-Goals

- No frontend wiring.
- No two simultaneous real 1v1 fights per participant.
- No invitation reason field.
- No spectator mode.
- No D3 argument map.
- No advanced harassment workflow beyond accept/decline/cancel/timeout.

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

- Real 1v1 challenge lifecycle works from pending to active to completed/declined/expired/timed out.
- Attacker can draft before acceptance.
- Accepting with a non-empty attacker draft creates Turn 1 immediately.
- Turn deadlines and timeout checks are scheduled.
- Debrief generation is queued on completion/timeout/forfeit paths.
- Participant and instructor view models expose Fight Me data.
- No designer-owned frontend files are changed.
- Gates pass.
