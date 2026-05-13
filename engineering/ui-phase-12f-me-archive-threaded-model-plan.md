# UI Phase 12f: Me Archive Threaded Model Plan

Date: 2026-05-13
Scope: Finish the `Me` tab migration onto the participant threaded message model without changing the current `Contribute`, `Explore`, shell, or visual design direction.

## Purpose

The participant workspace now exposes selected-question thread data for active work, but `Me` still reads from older flat history fields and rebuilds contribution state in the frontend.

This slice adds a backend archive contract for `Me` and moves `Me` onto that contract while keeping older compatibility fields available.

## Constraints

- Do not redesign `Contribute`.
- Do not redesign `Explore`.
- Do not change shell styling, question bar styling, or shared thread card styling.
- Do not remove existing compatibility fields in this pass.
- Fix only compile blockers that prevent this slice from verifying.

## Backend Contract

Add `myArchiveByQuestion` to `participantWorkspace.overview`.

Each archive section should include:

- question metadata, or a session-level fallback for legacy unscoped submissions;
- stable question ordering by current/released question recency, then latest activity;
- own top-level messages for that question;
- nested own replies/follow-ups under each root;
- compact category assignment state;
- compact feedback state;
- compact recategorisation state;
- per-section counts for top-level contributions and replies.

Existing fields stay available:

- `myZoneHistory`;
- `feedbackBySubmission`;
- `assignmentsBySubmission`;
- `recategorisationRequests`.

## Frontend Contract

Update only the `Me` data flow:

- `participant-workspace-page.tsx` passes `ws.myArchiveByQuestion` into `MyZoneTab`;
- `MyZoneTab` renders contribution history from `myArchiveByQuestion`;
- existing report, fight history, position shifts, and settings placement remain intact.

## Compatibility Plan

During this pass, the old flat fields remain in the workspace response so other code can continue to load.

After `Me` is verified on `myArchiveByQuestion`, a later cleanup can decide whether `myZoneHistory` is still needed.

## Verification

Run:

- `pnpm exec tsc -b`

If `pnpm check` still fails on unrelated formatting churn, report it separately rather than widening this slice.

## Done Criteria

- `participantWorkspace.overview` returns `myArchiveByQuestion`.
- `Me` uses `myArchiveByQuestion` instead of stitching `myZoneHistory` with feedback and assignment maps.
- `Contribute` and `Explore` behavior is unchanged except for narrow compile fixes.
- Typecheck failures introduced by this slice are resolved.
