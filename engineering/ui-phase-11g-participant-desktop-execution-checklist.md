# Participant Desktop Execution Checklist

Date: 2026-05-12
Scope: Concrete frontend execution checklist for the participant desktop experience.

This file is the desktop execution companion to:

- `engineering/ui-phase-11e-participant-desktop-wireframe-plan.md`
- `engineering/ui-phase-11f-participant-desktop-implementation-plan.md`

## How To Use This Checklist

- Complete this after or alongside the mobile participant cleanup.
- Treat it as a layout and density checklist, not a logic rewrite checklist.
- Validate real desktop behavior, not just responsive shrink/stretch in dev tools.

## Shared Desktop Shell

### Files

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-nav-rail.tsx`
- `src/components/layout/participant-top-bar.tsx`

### Tasks

- [ ] Keep left navigation rail stable and readable.
- [ ] Keep right context rail present on desktop.
- [ ] Ensure the right context rail contains context, not duplicated operational content.
- [ ] Ensure prompt is visible in the rail on desktop.
- [ ] Remove redundant full prompt cards from tab bodies where the rail already provides the context.
- [ ] Ensure the main content column remains visually dominant.
- [ ] Review horizontal spacing so the desktop layout feels intentional rather than sparse.

### Validation

- [ ] Prompt context is always available on desktop.
- [ ] Prompt context is not repeated wastefully in the main column.
- [ ] Left rail, main column, and right rail have clear roles.

## Contribute Desktop

### Files

- `src/pages/participant-workspace-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`

### Tasks

- [ ] Create a clearer desktop submission state header.
- [ ] Keep the latest contribution visually primary.
- [ ] Allow the latest contribution's analysis to remain visible more persistently than on mobile.
- [ ] Keep older contributions visually secondary.
- [ ] Avoid a grid of equally emphasized contribution cards.
- [ ] Preserve simplified action hierarchy even on desktop.
- [ ] Ensure secondary navigation actions do not dominate the latest contribution card.

### Validation

- [ ] A participant can glance at desktop Contribute and immediately understand their current state.
- [ ] The latest contribution plus next step dominate the screen.
- [ ] Analysis is visible enough to be useful, but not louder than the contribution itself.

## Explore Desktop

### Files

- `src/components/stream/stream-tab.tsx`
- `src/components/stream/response-stream-item.tsx`

### Tasks

- [ ] Implement a desktop layout where peer responses remain primary.
- [ ] Keep category controls visible in a stable desktop position.
- [ ] Keep synthesis visible only if it does not outrank the stream.
- [ ] Avoid recreating the current wasteful chip/label layout at larger widths.
- [ ] Reduce or remove low-value peer metadata even if space allows.
- [ ] Confirm response cards are readable at desktop widths and do not stretch awkwardly.

### Validation

- [ ] The participant's eye goes to the room, not to synthesis first.
- [ ] Category controls help navigation instead of feeling like a toolbar burden.
- [ ] Response cards are easier to scan than the current implementation.

## Fight Desktop

### Files

- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-thread.tsx`
- `src/components/fight/fight-target-picker.tsx`

### Tasks

- [ ] Keep incoming challenge or active fight at the top.
- [ ] Use side context for timers, rules, or original positions where appropriate.
- [ ] Keep the active thread visually dominant in a desktop thread view.
- [ ] Ensure past fights remain secondary.
- [ ] Confirm target picker scales cleanly to desktop width without looking empty.

### Validation

- [ ] A participant in a fight can orient quickly on desktop.
- [ ] Thread, timer, and status relationships are clearer than on mobile.
- [ ] Past history does not compete with the live thread.

## Me Desktop

### Files

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Tasks

- [ ] Create a stronger desktop report summary area.
- [ ] Show activity summary in a concise, scan-friendly block.
- [ ] Keep contribution history readable with selective default expansion.
- [ ] Place fight history, shifts, and settings in a support region.
- [ ] Ensure settings remain visibly secondary.
- [ ] Confirm the tab reads as review/history rather than a second workbench.

### Validation

- [ ] Desktop `Me` feels like a review dashboard.
- [ ] Report and history are easier to scan than on mobile.
- [ ] Settings do not interrupt the reflection flow.

## Prompt and Question Consistency

### Tasks

- [ ] Ensure the active question is present on every desktop tab via the context rail.
- [ ] Ensure released question switching is easy on desktop.
- [ ] Avoid repeating full question cards in-body unless state-specific.
- [ ] Verify that switching questions updates all relevant tab surfaces correctly.

### Validation

- [ ] Participants always know which question they are viewing.
- [ ] Desktop does not need repeated prompt cards to stay understandable.

## Desktop QA

### Views to test

- [ ] laptop width
- [ ] standard desktop width
- [ ] large desktop width

### QA checks

- [ ] no overly stretched cards
- [ ] no accidental empty whitespace dead zones
- [ ] no duplicated prompt/context surfaces
- [ ] no tab drifts from mobile logic
- [ ] no noisy metadata returning simply because space exists

## Cross-Breakpoint Consistency QA

### Tasks

- [ ] Compare mobile and desktop `Contribute` hierarchy
- [ ] Compare mobile and desktop `Explore` hierarchy
- [ ] Compare mobile and desktop `Fight` obligation ordering
- [ ] Compare mobile and desktop `Me` reflection/history framing
- [ ] Ensure terminology remains identical across breakpoints

### Validation

- [ ] Mobile and desktop feel like the same product
- [ ] Desktop adds stability and context, not a different IA

## Backend Follow-Up Only If Needed

- [ ] Document any real frontend blocker as a separate backend follow-up
- [ ] Do not pad desktop with backend asks unless a concrete contract gap exists

## Done Criteria

- [ ] desktop participant shell is stable and context-rich
- [ ] Contribute uses desktop space without duplicating old clutter
- [ ] Explore remains stream-first
- [ ] Fight remains obligation-first
- [ ] Me remains reflection/history-first
- [ ] right context rail adds value without duplication

## Suggested Commit Grouping

1. desktop shell/context rail refinement
2. contribute desktop layout
3. explore desktop layout
4. me desktop layout
5. fight desktop refinement
6. desktop QA cleanup
