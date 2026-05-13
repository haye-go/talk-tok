# UI Phase 13e: Decarding Setup &amp; Reports — Per-Section Plan

Date: 2026-05-13
Status: detailed design plan
Audience: frontend implementation engineer
Visual reference: [docs/instructor-shell-prototype.html](../docs/instructor-shell-prototype.html)

## Why this exists

Setup and Reports today wrap nearly every section in `<Card title="X">` and stuff 2×2 or 1×4 grids of `MetricTile` boxes inside. The result is a wall of cards-inside-cards-inside-cards — the "sloppy admin dashboard" look the prototype was meant to replace.

This document plans, **section by section**, what each piece should become. Three shared patterns appear repeatedly:

- **Pattern A — Inline stat strip:** `Label: value · Label: value · …` separated by `·`. Replaces 2–4-cell `MetricTile` grids.
- **Pattern B — Section block:** plain `<section>` with hairline header (eyebrow + title + right-aligned action). Replaces `<Card title="…">` for compact admin surfaces.
- **Pattern C — Status checklist row:** `[dot] [label] [badge] [optional detail line]` in a single outer frame, no nested boxes. Replaces card-on-card status displays.

Reach for Pattern A first, then B, then C. Keep `Card` only when grouping is real (two-column master-detail, graph surfaces).

---

## Setup

### Setup.1 — `question-manager-panel.tsx`

**Current (78 lines).** Three stacked surfaces inside one component:
1. `<Card title={currentQuestion?.title}>` wrapping the prompt body
2. `<SessionControlsCard>` (a form — earns its frame)
3. A 4-cell `MetricTile` grid (Submitted / Categories / Recat Req / Follow-ups)

**Sloppy:** The current-question card has only ~3 lines of content (prompt + footnote) but full Card chrome. The 4 metric tiles are isolated from the question header they describe.

**Proposed layout:**

```
JOIN-4X7
Should students be allowed to use AI to draft contributions in class?
Consider the implications for learning, originality, and equitable access.
AI controls target this question unless a panel explicitly says otherwise.
14 submitted · 3 categories · 1 recat pending · 2 follow-ups
────────────────────────────────────────────────────────────────
[ Session settings card with form ]   (keep as is)
```

**JSX skeleton:**

```tsx
<div className="grid gap-4">
  <header>
    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">{session.joinCode}</p>
    <h2 className="mt-1 font-display text-lg font-semibold text-[var(--c-ink)]">
      {currentQuestion?.title ?? "Current Question"}
    </h2>
    <p className="mt-2 text-sm leading-6 text-[var(--c-body)]">
      {currentQuestion?.prompt ?? session.openingPrompt}
    </p>
    <p className="mt-2 text-[11px] text-[var(--c-muted)]">
      AI controls target this question unless a panel explicitly says otherwise.
    </p>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--c-hairline)] pt-3 text-xs">
      <span><strong className="text-[var(--c-ink)]">{metrics.submitted}</strong> <span className="text-[var(--c-muted)]">submitted</span></span>
      <span aria-hidden className="text-[var(--c-muted)]">·</span>
      <span><strong className="text-[var(--c-ink)]">{metrics.categories}</strong> <span className="text-[var(--c-muted)]">categories</span></span>
      <span aria-hidden className="text-[var(--c-muted)]">·</span>
      <span><strong className="text-[var(--c-ink)]">{metrics.recategorisationRequests}</strong> <span className="text-[var(--c-muted)]">recat pending</span></span>
      <span aria-hidden className="text-[var(--c-muted)]">·</span>
      <span><strong className="text-[var(--c-ink)]">{metrics.followUps}</strong> <span className="text-[var(--c-muted)]">follow-ups</span></span>
    </div>
  </header>

  <SessionControlsCard ... />  {/* unchanged */}
</div>
```

**Imports to drop:** `Card`, `MetricTile`. (`SessionControlsCard` stays.)

**Result:** −1 card chrome, −4 metric tile boxes. The question header becomes a real header on the page background, not a tile. Estimated **~78 → ~55 lines**.

---

### Setup.2 — `category-taxonomy-editor.tsx`

**Current (237 lines).** Outer `<Card title="Category Taxonomy">` containing:
- An intro paragraph + `+ Add` button
- A conditional Add-Category form (bordered sub-panel)
- A grid of per-category tiles, each `rounded-md border bg-surface-soft p-3` with a 4px colored left border
- Each category tile contains: name + description + optional assignment count Badge, then a `Rename` button OR an inline edit form

**Sloppy:** Card-on-card. The outer Card frames the page section AND each category gets its own framed tile. Three levels of framing when only one is needed.

**Proposed layout (Pattern B + flat rows):**

```
CATEGORY TAXONOMY · 3 active                                      [+ Add]
Category editing lives in Setup. Room Categories is a live reading board.
────────────────────────────────────────────────────────────────
[Add Category form — only when toggled, bordered subdued panel]
────────────────────────────────────────────────────────────────
▍ Access            14 assigned                              Rename
   Arguments about equitable access and removing barriers
▍ Fairness           9 assigned                              Rename
   Arguments about leveling the playing field vs. craft
▍ Transparency      11 assigned                              Rename
   (no description)
```

- Outer wrapper: plain `<section>`, no Card
- Header: `<div className="flex items-baseline justify-between gap-3 border-b border-[var(--c-hairline)] pb-2">` with eyebrow + active count on the left, `+ Add` on the right
- Intro prose: `mt-2 text-xs text-muted`
- Each row: `flex items-start gap-3 border-b border-[var(--c-hairline)] py-3 last:border-b-0`
  - Left: a 3-px colored vertical bar (`<span className="mt-1 h-4 w-[3px] rounded-pill" style={{background: `var(--c-sig-${tone})`}} />`)
  - Middle: name (font-medium) + optional description (text-xs text-muted)
  - Right: assignment count as plain `<span>` (not Badge) + Rename button
- When in edit mode: name field replaces the label inline; description textarea drops below. Save / Cancel inline.

**JSX skeleton (per-row):**

```tsx
<li className="flex items-start gap-3 border-b border-[var(--c-hairline)] py-3 last:border-b-0">
  <span
    aria-hidden
    className="mt-1 h-4 w-[3px] shrink-0 rounded-pill"
    style={{ background: `var(--c-sig-${categoryColorToTone(category.color, index)})` }}
  />
  <div className="min-w-0 flex-1">
    {editingCategoryId === category.id ? (
      <RenameForm ... />   // inline form, same row footprint
    ) : (
      <>
        <p className="font-display text-sm font-medium text-[var(--c-ink)]">{category.name}</p>
        {category.description ? (
          <p className="mt-0.5 text-xs leading-5 text-[var(--c-muted)]">{category.description}</p>
        ) : null}
      </>
    )}
  </div>
  <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--c-muted)]">
    {category.assignmentCount !== undefined ? (
      <span>{category.assignmentCount} assigned</span>
    ) : null}
    <Button type="button" size="sm" variant="ghost" onClick={() => startRename(category)}>Rename</Button>
  </div>
</li>
```

**Imports to drop:** `Card`, `Badge`.

**Result:** Outer card removed, per-row card-tiles flattened to hairline-separated list rows. Vertical density roughly doubles — the screen comfortably shows 8–10 categories without scrolling instead of 4–5. Estimated **~237 → ~150 lines**.

---

### Setup.3 — `follow-up-draft-editor.tsx`

**Current (171 lines).** Outer `<Card title="Follow-up Prompts">` containing:
- Intro prose
- A "drafts" stack — each draft as `rounded-md bg-surface-strong px-3 py-2` row with status Badge
- A subhead "Create a category-targeted follow-up"
- A list of category tiles, each `rounded-md border bg-surface-soft p-3` with name + `Draft follow-up` button; expands into an inline textarea form when active

**Sloppy:** Outer Card + each existing draft is a sub-tile + each category line is another sub-tile. Triple nesting. The two distinct lists (existing drafts vs. category create rows) are visually similar enough to confuse a reader.

**Proposed layout (Pattern B + two flat lists with clear headings):**

```
FOLLOW-UP PROMPTS · 2 active                                  [+ New]
Draft per category; launch from Room or the right rail.
────────────────────────────────────────────────────────────────
EXISTING DRAFTS
  Confidence vs. originality                                 active
  Practical safeguards                                       draft

CREATE PER-CATEGORY
  Access            ↳ Draft follow-up
  Fairness          ↳ Draft follow-up    (← when clicked, inline textarea expands here)
  Transparency      ↳ Draft follow-up
```

- Outer wrapper: plain `<section>`, no Card
- Two subsections within: "Existing Drafts" and "Create per-category"
- Each subsection has its own faint uppercase eyebrow heading (`text-[10px] uppercase tracking-wider text-muted`)
- Each row is flat: `flex items-center justify-between border-b border-hairline py-2`
- Drafts row: title + status badge inline
- Category row: name on the left, `Draft follow-up` ghost button on the right; when clicked the textarea expands within the same row's vertical space

**JSX skeleton:**

```tsx
<section className="grid gap-4">
  <header className="flex items-baseline justify-between gap-3 border-b border-[var(--c-hairline)] pb-2">
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Follow-up Prompts</p>
      <p className="text-xs text-[var(--c-muted)]">{followUps.length} total</p>
    </div>
  </header>
  <p className="text-xs leading-5 text-[var(--c-muted)]">Draft follow-up prompts per category. Launch them from Room or the right rail during live facilitation.</p>

  {followUps.length > 0 ? (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--c-muted)]">Existing drafts</p>
      <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
        {followUps.slice(0, 8).map((prompt) => (
          <li key={prompt.id} className="flex items-center justify-between gap-3 border-b border-[var(--c-hairline)] py-2 text-sm">
            <span className="min-w-0 truncate font-medium text-[var(--c-ink)]">{prompt.title}</span>
            <Badge tone={...}>{prompt.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  ) : null}

  <div>
    <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--c-muted)]">Create per-category follow-up</p>
    <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
      {categories.map((category) => (
        <li key={category.id} className="border-b border-[var(--c-hairline)] py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[var(--c-ink)]">{category.name}</span>
            <Button size="sm" variant="ghost" onClick={...}>{openCategoryId === category.id ? "Cancel" : "Draft follow-up"}</Button>
          </div>
          {openCategoryId === category.id ? <InlineForm ... /> : null}
        </li>
      ))}
    </ul>
  </div>
</section>
```

**Imports to drop:** `Card`.

**Result:** Drops outer card, drops per-row mini-cards. Two lists become flat row stacks. Estimated **~171 → ~115 lines**.

---

### Setup.4 — `access-and-sharing-section.tsx`

**Current (68 lines).** A `<Card title="Join Access">` containing a 140px QR + URL + "Open projector" button, then a **separate** full-width "Save as Template" button hanging below the card (outside it).

**Sloppy:** The Card adds chrome around a tiny content block. The Save-as-Template button being outside the Card is visually awkward — it looks orphaned.

**Proposed layout (Pattern B + sidebar-style block):**

```
JOIN ACCESS · JOIN-4X7
────────────────────────────────────────────────────────────────
[QR  ]
[Code]    https://talktok.app/join/JOIN-4X7
          [Copy URL]
          [Open projector]
          [Save as Template]
```

- Outer: plain `<div className="grid content-start gap-4">`, no Card
- Header eyebrow with `JOIN ACCESS · {joinCode}` and bottom hairline
- QR on a small white surface (the QR itself needs the white background to scan)
- URL as breakable monospace muted text
- Three stacked secondary buttons: Copy URL, Open projector, Save as Template — full-width within the sidebar column

Save-as-Template now sits next to Open-Projector as a sibling action, not an outside-the-card afterthought.

**JSX skeleton:**

```tsx
<div className="grid content-start gap-4">
  <header className="border-b border-[var(--c-hairline)] pb-2">
    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Join Access</p>
    <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--c-ink)]">{joinCode}</p>
  </header>
  <div className="rounded-md bg-white p-3 self-start">
    <QRCodeSVG value={joinUrl} size={140} />
  </div>
  <div className="grid gap-2">
    <p className="break-all font-mono text-[11px] leading-5 text-[var(--c-muted)]">{joinUrl}</p>
    <div className="grid gap-1.5">
      <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(joinUrl)}>Copy URL</Button>
      <Button size="sm" variant="secondary" onClick={...}>Open projector</Button>
      <Button size="sm" variant="secondary" icon={<FloppyDisk size={14} />} onClick={...}>
        {templateSaved ? "Template saved!" : savingTemplate ? "Saving..." : "Save as Template"}
      </Button>
    </div>
  </div>
</div>
```

**Imports to drop:** `Card`.

**New small feature** (bundled): Copy-URL button (it's a tiny add but solves the obvious missing UX — the URL is displayed but not actionable today).

**Result:** Save-as-Template no longer dangles. QR + URL + actions are one coherent vertical strip. Estimated **~68 → ~55 lines** (plus the copy button).

---

### Setup.5 — `ai-readiness-section.tsx` (the worst offender)

**Current (236 lines).** Two side-by-side `<Card>` instances rendered in a `lg:grid-cols-2` row:

**Left card — Hidden Baseline Diagnostics:**
- Intro paragraph
- 4-cell `MetricTile` grid (Status / Provider / Model / Generated)
- Full-width "Regenerate Baseline" button
- Optional error line

**Right card — AI Readiness:**
- Intro paragraph
- 4-cell `MetricTile` grid (OpenAI key / Models / Prompts / Budget)
- A grid of **4 nested rounded sub-boxes** (Model coverage / Prompt templates / Budget and demo controls / Recent LLM failures), each with a Badge + prose

**Sloppy:** This is the canonical card-on-card-on-card. The 4 MetricTiles on the right card duplicate information already shown by the 4 nested badge sub-boxes below them. The two-column row also forces a small awkward height mismatch between baseline (less content) and readiness (more content).

**Proposed layout — split into two flat sections, stacked vertically (Pattern B for Baseline, Pattern C for Readiness):**

```
HIDDEN BASELINE DIAGNOSTICS                          [Regenerate Baseline]
The baseline is the instructor-side reference answer used by private
feedback and personal reports. Learners never see it.
────────────────────────────────────────────────────────────────
Status: ready · Provider: openai · Model: gpt-5 · Generated: 04:31 PM


AI READINESS
Operational prerequisites that commonly block AI work.
────────────────────────────────────────────────────────────────
●  OpenAI key            ready
●  Models                  3 enabled · ready
●  Prompts                  7 templates · ready
●  Model coverage          ready    Enabled models cover all features.
●  Prompt templates       missing   3 missing: question.baseline.v1, ...
●  Budget                  12%      No hard stop blocking this session.
●  Demo failure toggles    clear    No simulated failures active.
●  Recent LLM failures     0        No recent errors found.
```

- Two `<section>` blocks, one per concern, stacked vertically (not side-by-side — single column reads better at this density)
- **Baseline** uses Pattern B with the action button on the right of the hairline header and a single inline stat strip (Pattern A) for the four values
- **Readiness** uses Pattern C: one outer `rounded-2xl border border-hairline bg-surface-soft p-5`, then a vertical list of 7 status rows. Each row:
  - Status dot (success/warning/error color)
  - Label (font-medium)
  - Badge (ready/missing/clear/attention/N)
  - Optional second line of muted prose
  - All in `flex flex-col gap-1` per row, rows separated by hairline

Drop the 4-MetricTile grid at the top of Readiness entirely — its info is already in the row badges below. Merge the "Models" and "Prompts" counts into their respective row's badge area.

**JSX skeleton — baseline:**

```tsx
<section>
  <header className="flex items-baseline justify-between gap-3 border-b border-[var(--c-hairline)] pb-2">
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Hidden Baseline Diagnostics</p>
      <p className="text-xs text-[var(--c-muted)]">Instructor-side reference answer. Never shown to learners.</p>
    </div>
    <Button size="sm" variant="secondary" disabled={baselineBusy || !baselineCanGenerate} onClick={() => void handleGenerateBaseline(Boolean(baseline))}>
      {baselineBusy ? "Queued" : baseline ? "Regenerate Baseline" : "Generate Baseline"}
    </Button>
  </header>
  <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
    <StatPair label="Status" value={baseline?.status ?? "missing"} />
    <StatPair label="Provider" value={baseline?.provider ?? "none"} />
    <StatPair label="Model" value={baseline?.model ?? "none"} />
    <StatPair label="Generated" value={baseline?.generatedAt ? formatTime(baseline.generatedAt) : "not yet"} />
  </div>
  {error ? <p className="mt-2 text-xs text-[var(--c-error)]">{error}</p> : null}
</section>
```

**JSX skeleton — readiness:**

```tsx
<section>
  <header className="border-b border-[var(--c-hairline)] pb-2">
    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">AI Readiness</p>
    <p className="text-xs text-[var(--c-muted)]">Operational prerequisites that commonly block AI work.</p>
  </header>
  <ul className="mt-3 rounded-2xl border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] divide-y divide-[var(--c-hairline)]">
    <ReadinessRow tone={openAiKeyTone} label="OpenAI key" badge={openAiKeyState} />
    <ReadinessRow tone={modelsCount > 0 ? "success" : "warning"} label="Models" badge={`${modelsCount} enabled`} />
    <ReadinessRow tone={promptsCount > 0 ? "success" : "warning"} label="Prompts" badge={`${promptsCount} templates`} />
    <ReadinessRow tone={missingModelFeatureLabels.length === 0 ? "success" : "warning"} label="Model coverage" badge={missingModelFeatureLabels.length === 0 ? "ready" : "missing"} detail={missingModelFeatureLabels.length === 0 ? "Enabled models cover all AI workflow features." : `Missing: ${missingModelFeatureLabels.join(", ")}.`} />
    <ReadinessRow tone={missingPromptKeys.length === 0 ? "success" : "warning"} label="Prompt templates" badge={missingPromptKeys.length === 0 ? "ready" : "missing"} detail={missingPromptKeys.length === 0 ? "Required prompt templates are present." : `Missing: ${missingPromptKeys.join(", ")}.`} />
    <ReadinessRow tone={budgetHardStopActive ? "warning" : "success"} label="Budget" badge={`${budgetUsagePercent}%`} detail={budgetHardStopActive ? "Hard stop active." : "No budget hard stop blocking this session."} />
    <ReadinessRow tone={activeDemoToggleCount > 0 ? "warning" : "success"} label="Demo failure toggles" badge={activeDemoToggleCount > 0 ? "attention" : "clear"} />
    <ReadinessRow tone={recentLlmFailures.length === 0 ? "success" : "error"} label="Recent LLM failures" badge={String(recentLlmFailures.length)} detail={recentLlmFailures.length === 0 ? "No recent errors." : recentLlmFailures.map(c => `${c.feature}: ${c.error ?? "Unknown"}`).join(" / ")} />
  </ul>
</section>
```

A small `ReadinessRow` helper (15 lines) renders the row consistently:
```tsx
function ReadinessRow({ tone, label, badge, detail }) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneToDot(tone))} />
      <span className="flex-1 text-sm font-medium text-[var(--c-ink)]">{label}</span>
      <Badge tone={tone}>{badge}</Badge>
      {detail ? <p className="basis-full pl-5 text-[11px] leading-4 text-[var(--c-muted)]">{detail}</p> : null}
    </li>
  );
}
```

**Imports to drop:** `Card`, `MetricTile`.

**Result:** Two heavy side-by-side cards collapse to two stacked section blocks. The Readiness section's two redundant info layers (4 tiles + 4 nested boxes showing the same things) merge into one flat list of 8 rows. Estimated **~236 → ~125 lines**. Roughly half the file.

---

## Reports

### Reports.1 — `personal-reports-master-detail-panel.tsx` (counters only)

**Current.** Keep the master-detail Card. The one part that's sloppy is the **4-cell `MetricTile` grid** above the master-detail (`Total / Success / Processing / Error`).

**Proposed:** Move the counts into the panel header as an inline stat strip alongside "Generate All Reports".

```
PERSONAL REPORTS
14 total · 8 success · 1 processing · 0 error      [Generate All Reports]
[master-detail content unchanged]
```

**JSX patch:**

```tsx
<Card title="Personal Reports">
  <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">...</p>
  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
    <div className="flex items-center gap-x-3 text-xs text-[var(--c-muted)]">
      <span><strong className="text-[var(--c-ink)]">{counts.total}</strong> total</span>
      <span>·</span>
      <span><strong className="text-[var(--c-ink)]">{counts.success}</strong> success</span>
      <span>·</span>
      <span><strong className={cn("text-[var(--c-ink)]", (counts.queued + counts.processing) > 0 && "text-[var(--c-warning)]")}>{counts.queued + counts.processing}</strong> processing</span>
      <span>·</span>
      <span><strong className={cn("text-[var(--c-ink)]", counts.error > 0 && "text-[var(--c-error)]")}>{counts.error}</strong> error</span>
    </div>
    <Badge tone={...}>...</Badge>
    <Button className="ml-auto" ...>Generate All Reports</Button>
  </div>
  ...master-detail unchanged...
</Card>
```

**Imports to drop:** `MetricTile`.

**Result:** −4 metric tile boxes. Card stays. Estimated **~10 lines saved**.

---

### Reports.2 — `argument-map-section.tsx`

**Current (90 lines).** `<Card title="Argument Map">` containing intro + a tiny 2-cell `MetricTile` grid (`Links` / `Ready`) + Generate/Regenerate button squeezed in beside the tiles, then either the graph or a dashed empty-state.

**Sloppy:** The two MetricTiles are tiny. The button squeezed beside them looks fragile. The outer Card is only there to frame the section title and intro — the graph already has its own bounded surface.

**Proposed layout (Pattern B + Pattern A):**

```
ARGUMENT MAP                                  [Generate Argument Map]
Post-processed reasoning artifact across responses, categories, and synthesis.
Distinct from live Similarity clusters in Room.
────────────────────────────────────────────────────────────────
27 argument links · ready
[ Graph SVG within its own rounded-xl border surface ]
```

- Plain `<section>`, no outer Card
- Hairline-divided header with Generate button on the right
- Single inline stat line under the intro, no tiles
- Graph keeps its own bounded surface (`rounded-xl border border-hairline bg-surface-soft`) — that's the only Card-like surface that stays, because the SVG needs it
- Empty state stays a dashed-bordered placeholder where the graph would go

**JSX skeleton:**

```tsx
<section>
  <header className="flex items-baseline justify-between gap-3 border-b border-[var(--c-hairline)] pb-2">
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Argument Map</p>
      <p className="text-xs text-[var(--c-muted)]">Post-processed reasoning artifact across responses, categories, and synthesis. Distinct from live Similarity clusters in Room.</p>
    </div>
    <Button size="sm" variant="secondary" onClick={...} disabled={busy}>
      {busy ? "Queued" : graph ? "Regenerate" : "Generate Argument Map"}
    </Button>
  </header>
  <p className="mt-3 text-xs text-[var(--c-muted)]">
    <strong className="text-[var(--c-ink)]">{linkCount}</strong> argument links · {ready ? "ready" : "not yet generated"}
  </p>
  {errorMessage ? <p className="mt-2 text-xs text-[var(--c-error)]">{errorMessage}</p> : null}
  <div className="mt-4 rounded-xl border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]">
    {graph ? (
      <ArgumentMapGraph ... />
    ) : (
      <div className="border-2 border-dashed border-[var(--c-hairline)] p-10 text-center">
        <p className="text-sm font-semibold text-[var(--c-muted)]">Argument map not yet generated.</p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">Nodes: categories, submissions, synthesis artifacts. Edges: supports, contradicts, extends, questions, bridges.</p>
      </div>
    )}
  </div>
</section>
```

**Imports to drop:** `Card`, `MetricTile`.

**Result:** Estimated **~90 → ~70 lines**.

---

### Reports.3 — `novelty-radar-section.tsx`

**Current (58 lines).** `<Card title="Novelty Radar">` containing intro + a 3-cell `MetricTile` grid (Low / Medium / High distribution) + a 5-item list of distinctive items as small bordered tiles.

**Sloppy:** Three MetricTiles for a 3-value distribution is overkill — these can be three pills inline. The bordered list items don't need to be tiles either.

**Proposed layout (Pattern B + distribution pills):**

```
NOVELTY RADAR
Highlights novel signals across categories relative to baseline.
────────────────────────────────────────────────────────────────
Distribution:  [Low 12] [Medium 4] [High 1]

TOP DISTINCTIVE
  Jordan L.                                          high
  AI support improves access for students who...
  ...
```

- Plain `<section>`, no outer Card
- Distribution as 3 inline pills using the project's Badge or simple `<span>` chips
- "Top Distinctive" subsection with a flat list of 5 rows, each row: `flex items-start gap-3 border-b border-[var(--c-hairline)] py-2`
- Each row: name (font-medium), band Badge on the right, optional body preview as text-xs muted second line

**JSX skeleton:**

```tsx
<section>
  <header className="border-b border-[var(--c-hairline)] pb-2">
    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Novelty Radar</p>
    <p className="text-xs text-[var(--c-muted)]">Highlights novel signals across categories relative to baseline.</p>
  </header>
  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
    <span className="text-[var(--c-muted)]">Distribution:</span>
    <span className="rounded-pill bg-[var(--c-surface-strong)] px-2 py-0.5 font-semibold">Low {radar.distribution.low}</span>
    <span className="rounded-pill bg-[var(--c-sig-yellow)]/40 px-2 py-0.5 font-semibold">Medium {radar.distribution.medium}</span>
    <span className="rounded-pill bg-[var(--c-sig-mustard)]/40 px-2 py-0.5 font-semibold">High {radar.distribution.high}</span>
  </div>
  <div className="mt-4">
    <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--c-muted)]">Top Distinctive</p>
    <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
      {radar.topDistinctive.slice(0, 5).map((item) => (
        <li key={item.signalId} className="flex flex-col gap-1 border-b border-[var(--c-hairline)] py-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[var(--c-ink)]">{item.participantLabel}</span>
            <Badge tone="mustard">{item.band}</Badge>
          </div>
          {item.bodyPreview ? (
            <p className="text-[var(--c-muted)]">{previewText(item.bodyPreview)}</p>
          ) : null}
        </li>
      ))}
    </ul>
  </div>
</section>
```

**Imports to drop:** `Card`, `MetricTile`.

**Result:** Estimated **~58 → ~45 lines**.

---

### Reports.4 — `category-drift-section.tsx`

**Current (104 lines).** `<Card title="Category Drift">` containing intro + horizontal bars per category + a `<table>` with one row per time slice and one column per category.

**Sloppy:** Outer Card chrome unnecessary. The bottom table duplicates the same information already conveyed by the bars (per-category totals = sum of each table column). Keep the bars, drop the table.

**Proposed layout (Pattern B + keep bars):**

```
CATEGORY DRIFT · 3 slices
How category distribution changed over time. Each bar = share of threads per category.
────────────────────────────────────────────────────────────────
Access            14 threads · 33%  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░
Fairness           9 threads · 21%  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░
Transparency      11 threads · 26%  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░
Uncategorized      8 threads · 19%  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░ (warning tone)
```

- Plain `<section>`, no outer Card
- Hairline header, no action button (drift is read-only)
- Keep the existing bars exactly as they are — they're the right visualization
- Remove the table block (and its mapping logic). If transition data is wanted later, surface as a one-line caption per bar (`Access ↑ 2 since last slice`).

**JSX skeleton:**

Keep the existing bar-rendering code, change the wrapper from `<Card title="Category Drift">` to `<section>` with the hairline header, and **delete** the entire `<div className="overflow-x-auto"><table>...</table></div>` block at the bottom.

**Imports to drop:** `Card`.

**Result:** Estimated **~104 → ~70 lines** (table removal is ~30 lines).

---

### Reports.5 + Reports.6 — `embeddings-status-section.tsx` &amp; `novelty-signals-section.tsx`

**Current.** Each is a `<Card title="...">` with a 2-cell `MetricTile` grid and one action button. They render side by side in a 2-column grid in the workspace.

**Sloppy:** Two heavy Cards for what should be **one-line status strips**.

**Proposed layout (Pattern B, very compact — single row each, side by side OR stacked):**

```
EMBEDDINGS         25 stored · 14 submissions         [Generate Embeddings]
NOVELTY SIGNALS    11 signals · ready                 [Refresh Signals]
```

Both become single-line bordered strips:
- Eyebrow label (uppercase tracking) on the left
- Inline stat strip in the middle (Pattern A)
- Action button on the right

When the workspace renders them, it places them on consecutive rows (vertical stack) rather than the current 2-column grid. Vertical stacking actually looks better when each row is one line tall.

**JSX skeleton (Embeddings, mirror for Novelty Signals):**

```tsx
<section className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-hairline)] py-3">
  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">Embeddings</span>
    <span><strong className="text-[var(--c-ink)]">{embeddingCount}</strong> <span className="text-[var(--c-muted)]">stored</span></span>
    <span aria-hidden className="text-[var(--c-muted)]">·</span>
    <span><strong className="text-[var(--c-ink)]">{submissionCount}</strong> <span className="text-[var(--c-muted)]">submissions</span></span>
  </div>
  <Button size="sm" variant="secondary" onClick={...} disabled={busy}>
    {busy ? "Queued" : "Generate Embeddings"}
  </Button>
</section>
```

**Workspace adjustment:** in `reports-workspace.tsx`, change the wrapping from `<section className="grid gap-5 lg:grid-cols-2">` to just rendering both sections sequentially (they're already wide single-line strips). Two consecutive single-line strips read as a list.

**Imports to drop in each file:** `Card`, `MetricTile`.

**Result:** Each file goes **~45 → ~30 lines**. Combined ~30 lines saved across the two, plus reports-workspace becomes simpler.

---

## Implementation sequence

Each commit is small and visual. Each commit should remove more JSX than it adds.

| # | Commit | Touches | Est. lines saved |
|---|---|---|---|
| 1 | `style(setup): inline question-manager metrics, drop card` | `question-manager-panel.tsx` | ~23 |
| 2 | `style(setup): flatten category taxonomy into row list` | `category-taxonomy-editor.tsx` | ~87 |
| 3 | `style(setup): flatten follow-up drafts into two row lists` | `follow-up-draft-editor.tsx` | ~56 |
| 4 | `style(setup): inline access-and-sharing, drop card` | `access-and-sharing-section.tsx` | ~13 (+ copy URL) |
| 5 | `style(setup): collapse AI readiness into baseline strip + status checklist` | `ai-readiness-section.tsx` | ~111 |
| 6 | `style(reports): inline personal-reports counters in panel header` | `personal-reports-master-detail-panel.tsx` | ~10 |
| 7 | `style(reports): drop card chrome from argument map` | `argument-map-section.tsx` | ~20 |
| 8 | `style(reports): drop card chrome from novelty radar` | `novelty-radar-section.tsx` | ~13 |
| 9 | `style(reports): drop card chrome from category drift, remove redundant table` | `category-drift-section.tsx` | ~34 |
| 10 | `style(reports): collapse embeddings + novelty signals into one-line strips` | `embeddings-status-section.tsx`, `novelty-signals-section.tsx`, `reports-workspace.tsx` | ~30 |

**Total estimated:** ~397 fewer JSX lines across Setup and Reports with zero behavior change.

---

## Optional shared helpers (extract later if 3+ callers)

These are not part of any commit above. Only extract if the pattern recurs enough that copy-pasting becomes a problem:

- `SectionBlock({ eyebrow, intro?, action?, children })` → wraps the `<section>` + hairline header + intro pattern. ~5 callers above.
- `StatStrip({ pairs })` → renders `<strong>{value}</strong> <span>{label}</span>` items separated by `·`. ~4 callers above.
- `ReadinessRow({ tone, label, badge, detail? })` → only used by AI Readiness; don't extract yet (one caller).

The rule from the repo's CLAUDE.md applies: don't introduce abstractions until at least three call sites exist.

---

## What is NOT in scope

- No backend changes. Same queries, same mutations, same data.
- No content changes. Same labels, same actions.
- No dark mode work beyond the existing `var(--c-*)` vars.
- No changes to Room. Room's structural sections + bordered ThreadCard are the post-Phase-13 final state.
- Master-detail Cards in `synthesis-master-detail-panel.tsx` and `personal-reports-master-detail-panel.tsx` keep their outer Card (the two-column container needs it).
- The `Card` UI primitive itself stays untouched. Other parts of the app use it correctly.

---

## Done criteria

- `grep -r "import.*Card.*from.*ui/card" src/components/instructor/setup/` returns at most 0–1 hits (only AccessAndSharingSection if it keeps the QR's white surface as a Card — but the plan above drops it too).
- `grep -r "MetricTile" src/components/instructor/setup/ src/components/instructor/reports/` returns zero hits.
- Setup workspace and Reports workspace render with at most one card layer per section. Master-detail panels in Reports are the only places with a heavy outer Card.
- AiReadinessSection drops from 236 → ~125 lines.
- All buttons fire the same mutations; no test or UI behavior regresses.
