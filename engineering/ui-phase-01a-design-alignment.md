# UI Phase 01a: Design Alignment Pass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing Phase 01 foundation with the agreed design decisions: warm cream canvas (light), dark surface (dark), signature-card contrast tokens, Plus Jakarta Sans on tab bar, and verified readability across all surfaces.

**Architecture:** Token-level changes to globals.css, minor component updates to tab bar font and contrast classes. No structural changes — everything built in Phase 01 stays.

**Tech Stack:** Tailwind CSS v4, OKLCH color tokens, existing component library

**Prerequisite:** Phase 01 complete (it is).

---

## Context

During brainstorming, we made these design decisions that the Phase 01 foundation doesn't fully reflect yet:

1. **Light mode canvas should be warm cream** (`oklch(0.9500 0.012 81.75)`), not near-white
2. **Signature-card contrast** needs dedicated tokens so text is always readable on cream/peach/sky/coral/slate surfaces regardless of theme
3. **Tab bar labels** should use Plus Jakarta Sans (display font), not Literata (body font)
4. **Missing badge tones** — mustard and yellow variants are in the design plan but not in the badge component
5. **Missing button variant** — coral variant for Fight Me actions

---

### Task 1: Update Light Mode Canvas Tokens

**Files:**

- Modify: `src/styles/globals.css`

- [ ] **Step 1: Shift light mode canvas to warm cream**

In `src/styles/globals.css`, update the `:root` block:

```css
/* Change from near-white to warm cream */
--c-canvas: oklch(0.95 0.012 81.75);
--c-surface-soft: oklch(0.975 0.006 81.75);
/* surface-strong stays the same */
```

The current values are:

```css
/* OLD */
--c-canvas: oklch(0.995 0.003 82.2);
--c-surface-soft: oklch(0.9842 0.0034 81.75);
```

- [ ] **Step 2: Add signature-card contrast tokens**

Add these to the `:root` block, after the signature palette:

```css
/* Fixed text colors for signature surfaces (theme-independent) */
--c-on-sig-light: oklch(0.2299 0.019 82.2);
--c-on-sig-light-body: oklch(0.3391 0.016 82.2);
--c-on-sig-dark: oklch(0.995 0.003 82.2);
--c-on-sig-dark-body: oklch(0.85 0.01 82.2);
```

These do NOT change in `html.dark` — they are pinned contrast values for signature surfaces.

- [ ] **Step 3: Update the body background gradient**

The current body background uses a radial cream gradient. With the canvas now cream-tinted, adjust the gradient to be subtler:

```css
body {
  /* ... existing properties ... */
  background:
    radial-gradient(
      circle at top left,
      color-mix(in oklch, var(--c-sig-cream), transparent 60%),
      transparent 24rem
    ),
    var(--c-canvas);
}
```

Change `42%` to `60%` so it's gentler against the already-warm canvas.

- [ ] **Step 4: Verify in browser**

```bash
vp dev
```

Open `http://localhost:5173/session/demo-discussion`. The canvas should now be a subtle warm cream, not stark white. Toggle dark mode — should still be deep warm dark. The gradient overlay should be barely noticeable in light mode.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: shift light canvas to warm cream, add signature contrast tokens"
```

---

### Task 2: Tab Bar Display Font

**Files:**

- Modify: `src/components/layout/bottom-tab-bar.tsx`

- [ ] **Step 1: Add font-display class to tab labels**

In `bottom-tab-bar.tsx`, the tab button currently uses default font (inherits body/Literata). Change the `<span>` to use display font:

Find this line inside the button's children:

```tsx
<span>{tab.label}</span>
```

Replace with:

```tsx
<span className="font-display">{tab.label}</span>
```

The `font-display` class maps to `--font-display` ("Plus Jakarta Sans") via the Tailwind `@theme` block in globals.css.

- [ ] **Step 2: Verify in browser**

Open the participant session view. The tab labels (Main, Stream, Fight Me, My Zone) should now render in Plus Jakarta Sans instead of Literata. Compare against the body text in the content area — they should look different (sans-serif vs serif).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/bottom-tab-bar.tsx
git commit -m "style: use display font (Plus Jakarta Sans) for tab bar labels"
```

---

### Task 3: Add Missing Badge Tones

**Files:**

- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: Add mustard, yellow, and cream tones**

In `badge.tsx`, add these entries to the `toneClass` record:

```ts
const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-[var(--c-hairline)] bg-[var(--c-surface-strong)] text-[var(--c-ink)]",
  sky: "border-transparent bg-[var(--c-sig-sky)] text-[var(--c-on-sig-light)]",
  peach: "border-transparent bg-[var(--c-sig-peach)] text-[var(--c-on-sig-light)]",
  coral: "border-transparent bg-[var(--c-sig-coral)] text-[var(--c-on-sig-dark)]",
  slate: "border-transparent bg-[var(--c-sig-slate)] text-[var(--c-on-sig-dark)]",
  cream: "border-transparent bg-[var(--c-sig-cream)] text-[var(--c-on-sig-light)]",
  mustard: "border-transparent bg-[var(--c-sig-mustard)] text-[var(--c-on-sig-light)]",
  yellow: "border-transparent bg-[var(--c-sig-yellow)] text-[var(--c-on-sig-light)]",
  success: "border-transparent bg-[var(--c-success)] text-white",
  warning: "border-transparent bg-[var(--c-warning)] text-[var(--c-on-sig-light)]",
  error: "border-transparent bg-[var(--c-error)] text-white",
};
```

Update the type:

```ts
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?:
    | "neutral"
    | "sky"
    | "peach"
    | "coral"
    | "slate"
    | "cream"
    | "mustard"
    | "yellow"
    | "success"
    | "warning"
    | "error";
}
```

Note: text colors on light signature surfaces now use `--c-on-sig-light` instead of `--c-ink`. This ensures readability even if a future theme changes `--c-ink`. The `text-white` on coral/slate/success/error stays hardcoded because those surfaces are dark enough that white text works in both themes.

- [ ] **Step 2: Verify all badge tones render**

Add temporary badge showcase to the home page or dev tools. Verify:

- cream, peach, sky, yellow, mustard badges have dark readable text
- coral, slate badges have white readable text
- All remain correct when toggling to dark mode (signature colors don't change)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat: add cream, mustard, yellow badge tones with contrast-safe text"
```

---

### Task 4: Add Coral Button Variant

**Files:**

- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Add coral variant for Fight Me actions**

In `button.tsx`, add a `coral` entry to the variant object inside `buttonVariants`:

```ts
variant: {
  primary:
    "bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:bg-[var(--c-primary-active)]",
  secondary:
    "border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] text-[var(--c-ink)] hover:bg-[var(--c-surface-strong)]",
  ghost: "text-[var(--c-ink)] hover:bg-[var(--c-surface-soft)]",
  coral:
    "bg-[var(--c-sig-coral)] text-[var(--c-on-sig-dark)] hover:brightness-95",
  danger: "bg-[var(--c-error)] text-white hover:brightness-95",
},
```

- [ ] **Step 2: Verify coral button renders**

The coral button should have a warm red background with white text. Used for Fight Me "Fire Back" and "vs AI" actions.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: add coral button variant for Fight Me actions"
```

---

### Task 5: Verify Full Alignment

**Files:** None — verification only.

- [ ] **Step 1: Run type check**

```bash
vp check
```

Expected: No type errors.

- [ ] **Step 2: Run tests**

```bash
vp test
```

Expected: All existing tests pass.

- [ ] **Step 3: Visual verification checklist**

Open `vp dev` and check each surface:

| Check                                      | Route                       | Expected                                   |
| ------------------------------------------ | --------------------------- | ------------------------------------------ |
| Light canvas is warm cream, not white      | `/session/demo-discussion`  | Subtle warm tint visible                   |
| Dark mode is deep warm dark                | Toggle dark                 | Dark canvas, light text                    |
| Tab bar uses Plus Jakarta Sans             | `/session/demo-discussion`  | Tab labels in sans-serif display font      |
| Cream topic card text is readable          | Discover act placeholder    | Dark text on cream surface                 |
| Badge tones all render                     | Home page or dev preview    | All 11 tones visible with correct contrast |
| Coral button renders                       | Add to any page temporarily | Warm red bg, white text                    |
| Signature colors don't change in dark mode | Toggle                      | Coral/slate/cream/etc stay same hue        |

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify design alignment pass complete"
```

---

## What This Plan Produces

After these 5 tasks:

- Light mode canvas is warm cream (not flat white)
- Dark mode is deep warm dark (unchanged from Phase 01)
- Signature-card contrast tokens exist (`--c-on-sig-light`, `--c-on-sig-dark`)
- Tab bar labels use Plus Jakarta Sans
- Badge has 11 tones including mustard, yellow, cream
- Button has coral variant for Fight Me
- All existing tests still pass

## What Comes Next

- **UI Phase 02: Screen Content (Mock Data)** — Build actual screen content for pages that don't need backend data: Join, Lobby, Submit composer, Fight Me thread layout, My Zone layout, Session Creation form, Admin screen layouts
- **UI Phase 03: Backend-Connected Screens** — Wire Convex queries into Discover, Stream, Synthesize, Command Center as backend Phases 02-08 deliver data
