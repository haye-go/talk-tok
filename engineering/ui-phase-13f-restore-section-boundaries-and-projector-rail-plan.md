# UI Phase 13f: Restore Section Boundaries &amp; Move Projector to Left Rail

Date: 2026-05-13
Status: design plan
Audience: frontend implementation engineer
Background: [ui-phase-13e-decarding-setup-reports-plan.md](./ui-phase-13e-decarding-setup-reports-plan.md)
Visual reference: [docs/instructor-shell-prototype.html](../docs/instructor-shell-prototype.html)

## Why this exists

Two things to fix:

**1. Phase 13e overcorrected.** I dropped every outer `<Card>` in Setup and Reports because I conflated two distinct concerns:

| Pattern | Verdict |
|---|---|
| Per-row mini-cards inside a section, MetricTile grids, nested rounded sub-boxes | Sloppy, correctly removed |
| Outer `<Card>` wrapper marking a whole section as a section | Legitimate, should not have been removed |

With both gone, sections now blur into each other. Category Taxonomy and Follow-up Prompts run together in the left column with no visual break, and the right column (Access &amp; Sharing) visually merges with the left column where the Rename buttons graze the QR code.

**2. The projector view is hidden in Setup → Join Access.** It's a session-wide tool ("open the public projector view of this room") that an instructor wants reachable while they're in Room or Reports too, not just buried inside Setup's join-access block.

This plan addresses both.

## Part A — Restore section-level Cards

### Principle

One outer `<Card title="…" eyebrow?="…">` per section. **The card chrome marks the section.** Everything inside the card stays flat per Phase 13e: row lists, inline stat strips, single-frame status checklists, no nested sub-boxes, no MetricTile grids.

The cards being added back are *the outer wrapper only* — they do not bring back the per-row tiles, the metric tile grids, the nested status boxes, the redundant table, or the master-detail-counter-tiles that Phase 13e correctly killed.

### Per-file table

| File | Outer `Card` to restore | What stays flat (do NOT revert) |
|---|---|---|
| `question-manager-panel.tsx` | `<Card title={currentQuestion?.title ?? "Current Question"} eyebrow={session.joinCode}>` around the question header block | 4-stat inline strip under the prompt (no MetricTile grid). `SessionControlsCard` already has its own framing. |
| `category-taxonomy-editor.tsx` | `<Card title="Category Taxonomy" eyebrow={`${categories.length} active`}>` | 3px-bar row list, inline "N assigned" + Rename per row, no per-row mini-cards |
| `follow-up-draft-editor.tsx` | `<Card title="Follow-up Prompts" eyebrow={`${followUps.length} total`}>` | Two flat row lists (Existing drafts + Create per-category), inline form expansion within rows |
| `access-and-sharing-section.tsx` | `<Card title="Join Access" eyebrow={joinCode}>` | Inline button stack (Copy URL stays, Open projector **moves out** — see Part B), Save as Template stays inside |
| `ai-readiness-section.tsx` | Two outer Cards: `<Card title="Hidden Baseline Diagnostics">` and `<Card title="AI Readiness">` | Baseline inline stat strip, 8-row flat ReadinessRow checklist in a single inner frame within the Readiness card. No 4-MetricTile grid, no 4 nested sub-boxes inside the Readiness card. |
| `argument-map-section.tsx` | `<Card title="Argument Map">` | Inline link-count stat line, graph keeps its own bounded surface inside the Card |
| `novelty-radar-section.tsx` | `<Card title="Novelty Radar">` | 3 distribution pill chips, flat row list of top distinctive items |
| `category-drift-section.tsx` | `<Card title="Category Drift" eyebrow={`${drift.slices.length} slices`}>` | Horizontal bars only. Redundant table **stays deleted**. |
| `embeddings-status-section.tsx` | `<Card title="Embeddings">` (small, one-line content) | Inline stat strip + action button on the right within the card |
| `novelty-signals-section.tsx` | `<Card title="Novelty Signals">` | Inline stat strip + action button on the right within the card |
| `personal-reports-master-detail-panel.tsx` | Already has `<Card>`, no change | Inline counter strip in panel header (per 13e commit 6) stays |
| `synthesis-master-detail-panel.tsx` | Already has `<Card>`, no change | Unchanged |

### What this is not

- Not bringing back any MetricTile grid
- Not bringing back per-category rounded sub-cards inside Category Taxonomy
- Not bringing back per-draft rounded tiles inside Follow-up Prompts
- Not bringing back the 4 nested sub-boxes inside AI Readiness
- Not bringing back the Category Drift table
- Not re-introducing the 4-MetricTile grid above Personal Reports

The decarding *inside* each section is the right answer. The mistake was decarding the section boundaries too.

### Visual outcome

Each section reads as a single bordered block on the warm canvas. Inside each block, the content is flat — row lists with hairline dividers, inline stat strips, status checklists. The Setup workspace reads as a vertical stack of distinct blocks. The Reports workspace reads as a sequence of distinct blocks. The right column (Access &amp; Sharing) is its own card, so it stops visually bleeding into the left column.

## Part B — Move "Open projector" to the left rail

### Where it should live

Bottom of the left rail, below the existing footer note. The left rail today ends with the paragraph "Room is for live reading and intervention. Setup holds drafting and configuration. Reports holds synthesis, argument map, personal reports, and AI review surfaces." Put the projector action immediately below that paragraph, as a small full-width secondary action.

This placement:

- Keeps the rail's primary content (session identity + nav + modes) at the top
- Sits the projector in the natural "session-scoped tool" spot — the rail belongs to the session, the projector is a session-scoped view
- Stays out of the way during nav but is always reachable from Room, Setup, and Reports

### Visual treatment

A single small secondary `<Button>` styled to fit the dark rail surface:

```tsx
<a
  href={routes.instructorProjector(sessionSlug)}
  className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-[#d9e7f3] transition hover:bg-white/10 hover:text-white"
>
  <Presentation size={15} />
  Open projector
</a>
```

(Phosphor icon `Presentation` or similar; if it's not already imported in the rail file, add it.)

Uses `bg-white/5` + `border-white/10` so it reads as a subdued action button on the dark rail, not a primary nav item. Hover lifts it to `bg-white/10`.

### What goes away from Setup

`access-and-sharing-section.tsx` loses the "Open projector" button from its inline stack. Copy URL and Save as Template remain. The Card title stays "Join Access" — that's still its job.

### Props plumbing

`InstructorLeftRail` already receives `sessionSlug` indirectly via the workspace it lives inside. The page calls `<InstructorLeftRail ... />`. Currently the rail doesn't know the slug because routes.instructorProjector takes the session slug. Add a `sessionSlug: string` prop to `InstructorLeftRailProps`. The page passes it. Inside the rail, build the projector href once at render.

## Implementation sequence

Six small commits. Each one runnable, each one visually meaningful.

| # | Commit | Touches |
|---|---|---|
| 1 | `style(setup): restore card around question manager header` | `question-manager-panel.tsx` |
| 2 | `style(setup): restore cards around category taxonomy and follow-ups` | `category-taxonomy-editor.tsx`, `follow-up-draft-editor.tsx` |
| 3 | `style(setup): restore cards around access-and-sharing and ai readiness` | `access-and-sharing-section.tsx`, `ai-readiness-section.tsx` |
| 4 | `style(reports): restore cards around argument map, novelty radar, category drift` | `argument-map-section.tsx`, `novelty-radar-section.tsx`, `category-drift-section.tsx` |
| 5 | `style(reports): restore cards around embeddings and novelty signals strips` | `embeddings-status-section.tsx`, `novelty-signals-section.tsx` |
| 6 | `feat(instructor-ui): move open-projector action to left rail footer` | `instructor-left-rail.tsx`, `instructor-session-page.tsx`, `access-and-sharing-section.tsx` |

Commits 1–5 are pure subtract-then-add — each section file goes back to a structure similar to its Phase 13d state for the Card wrapper, but with all the internal Phase 13e flat layout work preserved.

Commit 6 is a small new feature: project action moves up to the rail; it disappears from Setup.

## Acceptance per commit

| # | Verify |
|---|---|
| 1 | Setup workspace shows the active question inside a Card with title + join-code eyebrow. The 4-stat inline strip stays. No MetricTile grid returns. |
| 2 | Category Taxonomy is a single Card with the row list inside. Follow-up Prompts is a single Card with the two row lists inside. No per-row mini-cards return. |
| 3 | Join Access is a single Card. AI Readiness shows two stacked Cards (Baseline + Readiness). No 4-MetricTile grids return, no 4 nested sub-boxes return inside the Readiness card — still 8 flat ReadinessRows. |
| 4 | Argument Map, Novelty Radar, Category Drift each in their own Card. Category Drift still doesn't have the table. Novelty Radar still uses 3 inline pill chips. |
| 5 | Embeddings and Novelty Signals each in their own Card with the inline single-line content. They no longer sit in a 2-column grid (kept as full-width stacked Cards). |
| 6 | The dark left rail has a small "Open projector" button at the bottom, below the help paragraph. The button is reachable from Room, Setup, and Reports. The Setup → Join Access card no longer contains an Open projector button. |

## Done criteria

- Every section in Setup and Reports has exactly one outer Card. No section has zero Cards (the Phase 13e mistake). No section has Card-inside-Card (the original mistake before Phase 13e).
- `grep -r "MetricTile" src/components/instructor/setup/ src/components/instructor/reports/` still returns only the 3 hits inside the per-student detail pane of `personal-reports-master-detail-panel.tsx` (those are appropriate where they sit).
- The category drift table stays deleted. The AI Readiness inner status checklist remains 8 flat ReadinessRows in one frame.
- "Open projector" is one click away from every workspace tab via the left rail.

## What is NOT in scope

- No backend changes.
- No content changes (same labels, same actions, same data).
- No revert of the per-row flat layouts.
- No changes to the master-detail panels' internal structure.
- No changes to Room.
