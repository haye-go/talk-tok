# Phase 01: App Foundation and Design System Integration

## Purpose

Build the stable frontend foundation that the final UI can attach to.

This phase should not implement the full product workflow yet. It should establish:

- VitePlus workflow
- route structure with readable slugs
- light-default OKLCH design tokens
- theme switching
- core UI primitives
- participant, instructor, admin, and projector shells
- testable route and component contracts

## Current Baseline

Already done:

- VitePlus + React + TypeScript app scaffold
- Convex dependency and provider wiring
- TanStack Router dependency
- readable route placeholders in manual route config
- Convex starter schema
- Convex AI guidance files
- Phosphor icons
- Pretext package
- QR code package
- GitHub repo and initial commits

Important constraints:

- Use `vp dev`, `vp check`, `vp test`, and `vp build`.
- Public URLs must use readable words, never Convex document IDs.
- `docs/` is ignored by Git for now.
- Do not overwrite `convex/schema.ts`.
- The app must render even before `npx convex dev` writes `VITE_CONVEX_URL`.

## Target Route Contract

Use singular, readable routes:

```txt
/
/join/:sessionCode
/session/:sessionSlug
/session/:sessionSlug/fight/:fightSlug
/session/:sessionSlug/review
/instructor
/instructor/session/new
/instructor/session/:sessionSlug
/instructor/session/:sessionSlug/projector
/instructor/templates
/instructor/admin/models
/instructor/admin/prompts
/instructor/admin/retrieval
/instructor/admin/protection
/instructor/admin/observability
```

For this phase, routes may render placeholders through real shells. Feature data can be mocked.

## Task 1: Dependency Alignment

Install the design-system dependencies:

- `tailwindcss`
- `@tailwindcss/vite`
- `@base-ui/react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`

Optional only if verified with `vp test`:

- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

Acceptance:

- `vp check` passes.
- `vp test` passes.
- `vp build` passes.
- No unrelated docs/design artifacts are formatted or committed.

## Task 2: Tailwind v4 and Tokenized Theme

Replace temporary CSS with the designer-aligned token system.

Implement:

- `src/styles/globals.css`
- Tailwind v4 import and Vite plugin
- light mode as default
- `.dark` theme override
- OKLCH surface, text, border, semantic, and signature tokens
- `sig-dark` and `sig-light` classes for fixed signature-card contrast
- font-face setup using the repo font files

Token priorities:

- canvas and surface scale
- ink, body, muted text colors
- hairline and border-strong
- signature coral, slate, cream, peach, sky, yellow, mustard
- link, success, info, warning, error

Acceptance:

- app defaults to light theme
- dark theme can be applied by adding `dark` to `html`
- signature cards keep stable colors across themes
- text contrast remains readable in both themes

## Task 3: Shared Utilities and Constants

Create:

- `src/lib/utils.ts` with `cn()`
- `src/lib/routes.ts` for route builders
- `src/lib/constants.ts` for acts, tabs, signature colors, and default labels

Constants should include:

- acts: `submit`, `discover`, `challenge`, `synthesize`
- tabs: `main`, `stream`, `fight-me`, `my-zone`
- act-to-color mapping
- default session code example: `SPARK`
- default demo session slug: `demo-discussion`

Acceptance:

- route builders produce readable paths
- no route builder accepts a raw Convex ID for public navigation
- constants are typed and reused by shell components

## Task 4: Theme Hook and Toggle

Create:

- `src/hooks/use-theme.ts`
- `src/components/theme-toggle.tsx`

Behavior:

- default to light
- persist preference under `talktok-theme`
- apply `.dark` to `document.documentElement`
- avoid hydration/runtime errors when rendering outside the browser

Acceptance:

- theme can switch between light and dark
- setting persists after refresh
- `vp test` covers the hook if DOM test setup is available

## Task 5: Core UI Primitives

Create local, owned components following shadcn-style composition with Base UI where useful:

- `Button`
- `Input`
- `Textarea`
- `Card`
- `Badge`
- `Switch`
- `Tabs` or segmented control
- `Chip`
- `MetricTile`
- `InlineAlert`

Rules:

- Use Phosphor for icons.
- Use CSS variables/Tailwind tokens, not raw color literals in components.
- Preserve visible focus states.
- Minimum touch target should be 44px for mobile actions.
- Inputs must use native controls; do not use Pretext for input.

Acceptance:

- component examples render in the foundation page
- keyboard focus is visible
- disabled, loading, selected, warning, and error states exist where applicable

## Task 6: Participant Shell

Create:

- `src/components/layout/participant-shell.tsx`
- `src/components/layout/act-progress-bar.tsx`
- `src/components/layout/bottom-tab-bar.tsx`

Behavior:

- mobile-first layout
- top act progress with four segments
- bottom tab bar with `Main`, `Stream`, `Fight Me`, `My Zone`
- tab unlock behavior can be mocked for now
- content area accepts route/page children
- safe-area padding for mobile bottom bar

Acceptance:

- `/session/demo-discussion` renders participant shell
- bottom tab bar fits mobile width
- Fight Me can appear locked before Challenge act
- shell works in light and dark themes

## Task 7: Instructor Shell

Create:

- `src/components/layout/instructor-shell.tsx`
- `src/components/layout/instructor-top-bar.tsx`
- `src/components/layout/three-panel-layout.tsx`

Behavior:

- desktop-first
- top bar with session title, code, participant count, act controls, theme toggle
- left panel: categories placeholder
- center panel: analytics/visualization placeholder
- right panel: activity feed placeholder
- responsive fallback below tablet width

Acceptance:

- `/instructor/session/demo-discussion` renders instructor shell
- three-panel layout fills the viewport
- command actions are placeholders, not wired to backend yet

## Task 8: Admin Shell

Create:

- `src/components/layout/admin-shell.tsx`
- placeholder pages for model, prompt, retrieval, protection, and observability routes

Admin areas:

- Providers & Models
- Prompt Templates
- Retrieval / Context
- Protection
- Observability

Acceptance:

- each admin route renders through shared admin shell
- navigation uses readable URLs
- pages show placeholder cards for future forms/tables

## Task 9: Projector Route

Create a projector shell for:

```txt
/instructor/session/:sessionSlug/projector
```

Behavior:

- display-only
- high contrast
- no dense controls
- large session code and category summary placeholders

Acceptance:

- route renders without instructor controls
- typography is readable at large distance

## Task 10: Pretext Display Boundary

Create a wrapper component or adapter placeholder:

- `src/components/text/pretext-display.tsx`

For this phase:

- define props and fallback rendering
- do not over-integrate measurement logic yet
- mark intended use for response previews, synthesis, quotes, My Zone cards, and activity feed

Acceptance:

- display surfaces can import a stable wrapper later
- inputs remain native textareas

## Task 11: Verification and Commit

Run:

```bash
vp check
vp test
vp build
```

Commit in small slices:

1. dependencies and Tailwind setup
2. tokens and theme
3. primitives
4. route shells
5. tests and cleanup

Do not commit:

- `.env.local`
- `dist/`
- `docs/`
- `.superpowers/`
- `.agents/`
- local design previews

## Open Decisions To Resolve During This Phase

- Whether to migrate from manual TanStack routes to file-based routing immediately.
- Whether DOM Testing Library + jsdom works reliably through `vp test`.
- Whether admin screens should be visually dense from the start or start as plain settings shells.
- Whether projector mode is only a route or also a toggle inside command center.

## Definition of Done

Phase 01 is complete when:

- all target routes render
- participant shell exists
- instructor shell exists
- admin shell exists
- projector shell exists
- light/dark token system is active
- core primitives are available
- `vp check`, `vp test`, and `vp build` pass
- code is committed and pushed to GitHub
