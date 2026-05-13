# Participant Desktop Implementation Plan

Date: 2026-05-12
Scope: Frontend implementation plan for desktop adaptation of the participant-facing app.

This document follows:

- `engineering/ui-phase-11e-participant-desktop-wireframe-plan.md`

The desktop implementation should be done after or alongside the mobile-first participant cleanup. It should not invent a separate logic model.

## Objective

Adapt the participant-facing app for desktop so that:

- context remains visible persistently
- multi-column layout improves scanning
- tab purpose remains clear
- extra real estate does not reintroduce duplication and low-value noise

## Principle

Desktop implementation is a layout and density pass, not a product rewrite.

Use the same behavioral structure as mobile:

- `Contribute` = active own-work surface
- `Explore` = room-reading surface
- `Fight` = challenge/defense surface
- `Me` = reflection/history surface

## Implementation Strategy

## Phase 1: Shell Stabilization

### Goal

Lock in a desktop shell that supports persistent context and clean tab navigation.

### Files

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-nav-rail.tsx`
- `src/components/layout/participant-top-bar.tsx`

### Tasks

1. Preserve the left navigation rail on desktop.
2. Preserve the right context rail on desktop.
3. Ensure the main column remains the primary active-work area.
4. Remove redundant prompt cards from tab bodies where the right rail already provides the question context.
5. Ensure tab heading, helper text, and main column spacing feel intentional and not overly stretched.

### Implementation notes

- The right context rail should remain narrow and contextual.
- Do not let it become a dumping ground for tab-specific controls.
- If a helper line is used, keep it short and per-tab.

## Phase 2: Contribute Desktop Layout

### Goal

Use extra space to support contribution plus analysis without duplicating multiple card layers.

### Files

- `src/pages/participant-workspace-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`

### Tasks

1. Create a clearer submission state header at the top of the main column.
2. Keep latest contribution visually dominant.
3. Allow the latest contribution's analysis to remain visible more persistently on desktop.
4. Ensure older contributions do not all expand at once by default.
5. Keep action clutter low even on wide screens.

### Preferred desktop layout

- top state band
- latest contribution card
- persistent adjacent or lower analysis card
- earlier points below

### Implementation notes

- If using two-column treatment inside the tab, restrict it to latest contribution + analysis only.
- Do not create a grid of contribution cards with equal emphasis.

## Phase 3: Explore Desktop Layout

### Goal

Use desktop width to improve room browsing, category scanning, and optional synthesis visibility.

### Files

- `src/components/stream/stream-tab.tsx`
- `src/components/stream/response-stream-item.tsx`

### Tasks

1. Convert the tab to a more structured multi-column layout on desktop.
2. Keep peer stream as the primary reading area.
3. Place category controls in a stable visible position.
4. Place synthesis in a side panel or lower panel without letting it dominate the stream.
5. Keep peer response cards readable and less noisy than the current version.

### Preferred desktop layout

Option A:

- left: peer stream
- right: room summary, categories, synthesis

Option B:

- top: room summary + category controls
- left: peer stream
- right or lower: synthesis

### Implementation notes

- Avoid restoring full-width horizontal chip overflow.
- Avoid turning the right side into a dashboard of too many small stat blocks.

## Phase 4: Fight Desktop Layout

### Goal

Give the participant better awareness of fight state and timing without compromising thread focus.

### Files

- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-thread.tsx`
- `src/components/fight/fight-target-picker.tsx`

### Tasks

1. Keep incoming challenge or active fight visually first.
2. Use side context for rules, timers, and original position reminders where appropriate.
3. Keep the active thread dominant when a fight is open.
4. Keep history visible only if it does not compete with the current fight.

### Implementation notes

- Desktop is well-suited for a main thread plus side context pattern.
- If timers and turn state are shown, group them clearly rather than scattering them across multiple surfaces.

## Phase 5: Me Desktop Layout

### Goal

Turn `Me` into a readable review dashboard with clear separation between report, history, and settings.

### Files

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Tasks

1. Create a stronger desktop report summary area.
2. Add a persistent activity summary row.
3. Allow the most recent contribution history item to show more detail by default.
4. Keep older contribution history scannable.
5. Position fight history, shifts, and settings in a side or lower support area.

### Preferred desktop layout

- left: report summary + contribution history
- right: fight history + shifts + settings

### Implementation notes

- The report summary can be richer on desktop than on mobile.
- Keep settings clearly secondary.

## Phase 6: Cross-Breakpoint Consistency Review

### Goal

Make sure the desktop pass did not drift from the mobile architecture.

### Tasks

1. Compare each tab's first-order purpose on mobile and desktop.
2. Ensure prompt handling is consistent:
   - visible everywhere
   - not wastefully repeated
3. Ensure desktop did not reintroduce low-value metadata by default.
4. Ensure interaction labels and next-step actions remain consistent across breakpoints.

## Risks

### Risk: desktop over-expansion

It will be tempting to expose more and more detail just because there is space. That must be resisted unless the detail improves scanning and decision-making.

### Risk: side rail becoming operational clutter

The desktop context rail should remain contextual. It should not absorb core actions that belong in the main task surface.

### Risk: reintroducing duplication between Contribute and Me

Desktop makes it easier to keep multiple panels open, which can accidentally collapse the distinction between the two tabs again.

## Backend Impact

This pass should not require major backend changes.

Possible minor follow-up only if needed:

- compact counts for summary blocks
- cleaner derived status fields if current frontend logic becomes too brittle

These should be treated as follow-up tasks, not baseline dependencies.

## Success Criteria

- desktop preserves the same tab intent as mobile
- prompt context is always available without repeated full prompt cards
- multi-column layouts improve scanning
- `Explore` still prioritizes peer stream over synthesis
- `Contribute` still prioritizes latest contribution and next action
- `Me` still reads as review/history
- `Fight` still prioritizes current obligation

## Summary

Desktop implementation should be an enhancement pass on top of the mobile-first cleanup:

- stronger persistent context
- better side-by-side scanning
- cleaner use of horizontal space

without changing the participant's core mental model.
