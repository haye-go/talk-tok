# Participant Tab UX Audit

Date: 2026-05-12
Scope: Participant-facing mobile-first app review based on current implementation in `src/pages/participant-workspace-page.tsx` and related tab components.

## Purpose

This document captures the current UX issues in the participant app, with emphasis on:

- mobile attention flow
- duplicate or low-value information
- unclear next actions
- tab intent drift
- desktop implications

The goal is not to redesign visuals in isolation. The goal is to tighten what each tab is for, what information belongs there, and what should be deprioritized or moved.

## Current Product Mental Model

The current implementation is trying to support several valid capabilities:

- contribution submission
- AI feedback on quality and originality
- categorization and recategorization
- peer discovery
- replies and reactions
- Fight Me mode
- personal reporting
- question switching

The issue is not feature count alone. The issue is that the participant-facing information architecture does not separate these capabilities cleanly enough.

Participants likely have a simpler mental model:

1. answer the question
2. see what happened to my answer
3. see what others said
4. respond or challenge
5. review my progress

The current app often leads with system state and optional mechanics instead of the participant's immediate task.

## Global UX Findings

### 1. Prompt context is repeated too often

The active question currently appears across multiple surfaces:

- top shell context rail on desktop
- released question selector/header
- prompt card inside `Contribute`
- indirect references in other tabs

This creates vertical waste on mobile and repeated cognitive setup. The participant needs orientation everywhere, but not a full prompt card everywhere.

### 2. Acts and tabs are not aligned strongly enough

The app has a flow concept:

- Submit
- Discover
- Challenge
- Synthesize

But the participant actually experiences:

- Contribute
- Explore
- Fight
- Me

That is acceptable, but the tab content needs to reinforce one clear job per tab. Right now some tabs contain too much overlap, especially `Contribute` and `Me`.

### 3. Mobile loses guidance that desktop still has

The desktop-only status banner means mobile participants lose important guidance such as:

- contributions paused
- peer responses not released
- fight locked until first contribution
- personal reports not released

This is exactly the device where short, strong guidance is most needed.

### 4. Too much secondary metadata appears too early

Across the app, the participant sees a lot of non-primary information:

- feedback tone
- originality labels
- telemetry labels
- repeated category indicators
- status states for unreleased or unavailable content

Some of this belongs in deeper layers, not the first screenful.

### 5. Terminology is overloaded

Several flows use overlapping language:

- add another point
- add follow-up
- reply
- follow-up prompt

These are different actions and should be separated more clearly.

## Tab-by-Tab Findings

## Contribute

### Current behavior

The tab currently includes:

- a full prompt card
- errors/warnings
- a generic `Your contributions` card
- top-level contributions
- action buttons on each contribution
- expandable analysis for each contribution
- AI feedback
- category placement
- recategorization requests
- follow-ups on that point
- inline follow-up composer

### Problems

#### The first screenful does not answer the participant's top questions

After a participant submits, they need to know:

- did my submission go through
- what happened to it
- what should I do next

Instead, the current layout first shows:

- full question again
- a generic card about contributions
- another contribution card with multiple actions

The action hierarchy is weak.

#### The tab duplicates history and reflection concerns

`Contribute` should be about active participation, not full archival review. Once AI feedback, category placement, recategorization, and follow-up history all expand inline, the tab starts behaving like a hybrid of `Contribute` and `Me`.

#### Action density is too high

Per contribution, the user can see:

- hide/view analysis
- add follow-up
- view in explore
- go to fight

That is too many lateral decisions for mobile. It does not help the participant focus on the next meaningful step.

#### Labels are redundant

`Original post` and `Latest contribution` appearing together create duplication instead of clarity.

#### Telemetry disclosure is too prominent in the composer

The note that typing telemetry is stored locally and sent on submit is implementation detail. It may be appropriate in settings, policy, or an info tooltip, but it should not compete with the submission task.

### UX direction

`Contribute` should become the participant's primary workbench:

- submit first response
- see submission state
- extend or refine own contribution
- respond to instructor-directed prompts if present

It should not function as a full archive or profile.

## Explore

### Current behavior

The tab currently includes:

- presence bar
- category chips with horizontal overflow
- capability notices
- synthesis state or synthesis cards
- peer response visibility state
- peer response stream
- reply actions
- fight actions
- reactions
- telemetry/originality labels on responses

### Problems

#### The tab combines three different experiences

`Explore` currently acts as:

- category board
- peer response stream
- synthesis dashboard

That is too much for one mobile surface without stronger prioritization.

#### Synthesis competes with raw discovery

If synthesis appears high in the tab, participants may consume the AI roll-up before actually reading peers. That undermines the discovery value of the room.

#### Horizontal chip scrolling wastes space

For mobile, too many side-scroll chips create friction:

- difficult to compare options
- unclear what is selected
- encourages clipping and hidden states

#### Per-response metadata is too heavy

Each stream item can show:

- nickname
- category
- telemetry label
- originality label
- reply
- fight
- reactions

This is a lot of visual and interactive overhead for a reading surface.

#### Peer-visible telemetry is questionable

Showing `Likely pasted` or `Composed gradually` to peers changes the social tone of the room. That may be useful for instructor analytics, but for participant peer view it risks turning discussion into performance policing.

### UX direction

`Explore` should become the room view:

- what people are saying
- what categories are emerging
- what is worth replying to or challenging

Synthesis should be available, but not dominate the stream.

## Fight

### Current behavior

The tab includes:

- locked state if disabled
- empty state if participant has not submitted
- Fight home
- incoming challenge cards
- current fight shortcut
- start vs AI
- challenge another participant
- target picker
- past fights
- thread view with turns, deadlines, and debrief

### Problems

#### The mode logic is good, but rules are not surfaced early enough

The tab has meaningful constraints:

- you need your own contribution first
- a challenge needs acceptance
- there are turn deadlines
- there is a turn cap

These rules should be visible before commitment, not only inferred from disabled buttons or thread state.

#### Pending-draft behavior is not self-explanatory

Allowing an attacker to draft while waiting for acceptance is sensible, but the participant should understand why the composer is already present.

#### History competes with current obligation

If there is an active or incoming fight, that should dominate attention. Past fights should be secondary on mobile.

### UX direction

`Fight` should remain a distinct tab with a narrow job:

- accept/decline
- start a challenge
- resume current fight
- review completed fights

This is the cleanest tab conceptually and needs the fewest structural changes.

## Me

### Current behavior

The tab includes:

- personal report release state
- private comparison notes if released
- loading/empty contribution state
- contribution history
- feedback cards again
- recategorization request state
- follow-ups list
- position shifts
- fight history
- nickname settings

### Problems

#### It duplicates `Contribute`

The tab repeats a large amount of content already encountered elsewhere:

- contributions
- feedback
- category assignments
- follow-up history

This weakens the role of both tabs.

#### Release semantics leak into participant UX

The participant should not have to think about:

- private report exists
- report released into question view
- full report separate from released surface

Those are valid backend states, but the frontend copy should translate them into something simpler.

#### Settings are mixed into reflection

Nickname editing is not part of the same mental task as reviewing participation or AI analysis.

### UX direction

`Me` should become:

- personal report status and access
- my contribution history
- my fight history
- my shifts
- profile/settings

It should not act as a second live workbench.

## Recommended Information Architecture

Each tab should own one dominant participant question.

### Contribute

Question: `What should I do now with my own response?`

### Explore

Question: `What is happening in the room?`

### Fight

Question: `Do I want to challenge or defend?`

### Me

Question: `What have I done, and how am I doing?`

If a section does not help answer that tab's core question, it should be moved, collapsed, or removed.

## Active Question Recommendation

The active question should be visible on every tab, but in compact form.

### Mobile

Use a sticky compact question bar:

- label: `Current question`
- one-line preview
- tap to expand full prompt
- optional compact question switcher if multiple released questions exist

Do not show a full large prompt card by default on every tab.

### Desktop

The current context rail concept is still useful on desktop because space exists for persistent context. However:

- the prompt card should be compact
- question switching should remain in the rail
- duplicate prompt cards inside each tab body should usually be removed

## Mobile vs Desktop Implications

The underlying logic should remain the same across breakpoints. The differences should mainly be in how much context is persistently visible.

### Mobile rules

- one dominant action per first screenful
- less repeated metadata
- collapse secondary details
- avoid horizontal scrolling where possible
- keep question context compact

### Desktop rules

- persistent context is acceptable
- secondary panels can stay visible if they support scanning
- history/detail panes can coexist with primary content
- metadata may be shown more often if it does not interrupt task flow

### What should stay shared

- tab purpose
- data ownership by tab
- copy hierarchy
- action priority

### What can differ by breakpoint

- prompt presentation
- question switcher layout
- whether synthesis appears inline or in a side panel
- whether history and detail panels are expanded by default

## Priority Fixes

### High priority

- simplify `Contribute` first screenful
- remove duplicated contribution/report content between `Contribute` and `Me`
- restructure `Explore` to prioritize peer responses over synthesis
- replace horizontal chip overload with a more compact filter pattern
- show participant guidance on mobile, not desktop only

### Medium priority

- demote peer-visible telemetry labels
- clarify terminology for point, follow-up, reply, and recategorization
- make Fight rules explicit before entering a thread

### Lower priority

- refine desktop persistent context behavior
- tune secondary metadata density

## Summary

The current participant app is feature-rich but not attention-tight enough. The main UX problem is not visual polish. It is that each tab needs a stronger job boundary, cleaner priority of actions, and less repeated system context.

The mobile version should be treated as the primary reference model:

- compact context
- one main action
- one main content stream
- secondary details collapsed or delayed

Desktop can expose more persistent context, but it should not change the core behavioral logic.
