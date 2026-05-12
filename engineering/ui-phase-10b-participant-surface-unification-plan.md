# UI Phase 10b: Participant Surface Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `brainstorming` before implementation changes, plus the repo-required frontend skills. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the participant workspace into one coherent visual system by unifying tab identity colors, standardizing participant section shells, and migrating `Contribute`, `Explore`, `Fight`, and `Me` onto that system without flattening the intentional `Fight` mode treatment.

**Architecture:** Introduce one semantic tab-color contract and one participant section grammar. Apply those shared primitives incrementally so the shell, navigation, and tab interiors all reinforce the same workspace model. Preserve `Fight` as the most assertive tab, but keep it within the same token and action system.

**Tech Stack:** React, Tailwind CSS v4, OKLCH design tokens, Phosphor Icons

---

## Why this phase exists

Phase 16 fixed participant routing and shell ownership. The shell is now structurally correct, but the content surfaces still come from older feature-specific implementations.

Current user-visible issues:

1. **Tab identity colors drift**
   - headings use one semantic path;
   - active tab controls use another;
   - internal actions sometimes fall back to generic blue link styling.

2. **Tab interiors do not share a common section grammar**
   - `Contribute` reads like an editor;
   - `Explore` reads like a utility/feed;
   - `Fight` reads like a mode surface;
   - `Me` reads like a settings/archive page.

3. **Shared state messages are inconsistent**
   - hidden, empty, waiting, private, and locked states are framed differently from tab to tab.

The fix should not be cosmetic only. It needs a stable design contract that implementation can follow.

---

## Approved direction

Implement the [participant surface unification spec](./ui-phase-10-participant-surface-unification-spec.md) in reviewable slices.

Key decisions from the spec:

- participant tab identity must come from one semantic token family;
- tab interiors must use one section grammar;
- internal participant actions must stop falling back to browser-default blue links;
- `Fight` remains intentionally more modeful than the other tabs;
- `Fight` should not be flattened into the same quiet tone as `Explore` or `Me`.

---

## File map

Likely primary files:

- `src/styles/globals.css`
- `src/lib/constants.ts`
- `src/components/layout/participant-shell.tsx`
- `src/components/layout/bottom-tab-bar.tsx`
- `src/components/layout/participant-nav-rail.tsx`
- `src/components/ui/card.tsx`
- `src/components/submission/response-composer.tsx`
- `src/components/stream/stream-tab.tsx`
- `src/components/fight/fight-home.tsx`
- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

Likely new components:

- `src/components/layout/participant-section.tsx`
- `src/components/layout/participant-state-section.tsx`
- `src/components/layout/participant-section-header.tsx`

Only add new abstractions if they remove real duplication. Do not create wrappers that simply rename existing markup.

---

## Design rules to preserve

- shell heading remains the tab-level page title;
- active bottom-tab state and heading color must align semantically;
- empty or locked states stay visible and explanatory;
- `Contribute` remains productive after first submission;
- `Explore` remains the cohort-facing room view;
- `Fight` remains the structured challenge mode;
- `Me` remains the private archive and report hub;
- report/history content stays higher priority than profile settings in `Me`.

---

## Implementation strategy

### 10b-1: Unify semantic tab-color tokens

**Purpose**

Fix the current color mismatch between:

- page headings;
- active bottom-tab labels/icons;
- desktop nav rail active states.

**Files**

- `src/styles/globals.css`
- `src/lib/constants.ts`
- `src/components/layout/participant-shell.tsx`
- `src/components/layout/bottom-tab-bar.tsx`
- `src/components/layout/participant-nav-rail.tsx`

**Tasks**

- [ ] Add semantic participant tab tokens:
  - `--c-tab-contribute`
  - `--c-tab-explore`
  - `--c-tab-fight`
  - `--c-tab-me`
- [ ] Define them in both `:root` and `html.dark`.
- [ ] Make shell heading color derive from these semantic tokens.
- [ ] Make active bottom-tab icon/text/border derive from these semantic tokens.
- [ ] Make desktop nav rail active state derive from the same semantic tokens.
- [ ] Remove accidental dependence on lighter signature colors for active participant-tab identity.

**Rules**

- Do not globally mutate the wider signature palette just to fix participant tab contrast.
- Do not retint all participant surfaces with tab colors.
- This slice is about identity consistency, not surface redesign.

**Acceptance**

- `Contribute` and `Explore` no longer look washed out in light mode.
- Active bottom-tab states match the heading family more closely.
- Dark mode uses the same semantic contract instead of a separate ad hoc path.

---

### 10b-2: Introduce participant section primitives

**Purpose**

Create the shared section grammar before migrating all four tabs.

**Files**

- `src/components/ui/card.tsx`
- `src/components/layout/participant-section.tsx`
- `src/components/layout/participant-state-section.tsx`
- `src/components/layout/participant-section-header.tsx`
- any minimal support changes needed in `participant-shell.tsx`

**Tasks**

- [ ] Decide whether to extend `Card` or create participant-specific wrappers on top of it.
- [ ] Implement a shared participant section shell with:
  - consistent border treatment;
  - radius;
  - padding rhythm;
  - optional header region;
  - optional footer/action row.
- [ ] Implement a participant state-section pattern for:
  - hidden;
  - locked;
  - empty;
  - waiting;
  - released-later states.
- [ ] Ensure section titles, descriptions, and header actions follow one spacing model.

**Rules**

- Do not over-abstract early.
- If a single shared `ParticipantSection` plus a small header helper is enough, stop there.
- Preserve compatibility with existing card usage where reasonable.

**Acceptance**

- There is one reusable section shell for participant tabs.
- There is one reusable state framing pattern for participant tabs.
- Subsequent tab migrations can use these primitives instead of bespoke containers.

---

### 10b-3: Migrate `Contribute`

**Purpose**

Make `Contribute` the reference implementation of the unified participant workspace style.

**Files**

- `src/components/submission/response-composer.tsx`
- `src/pages/participant-workspace-page.tsx`
- any contribution-thread related components used inside the tab

**Tasks**

- [ ] Move the released-question block onto the shared context-section pattern.
- [ ] Refit `ResponseComposer` to the shared action-section shell.
- [ ] Keep private feedback visually attached to the latest submitted contribution.
- [ ] Keep queued/processing/error feedback in the same local region.
- [ ] Bring contribution history onto the same section rhythm as the composer.
- [ ] Normalize recategorisation / follow-up / view-in-explore / fight-entry actions to the shared action vocabulary.

**Rules**

- Do not push private feedback back into `Me`.
- Do not make `Contribute` feel empty after first submission.
- Keep multiple contribution support intact.

**Acceptance**

- `Contribute` reads as one coherent workspace, not separate prompt/composer/history systems.
- Primary, secondary, and tertiary actions are visually consistent.

---

### 10b-4: Migrate `Explore`

**Purpose**

Turn `Explore` into a coherent room-view surface instead of a stack of unrelated strips and boxes.

**Files**

- `src/components/stream/stream-tab.tsx`
- related stream/filter/category components if needed

**Tasks**

- [ ] Convert presence/status strip into a deliberate context or state section.
- [ ] Convert “not released yet” and privacy notices into shared state sections.
- [ ] Bring class synthesis and category/filter surfaces into the shared section rhythm.
- [ ] Ensure the peer stream sits inside a stable history/detail section.
- [ ] Normalize upvote/reply/fight entry action treatments.

**Rules**

- `Explore` should remain calmer than `Fight`.
- Do not over-theme `Explore` with tab color.
- Preserve the visibility/capability explanations from the question-centric flow.

**Acceptance**

- `Explore` no longer feels like a utility page stitched together from unrelated containers.
- Feed, filters, and state notices share one visual hierarchy.

---

### 10b-5: Migrate `Fight` without flattening it

**Purpose**

Keep the current strong `Fight` direction while bringing it under the shared token and action system.

**Files**

- `src/components/fight/fight-home.tsx`
- any fight list / row components

**Tasks**

- [ ] Keep the stronger `Fight` hero/action panel if it remains visually effective.
- [ ] Ensure the hero panel derives its accent from the semantic `Fight` token family.
- [ ] Ensure the launcher buttons use the shared primary/secondary action vocabulary.
- [ ] Bring fight history/detail panels under the calmer shared section shell.
- [ ] Replace generic blue `View`-style internal actions with palette-consistent tertiary actions.
- [ ] Normalize fight status chips and row spacing if needed.

**Rules**

- Do not flatten `Fight` into a neutral-card-only tab.
- Do not remove the modeful entry feel if it is working.
- Standardize the system underneath it, not the tone out of it.

**Acceptance**

- `Fight` remains the most assertive tab.
- `Fight` still feels like part of the same product.
- The hero panel and the archive/detail sections feel intentionally related rather than visually unrelated.

---

### 10b-6: Migrate `Me`

**Purpose**

Make `Me` read as a private archive and report surface first, settings second.

**Files**

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`

**Tasks**

- [ ] Move report state and report detail onto shared context/state sections.
- [ ] Normalize contribution history, private feedback, fight history, and report-related detail surfaces.
- [ ] Replace generic blue internal links with palette-consistent tertiary actions.
- [ ] Keep nickname/profile controls as a lower-priority action section.
- [ ] Ensure empty states are deliberate and framed, not free-floating sentences.

**Rules**

- Do not reintroduce duplicate local chrome for `Me`.
- Keep report/history first and settings second.
- Preserve private archive behavior.

**Acceptance**

- `Me` no longer reads like a settings-first page.
- Report, history, and identity controls sit in a clear hierarchy.

---

### 10b-7: Cross-tab polish and dark-mode QA

**Purpose**

Validate that the unified system works across the full participant workspace.

**Files**

- any touched files from prior slices

**Tasks**

- [ ] Compare `Contribute`, `Explore`, `Fight`, and `Me` side-by-side in light mode.
- [ ] Compare the same set in dark mode.
- [ ] Check mobile bottom-tab active states against the shell heading colors.
- [ ] Check desktop nav rail active states against the same token contract.
- [ ] Check all tertiary text actions for accidental browser-default blue or low-contrast states.
- [ ] Tighten any spacing or section-title drift revealed by side-by-side QA.

**Rules**

- This slice is for convergence and cleanup, not for re-architecting the feature behavior again.
- Preserve the approved stronger `Fight` tone.

**Acceptance**

- the participant workspace reads as one coherent product across all four tabs;
- light and dark mode relationships are consistent;
- tab identity color, section grammar, and action hierarchy are stable across the workspace.

---

## Suggested order

1. `10b-1` semantic tab colors
2. `10b-2` shared section primitives
3. `10b-3` `Contribute`
4. `10b-4` `Explore`
5. `10b-5` `Fight`
6. `10b-6` `Me`
7. `10b-7` cross-tab QA and cleanup

---

## Verification checklist

- active participant tab colors are consistent between shell heading and navigation;
- light mode no longer has washed-out active tab states;
- dark mode uses the same semantic token model cleanly;
- participant tabs use one section grammar;
- hidden/locked/empty/waiting states are framed consistently;
- generic browser-blue internal action links are removed from participant tabs;
- `Fight` remains the most modeful tab without looking disconnected from the shell;
- `Me` reads as report/archive first, settings second;
- `pnpm exec tsc -b` still passes after implementation;
- participant workspace behavior remains unchanged functionally unless explicitly intended by the spec.

---

## Commit strategy

This phase should be implemented as one commit per slice:

- `10b-1` semantic tab color contract
- `10b-2` participant section primitives
- `10b-3` contribute migration
- `10b-4` explore migration
- `10b-5` fight migration
- `10b-6` me migration
- `10b-7` cross-tab polish and QA cleanup

Do not collapse all seven slices into one visual mega-commit. The whole point is to keep the design-system shift reviewable.

