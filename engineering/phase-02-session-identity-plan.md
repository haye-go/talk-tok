# Phase 02: Session, Slugs, Join, and Identity

## Purpose

Create the first real Convex-backed product flow:

- instructor creates a session
- session receives a readable slug and short join code
- participants join by code or QR URL
- participants choose a nickname
- participants can leave and rejoin from the same browser
- lobby presence is visible in aggregate

This phase should keep UI simple and structural. The UI designer owns final visual polish.

## Current Baseline

Already available:

- VitePlus app foundation
- route registry with readable URL policy
- participant, instructor, admin, and projector shells
- Convex provider wiring
- starter Convex schema
- route builders in `src/lib/routes.ts`
- async state components
- basic UI primitives

## Scope

Included:

- session creation mutation
- session list/query for instructor dashboard
- session lookup by slug
- session lookup by join code
- readable slug generation
- short session code generation
- participant join mutation
- participant nickname update mutation
- local participant rejoin token
- participant lookup/restore flow
- lobby page state
- QR join URL generation
- aggregate participant presence baseline
- tests for slug/code helpers and core join behavior where feasible

Excluded:

- authentication
- roster import
- advanced access control
- submissions
- AI workflows
- category mapping
- full session templates
- real-time typing telemetry

## Route Contract

Keep these routes:

```txt
/join/:sessionCode
/session/:sessionSlug
/instructor
/instructor/session/new
/instructor/session/:sessionSlug
/instructor/session/:sessionSlug/projector
```

Rules:

- `sessionCode` is short and human-enterable, e.g. `SPARK`.
- `sessionSlug` is readable and stable, e.g. `ethics-ai-healthcare`.
- Convex document IDs are never shown in public URLs.
- Join code lookup redirects/navigates to the slug route after participant identity is established.

## Data Model

Use and refine existing `convex/schema.ts`.

Minimum required tables for this phase:

- `sessions`
- `participants`

Existing `sessions` fields that matter:

- `slug`
- `joinCode`
- `title`
- `openingPrompt`
- `modePreset`
- `phase`
- `currentAct`
- `visibilityMode`
- `anonymityMode`
- `responseSoftLimitWords`
- `categorySoftCap`
- `critiqueToneDefault`
- `telemetryEnabled`
- `fightMeEnabled`
- `summaryGateEnabled`
- `createdAt`
- `updatedAt`

Existing `participants` fields that matter:

- `sessionId`
- `participantSlug`
- `nickname`
- `role`
- `clientKeyHash`
- `joinedAt`
- `lastSeenAt`
- `presenceState`

Potential additions:

- `sessions.status` if `phase` is too overloaded for draft/open/closed.
- `sessions.description` if needed for creation form.
- `participants.displayColor` if the UI needs deterministic peer coloring.

Do not add more schema than needed.

## Convex Functions

Create these modules:

```txt
convex/sessions.ts
convex/participants.ts
```

### `sessions.create`

Mutation.

Input:

- title
- openingPrompt
- optional modePreset
- optional preset joinCode

Behavior:

- generate readable slug from title
- ensure slug uniqueness
- generate short join code if not provided
- ensure join code uniqueness among active/draft sessions
- insert session with MVP defaults
- return public session object

Default config:

- mode preset: `class_discussion`
- phase: `lobby`
- current act: `submit`
- visibility: `private_until_released`
- anonymity: `nicknames_visible`
- soft word limit: `200`
- category soft cap: `8`
- critique tone default: `spicy`
- telemetry enabled: `true`
- Fight Me enabled: `true`
- summary gate enabled: `false`

### `sessions.listForInstructor`

Query.

For demo, no auth filtering yet.

Return:

- title
- slug
- joinCode
- phase
- currentAct
- participant count if cheap
- createdAt
- updatedAt

Avoid expensive reads. If participant count becomes costly later, use a counter.

### `sessions.getBySlug`

Query.

Input:

- sessionSlug

Return:

- public session data
- phase/act
- basic config needed by participant shell

### `sessions.getByJoinCode`

Query.

Input:

- sessionCode

Behavior:

- normalize to uppercase
- return session public data or null

### `participants.join`

Mutation.

Input:

- sessionCode or sessionSlug
- nickname
- clientKey

Behavior:

- find session
- hash client key before storing
- if existing participant with same session and client key exists, update nickname and `lastSeenAt`
- otherwise create participant with readable `participantSlug`
- set presence to `idle` or `submitted` depending on later state; for now `idle`
- return participant public object and session slug

### `participants.updateNickname`

Mutation.

Input:

- participantSlug
- sessionSlug
- nickname
- clientKey

Behavior:

- verify client key hash matches
- update nickname across future reads
- update `lastSeenAt`

### `participants.restore`

Query or mutation.

Input:

- sessionSlug
- clientKey

Behavior:

- if matching participant exists, return participant public object
- otherwise return null
- optionally update `lastSeenAt` via a separate mutation to avoid query writes

### `participants.touchPresence`

Mutation.

Input:

- sessionSlug
- clientKey
- presenceState

Behavior:

- update participant presence and `lastSeenAt`
- throttle on client side
- do not store raw typing text

### `participants.listLobby`

Query.

Input:

- sessionSlug

Return:

- participant count
- recent participant nicknames if visibility allows
- aggregate states: idle, typing, submitted, offline

## Frontend Work

## Session Creation

Update `/instructor/session/new`.

Build:

- title input
- opening topic textarea
- optional mode preset selector placeholder
- create button
- on success, navigate to `/instructor/session/:sessionSlug`

For MVP scaffold:

- form can be simple
- advanced settings can remain placeholders

## Instructor Dashboard

Update `/instructor`.

Build:

- query sessions
- show loading/empty/error states
- show session cards
- open session button
- create session button

## Join Flow

Update `/join/:sessionCode`.

Build:

- load session by code
- show session title/topic
- nickname input
- generate or restore local client key
- join button
- on success, store participant token locally and navigate to `/session/:sessionSlug`

Local storage:

```txt
talktok-client-key
talktok-participant:<sessionSlug>
```

The first key is stable per browser. The second can store participant slug and last nickname per session.

## Participant Session Lobby

Update `/session/:sessionSlug`.

Build:

- query session by slug
- attempt local participant restore
- if no participant, show join prompt or link to code join
- if participant exists, show participant shell with lobby/current phase placeholder
- show aggregate lobby presence
- show nickname and change nickname action

## QR Join

For now:

- show QR code on instructor session page
- QR target should be `/join/:sessionCode`
- use `qrcode.react`

## Projector View

Update `/instructor/session/:sessionSlug/projector`.

Build:

- query session by slug
- show title and join code
- show QR code or large code
- remain display-only

## Helper Modules

Create:

```txt
src/lib/client-identity.ts
src/lib/session-slug.ts
```

Client identity:

- generate random browser key with `crypto.randomUUID()`
- persist in localStorage
- never expose as a URL param

Slug helper:

- frontend display helper only
- backend remains source of truth for uniqueness

## Tests

Add tests for pure helpers:

- client storage key naming
- route generation already covered
- slug normalization
- session code normalization
- client identity fallback behavior if needed

Convex function tests can come later unless a clean test harness is introduced.

## Protection Rules For This Phase

- session code uniqueness check
- slug uniqueness check
- nickname length cap
- nickname trim and basic validation
- join mutation should be idempotent per session/client key
- presence updates should be client-throttled
- do not store raw typing text

## Acceptance Criteria

Phase 02 is complete when:

- instructor can create a session
- instructor dashboard lists created sessions
- created session has readable slug and short code
- instructor session page shows join code and QR target
- participant can join by code and nickname
- participant is routed to readable session URL
- browser refresh restores participant identity
- nickname can be updated
- participant lobby presence aggregate displays
- projector route shows title and join code
- `vp check` passes
- `vp test` passes
- `vp build` passes
- code is committed and pushed

## Implementation Order

1. Convex slug/code helpers and sessions functions
2. participant identity helpers
3. participant join/restore functions
4. frontend session creation page
5. instructor dashboard and session page
6. join page and local rejoin behavior
7. participant lobby presence
8. projector join display
9. tests and cleanup

## Notes For UI Designer Integration

This phase should keep layout minimal and contract-driven.

The UI designer can later replace:

- create session form layout
- session cards
- join page composition
- lobby display
- QR/code panel
- projector styling

The engineering contract to preserve is:

- route names
- query/mutation inputs
- returned view-model shapes
- loading/empty/error states
- local identity behavior
