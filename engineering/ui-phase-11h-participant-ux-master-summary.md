# Participant UX Master Summary

Date: 2026-05-12
Scope: Master handoff summary for participant-facing UX restructuring across mobile and desktop.

## Purpose

This document is the entry point for the participant UX redesign work. It summarizes the intent behind the detailed mobile and desktop planning documents and clarifies how they fit together.

Use this file first. Then open the linked detailed files as needed.

## Source Documents

### Audit and reasoning

- `engineering/ui-phase-11-participant-tab-ux-audit.md`

### Mobile-first design

- `engineering/ui-phase-11b-participant-mobile-wireframe-plan.md`
- `engineering/ui-phase-11c-participant-tab-implementation-plan.md`
- `engineering/ui-phase-11d-participant-tab-execution-checklist.md`

### Desktop adaptation

- `engineering/ui-phase-11e-participant-desktop-wireframe-plan.md`
- `engineering/ui-phase-11f-participant-desktop-implementation-plan.md`
- `engineering/ui-phase-11g-participant-desktop-execution-checklist.md`

## Core Product Direction

The participant app should feel like one coherent product across mobile and desktop.

The redesign is not about adding new features. It is about tightening:

- attention flow
- tab purpose
- next-action clarity
- information density
- duplication control

The participant should always be able to answer:

1. what is this tab for
2. what should I do next
3. what information matters right now

## One Tab, One Job

This is the governing rule for all participant tabs.

### Contribute

Job: post and refine my own ideas

Should emphasize:

- have I submitted
- what happened to my response
- what should I do next

Should not behave like:

- a full archive
- a report dashboard
- a navigation hub to every other tab

### Explore

Job: inspect the room and respond to others

Should emphasize:

- peer response stream
- category lens
- reply or challenge opportunities

Should not behave like:

- a synthesis-first dashboard
- a metadata-heavy analytics wall

### Fight

Job: challenge or defend in a structured mini-debate

Should emphasize:

- current obligation
- rules and timing
- start or resume challenge

Should not behave like:

- a history-first archive

### Me

Job: review my history and private analysis

Should emphasize:

- personal report
- contribution history
- fight history
- profile/settings

Should not behave like:

- a second copy of Contribute

## Shared Cross-Breakpoint Rules

These rules apply to both mobile and desktop.

### 1. The active question should be visible on every tab

Yes, it should remain visible everywhere.

But it should not be a large repeated prompt card on every tab body.

### 2. Prompt visibility should be compact by default

- mobile: sticky compact question bar
- desktop: persistent question card in the context rail

### 3. Secondary details should be delayed

Examples:

- deep AI feedback detail
- recategorization mechanics
- report release semantics
- telemetry explanations

These should live behind expansion, lower sections, or secondary surfaces.

### 4. Synthesis should not outrank the room

Participants should encounter peer responses before the AI roll-up, especially in `Explore`.

### 5. Desktop gets more context, not more clutter

Desktop can persist more panels and supporting information, but should not reintroduce:

- duplicate prompt cards
- low-value metadata
- tab overlap

## Mobile-First Summary

Mobile is the primary engagement reference.

The mobile work focuses on:

- one dominant action per first screenful
- less vertical waste
- fewer duplicated labels
- fewer sideways scrolling interactions
- tighter action hierarchy

### Most important mobile corrections

- simplify `Contribute`
- streamline `Explore`
- stop duplicating `Contribute` content inside `Me`
- keep question context compact and always visible

## Desktop Summary

Desktop should preserve the same logic as mobile, but take advantage of stable layout.

Desktop gets:

- persistent context rail
- stronger side-by-side scanning
- more visible support panels
- selective persistent detail

Desktop should not become:

- a different information architecture
- a cluttered multi-panel dashboard

## Recommended Build Order

If the UI work is done in sequence, use this order:

1. shared shell and compact question context
2. contribute tab restructure
3. explore tab restructure
4. me tab consolidation
5. fight tab tightening
6. desktop adaptation pass
7. cross-breakpoint cleanup

Reason:

- `Contribute` and `Explore` currently contain the most participant confusion
- `Me` becomes easier to clean up once `Contribute` is clarified
- `Fight` is already the cleanest conceptually
- desktop should follow the corrected mobile logic, not precede it

## What To Preserve

These parts of the product are worth keeping:

- readable session routing
- question-centric model
- categorization flow
- Fight Me separation as its own tab
- personal report as a distinct participant value surface
- right-side context rail on desktop

## What To Reduce

These are the main sources of friction:

- repeated prompt cards
- vague intro cards
- too many visible actions per contribution
- stream cards with too much low-value metadata
- synthesis shown too early
- duplicate contribution/report/history content across tabs

## What Success Looks Like

After the redesign:

- `Contribute` feels like a workbench
- `Explore` feels like a room
- `Fight` feels like a mode
- `Me` feels like a reflection space

And across both mobile and desktop:

- participants stay oriented
- next actions are obvious
- fewer things compete for attention

## Which File To Open Next

### If you want the critique

Open:

- `engineering/ui-phase-11-participant-tab-ux-audit.md`

### If you are designing mobile surfaces

Open:

- `engineering/ui-phase-11b-participant-mobile-wireframe-plan.md`

### If you are implementing mobile UI

Open:

- `engineering/ui-phase-11c-participant-tab-implementation-plan.md`
- `engineering/ui-phase-11d-participant-tab-execution-checklist.md`

### If you are designing desktop surfaces

Open:

- `engineering/ui-phase-11e-participant-desktop-wireframe-plan.md`

### If you are implementing desktop UI

Open:

- `engineering/ui-phase-11f-participant-desktop-implementation-plan.md`
- `engineering/ui-phase-11g-participant-desktop-execution-checklist.md`

## Summary

This redesign is primarily a UX focus and information architecture correction:

- simplify
- prioritize
- collapse
- separate tab jobs clearly

The detailed docs already exist. This master summary is the single handoff entry point for the participant-facing redesign.
