# UI Phase 08: Instructor Branded Top Bar + LLM Settings Quick Access

## Problem

The instructor surfaces (dashboard, admin pages, live session) lack a consistent branded header. There's no quick way to reach LLM model settings from the dashboard or live session view — you have to know the admin nav exists. The admin sidebar is also missing entries for Prompts and Retrieval despite those routes and pages already existing.

## Changes

### 1. Shared brand bar component (`src/components/layout/instructor-brand-bar.tsx`) — NEW

- Reusable bar for all instructor surfaces
- Left: favicon inlined as 24px logo + "TalkTok" in `font-display`
- Right: GearSix icon button → `/instructor/admin/models`, ThemeToggle
- Background: `--c-surface-dark` with `--c-on-dark` text
- Compact height (~40px)

### 2. Instructor Dashboard (`src/pages/instructor-dashboard-page.tsx`)

- Mount `InstructorBrandBar` above the existing content
- Remove standalone ThemeToggle from header (now in brand bar)

### 3. Admin Shell (`src/components/layout/admin-shell.tsx`)

- Mount `InstructorBrandBar` above the existing content
- Remove standalone ThemeToggle and "Instructor Admin" badge (brand bar replaces them)

### 4. Instructor Session top bar (`src/components/layout/instructor-top-bar.tsx`)

- Add GearSix icon button next to ThemeToggle → `/instructor/admin/models`

### 5. Admin nav completeness (`src/lib/constants.ts`)

- Add `{ label: "Prompts", path: "/instructor/admin/prompts", icon: ChatCircleText }`
- Add `{ label: "Retrieval", path: "/instructor/admin/retrieval", icon: MagnifyingGlass }`
- New icon import: `MagnifyingGlass`

## Backend Impact

None.

## Acceptance Criteria

1. All instructor pages show the branded dark navy bar with logo + "TalkTok"
2. GearSix button visible on dashboard, admin shell, and live session top bar
3. Clicking GearSix navigates to `/instructor/admin/models`
4. Prompts and Retrieval appear in the admin sidebar nav
5. No duplicate ThemeToggles on any page
6. Works in both light and dark mode
