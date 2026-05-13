# Participant Tab Execution Checklist

Date: 2026-05-12
Scope: Concrete frontend implementation checklist following:

- `engineering/ui-phase-11-participant-tab-ux-audit.md`
- `engineering/ui-phase-11b-participant-mobile-wireframe-plan.md`
- `engineering/ui-phase-11c-participant-tab-implementation-plan.md`

This file is execution-facing. It is intentionally more operational than the strategy documents.

## How To Use This Checklist

- Treat each section as a build unit.
- Complete shared shell work before heavy tab refinement.
- Validate mobile first, then desktop adaptation.
- Do not add backend scope here unless a frontend blocker is confirmed.

## Shared Shell and Context

### Goal

Establish a compact, consistent participant shell that avoids repeating the active question across tab bodies.

### Files

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/components/layout/participant-status-banner.tsx`
- `src/pages/participant-workspace-page.tsx`

### Tasks

- [ ] Add a compact question bar pattern for mobile.
- [ ] Ensure the active question is visible on every tab in compact form.
- [ ] Support expand/collapse for full prompt text.
- [ ] Preserve released-question switching when multiple released questions exist.
- [ ] Remove the need for a full large prompt card at the top of every tab body.
- [ ] Replace desktop-only participant guidance with a mobile-visible helper line or compact state row.
- [ ] Keep desktop context rail, but reduce prompt duplication between rail and tab body.

### Validation

- [ ] On mobile, the active question is visible without consuming excessive vertical space.
- [ ] On desktop, the context rail remains useful but does not cause prompt duplication.
- [ ] Tab content starts closer to the participant's real task.

## Contribute Tab

### Goal

Make the first screenful clearly communicate submission state and next action.

### Files

- `src/pages/participant-workspace-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/submission/response-composer.tsx`

### Tasks

- [ ] Remove the generic `Your contributions` intro card after submission.
- [ ] Replace it with a compact submission state card.
- [ ] Show clear state in that card:
  - [ ] submitted status
  - [ ] timestamp
  - [ ] category if assigned
  - [ ] feedback status
  - [ ] next recommended action
- [ ] Keep the initial composer as the dominant surface when no contribution exists.
- [ ] Limit the top-level visible CTA set after submission to:
  - [ ] one primary CTA
  - [ ] at most one secondary CTA
- [ ] Show latest contribution first.
- [ ] Move older top-level contributions into a collapsed `Earlier points` section.
- [ ] Reduce top-level visible actions on each contribution card.
- [ ] Keep `Add follow-up` as the primary thread action.
- [ ] Move deeper analysis behind `Open analysis`.
- [ ] Keep recategorization inside the analysis/detail layer, not in the primary action layer.
- [ ] Remove or demote low-value contribution-card actions such as:
  - [ ] `View in Explore`
  - [ ] `Go to Fight`
- [ ] Remove the always-visible telemetry disclosure line from the composer, or demote it significantly.

### Validation

- [ ] A participant can tell within one screen whether their submission has already been sent.
- [ ] The next best action is obvious.
- [ ] The tab no longer feels like a history/archive surface.
- [ ] The participant is not asked to make too many lateral decisions from the latest contribution card.

## Explore Tab

### Goal

Turn `Explore` into a room-reading surface, not a mixed synthesis dashboard.

### Files

- `src/components/stream/stream-tab.tsx`
- `src/components/stream/response-stream-item.tsx`
- optionally a new extracted category-filter component if needed

### Tasks

- [ ] Add a compact room summary strip near the top.
- [ ] Include only lightweight room signals there:
  - [ ] response count
  - [ ] category count
  - [ ] synthesis available state if applicable
- [ ] Replace long horizontal chip scrolling with a more mobile-efficient pattern.
- [ ] Choose one category-filter interaction:
  - [ ] wrapped top categories with `More`
  - [ ] bottom sheet filter picker
- [ ] Ensure peer response stream appears before synthesis by default.
- [ ] If synthesis exists, place it lower or behind a collapsed `View class synthesis` entry.
- [ ] Reduce per-response metadata density.
- [ ] Keep default visible response content to:
  - [ ] nickname
  - [ ] body
  - [ ] category badge
  - [ ] reply/challenge/reaction actions
- [ ] Reassess peer-visible telemetry and originality labels.
- [ ] Remove or strongly demote:
  - [ ] `Composed gradually`
  - [ ] `Likely pasted`
  - [ ] generic originality labels in the stream
- [ ] Avoid stacking large waiting/locked/empty state cards above the response stream.

### Validation

- [ ] On mobile, category filtering no longer feels like horizontal chip overflow management.
- [ ] Peer responses dominate the tab more than synthesis.
- [ ] The tab reads cleanly as a stream rather than a dashboard.
- [ ] Response cards no longer feel over-labeled.

## Fight Tab

### Goal

Keep the strong current separation, but make the mode rules and obligation states more explicit.

### Files

- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-thread.tsx`
- `src/components/fight/fight-target-picker.tsx`

### Tasks

- [ ] Add a short fight explainer/rules block on the home state.
- [ ] Include:
  - [ ] turn count expectation
  - [ ] acceptance deadline
  - [ ] turn deadline
  - [ ] submission requirement
- [ ] Make incoming challenge the first visible item if present.
- [ ] Make active fight the first visible item if present.
- [ ] Ensure past fights are secondary on mobile.
- [ ] Add a clearer explanation for pending-state drafting if the draft composer appears before acceptance.
- [ ] Keep target picking lean and readable on mobile.
- [ ] Review whether `Challenge a Response` should be renamed to something more participant-natural, e.g. `Challenge a participant`.

### Validation

- [ ] A participant can understand how Fight works before opening a thread.
- [ ] The participant always sees current obligations before history.
- [ ] Starting or resuming a fight is visually clear.

## Me Tab

### Goal

Make `Me` a reflection/history surface instead of a duplicate contribution workspace.

### Files

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

### Tasks

- [ ] Introduce a simpler personal report status card with participant-facing copy.
- [ ] Remove backend-heavy release semantics from the main tab wording.
- [ ] Add a compact activity summary row with counts:
  - [ ] contributions
  - [ ] follow-ups
  - [ ] fights
  - [ ] shifts
- [ ] Convert contribution history into a compact list with expandable detail.
- [ ] Stop showing full heavy feedback cards inline for every historical contribution by default.
- [ ] Keep contribution detail available on expansion.
- [ ] Keep fight history below contribution history.
- [ ] Keep position shifts below contribution/fight history.
- [ ] Move nickname settings to the bottom of the tab.
- [ ] Ensure the `View full report` path remains available when appropriate.

### Validation

- [ ] `Me` no longer feels like a second copy of `Contribute`.
- [ ] Contribution history is scannable on mobile.
- [ ] The participant can distinguish private report access from in-session participation work.
- [ ] Settings no longer compete with reflection content.

## Review Route

### Goal

Keep the dedicated report page useful without leaking too much complexity into `Me`.

### Files

- `src/pages/participant-workspace-page.tsx`

### Tasks

- [ ] Confirm the separate review route still makes sense after `Me` is simplified.
- [ ] Keep the full report detail page for:
  - [ ] metric tiles
  - [ ] summary
  - [ ] contribution trace
  - [ ] argument evolution
  - [ ] growth opportunity
- [ ] Ensure the `Me` tab links into this page cleanly.
- [ ] Ensure copy clearly distinguishes:
  - [ ] quick in-tab summary
  - [ ] full private report page

### Validation

- [ ] Participants understand why a full report page exists separately from the tab summary.

## Mobile-First QA

### Devices / widths

- [ ] narrow phone width
- [ ] standard phone width
- [ ] tablet portrait

### Checks

- [ ] first screenful in each tab has one dominant purpose
- [ ] no unnecessary repeated prompt cards
- [ ] no awkward horizontal chip overflow as primary interaction
- [ ] bottom tab navigation remains stable and readable
- [ ] no card stack feels like system-state spam
- [ ] default actions are tappable and visually prioritized

## Desktop Adaptation QA

### Files

- all participant shell and tab components

### Tasks

- [ ] Keep the context rail on desktop.
- [ ] Remove duplicate prompt/body context if the rail is already visible.
- [ ] Allow more persistent visibility for:
  - [ ] question switcher
  - [ ] synthesis
  - [ ] contribution detail
  - [ ] history
- [ ] Verify desktop does not reintroduce the same duplication mobile is trying to remove.

### Validation

- [ ] Desktop feels richer, not noisier.
- [ ] Each tab still has a clear job.
- [ ] Persistent context helps scanning rather than repeating information.

## Backend Follow-Up Only If Needed

Do not expand backend scope unless frontend implementation confirms a real contract gap.

Potential follow-up asks only if necessary:

- [ ] compact counts for `Me` summary if too awkward to derive in frontend
- [ ] more compact contribution-status summaries if current frontend derivation is too messy
- [ ] any missing synthesis availability flags needed for clean Explore rendering

If any of these are needed, document them separately instead of broadening this checklist.

## Done Criteria

- [ ] `Contribute` clearly surfaces submission state and next action
- [ ] `Explore` prioritizes peer responses over synthesis
- [ ] `Fight` prioritizes incoming/current obligations over history
- [ ] `Me` behaves like archive/reflection rather than duplicate workbench
- [ ] active question is visible everywhere in compact form
- [ ] mobile first-screen hierarchy is noticeably cleaner
- [ ] desktop remains aligned with the same core logic

## Suggested Commit Grouping

If implementing in multiple PRs or commits:

1. participant shell and compact question bar
2. contribute tab cleanup
3. explore tab cleanup
4. me tab consolidation
5. fight tab tightening
6. desktop refinement and QA fixes

This keeps the refactor reviewable and easier to test incrementally.
