# UI Phase 09b: Learner Tab Contracts

## Purpose

Define the learner-facing screen contract for the new stable workspace:

- `Contribute`
- `Explore`
- `Fight`
- `You`

This document translates the IA direction into concrete tab responsibilities, content blocks, capability rules, and empty/unavailable states before implementation begins.

## Global Shell Contract

The learner shell should contain:

1. top utility bar
2. session-status banner
3. active tab content
4. persistent bottom tab bar

The shell should not contain:

- learner act progress navigation
- act-based tab unlocking
- a `Main` surface that changes identity by phase

## Top Utility Bar

Keep this minimal and stable.

Should support:

- back / session identity
- demo identity switching when applicable
- lightweight participant identity context

Should not attempt to teach the session flow.

## Session-Status Banner

This replaces learner-facing act navigation.

### Responsibilities

- tell the learner what is open now
- explain what they can do now
- explain what exists but is not yet released
- signal important newly available features

### Required data

- session title or prompt label
- current instructor-controlled phase/state
- capability summary
- visibility state summary

### Example banner structure

- primary line: `Now open: Submit points`
- secondary line: `Available now: private analysis and follow-ups`
- secondary line when relevant: `Not yet released: peer responses and category summaries`

### Example states

#### Early discussion

- `Now open: Add your points`
- `Available now: private analysis`
- `Not yet released: peer responses`

#### Mid discussion

- `Now open: Explore the class discussion`
- `Available now: categories and released responses`
- `Optional: Fight is enabled`

#### Synthesis stage

- `Now open: Review the class synthesis`
- `Available now: published summaries`
- `Your personal report will appear when the instructor generates it`

## Capability Model

The shell should derive UI state from capabilities, not learner-facing acts.

Representative capabilities:

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

Implementation rule:

- tabs always render
- each tab chooses among:
  - live content
  - partial content plus locked sections
  - explicit unavailable-state explanation

## Tab 1: `Contribute`

## Definition

The learner's active contribution workspace.

This tab is where a participant adds, continues, and manages their contributions over time.

It must remain useful after the first submission.

## Chosen structural model

`Contribute` uses an adaptive split-header model.

The top of the tab should not stay fixed across the whole session. Its structure changes based on learner state:

- before the learner has contributed: prompt-first, composer-first
- after the learner has contributed: contribution/workspace-first
- when an active follow-up or targeted prompt exists: task-first

This is intentional.

It avoids two weak outcomes:

- a first tab that becomes dead weight after the first submission
- a first-run screen that feels like contribution management before the learner has said anything

The tab should begin as an entry point and mature into a workspace.

## Primary responsibilities

- show what prompt is active now
- let the learner submit new points
- let the learner respond to follow-up prompts
- let the learner add follow-ups to earlier points
- show contribution status and next actions

## Content blocks

### A. Active prompt card

Shows:

- base discussion prompt
- active instructor follow-up prompt if present
- category-targeted prompt if applicable
- round or context label if needed

Priority rule:

- if a targeted follow-up is active, it should be visually foregrounded
- the original session prompt should remain accessible

### B. Contribution composer

Must support:

- new top-level point
- follow-up/addendum to an existing point
- response to instructor follow-up prompt
- response to category-targeted prompt

Recommended mode selector:

- `New point`
- `Follow-up`
- `Prompt response`

The exact options can be inferred from current context if only one mode is available.

### C. My contribution list

Shows all of the learner's contribution units:

- top-level submissions
- follow-up replies
- prompt responses

Per item show:

- short body preview
- created time
- status chips:
  - feedback queued
  - analyzed
  - categorized
  - awaiting release
  - included in summary
- current category placement if available

### D. Per-contribution actions

Per contribution, allow:

- `Add follow-up`
- `View analysis`
- `View in Explore`
- `Request recategorisation`
- `Start Fight` when enabled

Navigation rule:

- `View analysis` should send the learner into `You`
- `View in Explore` should send the learner into `Explore`

### E. Open tasks / opportunities

A lightweight section near the top or between prompt and list:

- `You have not responded to the instructor follow-up yet`
- `You can add another point`
- `Your category has a new prompt`
- `Fight is now available for this session`

## State-based layout contract

### State A: no contributions yet

Use a prompt-first, composer-first layout.

Block order:

1. active prompt card
2. primary contribution composer
3. short explanation of what will appear after posting

Behavior:

- optimize for first submission
- minimize management UI
- keep the interaction lightweight for classroom and conference/Q&A settings

### State B: learner has contributed, no active follow-up

Use a contribution/workspace-first layout.

Block order:

1. contribution summary / open opportunities
2. compact `Add another point` / `Continue a point` action row
3. contribution list
4. composer in compact or expandable form

Behavior:

- the tab should now feel like a live workspace, not a one-shot submit form
- multiple top-level points should feel normal
- follow-up and continuation should be foregrounded over “start from scratch every time”

### State C: active follow-up or targeted prompt exists

Use a task-first layout.

Block order:

1. active follow-up / targeted prompt banner
2. composer for that prompt
3. contribution summary / list below

Behavior:

- urgent instructor prompts take precedence without reintroducing learner act navigation
- the learner should still be able to access prior contributions in the same tab

## Empty and unavailable states

### No submissions yet

Show:

- prompt
- composer
- short explanation that points appear here after submission

### Submissions closed

Show prior contributions, but replace composer with explanation:

- `New points are closed for now`
- `You can still explore released discussion`

### Follow-ups unavailable

Do not hide the concept.

Show:

- `Follow-ups open when the instructor starts the next round`

## Tab 2: `Explore`

## Definition

The learner's class-facing discovery workspace.

This tab is for understanding how the room is thinking.

## Primary responsibilities

- show released categories
- show released peer responses
- show released synthesis
- let the learner filter and inspect the discussion
- let the learner branch back into contributing or fighting

## Content blocks

### A. Release-state header

Shows what level of class visibility is currently available:

- private only
- category summary visible
- raw responses visible
- synthesis visible

This should be explicit because Explore is the tab most affected by instructor release controls.

### B. Category board

Shows:

- category names
- counts
- category summaries when released
- selected category state

Optional later:

- strongest examples
- highlighted quotes
- “distinctive idea” markers

### C. Peer response stream

Shows:

- peer responses when released
- filters by category
- reaction bar
- contextual metadata such as composition label if that product decision remains

### D. Synthesis section

Shows:

- published category summaries
- published class synthesis
- final synthesis when available

This should not require a separate learner act to become visible.

### E. Contextual response CTAs

From Explore, the learner may branch into:

- `Add your take`
- `Respond to this category`
- `Challenge this`

These should not create a full second composition surface.

They should route or hand off into:

- `Contribute` for writing
- `Fight` for challenge

## Empty and unavailable states

### Peer responses private

Show:

- `Peer responses are still private`
- `You will see them here when the instructor releases them`

### Categories not yet published

Show:

- `Categories are still being prepared`
- `Your private analysis remains available in You`

### Synthesis not yet published

Show:

- `Class synthesis has not been released yet`

## Tab 3: `Fight`

## Definition

The learner's structured challenge workspace.

This tab contains the debate feature set and its history.

## Primary responsibilities

- start a fight
- accept or decline incoming challenge
- continue active fight
- review completed fights and debriefs

## Content blocks

### A. Feature-state header

Shows:

- whether Fight is enabled
- whether 1v1 is enabled
- whether AI fight is enabled
- whether the learner already has an active fight

### B. Fight home

Shows:

- start `vs AI`
- challenge another response
- challenge an opposing category later if supported
- pending incoming challenges
- active/current fight CTA

### C. Fight thread

When active:

- turn history
- countdown / deadline state
- draft composer
- debrief when completed

### D. Past fights

Shows:

- mode
- status
- debrief availability
- view thread action

## Empty and unavailable states

### Fight disabled

Show:

- `Fight is turned off for this session`
- if relevant: `The instructor can enable it later`

### No eligible contribution yet

Show:

- `Submit a point in Contribute to start a fight`

## Tab 4: `You`

## Definition

The learner's private personal workspace.

This tab is the stable home for self-facing analysis and history.

## Primary responsibilities

- show private analysis per contribution
- show comparison against the generated default/reference response
- show category placement and recategorisation status
- show personal report when available
- show identity/session controls

## Content blocks

### A. Personal summary header

Compact overview:

- contribution count
- report status
- latest analysis status
- last visible placement or summary signal

### B. Private analysis by contribution

For each contribution:

- body preview
- AI feedback
- reasoning / originality / specificity bands if retained
- reference/default-response comparison
- cohort-relative comparison when available

This is where the missing “generated default response” comparison belongs.

### C. Placement and recategorisation

Per contribution:

- current category
- status:
  - uncategorized
  - categorized
  - recategorisation pending
  - approved
  - rejected

### D. Personal report

If generated:

- summary preview
- contribution bands
- open full review route

If not generated:

- explain whether report is:
  - not yet requested
  - queued
  - processing
  - unavailable until instructor triggers it

### E. Contribution history

Shows:

- top-level submissions
- follow-ups
- prompt responses
- fights participated in
- position shifts if retained

### F. Personal controls

Minimal controls:

- nickname update
- maybe notification/status preferences later

## Empty and unavailable states

### No analysis yet

Show:

- `Private analysis appears here after you submit a point`

### Report not generated

Show:

- `Your personal report is not ready yet`
- `The instructor can generate it later`

## Cross-Tab Navigation Rules

These flows should be intentional and consistent.

### From `Contribute`

- `View analysis` -> `You`
- `View in Explore` -> `Explore`
- `Start Fight` -> `Fight`

### From `Explore`

- `Add your take` -> `Contribute`
- `Respond to this category` -> `Contribute`
- `Challenge this` -> `Fight`

### From `You`

- `Continue this idea` -> `Contribute`
- `See how this appears in class view` -> `Explore`
- `Fight from this contribution` -> `Fight`

## Current Component Mapping

This is the target migration map for the current UI.

### Move into `Contribute`

- `ResponseComposer`
- contribution submission flow from `participant-session-page.tsx`
- follow-up composer
- contribution list from parts of `MyZoneTab`
- active follow-up prompts from `ChallengeAct`

### Move into `Explore`

- `StreamTab`
- category board / category summary portions from `DiscoverAct`
- released synthesis from `SynthesizeAct`

### Move into `Fight`

- `FightHome`
- `FightThread`

### Move into `You`

- private feedback from `DiscoverAct`
- placement and recategorisation state from `DiscoverAct`
- contribution history from `MyZoneTab`
- personal report summary from `MyZoneTab` / `SynthesizeAct`

## Data Contract Follow-Up

Before implementation, define or confirm a participant workspace contract that supports:

- contribution list independent of `firstInitialResponse`
- per-contribution analysis
- per-contribution placement
- reference/default-response comparison artifact
- capability summary for the banner and tabs
- explicit release-state summary for Explore
- manual report availability state
- Fight feature-state summary

## Acceptance Criteria

This contract is ready for implementation when:

- every learner feature has one stable home
- every tab can explain unavailable content without disappearing
- the first tab remains useful after the first submission
- the `Contribute` tab clearly shifts from entry-point mode to workspace mode as learner activity grows
- multiple top-level points are treated as normal
- private analysis and public exploration are clearly separated
- Fight is feature-gated rather than learner-act-gated
- the learner can move between tabs without needing to understand session acts
