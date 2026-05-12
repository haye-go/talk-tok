# UI Phase 10: Participant Surface Unification Spec

## Purpose

The participant shell now has a stable top bar, question context, and tab navigation, but the content inside the tabs still reads as four different products.

This spec defines a single visual and structural system for participant-facing tab content so that:

- `Contribute`
- `Explore`
- `Fight`
- `Me`

feel like coordinated views inside one learner workspace rather than unrelated feature panels.

This spec also resolves the current tab-color drift between:

- page headings
- active bottom-tab labels/icons
- active desktop nav states
- tab-local actions and accents

## Problem Statement

The current participant UI has two separate issues that compound each other.

### 1. Tab identity colors are split across two token systems

Today:

- page headings use tab-heading tokens
- active bottom tabs use lighter signature colors
- some actions still use generic link blue
- some local surfaces introduce their own custom accent choices

Result:

- active tab states feel washed out in light mode
- dark mode cannot be tuned coherently because the same tab identity is not coming from one semantic source
- the shell and the content do not reinforce the same visual hierarchy

### 2. Tab interiors use inconsistent content grammars

The participant tabs currently mix:

- shared `Card` sections
- bespoke bordered panels
- raw notices
- custom CTA containers
- form surfaces with their own layout logic
- link-like actions that do not match the rest of the workspace

Result:

- `Contribute` feels like an editor flow
- `Explore` feels like a utility/feed screen
- `Fight` feels intentionally more mode-driven than the other tabs
- `Me` feels like a settings/archive page

The shell is now cleaner than the content it contains.

## Scope

This spec applies to participant-facing in-session workspace surfaces only.

In scope:

- participant shell tab content
- participant tab color semantics
- section hierarchy and shared spacing
- mobile and desktop participant navigation accent behavior
- empty, locked, hidden, waiting, and released states inside participant tabs
- participant action styling for links, buttons, and secondary controls

Out of scope:

- instructor dashboard styling
- home/join/demo persona entry pages
- backend behavior changes
- new product features
- projector surfaces

## Product Intent

The participant experience should feel like a guided but non-brittle learning workspace.

The UI should communicate:

- what question is currently in focus
- what the learner can do right now
- what exists but is not yet released
- what is private versus shared
- where each kind of work belongs

The UI should not communicate:

- four unrelated mini-products under one tab bar
- action availability through accidental color differences
- hidden capability through missing containers or layout jumps

## Core Design Decision

Participant tabs will share one section system.

Each tab may contain different content, but all major participant surfaces must be composed from the same section primitives and the same tab-identity color model.

This is a structural standardization, not a one-off visual cleanup.

## Visual Principles

### 1. One shell, one section grammar

The shell owns:

- page heading
- question context
- tab identity

Tab content must not reintroduce competing page-level chrome unless the content is a true detail view.

### 2. Color signals identity, not arbitrary decoration

Each tab gets one semantic identity color family.

That family can be used for:

- page heading
- active nav state
- optional section accent
- optional chip/badge accents for tab-owned actions

It should not cause every section background to become tinted or themed beyond readability.

`Fight` is the one explicit exception in tone, not in system.

It may use a stronger hero/action treatment than the other tabs, but that treatment must still be built from the same semantic tab token family and the same action vocabulary.

### 2a. `Fight` remains intentionally modeful

The unification goal is not to make `Fight` look as quiet as `Explore` or `Me`.

`Fight` is allowed to be the most visually assertive participant tab when it is presenting:

- the main challenge launcher
- AI-versus-human choice
- a debate-mode entry state

That stronger treatment is correct when:

- the hero/action panel is still driven by the semantic `Fight` tab token
- the main launcher follows the shared button/action vocabulary
- the history and detail panels beneath it return to the calmer shared section shell
- internal actions, such as `View`, do not fall back to generic browser-link blue

This clarification supersedes any earlier wording that implied `Fight` should be flattened into the same tone as the quieter tabs.

### 3. Major content should always live inside deliberate sections

Avoid floating text blocks or raw bordered divs where a structured section should exist.

If a state matters enough to show, it matters enough to frame.

### 4. Private/shared/locked states must be explicit

The interface should explain why a section is empty or inactive:

- not released
- no contributions yet
- contribution required first
- waiting on AI
- visible but closed

Do not communicate those states only through missing controls.

### 5. Actions should come from a small, consistent vocabulary

Participant tabs should use:

- primary actions
- secondary actions
- tertiary text actions

Avoid ad hoc raw browser-link styling inside content sections unless the target is truly external.

## Semantic Tab Color Contract

## Current issue

The current UI uses one token set for headings and another for active tab controls.

That split should be removed.

## Approved direction

Introduce one semantic tab color set and use it everywhere participant tab identity appears.

### Required tokens

- `--c-tab-contribute`
- `--c-tab-explore`
- `--c-tab-fight`
- `--c-tab-me`

These must be defined for both:

- `:root`
- `html.dark`

### Usage

These tokens become the source of truth for:

- page heading color
- active bottom-tab icon/text color
- active desktop nav icon/text color
- active underline/border for participant nav
- optional tab-owned accent text or chips when needed

### What should not use these tokens directly

Do not automatically retint:

- all cards
- all borders
- all button fills
- all empty states

The tab identity color is an accent signal, not a full-surface theme.

### Relationship to existing signature palette

The existing signature palette can still exist for broader branding use, but participant tab identity must not depend on a lighter accent token in one place and a darker text token in another.

If a signature token remains necessary elsewhere, that is fine. The participant shell should still have one semantic source of truth for tab identity.

## Participant Section System

All participant tab content should be composed from the following section types.

### Section Type A: Context Section

Purpose:

- establish what this tab is about right now
- show the released question, room state, or current private/report context

Examples:

- released question block in `Contribute`
- class synthesis context in `Explore`
- fight availability summary in `Fight`
- report state banner in `Me`

Rules:

- usually appears first
- calm surface, not a hard CTA
- may use eyebrow/title/body format
- may include one small action if necessary

### Section Type B: Action Section

Purpose:

- hold the primary action surface for the tab

Examples:

- response composer
- challenge launcher
- reply composer
- nickname editor

Rules:

- one clear primary action hierarchy
- actions grouped in footer or header slot, not scattered
- should feel like the workspace engine of the tab
- if disabled, explanation remains inside the same section

### Section Type C: State Section

Purpose:

- represent empty, hidden, locked, queued, waiting, or unavailable states

Examples:

- peer responses still private
- no fight available yet
- report not released
- no contributions yet

Rules:

- same shell as other sections
- no floating orphan sentences
- state title optional, but explanation required
- may include a single directional action

### Section Type D: History / Detail Section

Purpose:

- hold ongoing records, lists, archives, feed items, or detail panels

Examples:

- own contribution history
- peer stream
- past fights
- follow-up history
- report details

Rules:

- stable title and content hierarchy
- repeated items should use consistent internal spacing and separators
- avoid mixing list and freeform prose with no structure

## Shared Section Anatomy

Every major participant section should use the same core anatomy.

### Outer shell

- same border logic
- same radius family
- same horizontal padding logic
- same vertical padding logic

### Optional header

Supports:

- eyebrow
- title
- description
- header action

Not every section needs every element, but the spacing model should remain consistent.

### Body

- primary content
- feed/list/detail
- state explanation
- form body

### Optional footer/action row

Supports:

- primary action
- secondary action
- metadata row

Footer actions should not visually fight with body content.

## Typography Rules

### Tab heading

- shell-level only
- uses semantic tab color token
- strongest colored text on the page

### Section titles

- neutral ink color, not tab color by default
- should not compete with the shell heading
- should be the stable anchor for the content block

### Eyebrows

- reserved for contextual labels like `Released Question`, `Personal Report`, `Available Now`
- use a restrained uppercase treatment consistently

### Body copy

- use neutral ink/muted hierarchy consistently
- avoid introducing default browser blue for internal actions inline with prose

## Button And Action Styling Contract

Participant tabs need a smaller, stricter action system.

### Primary action

Use for:

- submit response
- save or send meaningful work
- start or confirm a major action

Characteristics:

- strongest filled treatment
- one per section when possible

### Secondary action

Use for:

- navigate to a nearby related workflow
- open a thread
- edit or update settings

Characteristics:

- bordered or tonal
- visually subordinate to primary action

### Tertiary text action

Use for:

- open report detail
- view contribution in stream
- open history item

Characteristics:

- no raw browser-blue styling
- must inherit the product palette
- should still have hover/focus affordances

### Forbidden pattern

Do not mix:

- filled buttons
- ghost buttons
- blue underlined links
- custom inline action text

inside one section unless there is a genuine semantic reason.

## Tab-Specific Content Contracts

These are not redesigns of feature behavior. They are presentation contracts.

## Contribute

### Required structure

1. Context section
   - released/current question
   - any small guidance about contribution status

2. Action section
   - top-level response composer
   - private feedback directly attached to the latest submitted contribution
   - queued/processing/error feedback state in place

3. History/detail section
   - learner contributions
   - follow-ups
   - actions like recategorisation, view in explore, start fight when allowed

### Visual intent

`Contribute` should feel productive and focused, not empty after the first submission.

### Specific cleanup required

- the composer surface should conform to the shared section shell
- private feedback should feel attached to the contribution, not like a separate unrelated card family
- contribution history should not use a different surface logic from the composer above it

## Explore

### Required structure

1. Context section
   - class state or room signal strip
   - current availability explanation when peers/synthesis are not released

2. State or synthesis section
   - class synthesis or not-yet-released explanation

3. History/detail section
   - peer stream
   - category board
   - replies
   - upvote-first interaction entry points

### Visual intent

`Explore` should feel like the shared room view, not a collection of raw utility strips.

### Specific cleanup required

- presence/status strip must visually belong to the same workspace system
- privacy and not-released notices should use state sections, not stray bordered boxes
- stream filters, category filters, and feed items should sit inside a deliberate section rhythm

## Fight

### Required structure

1. Context or state section
   - can I fight now
   - why not, if not

2. Action section
   - challenge launcher
   - response-first gating explanation if needed

3. History/detail section
   - open fights
   - incoming challenges
   - completed fights

### Visual intent

`Fight` should feel like a structured mode inside the same product, not a campaign page with its own design language.

### Specific cleanup required

- remove custom “special event” panel styling that makes `Fight` look like a different surface family
- fight state cards should use the same section shell and spacing model as other tabs
- locked/unavailable state should still look deliberate, not like a fallback

## Me

### Required structure

1. Context/state section
   - personal report state
   - report availability / privacy explanation

2. History/detail section
   - own responses
   - private feedback
   - follow-ups
   - category placement
   - fight history

3. Action section
   - nickname/settings controls

### Visual intent

`Me` should feel like a private archive and reflection workspace, not a settings page with some report content attached.

### Specific cleanup required

- remove generic blue internal links
- keep report/history first, settings second
- preserve useful detail, but with the same section grammar as the other tabs

## Mobile And Desktop Navigation Contract

The same semantic tab color must drive both navigation systems.

### Bottom tab bar

Active state should match the tab heading color family closely enough that the shell and the selected tab read as one identity.

The active state should include:

- icon color
- label color
- border/underline/accent

All three should come from the same semantic token system.

### Desktop nav rail

Desktop active state should mirror the same contract as mobile:

- same tab token
- same level of emphasis
- no alternate palette logic

## Dark Mode Contract

This is not a simple inversion exercise.

### Requirements

- tab identity colors must remain distinct and readable
- colored headings must not become neon
- low-emphasis surfaces must remain calm
- tertiary text actions must remain visible without becoming browser-default blue

### Practical rule

If a participant tab uses a semantic color in light mode for identity, it should use the dark-mode value of the same semantic token in dark mode, not a different token family chosen ad hoc.

## State Messaging Contract

When content is unavailable, the user should always know which of these states applies:

- hidden until released
- visible but not interactive
- waiting for learner action
- waiting for instructor release
- waiting for AI processing
- empty because nothing exists yet

These states should be framed consistently across all tabs.

Recommended format:

- short state title when needed
- one explanatory sentence
- optional one-action next step

## Reuse Strategy

Implementation should standardize by composition, not by copy-paste.

Preferred direction:

- keep `Card` or evolve it into a participant-friendly section primitive
- create a participant-specific section wrapper if `Card` is too generic
- migrate tab content to that wrapper incrementally

Avoid:

- four separate tab-specific style systems
- bespoke section shells for each feature
- fixing color mismatch without fixing section grammar

## File-Level Implications

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

Potential new abstractions:

- `ParticipantSection`
- `ParticipantStateSection`
- `ParticipantSectionHeader`

These should be introduced only if they reduce divergence materially.

## Acceptance Criteria

The participant workspace meets this spec when:

- tab headings and active tab states use one semantic tab color contract
- light mode active tab colors no longer read as washed out compared with the heading
- dark mode keeps the same semantic relationships cleanly
- each tab is composed from the same section system
- empty/locked/released/waiting states are framed consistently
- internal participant actions no longer fall back to generic blue link styling
- `Fight` remains the most modeful tab, but still reads as part of the same product
- `Me` no longer feels like a settings-first page
- the workspace reads as one coherent product across all four tabs

## Non-Goals

This spec does not:

- redesign the participant information architecture
- add new learner features
- change backend behavior
- merge tabs together
- remove private/public distinctions
- replace the broader visual identity of the app

## Recommended Implementation Order

1. unify semantic tab color tokens
2. standardize navigation active-state consumption
3. define the participant section primitive
4. migrate `Contribute`
5. migrate `Explore`
6. migrate `Fight`
7. migrate `Me`
8. run light/dark visual QA across mobile and desktop
