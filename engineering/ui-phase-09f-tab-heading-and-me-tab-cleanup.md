# UI Phase 09f: Tab Heading Contrast & Me Tab Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix participant tab heading contrast in both light and dark mode without mutating the shared signature palette, and remove duplicate local chrome from the `Me` tab so it matches the rest of the participant workspace.

**Architecture:** Participant shell section headings stop using raw signature/accent tokens as text color. Instead, add theme-aware semantic heading tokens for each tab and consume those from the shell content header. The `Me` tab removes its internal peach intro banner, keeps the shell heading as the only section title, and reorders secondary profile controls so the tab reads as report/history first, settings second.

**Tech Stack:** React, Tailwind CSS v4, OKLCH tokens, Phosphor Icons

---

## Why this phase exists

Two issues remain after the shell/content-header cleanup:

1. **Heading contrast is inconsistent**
   - The shell heading currently uses `tab.color` directly from `TABS`
   - `Contribute` (`--c-sig-sky`) and `Explore` (`--c-sig-peach`) are too light as text on the light canvas
   - In dark mode, the same approach is still wrong in principle even when it looks acceptable by accident

2. **`Me` still has duplicate local chrome**
   - `ParticipantShell` already renders the page heading
   - `MyZoneTab` still renders its own peach `Me` hero block
   - `MeTabContent` then appends a separate nickname card, making the tab feel heavier and more fragmented than the others

**Decision:** Do **not** darken the base signature palette globally. Add separate semantic heading tokens for text use.

---

## Design rules

- Base signature tokens (`--c-sig-sky`, `--c-sig-peach`, etc.) remain brand/accent colors
- Tab headings use **text-specific semantic tokens**
- Heading tokens must be defined for **both light and dark mode**
- Shell-level section heading is the only page heading for a tab
- Tab-local intro banners that repeat the section name should be removed
- `Me` should read in this order:
  1. report / report state
  2. response history / private archive
  3. profile controls (nickname)

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/styles/globals.css` | Modify | Add semantic tab-heading color tokens for light and dark themes |
| `src/components/layout/participant-shell.tsx` | Modify | Consume heading tokens instead of raw `tab.color` |
| `src/components/myzone/my-zone-tab.tsx` | Modify | Remove duplicate peach intro block and tighten empty/report states |
| `src/pages/participant-workspace-page.tsx` | Modify | Demote/reposition nickname editor in `MeTabContent` |

---

## Token strategy

### Do not change

Keep these untouched as shared accent/brand tokens:

- `--c-sig-sky`
- `--c-sig-peach`
- `--c-sig-coral`
- `--c-sig-mustard`

These are used in more places than headings: nav states, badges, surfaces, and accent blocks.

### Add

Add new semantic heading tokens:

- `--c-tab-heading-contribute`
- `--c-tab-heading-explore`
- `--c-tab-heading-fight`
- `--c-tab-heading-me`

These should be defined in both `:root` and `html.dark`.

### Light-mode direction

Heading tokens should be darker than the raw signature tokens and tuned for text readability on `--c-canvas`.

Practical rule:
- keep hue family aligned to the tab color
- reduce lightness enough for text contrast
- preserve some chroma so the heading still feels branded

### Dark-mode direction

Use the same semantic token model in dark mode rather than falling back to raw signature colors.

Practical rule:
- brighter than light-mode heading tokens
- still text-tuned, not surface/accent tuned
- readable against `--c-canvas` dark background

### Value selection approach

Prefer one of these approaches:

1. **Explicit OKLCH values** per heading token in light and dark mode
2. **Derived color-mix values** anchored to `--c-ink`

Recommendation: use **explicit tokens** first for predictability and easier visual QA.

---

## Task 1: Add semantic tab heading tokens

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1.1: Add heading tokens in light mode**

In `:root`, add:

```css
--c-tab-heading-contribute: ...;
--c-tab-heading-explore: ...;
--c-tab-heading-fight: ...;
--c-tab-heading-me: ...;
```

Requirements:
- darker than `--c-sig-sky` / `--c-sig-peach` / `--c-sig-mustard`
- still visibly associated with each tab's brand color
- no changes to the base `--c-sig-*` tokens

- [ ] **Step 1.2: Add heading tokens in dark mode**

In `html.dark`, add matching semantic heading tokens with dark-theme values.

Requirements:
- readable on `--c-canvas` dark background
- maintain tab color identity
- do not reuse raw signature tokens directly

- [ ] **Step 1.3: Keep all other signature token usage unchanged**

Do not modify:
- bottom tab bar active accents
- nav rail active accents
- signature badges
- signature surface fills

This phase only changes **heading text color**.

---

## Task 2: Update participant shell heading to use semantic tokens

**Files:**
- Modify: `src/components/layout/participant-shell.tsx`

- [ ] **Step 2.1: Replace raw `tab.color` usage for the content header**

Current behavior:
- shell heading uses `style={{ color: tab?.color }}`

New behavior:
- heading color should come from a tab-id to semantic-token mapping

Suggested direction:

```tsx
const tabHeadingColor: Record<TabId, string> = {
  contribute: "var(--c-tab-heading-contribute)",
  explore: "var(--c-tab-heading-explore)",
  fight: "var(--c-tab-heading-fight)",
  me: "var(--c-tab-heading-me)",
};
```

Apply this only to the page heading inside `<main>`.

- [ ] **Step 2.2: Keep nav accents on raw tab colors**

Do not repurpose this heading token mapping for:
- `BottomTabBar`
- `ParticipantNavRail`

Those controls should keep their existing accent treatment unless visual QA shows a separate issue.

---

## Task 3: Remove duplicate `Me` intro chrome

**Files:**
- Modify: `src/components/myzone/my-zone-tab.tsx`

- [ ] **Step 3.1: Remove the peach intro block**

Delete the local banner block that currently renders:
- `Me`
- `Your private archive, feedback, and report`

Reason:
- the shell already renders the section heading
- this local banner creates duplicate heading chrome and makes the `Me` tab visually heavier than the others

- [ ] **Step 3.2: Keep report state as the primary top content**

After removing the peach banner, the first meaningful block in `MyZoneTab` should be the personal-report state card or report summary content.

Do not add a replacement hero/banner.

- [ ] **Step 3.3: Tighten the empty response state**

Current empty state:

```tsx
<p className="text-sm text-[var(--c-muted)]">Your submitted responses appear here.</p>
```

Replace this loose sentence with a more deliberate compact empty state, such as:
- a small neutral card
- or a better-framed quiet notice

Goal:
- avoid random floating text between larger cards

---

## Task 4: Demote profile controls inside `Me`

**Files:**
- Modify: `src/pages/participant-workspace-page.tsx`

- [ ] **Step 4.1: Keep nickname editing, but make it secondary**

`MeTabContent` currently appends a full `Nickname` card immediately after `MyZoneTab`.

Keep the feature, but reduce its visual priority.

Preferred direction:
- place it after report/archive/history content
- style it as a secondary profile/settings card
- avoid letting it compete with report/history as a first-screen block

- [ ] **Step 4.2: Do not mix shell identity with profile controls**

The nickname editor is a settings/control concern, not page identity.

Do not reintroduce:
- local hero blocks
- repeated `Me` headers
- explanatory straps that duplicate the section heading

---

## Task 5: Review `Me` content order and emphasis

**Files:**
- Modify: `src/components/myzone/my-zone-tab.tsx`
- Modify: `src/pages/participant-workspace-page.tsx`

- [ ] **Step 5.1: Ensure content priority is correct**

Desired order:

1. Personal report state / summary
2. Contributions and follow-ups
3. Position shifts / fight history
4. Nickname editor

- [ ] **Step 5.2: Keep card titles that add meaning; remove only redundant ones**

Do not blindly strip titles from everything in `MyZoneTab`.

Keep titles like:
- `Follow-ups`
- `Position shifts`
- `Fight history`

Remove only the tab-level duplicate heading treatment.

---

## Task 6: Light and dark mode QA

**Files:**
- Possibly modify any file from Tasks 1-5 for visual tuning

- [ ] **Step 6.1: Verify heading readability in light mode**

Check:
- `Contribute` heading is no longer too pale
- `Explore` heading is no longer too pale
- `Fight` heading still feels branded and readable
- `Me` heading reads cleanly against light canvas

- [ ] **Step 6.2: Verify heading readability in dark mode**

Check:
- all four tab headings remain readable against dark canvas
- no heading feels muddy or too dim
- no heading becomes neon/brighter than the surrounding UI hierarchy

- [ ] **Step 6.3: Verify no collateral token regressions**

Check that these remain unchanged:
- bottom tab active borders and icon/text accents
- nav rail active accents
- signature badges
- prompt cards and other signature surfaces

- [ ] **Step 6.4: Verify `Me` tab composition**

Check:
- no duplicate `Me` banner inside tab content
- report state appears first
- nickname editor reads as secondary
- empty state, if shown, feels deliberate rather than leftover

---

## Success criteria

- Participant tab headings are readable in **light mode**
- Participant tab headings are readable in **dark mode**
- Base signature/accent tokens remain unchanged
- `Me` no longer has duplicate heading chrome
- `Me` content order feels consistent with the rest of the participant tabs
- No new shell-level chrome is introduced to compensate

