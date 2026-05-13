# Participant Desktop Wireframe Plan

Date: 2026-05-12
Scope: Desktop-specific wireframe and content architecture plan for the participant-facing app.

This document is the desktop counterpart to:

- `engineering/ui-phase-11b-participant-mobile-wireframe-plan.md`

The desktop version should not become a different product. It should keep the same behavioral logic as mobile, while taking advantage of persistent context, wider scanning layouts, and more stable multi-column composition.

## Purpose

Define how the participant app should behave on desktop when more horizontal space is available:

- what should remain always visible
- what can be persistently pinned
- what should still stay collapsed despite extra space
- how each tab should use multi-column layouts without reintroducing duplication

## Core Desktop Principle

Desktop gets more simultaneous visibility, not more conceptual clutter.

That means:

- more context can remain visible
- more history can remain visible
- more comparison can remain visible

That does not mean:

- repeat the same prompt in multiple places
- show every secondary control by default
- re-open all detail surfaces just because space exists

## Desktop Shell

## Recommended layout

Three-zone layout:

1. left rail: tab navigation
2. main content column: active tab task surface
3. right context rail: question and lightweight context

This largely matches the current shell structure and should be preserved.

## Always visible on desktop

- top bar with session title and participant identity
- left tab rail
- right context rail
- active tab title

## Right context rail contents

Desktop can keep a persistent right context rail because it genuinely supports orientation.

Recommended permanent contents:

- compact question card
- released question switcher when applicable
- optional small helper text for current act/tab

Avoid placing full tab-specific operational content in the right rail. It should remain contextual, not become a second work column.

## Prompt handling on desktop

The active question should still be visible at all times, but the main tab body should not repeat a large prompt card unless the participant explicitly expands it or the tab state needs it.

Recommended default:

- prompt in the right rail only
- tab body references it implicitly

Exception:

- `Contribute` in first-time/no-submission state can still include a stronger in-body prompt treatment if needed

## Tab 1: Contribute

## Goal

On desktop, `Contribute` should feel like an active workspace for the participant's own current response thread.

## Recommended layout

Main column stack:

1. submission state header
2. primary action row
3. latest contribution thread card
4. inline detail/analysis panel
5. earlier points section

## Desktop-specific opportunities

### Persistent analysis beside the latest contribution

Unlike mobile, desktop can support a split treatment for the latest contribution:

- left side: contribution body and thread actions
- right side or lower persistent panel: AI feedback and category placement

This is useful only for the latest contribution. Do not expand every historical contribution into the same two-column treatment.

### Earlier points can be more visible

Desktop can show `Earlier points` open by default if the count is small. If the count is larger, keep it collapsible or paged.

### Action simplification remains important

Even on desktop, avoid restoring all previous action buttons by default. The latest contribution should still focus on:

- add follow-up
- open analysis
- add another point

Secondary navigation actions like Explore or Fight should not dominate the work surface.

## Desktop contribution surface recommendation

Default composition:

- compact state band: `You've submitted`, category, feedback status, timestamp
- latest contribution card
- adjacent or below analysis block
- earlier points list

## Tab 2: Explore

## Goal

Desktop `Explore` should feel like a readable room dashboard, not a cluttered analytics wall.

## Recommended layout

Two-column main body:

Left column:

- peer response stream

Right column:

- category filter block
- compact room summary
- optional synthesis panel

Alternative if synthesis is heavy:

- keep category filter above stream
- place synthesis below stream in an expandable section

## Desktop-specific opportunities

### Persistent category lens

Desktop can keep category filters visible in a stable side panel or upper block without resorting to horizontal overflow.

### Synthesis can be visible without leading

Desktop may keep a visible synthesis panel if:

- it sits beside the stream rather than above it
- it does not replace the stream as the primary reading surface

### Peer response cards can support a bit more metadata

Desktop can display slightly more scan-friendly metadata than mobile, such as:

- category
- timestamp
- maybe compact reaction state

But peer-visible telemetry and originality labels should still be reconsidered. Extra width does not automatically justify low-value metadata.

## Recommended desktop composition

Preferred order of importance:

1. peer response stream
2. category lens
3. synthesis

Not:

1. synthesis
2. category chips
3. peer stream

## Tab 3: Fight

## Goal

Desktop `Fight` should let the participant manage challenge state clearly while keeping active thread focus.

## Recommended layout

If no active thread:

- top row: incoming challenge or active fight priority card
- lower row: start new fight panel + past fights panel

If inside a thread:

- large main thread column
- smaller side context block for:
  - fight status
  - rules/reminders
  - original positions

## Desktop-specific opportunities

### Side status is useful here

Because fights are structured, desktop benefits from a small side context module showing:

- turn count
- whose turn it is
- time remaining
- original position summaries

### History can stay visible if not distracting

Past fights can remain in a side card on desktop, as long as the active thread clearly dominates.

## Tab 4: Me

## Goal

Desktop `Me` should feel like a review dashboard, not a second contribution panel.

## Recommended layout

Two-column review surface:

Left column:

- personal report summary
- activity summary row
- contribution history

Right column:

- fight history
- position shifts
- settings

Alternative:

- keep settings at the bottom spanning full width if the right column feels too sparse

## Desktop-specific opportunities

### Richer report summary

Desktop can show the report summary more permanently:

- bands
- summary
- argument evolution
- growth opportunity
- contribution trace

This is appropriate here because `Me` is already the reflection surface.

### Contribution history can show more detail by default

Desktop can allow the most recent contribution history item to open by default, with older ones collapsed.

### Settings can stay peripheral

The nickname form should remain available but should not compete with report content. Right-column or bottom placement is appropriate.

## Active Question on Desktop

Yes, the active question should still be shown on every tab.

Desktop answer:

- show it permanently in the right context rail
- avoid repeating a large in-body prompt card
- allow easy switching between released questions from the rail

This is one of the main differences from mobile:

- mobile needs compact sticky visibility
- desktop can keep persistent contextual visibility

## Desktop vs Mobile Summary

## Same logic

Both breakpoints should preserve:

- one tab = one dominant job
- reduced duplication
- peer stream before synthesis
- `Me` as reflection/history, not workbench duplication
- `Contribute` centered on active contribution state

## Different presentation

Desktop can permanently show:

- prompt context
- question switcher
- category lens
- synthesis panel
- review context

Mobile should:

- keep these more compact
- collapse secondary panels
- avoid multi-column assumptions

## Components Likely To Need Desktop Layout Care

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/participant-context-rail.tsx`
- `src/pages/participant-workspace-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/stream/stream-tab.tsx`
- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-thread.tsx`
- `src/components/myzone/my-zone-tab.tsx`

## Desktop Success Criteria

- the prompt remains visible without being repeated wastefully
- the main content column clearly reflects the active tab job
- additional space improves scanning, not clutter
- participant can keep context while acting
- mobile and desktop feel like the same product, not two different IA models

## Summary

Desktop should be treated as a persistent-context enhancement of the mobile-first architecture:

- more stable context
- better side-by-side scanning
- more visible supporting information

But the participant still needs the same clarity:

- what is this tab for
- what should I do next
- what information matters now
