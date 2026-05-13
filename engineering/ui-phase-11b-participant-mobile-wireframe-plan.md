# Participant Mobile Wireframe Plan

Date: 2026-05-12
Scope: Mobile-first content and section order for the participant-facing app, with desktop adaptation notes.

## Purpose

This document translates the participant UX audit into a concrete wireframe-level plan:

- what appears in each tab
- what is default-visible
- what is collapsed
- what should move tabs
- how desktop should adapt without changing the core logic

This is a content architecture spec, not a visual styling spec.

## Core Design Rules

### 1. One tab, one dominant job

- `Contribute`: post and refine my own ideas
- `Explore`: inspect the room and respond to others
- `Fight`: challenge or defend
- `Me`: review my history and private analysis

### 2. The active question is always visible, but compact

Every tab should show the current question in a compact sticky bar.

Mobile question bar:

- label: `Current question`
- one-line prompt preview
- chevron or tap target to expand full prompt
- optional released-question switcher if more than one question is open

Do not show the full large prompt card by default in every tab body.

### 3. First screenful must answer one participant question

On mobile, the first visible screen after the question bar should make the next action obvious.

### 4. Secondary system detail must be collapsed

Examples:

- telemetry explanation
- detailed feedback
- report release semantics
- deep categorization mechanics

These can exist, but not in the participant's first decision layer.

## Shared Mobile Shell

## Always visible

- top bar: app name, session title, join code, nickname/demo identity, theme
- sticky compact question bar
- bottom tab bar

## Optional contextual row under question bar

Use a small single-line helper that changes by tab:

- `Contribute`: `Submit once, then add more only if you have a distinct angle.`
- `Explore`: `Read the room before replying or challenging.`
- `Fight`: `Structured 4-turn mini debate.`
- `Me`: `Your history and private analysis.`

This replaces the current desktop-only status hint as the participant guidance layer.

## Tab 1: Contribute

## Goal

Help the participant understand:

- have I contributed yet
- what happened to my contribution
- what should I do next

## Mobile section order

### State A: no contribution yet

1. compact question bar
2. tab helper line
3. contribution composer card
4. optional small note about response tone

Recommended copy:

- title: `Share your perspective`
- helper: `Start with one strong point. You can add another angle later.`

Do not show:

- category mechanics
- report logic
- generic contributions card

### State B: participant has already contributed

1. compact question bar
2. submitted state card
3. primary action row
4. latest contribution card
5. older contributions section, collapsed by default

### Submitted state card contents

- status label: `You’ve submitted`
- timestamp
- category if available
- feedback state:
  - `AI feedback ready`
  - `Generating AI feedback`
  - `Feedback failed`
- optional single-line next step suggestion

### Primary action row

Show only one primary CTA and at most one secondary CTA.

Priority logic:

1. if no contribution exists: `Submit response`
2. if contribution exists and feedback is ready: `Add follow-up`
3. if contribution exists but feedback pending: `Add another point`
4. if category board is visible: secondary `See the room`
5. if Fight is enabled and participant is eligible: secondary `Challenge a view`

### Latest contribution card

Default visible:

- contribution body
- small metadata row:
  - time
  - category
  - feedback state
- primary button: `Add follow-up`
- secondary text action: `Open analysis`

Collapsed analysis panel:

- AI feedback card
- category placement
- request recategorization
- follow-ups attached to this contribution

### Older contributions

If the participant has multiple top-level points:

- collapsed section title: `Earlier points`
- expand only when tapped

## Remove from default mobile view

- full large prompt card
- generic `Your contributions` intro card
- duplicate labels like `Original post` + `Latest contribution`
- `View in Explore` on every contribution
- `Go to Fight` on every contribution
- telemetry disclosure sentence in the composer body

## Desktop adaptation

Desktop can keep:

- expanded analysis visible more often
- an adjacent context rail
- older contributions open by default if vertical space allows

But desktop should still preserve the same priority:

- submission status first
- latest contribution second
- deeper analysis third

## Tab 2: Explore

## Goal

Help the participant answer:

- what are people saying
- what themes are emerging
- what can I respond to

## Mobile section order

1. compact question bar
2. room summary strip
3. category filter control
4. peer response stream
5. synthesis entry, collapsed or lower in the tab

### Room summary strip

Small one-line or two-line summary:

- `23 responses`
- `6 themes`
- `Synthesis available` if applicable

This should not become a large dashboard block.

### Category filter

Recommended mobile behavior:

- show `All` plus top 4 or 5 categories
- use wrapped rows if short enough
- if too many categories, show `More filters`
- open full category list in a bottom sheet or compact modal

Avoid a long horizontally scrolling chip row as the default interaction.

### Peer response stream

Each response card should show:

- nickname
- response body
- category badge

Optional, but subtle:

- time

Default actions:

- `Reply`
- `Challenge` if enabled
- reaction/upvote control if retained

### Hide or demote in peer cards

- originality label
- telemetry label
- likely pasted / composed gradually labels

If such data is kept for participants at all, it should be hidden behind a detail affordance, not foregrounded in the stream.

### Synthesis

Do not lead the tab with synthesis.

Instead use:

- collapsed card: `View class synthesis`
- when expanded:
  - category summaries
  - key points
  - opposing views if released

If synthesis is not released:

- use a compact empty/locked state
- avoid stacking large state cards above the stream

## Remove from default mobile view

- synthesis before peer responses
- large stacked state cards
- duplicate labels around response cards
- heavy metadata lines
- long sideways category browsing

## Desktop adaptation

Desktop can show:

- category controls persistently
- synthesis in a side rail or lower panel
- more metadata if it supports scanning

But desktop should still prioritize the raw response stream before the AI roll-up.

## Tab 3: Fight

## Goal

Help the participant answer:

- do I have to respond to a challenge
- do I want to start a challenge
- what are the rules

## Mobile section order

### State priority

1. incoming challenge
2. active fight
3. start fight options
4. past fights

### Intro rules card

Always show a short explainer near the top unless the participant is already deep in a thread:

- `4-turn mini debate`
- `Accept within 20s`
- `Each turn has 60s`
- `You need a submitted response first`

### Incoming challenge block

If present, this should be the most visually prominent item:

- challenger/opponent label
- short response preview
- countdown
- `Accept`
- `Decline`

### Active fight block

If the participant already has an active fight:

- show `Resume current fight`
- show remaining turn/deadline info
- hide or demote start-new-fight options

### Start fight options

Two large clear buttons:

- `Fight AI`
- `Challenge a participant`

If participant is not yet eligible:

- show locked state with reason
- include direct CTA back to `Contribute`

### Target picker

For real participant challenge flow:

- nickname
- short preview of target response
- maybe category badge
- `Challenge`

No extra clutter.

### Past fights

- collapsed by default
- opens into prior fight list

## Fight thread view

Inside a fight thread, keep:

- header with mode and status
- turn count
- countdown when relevant
- original positions preview
- turn bubbles
- current draft composer
- debrief after completion

Add one micro-explainer for pending state:

- `You can draft now while waiting for acceptance.`

## Desktop adaptation

Desktop can keep:

- current thread with side status context
- visible history alongside the active thread

But mobile should always prioritize current obligation over history.

## Tab 4: Me

## Goal

Help the participant answer:

- what have I contributed
- what does my private analysis say
- what happened over time

## Mobile section order

1. compact question bar
2. personal report status card
3. activity summary row
4. contribution history
5. fight history
6. position shifts
7. settings

### Personal report status card

Use simple participant-facing language.

Possible states:

- `Your private report is ready`
- `Your report is generating`
- `Reports are not available for this question yet`
- `Report generation failed`

Avoid exposing backend release semantics such as:

- generated but not released here
- separate instructor-controlled visibility phrased in system language

### Activity summary row

Show compact counts:

- `2 contributions`
- `3 follow-ups`
- `1 fight`
- `1 shift`

This gives the tab a useful overview without forcing the participant into long cards immediately.

### Contribution history

This should be a history view, not a second workbench.

Each item should show:

- contribution snippet
- timestamp
- category
- feedback status

Tap to open deeper detail:

- full body
- feedback
- recategorization request
- attached follow-ups

Do not show all full feedback cards inline by default.

### Fight history

Simple list:

- mode
- status
- timestamp
- `View`

### Position shifts

Show only if present:

- reason
- influenced by, if any

### Settings

Keep this last:

- visible nickname
- save/update

## Desktop adaptation

Desktop can support:

- visible report summary and contribution history side by side
- expanded details by default for the latest report or most recent contribution

But it should still feel like:

- archive
- reflection
- settings

not a duplicate of `Contribute`.

## What Moves Between Tabs

### Keep in Contribute

- submission composer
- latest contribution
- add another point
- add follow-up to own point
- immediate AI feedback summary

### Move out of Contribute into Me

- deep contribution history
- older points expanded by default
- archival review

### Keep in Explore

- peer response stream
- category lens
- reply/challenge actions

### Demote in Explore

- synthesis as collapsed entry
- telemetry/originality meta

### Keep in Fight

- challenge flow
- active fight
- debrief

### Keep in Me

- personal report
- history
- fight history
- settings

## State and Copy Recommendations

### Prefer direct participant-facing copy

Good:

- `You’ve submitted`
- `Feedback is ready`
- `Add another point`
- `Read the room`
- `Resume current fight`
- `Your private report is ready`

Avoid:

- system-heavy release semantics
- repeated generic labels like `Your contributions`
- labels that restate the obvious without driving action

## Desktop Summary

Desktop should not become a different product. It should be the same behavioral model with more persistent context.

### Desktop can show permanently

- compact prompt/context rail
- question switcher
- extra metadata that helps scanning
- expanded synthesis panel
- open history lists

### Desktop should still preserve

- one clear tab purpose
- one primary action per participant state
- reduced duplication between `Contribute` and `Me`

## Implementation Notes for UI Work

These wireframe changes mainly require:

- reordering sections
- hiding/removing duplicate labels
- collapsing secondary content
- moving some content from default-visible to detail-visible
- changing copy

They do not require a major backend model change by default.

Potential follow-up frontend tasks:

- add sticky compact question bar
- move mobile guidance out of desktop-only status banner
- introduce bottom-sheet or wrapped category filter pattern
- collapse synthesis by default in Explore
- reduce default expansion in My Zone / Me

## Summary

The mobile-first participant experience should feel tighter and more purposeful:

- `Contribute` is for doing
- `Explore` is for reading the room
- `Fight` is for structured challenge
- `Me` is for review and reflection

Desktop can expose more context, but should not reintroduce the same duplication and attention drift that mobile is trying to remove.
