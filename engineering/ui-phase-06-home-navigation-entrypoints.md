# UI Phase 06: Homepage Navigation Entrypoints

## Problem

The homepage currently sends users to hard-coded demo session targets:

- Participants: `/join/SPARK`
- Instructors: `/instructor/session/demo-discussion`

Those routes only work when matching demo data exists in Convex. In an empty deployment, both flows can land on "Session not found", which makes the app look broken even though session creation and joining work.

## Intended Flow

- Participants should start at a generic join-code entry screen.
- Instructors should start at the instructor dashboard.
- Demo-specific links should not be the default production entrypoints unless demo data is seeded.

## Implementation Plan

1. Add a generic `/join` route.
2. Add a lightweight join-code entry page that accepts a code and redirects to `/join/:sessionCode`.
3. Update the homepage participant CTA to use `/join`.
4. Update the homepage instructor CTA to use `/instructor`.
5. Keep the existing `/join/:sessionCode` route and backend lookup unchanged.
6. Update route helper tests for the new join entry route.

## Backend Impact

None. Existing Convex functions continue to resolve sessions by join code after the participant submits a code.

## Validation

- `/` should render the homepage.
- Participant CTA should navigate to `/join`.
- Instructor CTA should navigate to `/instructor`.
- `/join/:sessionCode` should continue to work for direct links and QR codes.
