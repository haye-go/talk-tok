# UI Phase 09d: Shell Color Personality

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring signature color identity and clear section wayfinding to the participant shell, without bloating the vertical chrome.

**Architecture:** The shell header uses a two-level hierarchy on mobile: top row for session identity (favicon + title + code), second row for section identity (active tab name in its signature color). On desktop the nav rail handles section identity, so the second row hides. Each tab carries a signature color used in the section heading, bottom tab bar, nav rail, and a 3px accent strip. A `--c-topbar` CSS token provides a warm cream background in light mode and a warm dark surface in dark mode.

**Tech Stack:** React, Tailwind CSS v4 (OKLCH tokens), Phosphor icons

---

## Design Decisions

### Information hierarchy (mobile)

```
┌──────────────────────────────┐
│ 🗨️ Session Title    CODE  Jo ⚙│ ← session identity (cream bg)
│ Fight                        │ ← section identity (tab color)
│▀▀▀▀▀▀▀▀▀▀▀ coral ▀▀▀▀▀▀▀▀▀▀│ ← 3px accent strip
├──────────────────────────────┤
│ [content]                    │
├──────────────────────────────┤
│ ○ Contribute ○ Explore ◉ Fight ○ Me│
│                        coral       │
└──────────────────────────────┘
```

### Information hierarchy (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ 🗨️ TalkTok / Session Title   CODE                     Jo ⚙│
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ coral ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
├────────────┬──────────────────────────────────┬─────────────┤
│ Contribute │                                  │ prompt card │
│ ┃Explore   │  content                         │ questions   │
│  Fight     │                                  │             │
│  Me        │                                  │             │
└────────────┴──────────────────────────────────┴─────────────┘
```

### What goes where

| Information | Where | Why |
|---|---|---|
| Platform name "TalkTok" | Icon-only on mobile, wordmark on desktop (lg+) | Favicon IS the brand. Text is redundant on small screens. |
| Session title | Always in top row | Session identity — compact, truncated if long |
| Join code badge | Always in top row | Reference for sharing |
| Section/tab name | Second row on mobile (`lg:hidden`), nav rail on desktop | The thing students need most — "where am I?" |
| Nickname | Hidden on mobile, shown on sm+ | Low priority, saves space |
| Status banner | Separate component below header (to be revisited later) | Capability info, not section identity — don't mix them |

### What NOT to do

- Don't show "TalkTok" text on mobile — the icon is the brand
- Don't rely on the 3px accent strip alone — too subtle for section identity
- Don't use the status banner as section identity — it mixes orientation with workflow state
- Don't change the top bar background per tab — destabilises the brand anchor

### Tab color assignments

Following the lineage from the old ACTS (submit→sky, discover→peach, challenge→coral, synthesize→slate):

| Tab | Token | CSS variable |
|---|---|---|
| Contribute | sky | `var(--c-sig-sky)` |
| Explore | peach | `var(--c-sig-peach)` |
| Fight | coral | `var(--c-sig-coral)` |
| Me | mustard | `var(--c-sig-mustard)` |

### Dark mode

Signature colors are theme-independent (defined once in `:root`, not overridden). The top bar background uses a dedicated `--c-topbar` token:

- Light: `oklch(0.938 0.031 81.75)` (same as `--c-sig-cream`)
- Dark: `oklch(0.2 0.012 82.2)` (warm, slightly higher chroma than surface-soft)

---

## File Map

### Modified files

| File | Changes |
|---|---|
| `src/lib/constants.ts` | Add `color` field to `TabDefinition` and `TABS` entries |
| `src/styles/globals.css` | Add `--c-topbar` token for light and dark mode |
| `src/components/layout/participant-top-bar.tsx` | Cream bg, favicon, session title, section heading row (mobile), accent strip |
| `src/components/layout/bottom-tab-bar.tsx` | Active tab uses per-tab signature color |
| `src/components/layout/participant-nav-rail.tsx` | Active tab uses per-tab signature color for left border |
| `src/components/layout/participant-shell.tsx` | Pass `activeTab` to top bar |

---

## Task 1: Add Color to Tab Definitions

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1.1: Add `color` to `TabDefinition` interface**

In `src/lib/constants.ts`, change the `TabDefinition` interface from:

```ts
export interface TabDefinition {
  id: TabId;
  label: string;
  icon: Icon;
}
```

to:

```ts
export interface TabDefinition {
  id: TabId;
  label: string;
  icon: Icon;
  color: string;
}
```

- [ ] **Step 1.2: Add color values to TABS array**

Change the `TABS` constant from:

```ts
export const TABS: TabDefinition[] = [
  { id: "contribute", label: "Contribute", icon: Crosshair },
  { id: "explore", label: "Explore", icon: ChatCircleText },
  { id: "fight", label: "Fight", icon: Lightning },
  { id: "me", label: "Me", icon: User },
];
```

to:

```ts
export const TABS: TabDefinition[] = [
  { id: "contribute", label: "Contribute", icon: Crosshair, color: "var(--c-sig-sky)" },
  { id: "explore", label: "Explore", icon: ChatCircleText, color: "var(--c-sig-peach)" },
  { id: "fight", label: "Fight", icon: Lightning, color: "var(--c-sig-coral)" },
  { id: "me", label: "Me", icon: User, color: "var(--c-sig-mustard)" },
];
```

- [ ] **Step 1.3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 1.4: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add signature color to tab definitions"
```

---

## Task 2: Add `--c-topbar` CSS Token

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 2.1: Add `--c-topbar` in `:root` block**

After the `--c-border-strong` line in the `:root` block, add:

```css
  --c-topbar: oklch(0.938 0.031 81.75);
```

- [ ] **Step 2.2: Add `--c-topbar` in `html.dark` block**

After the `--c-border-strong` line in the `html.dark` block, add:

```css
  --c-topbar: oklch(0.2 0.012 82.2);
```

- [ ] **Step 2.3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: add --c-topbar token with dark mode support"
```

---

## Task 3: Restyle ParticipantTopBar

**Files:**
- Modify: `src/components/layout/participant-top-bar.tsx`

This is the core change. The top bar becomes a two-level header on mobile:

- **Row 1 (session identity):** favicon (24px) + session title (truncated) + join code badge + nickname (sm+) + theme toggle. "TalkTok" wordmark only on `lg+`.
- **Row 2 (section identity, mobile only):** active tab name in its signature color, 15px semibold. Hidden on desktop (`lg:hidden`) since the nav rail handles section identity there.
- **Accent strip:** 3px bar in the active tab's signature color. Visible on all breakpoints.

- [ ] **Step 3.1: Add `activeTab` prop**

Add `activeTab: TabId` to the `ParticipantTopBarProps` interface. Import `TABS` and `TabId` from constants.

- [ ] **Step 3.2: Rewrite the component**

```tsx
// src/components/layout/participant-top-bar.tsx
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DemoIdentityControls,
  getDemoDisplayNickname,
} from "@/components/demo/demo-identity-bar";
import { Badge } from "@/components/ui/badge";
import { TABS, type TabId } from "@/lib/constants";

interface ParticipantTopBarProps {
  sessionTitle: string;
  joinCode: string;
  nickname: string;
  sessionSlug: string;
  activeTab: TabId;
}

export function ParticipantTopBar({
  sessionTitle,
  joinCode,
  nickname,
  sessionSlug,
  activeTab,
}: ParticipantTopBarProps) {
  const demoNickname = getDemoDisplayNickname(sessionSlug);
  const tab = TABS.find((t) => t.id === activeTab);
  const tabColor = tab?.color ?? "var(--c-primary)";
  const tabLabel = tab?.label ?? "";

  return (
    <header className="shrink-0 bg-[var(--c-topbar)]">
      {/* Row 1: session identity */}
      <div className="flex min-h-12 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="hidden font-display text-sm font-semibold text-[var(--c-ink)] lg:inline">
            TalkTok
          </span>
          <span className="mx-0.5 hidden text-[var(--c-hairline)] lg:inline" aria-hidden>
            /
          </span>
          <h1 className="truncate font-display text-sm font-medium text-[var(--c-ink)]">
            {sessionTitle}
          </h1>
          <Badge tone="slate" className="shrink-0 text-[10px]">
            {joinCode}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {demoNickname ? (
            <>
              <DemoIdentityControls sessionSlug={sessionSlug} />
              <span className="hidden text-xs text-[var(--c-muted)] sm:inline">
                as <strong className="text-[var(--c-ink)]">{demoNickname}</strong>
              </span>
            </>
          ) : (
            <span className="hidden text-xs text-[var(--c-muted)] sm:inline">
              as {nickname}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Row 2: section identity (mobile only — desktop has nav rail) */}
      <div className="flex items-center px-4 pb-1.5 lg:hidden">
        <span
          className="font-display text-[15px] font-semibold"
          style={{ color: tabColor }}
        >
          {tabLabel}
        </span>
      </div>

      {/* Accent strip */}
      <div className="h-[3px]" style={{ backgroundColor: tabColor }} />
    </header>
  );
}
```

- [ ] **Step 3.3: Type-check**

Run: `npx tsc --noEmit`
Expected: will fail — `ParticipantShell` doesn't pass `activeTab` yet. Fixed in Task 6.

- [ ] **Step 3.4: Commit**

```bash
git add src/components/layout/participant-top-bar.tsx
git commit -m "feat: two-level top bar with section heading and accent strip"
```

---

## Task 4: Per-Tab Signature Colors in BottomTabBar

**Files:**
- Modify: `src/components/layout/bottom-tab-bar.tsx`

Active tab currently uses `--c-primary` for its top border and text. Replace with the tab's own signature color via inline `style` (necessary because the color is a CSS variable string, not a static Tailwind class).

- [ ] **Step 4.1: Use per-tab color for active state**

```tsx
// src/components/layout/bottom-tab-bar.tsx
import { TABS, type TabId } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
}

export function BottomTabBar({
  activeTab,
  onTabChange,
  className,
}: BottomTabBarProps) {
  return (
    <nav
      className={cn(
        "grid grid-cols-4 border-t border-[var(--c-hairline)] bg-[var(--c-canvas)] pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      aria-label="Participant tabs"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            data-active={active ? "true" : "false"}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 border-t-2 px-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-info-border)]",
              active
                ? "font-medium"
                : "border-transparent text-[var(--c-muted)]",
            )}
            style={active ? { borderColor: tab.color, color: tab.color } : undefined}
          >
            <Icon size={20} weight={active ? "bold" : "regular"} />
            <span className="font-display">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 4.3: Commit**

```bash
git add src/components/layout/bottom-tab-bar.tsx
git commit -m "feat: per-tab signature colors in bottom tab bar"
```

---

## Task 5: Per-Tab Signature Colors in ParticipantNavRail

**Files:**
- Modify: `src/components/layout/participant-nav-rail.tsx`

Same treatment as bottom tab bar: active tab's left border and text use its signature color via inline `style`.

- [ ] **Step 5.1: Use per-tab color for active state**

```tsx
// src/components/layout/participant-nav-rail.tsx
import { TABS, type TabId } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ParticipantNavRailProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function ParticipantNavRail({
  activeTab,
  onTabChange,
}: ParticipantNavRailProps) {
  return (
    <nav
      className="hidden w-[200px] shrink-0 flex-col border-r border-[var(--c-hairline)] bg-[var(--c-surface-soft)] lg:flex"
      aria-label="Participant tabs"
    >
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[var(--c-surface-strong)] font-medium"
                  : "border-transparent text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]",
              )}
              style={active ? { borderColor: tab.color, color: tab.color } : undefined}
            >
              <Icon size={20} weight={active ? "bold" : "regular"} />
              <span className="font-display">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 5.3: Commit**

```bash
git add src/components/layout/participant-nav-rail.tsx
git commit -m "feat: per-tab signature colors in desktop nav rail"
```

---

## Task 6: Wire `activeTab` to ParticipantTopBar

**Files:**
- Modify: `src/components/layout/participant-shell.tsx`

The shell already has `activeTab` — pass it through to the top bar.

- [ ] **Step 6.1: Add `activeTab` to the ParticipantTopBar call**

Change the `<ParticipantTopBar>` JSX from:

```tsx
      <ParticipantTopBar
        sessionTitle={sessionTitle}
        joinCode={joinCode}
        nickname={nickname}
        sessionSlug={sessionSlug}
      />
```

to:

```tsx
      <ParticipantTopBar
        sessionTitle={sessionTitle}
        joinCode={joinCode}
        nickname={nickname}
        sessionSlug={sessionSlug}
        activeTab={activeTab}
      />
```

- [ ] **Step 6.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6.3: Build**

Run: `npx vite build`
Expected: clean production build

- [ ] **Step 6.4: Commit**

```bash
git add src/components/layout/participant-shell.tsx
git commit -m "feat: pass activeTab to top bar for section heading and accent strip"
```

---

## Task 7: Visual QA

- [ ] **Step 7.1: Mobile light mode**

Start dev server: `npx vite --host`

Open the demo session on a mobile viewport (390px). Verify:
- Top bar has warm cream background, distinct from canvas body
- Favicon visible, "TalkTok" text hidden
- Session title + code badge visible
- Section heading row shows active tab name in its signature color ("Contribute" in sky)
- Switching tabs changes section heading + accent strip + bottom tab color
- Bottom tabs: active icon/label/border in signature color, inactive in muted

- [ ] **Step 7.2: Mobile dark mode**

Toggle dark mode. Verify:
- Top bar background is warm dark (not jarring cream)
- Section heading colors remain vivid
- Accent strip colors remain vivid
- Bottom tab signature colors legible on dark background

- [ ] **Step 7.3: Desktop (1280px+)**

Verify:
- "TalkTok" wordmark + "/" separator visible before session title
- Section heading row hidden (nav rail handles it)
- Nav rail active tab uses signature color for left border + text
- Accent strip visible at full width
- Bottom tab bar hidden

- [ ] **Step 7.4: Fix any issues, commit**

```bash
git add -A
git commit -m "fix: visual QA polish for shell color personality"
```

---

## Summary

| Task | What | Files |
|---|---|---|
| 1 | Tab color assignments | `constants.ts` |
| 2 | `--c-topbar` CSS token (light + dark) | `globals.css` |
| 3 | Two-level top bar: session row + section heading + accent strip | `participant-top-bar.tsx` |
| 4 | Per-tab signature colors in bottom tabs | `bottom-tab-bar.tsx` |
| 5 | Per-tab signature colors in nav rail | `participant-nav-rail.tsx` |
| 6 | Wire `activeTab` to top bar | `participant-shell.tsx` |
| 7 | Visual QA (mobile/desktop, light/dark) | any file needing polish |

## Status

All tasks are already implemented. This plan documents the final design decisions and code for reference.
