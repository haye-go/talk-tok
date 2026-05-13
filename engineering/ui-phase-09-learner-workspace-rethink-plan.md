# UI Phase 09: Learner Workspace Rethink

## Purpose

Replace the current learner navigation model with a stable, capability-driven workspace.

The current participant UI follows the original acts-based plan:

- top act progress: `Submit`, `Discover`, `Challenge`, `Synthesize`
- bottom tabs: `Main`, `Stream`, `Fight Me`, `My Zone`

That model creates two competing mental maps:

1. the learner must understand the current class stage
2. the learner must understand where product capabilities live

In practice, `Main` changes identity by act, tabs unlock and disappear based on act state, and learners do not form a stable understanding of what the product can do.

This plan replaces learner-facing act navigation with a persistent four-tab workspace:

- `Contribute`
- `Explore`
- `Fight`
- `You`

Acts remain useful as backend session state and instructor orchestration, but they should no longer act as the learner's primary navigation model.

## Product Direction

The learner experience should support dynamic participation rather than a rigid sequence.

The core interaction model is:

- submit one or more top-level points
- receive private analysis per point
- compare privately against a generated default/reference response
- explore peers, categories, and released summaries when allowed
- add follow-ups to one's own points
- respond to follow-up prompts or category-level prompts
- optionally enter 1v1 challenge if enabled by the instructor
- optionally receive a broader personal report if manually triggered
- optionally view category/class synthesis when manually released

This must also work for less linear settings such as conference Q&A, where multiple initial points are normal and learners should be able to explore without waiting for a strict phase march.

## Core UX Principle

For learners:

- tabs are places
- capabilities inside those places change over time
- session state is explained, not used as a second navigation system

For instructors:

- phases/acts still exist
- release gates still exist
- feature availability can still be controlled

The model becomes:

- instructor controls release and availability
- learner retains stable navigation and autonomy

## New Learner Navigation

### 1. `Contribute`

This is the learner's active contribution workspace.

It is not only for the first submission.

It should hold:

- session prompt / active prompt
- new top-level contribution composer
- active instructor follow-up prompts
- category-targeted prompts when applicable
- the learner's own contribution list
- per-contribution actions:
  - add follow-up
  - view private analysis
  - view placement
  - request recategorisation
  - optionally launch Fight from a contribution
- open tasks / opportunities:
  - respond to current follow-up
  - add another point
  - respond to category prompt
  - debate is now available

Important:

- multiple top-level contributions must be first-class
- the current `firstInitialResponse` assumption should be removed from the learner IA

### 2. `Explore`

This is the learner's class-facing discovery workspace.

It should hold:

- released category board
- category summaries
- released raw peer responses
- category filters
- published and final synthesis artifacts
- comparison / exploration affordances
- contextual CTAs such as:
  - respond to this category
  - add your take
  - challenge this

Important:

- `Explore` can contain response entry points
- full composition should still hand off to `Contribute`
- do not create two equally primary writing surfaces

When content is unavailable, `Explore` should still explain why:

- responses are still private
- categories have not been published yet
- synthesis has not been released yet

### 3. `Fight`

This is the challenge and structured disagreement workspace.

It should hold:

- Fight Me home
- current fight
- incoming challenges
- completed fights
- AI fight entry
- 1v1 challenge entry

Availability should be feature-gated, not act-gated.

If Fight is disabled, the tab should remain visible and explain:

- this session has debate turned off
- debate opens later if the instructor enables it

### 4. `You`

This is the learner's private personal workspace.

It should hold:

- private AI analysis per submission
- comparison against the generated default/reference response
- category placement per submission
- recategorisation request status
- contribution history
- fight history
- personal report when generated
- nickname / personal session settings

`You` replaces the role of `My Zone`, but with clearer, more neutral product language.

## Session State Presentation

Remove the learner act progress bar as navigation.

Replace it with a compact session-status banner that explains:

- what is open now
- what the learner can do now
- what exists but is not yet available

Examples:

- `Now open: Submit your points.`
- `Available now: private analysis and follow-ups.`
- `Not yet released: peer responses and category summaries.`

Later:

- `Now open: Explore the class discussion.`
- `Available now: category summaries and released responses.`
- `Optional: Fight is enabled for this session.`

This keeps learners oriented without forcing them through a second navigation system.

## Capability-Driven Model

The learner shell should be driven by capabilities rather than learner-facing acts.

Representative capability flags:

- `canSubmitTopLevel`
- `canSubmitFollowUps`
- `canSeePrivateAnalysis`
- `canSeeReferenceComparison`
- `canSeePeerResponses`
- `canSeeCategoryBoard`
- `canRespondToCategory`
- `canUseFight`
- `canSeeSynthesis`
- `canRequestPersonalReport`
- `canSeePersonalReport`

These can be derived from existing session state, visibility mode, release state, and instructor toggles.

The UI rule is:

- every tab always exists
- each tab either shows live content or an explicit unavailable-state explanation

## Backend / Product Implications

This plan does not require removing backend phases.

It does require clarifying that phases are:

- instructor controls
- release gates
- workflow state

and not:

- primary learner navigation

Additional product/backend implications:

### Reference Comparison

Private analysis should not only be generic feedback.

The backend should support a generated default/reference response for the session prompt, so learner submissions can be compared against:

- a session-level default/generated response
- cohort patterns

This should become a first-class analysis artifact rather than an implied or hand-waved comparison.

### Multiple Top-Level Contributions

The learner UI should stop centering on a single canonical submission.

The backend already supports multiple top-level submissions; the participant experience should reflect that directly.

### Manual Release / Manual Generation

These features should remain manually controllable by the instructor:

- release of peer responses
- release of category views
- release of synthesis
- enabling Fight / 1v1 challenge
- generation of personal reports
- generation of summary artifacts

This matches the product's dynamic orchestration model better than a hard learner phase march.

## Current Code Mismatch

The current learner UI is still act-driven.

Relevant files:

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/act-progress-bar.tsx`
- `src/components/layout/bottom-tab-bar.tsx`
- `src/pages/participant-session-page.tsx`
- `src/lib/act-state.ts`
- `src/lib/constants.ts`

Current problems:

- `Main` changes identity based on act
- tabs unlock based on act
- `firstInitialResponse` is treated as the learner's main contribution
- private analysis lives in act-specific surfaces instead of a stable private workspace
- Fight is bound too tightly to stage progression

## Implementation Direction

### Step 1: Rename and stabilize learner tabs

Replace:

- `Main`
- `Stream`
- `Fight Me`
- `My Zone`

with:

- `Contribute`
- `Explore`
- `Fight`
- `You`

### Step 2: Remove learner act selection

- remove top act switching from the participant shell
- remove act-selectable learner progression UI
- keep session status banner instead

### Step 3: Re-map current surfaces into the new tabs

Map current components roughly as follows:

- `ResponseComposer`, contribution list, follow-up prompts -> `Contribute`
- `StreamTab`, category board, released synthesis -> `Explore`
- `FightHome`, `FightThread` -> `Fight`
- `DiscoverAct` private analysis portions, `MyZoneTab`, report summary -> `You`

### Step 4: Split public vs private concerns cleanly

Move:

- private feedback
- private placement
- recategorisation status
- contribution history

out of shared discovery surfaces and into `You`.

### Step 5: Replace act gating with capability messaging

Tabs should not disappear or change identity based on learner act.

Instead:

- show the tab
- explain what is unavailable
- show the current release state
- offer available next actions

### Step 6: Expand `Contribute` to support multiple top-level points

The first tab must become a real contribution workspace, not a one-shot submit screen.

### Step 7: Add first-class reference comparison

Introduce a session-level generated default/reference response artifact and show comparison results in `You`.

## Acceptance Criteria

This rethink is successful when:

- learners no longer need to understand two navigation systems
- the first tab remains useful after the first submission
- learners can always see what parts of the product exist
- unavailable areas explain why they are unavailable
- multiple top-level contributions feel normal
- private analysis has a stable home
- public exploration has a stable home
- Fight availability is clearly feature-based
- the UI works for both classroom discussion and conference/Q&A patterns

## Non-Goals

This plan does not yet specify:

- final visual design
- exact copywriting for every empty/unavailable state
- full backend schema changes for reference-comparison artifacts
- instructor-side session-control redesign

Those should follow after the learner IA direction is accepted.
