# Participant Tab Implementation Plan

Date: 2026-05-12
Scope: Frontend implementation plan for participant-facing tab cleanup based on:

- `engineering/ui-phase-11-participant-tab-ux-audit.md`
- `engineering/ui-phase-11b-participant-mobile-wireframe-plan.md`

This plan is mobile-first. Desktop should inherit the same behavioral logic, with more persistent context where appropriate.

## Objective

Refactor the participant-facing app so each tab has:

- a single dominant job
- clearer next actions
- less duplicate information
- tighter mobile first-screen hierarchy
- reduced low-value metadata

This is primarily a frontend/content-architecture change. It should not require a major backend redesign.

## Target Outcome

### Contribute

Becomes the participant's active workbench:

- submit first response
- understand submission state
- add another top-level point
- add follow-up to own point
- open deeper analysis on demand

### Explore

Becomes the room view:

- inspect peer responses
- filter by category
- reply or challenge
- optionally open synthesis after reading the room

### Fight

Becomes a narrow challenge surface:

- accept/decline incoming challenge
- resume active fight
- start a new challenge
- review past fights secondarily

### Me

Becomes history and reflection:

- personal report status
- activity summary
- contribution history
- fight history
- settings

## Constraints

### Do not change the participant mental model by route

Current routes are already reasonable:

- `/session/:sessionSlug`
- `/session/:sessionSlug?tab=explore`
- `/session/:sessionSlug?tab=fight`
- `/session/:sessionSlug?tab=me`
- `/session/:sessionSlug/fight/:fightSlug`
- `/session/:sessionSlug/review`

No route redesign is required for this pass.

### Preserve existing backend contracts where possible

This implementation should reuse current data returned by:

- `useParticipantWorkspace`
- `participants.restore`
- `personalReports.getMine`
- `positionShifts.listMine`

If frontend gaps are found, create a small follow-up contract list instead of blocking the UI restructure.

## Implementation Strategy

## Phase 1: Shell and Context Cleanup

### Goal

Stop repeating the active question and move to a compact cross-tab context model.

### Tasks

1. Replace full repeated prompt usage with a compact sticky question bar for mobile.
2. Keep desktop context rail, but reduce prompt duplication inside tab content.
3. Move participant guidance out of desktop-only `ParticipantStatusBanner` into a mobile-visible helper line or compact state row.
4. Keep released-question switching accessible from every tab, but compact.

### Components likely affected

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-status-banner.tsx`
- `src/pages/participant-workspace-page.tsx`

### Implementation notes

- The question bar should show:
  - `Current question`
  - one-line prompt preview
  - expand/collapse behavior
  - question switch affordance if multiple released questions exist
- The full cream prompt card should no longer be the default top section of every tab.

## Phase 2: Contribute Tab Restructure

### Goal

Make the first screenful clearly answer:

- have I submitted
- what happened
- what should I do next

### Tasks

1. Remove the current generic `Your contributions` intro card.
2. Introduce a compact submission state card above the contribution thread list.
3. Reduce the top-level action row to:
   - one primary CTA
   - at most one secondary CTA
4. Keep only the latest contribution expanded by default.
5. Move older contributions into a collapsed `Earlier points` section.
6. Keep AI feedback and recategorization behind `Open analysis`, not always foregrounded.
7. Remove low-priority lateral buttons from the default visible contribution card.

### Components likely affected

- `src/pages/participant-workspace-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/submission/response-composer.tsx`

### Implementation notes

#### New top-of-tab state logic

When there is no top-level contribution:

- show composer immediately

When there is at least one top-level contribution:

- show a compact `You've submitted` state card
- show:
  - latest category if assigned
  - feedback status
  - timestamp
  - next suggested action

#### Action simplification

Default visible actions on the latest contribution card:

- `Add follow-up`
- `Open analysis`

Move or remove from default visible card:

- `View in Explore`
- `Go to Fight`

These can survive inside an overflow/detail state if still needed.

#### Composer cleanup

The telemetry disclosure line in `ResponseComposer` should be demoted or removed from the default submission card. It is not a primary-task element.

## Phase 3: Explore Tab Restructure

### Goal

Make `Explore` feel like a reading/responding room rather than a mixed analytics surface.

### Tasks

1. Add a compact room summary row:
   - response count
   - category count
   - synthesis available state
2. Replace long horizontal chip scrolling with either:
   - wrapped chips, or
   - a `More filters` bottom-sheet/modal trigger
3. Move class synthesis below the peer response stream, or collapse it behind `View class synthesis`.
4. Reduce per-response metadata noise.
5. Reassess peer-visible telemetry/originality labels.

### Components likely affected

- `src/components/stream/stream-tab.tsx`
- `src/components/stream/response-stream-item.tsx`
- possibly a new category filter subcomponent if the chip control is extracted

### Implementation notes

#### Room summary

Keep this compact. It should not become a dashboard block.

#### Peer cards

Default visible:

- nickname
- response body
- category badge
- reply/challenge/reaction actions

Hide or strongly demote:

- `Composed gradually`
- `Likely pasted`
- `originality`

These are not the core of room discovery and may distort peer perception.

#### Synthesis

If synthesis is released:

- use a collapsed card or lower section
- do not place it above the stream by default

## Phase 4: Fight Tab Tightening

### Goal

Preserve the current good separation while making rules and obligation states more legible on mobile.

### Tasks

1. Add a short Fight rules/explainer block on the home state.
2. Ensure incoming challenge is visually first.
3. Ensure active fight is visually first when present.
4. Collapse or demote past fights below current obligations.
5. Add a clearer pending-state explanation for pre-acceptance drafting.

### Components likely affected

- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-thread.tsx`
- optionally `src/components/fight/fight-target-picker.tsx`

### Implementation notes

Recommended rule copy:

- `4-turn mini debate`
- `Accept within 20s`
- `Each turn has 60s`
- `You need a submitted response first`

No backend changes are required for this explanation layer.

## Phase 5: Me Tab Consolidation

### Goal

Stop `Me` from behaving like a second `Contribute` tab.

### Tasks

1. Introduce a compact personal report status card with simplified participant-facing copy.
2. Add a small activity summary row:
   - contributions
   - follow-ups
   - fights
   - shifts
3. Convert contribution history into a compact list with expandable detail, rather than full heavy cards for every item by default.
4. Keep fight history and position shifts below contribution history.
5. Move settings to the bottom.

### Components likely affected

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Implementation notes

#### Report copy cleanup

Translate backend release semantics into participant terms:

- `Your private report is ready`
- `Your report is generating`
- `Reports are not available for this question yet`

Avoid system-heavy wording like:

- `generated but not released here`
- `instructor has not released report cards into this question view yet`

#### History model

The contribution history list should show:

- snippet
- timestamp
- category
- feedback status

Tap to expand full feedback and related details.

## Phase 6: Desktop Adaptation Pass

### Goal

Keep the same logic as mobile, while making use of desktop real estate without reintroducing duplication.

### Tasks

1. Keep the context rail on desktop.
2. Ensure desktop does not also repeat the full prompt at the top of each tab body.
3. Allow more persistent visibility for:
   - question switcher
   - synthesis panel
   - history panel
   - expanded detail areas
4. Confirm that desktop still respects the same tab job boundaries.

### Components likely affected

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- all tab components for breakpoint-specific defaults

### Implementation notes

Desktop should be a richer scanning layout, not a different product.

That means:

- more persistent context is fine
- duplicated meaning is still not fine

## Proposed Work Order

### Recommended sequence

1. Shell/context cleanup
2. Contribute restructure
3. Explore restructure
4. Me consolidation
5. Fight tightening
6. Desktop adaptation pass

Reason:

- `Contribute` and `Explore` drive the most participant confusion right now
- `Me` duplication becomes easier to resolve after `Contribute` is clarified
- `Fight` is already structurally decent
- desktop should follow after mobile task hierarchy is correct

## Risks and Watchouts

### Risk: over-preserving old sections

If old cards are retained and only restyled, the attention problem will persist. This needs actual content removal or collapse, not cosmetic compression only.

### Risk: backend wording leaking into UX

Several current surfaces expose internal product semantics. During implementation, copy must be rewritten for participant comprehension, not backend truthfulness alone.

### Risk: desktop-only assumptions creeping back in

Do not solve mobile clarity by hiding complexity only on mobile while leaving desktop logic cluttered. The logic should be unified; only the presentation density should vary.

## Backend Impact

### Expected minimal/no-change areas

This plan should mostly work with existing data:

- contribution history
- assignments
- feedback states
- personal report summary
- fight history
- question list

### Potential follow-up backend asks

If needed, add only small contract refinements such as:

- compact counts for `Me` activity summary
- clearer per-contribution status summary fields if frontend derivation becomes too messy
- synthesis availability flags if not already easy to consume

These should be tracked separately if discovered during implementation.

## Deliverables

After implementation, the participant app should have:

- one compact cross-tab question context model
- a simplified `Contribute` first screen
- a leaner `Explore` stream
- a cleaner `Me` archive/reflection tab
- a clearer Fight entry state
- desktop parity without duplication

## Success Criteria

### Contribute

- participant can tell within one screen whether they have submitted
- participant can identify the next best action without reading multiple cards

### Explore

- participant sees peer responses before synthesis
- response cards no longer feel over-labeled

### Fight

- participant understands fight rules before starting
- current obligation is always visually first

### Me

- participant sees it as history/reflection, not another contribution screen

### Cross-tab

- active question is always visible
- full prompt is no longer repeated wastefully
- mobile attention flow is tighter

## Summary

This is a frontend restructuring pass, not a backend feature expansion pass. The emphasis should be:

- reduce duplication
- tighten action hierarchy
- collapse low-value detail
- keep tab intent pure

The implementation should be done against mobile first-screen behavior first, then verified on desktop as a persistent-context adaptation.
