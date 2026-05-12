# UI Phase 09e: Content Header & Status Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the section title out of the shell chrome and into the content area; kill the multi-line status banner; establish a clean mobile model where status is shown only when actionable or newly changed.

**Architecture:** The top bar becomes session-identity only. Each tab's section name renders as the page-level heading at the top of the scrollable content area (inside `<main>`). The old multi-line shell status banner is removed. On desktop, it is replaced by a quiet one-line status hint below the heading when relevant. On mobile, there is no persistent status — gating/blocking messages are delivered as inline notices inside tab content, and instructor-triggered state changes will be delivered via toast (toast infrastructure is deferred to a follow-up phase).

**Tech Stack:** React, Tailwind CSS v4, OKLCH tokens, Phosphor Icons

---

## Mobile status philosophy

On mobile, remove the persistent shell status banner. Show status only when it is actionable or newly changed. Use inline notices inside the active tab when that tab is blocked or gated. Keep the shell focused on session identity and section identity.

**Delivery mechanisms:**
- **Inline notice/card** when the current tab is blocked or gated:
  - Fight: "Submit a response before you can start a Fight thread." + CTA
  - Explore: "Peer responses are not released yet" (already exists in `StreamTab`)
  - Contribute: "Contributions are paused" card (already exists)
  - Me: "Your personal report is not released yet"
- **Toast for instructor-triggered updates** (deferred — no toast infrastructure exists yet):
  - "Peer responses are now open"
  - "Fight is now available"
  - "Contributions were paused"
  - "Synthesis was released"
- **No persistent capability inventory on mobile** — no "Available: ..." / "Not yet released: ..."

The mobile model becomes:
```
top bar: session identity
content header: section title (colored, scrollable)
inline tab-specific notice only if needed
cards / working content
bottom tab bar
```

Desktop can still keep a quiet one-line status hint below the heading — there is room for it.

---

## Current state (what's wrong)

```
┌─────────────────────────────────────┐
│ 🔥 TalkTok / Best Food… [SNACK] 🌙 │  ← top bar row 1 (session identity) ✓
│ Fight                               │  ← top bar row 2 (section heading) ✗ wrong layer
│ ═══════ coral accent strip ═══════  │  ← redundant with bottom tab
│ 🟡 Your points are submitted        │  ← status banner line 1
│   Available: peer responses · Fight  │  ← status banner line 2 (chip list)
│   Not yet released: synthesis · …   │  ← status banner line 3 (chip list)
├─────────────────────────────────────┤
│ [Card: Fight needs a contribution   │  ← card title duplicates section name
│  first]                             │
│                                     │
│ (actual content far down the page)  │
├─────────────────────────────────────┤
│  ✚ Contribute  💬 Explore  ⚡ Fight  👤 Me │
└─────────────────────────────────────┘
```

**Problems:**
1. Section heading is in the shell chrome (top bar row 2) — should be page-level
2. Accent strip is redundant with the bottom tab's colored border
3. Status banner is 3 lines of chip lists — too much chrome before content
4. Card titles duplicate the section name already shown by the heading
5. Status banner is always visible even when it has nothing useful to say

## Target state

```
┌─────────────────────────────────────┐
│ 🔥 TalkTok / Best Food… [SNACK] 🌙 │  ← top bar: session identity only
├─────────────────────────────────────┤
│                                     │
│  Fight              ← content header (colored, scrollable)
│  Fight unlocks after…  (desktop)    │  ← one-line hint, desktop only
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Submit a response before you    ││  ← inline notice card (no "Fight" title)
│  │ can open a Fight thread.        ││
│  │ [Go to Contribute]             ││  ← CTA
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  ✚ Contribute  💬 Explore  ⚡ Fight  👤 Me │
└─────────────────────────────────────┘
```

**Rules:**
- session name = shell-level identity (top bar)
- section name = page-level heading (content area, scrollable)
- state = inline notice inside tab content when blocked/gated
- desktop hint = quiet one-line text below heading (hidden on mobile)
- explanation/actions = cards with CTAs

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/components/layout/participant-top-bar.tsx` | Modify | Remove section heading row, accent strip, `activeTab` prop |
| `src/components/layout/participant-status-banner.tsx` | Rewrite | Desktop-only one-line tab-aware hint, return `null` when nothing to say |
| `src/components/layout/participant-shell.tsx` | Modify | Remove old banner position, add content header + banner inside `<main>` |
| `src/pages/participant-workspace-page.tsx` | Modify | Remove duplicate card titles, add CTAs to gating cards |

---

## Existing inline notices (already in codebase, no changes needed)

These tab-content-level gating messages already exist and serve as the mobile status mechanism:

- **Explore tab** (`stream-tab.tsx:239`): `"Peer responses remain private until the instructor releases them."` — shown when `!canSeeRawPeerResponses`
- **Contribute tab** (`participant-workspace-page.tsx:562`): `<Card title="Contributions are paused">` — shown when `!contributionsOpen && no contributions` (title will be removed in Task 4)
- **Fight tab** (`participant-workspace-page.tsx:773`): `<Card title="Fight needs a contribution first">` — shown when `canUseFight && !canUseFightMe` (title will be removed in Task 4)
- **Fight tab** (`participant-workspace-page.tsx:782`): `<Card title="Fight is unavailable">` — shown when `!canUseFight` (title will be removed in Task 4)

These inline notices mean that mobile users already see blocking/gating info inside the tab content. The shell-level banner is redundant on mobile.

---

## Deferred: Toast infrastructure for instructor-triggered updates

**Not in scope for this phase.** Requires:
- Install `sonner` (shadcn-compatible toast library): `npx shadcn@latest add sonner`
- Add `<Toaster />` to the app root
- Create a `useCapabilityChangeToasts` hook that compares previous vs. current capabilities via `useRef` and fires toasts on transitions (e.g. `fightEnabled` goes `false→true` → toast "Fight is now available")
- Wire the hook into `ParticipantWorkspacePage`

This is a separate phase because it needs state-change detection, not just current-state rendering.

---

### Task 1: Simplify ParticipantTopBar to session identity only

**Files:**
- Modify: `src/components/layout/participant-top-bar.tsx`

The top bar keeps: favicon, "TalkTok" brand, session title, join code badge, demo identity controls, nickname, theme toggle. Remove: section heading row, accent strip, `activeTab` prop, `TABS` import. Because the section heading moves into `<main>`, the session title in the top bar should render as ordinary shell text, not as the page-level heading.

- [ ] **Step 1: Remove activeTab prop and tab-related code**

```tsx
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DemoIdentityControls,
  getDemoDisplayNickname,
} from "@/components/demo/demo-identity-bar";
import { Badge } from "@/components/ui/badge";

interface ParticipantTopBarProps {
  sessionTitle: string;
  joinCode: string;
  nickname: string;
  sessionSlug: string;
}

export function ParticipantTopBar({
  sessionTitle,
  joinCode,
  nickname,
  sessionSlug,
}: ParticipantTopBarProps) {
  const demoNickname = getDemoDisplayNickname(sessionSlug);

  return (
    <header className="shrink-0 border-b border-[var(--c-hairline)] bg-[var(--c-topbar)]">
      <div className="flex min-h-12 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="hidden font-display text-sm font-semibold text-[var(--c-ink)] lg:inline">
            TalkTok
          </span>
          <span className="mx-0.5 hidden text-[var(--c-hairline)] lg:inline" aria-hidden>
            /
          </span>
          <p className="truncate font-display text-sm font-medium text-[var(--c-ink)]">
            {sessionTitle}
          </p>
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
    </header>
  );
}
```

Key changes vs. current:
- Remove `TABS` and `TabId` imports
- Remove `activeTab` from props and interface
- Remove `tab`, `tabColor`, `tabLabel` derived values
- Remove the `<div className="flex items-center px-4 pb-1.5 lg:hidden">` section heading row
- Remove the `<div className="h-[3px]" ...>` accent strip
- Add `border-b border-[var(--c-hairline)]` to `<header>` for separation

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | Select-String "participant-top-bar|participant-shell"`

Expected: Errors in participant-shell.tsx about `activeTab` prop no longer accepted — these will be fixed in Task 3.

---

### Task 2: Rewrite ParticipantStatusBanner as desktop-only tab-aware hint

**Files:**
- Rewrite: `src/components/layout/participant-status-banner.tsx`

The banner becomes a quiet one-line hint visible only on desktop. It takes `activeTab` plus capabilities, derives a single short sentence relevant to that tab, and returns `null` when there is nothing to say. On mobile, it is always hidden — blocking/gating info is already delivered by inline notices inside each tab's content.

- [ ] **Step 1: Rewrite the component**

```tsx
import type { TabId } from "@/lib/constants";

interface ParticipantStatusBannerProps {
  activeTab: TabId;
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}

export function ParticipantStatusBanner({
  activeTab,
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  canSeeCategorySummary,
  fightEnabled,
  personalReportsVisible,
  synthesisVisible,
}: ParticipantStatusBannerProps) {
  const message = deriveStatusMessage({
    activeTab,
    contributionsOpen,
    hasContributions,
    canSeeRawPeerResponses,
    canSeeCategorySummary,
    fightEnabled,
    personalReportsVisible,
    synthesisVisible,
  });

  if (!message) return null;

  return (
      <p className="hidden px-1 py-1 text-xs text-[var(--c-muted)] lg:block">
        {message}
      </p>
  );
}

function deriveStatusMessage({
  activeTab,
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  canSeeCategorySummary,
  fightEnabled,
  personalReportsVisible,
  synthesisVisible,
}: ParticipantStatusBannerProps): string | null {
  switch (activeTab) {
    case "contribute":
      if (!contributionsOpen) return "Contributions are paused";
      if (!hasContributions) return "Add your points";
      return null;

    case "explore":
      if (!canSeeRawPeerResponses && !canSeeCategorySummary) {
        return "Peer responses and categories are not released yet";
      }
      if (!canSeeRawPeerResponses) return "Peer responses are not released yet";
      if (!canSeeCategorySummary) return "Categories are not released yet";
      if (!synthesisVisible) return "Synthesis is not released yet";
      return null;

    case "fight":
      if (!fightEnabled) return "Fight is not enabled for this question";
      if (!hasContributions) return "Fight unlocks after your first contribution";
      return null;

    case "me":
      if (!personalReportsVisible) return "Your personal report is not released yet";
      return null;

    default:
      return null;
  }
}
```

Key design decisions:
- `hidden lg:block` — **no persistent banner on mobile**. Mobile status is delivered by inline notices inside each tab's content (already exist in codebase).
- Returns `null` when nothing actionable — no chrome when there's nothing to say, even on desktop.
- No chip lists, no "Available:" / "Not yet released:" prefixes — no capability inventory.
- Simple `<p>` tag, no wrapper div with background — it sits inside the content area as quiet text below the heading.

- [ ] **Step 2: Verify the component compiles**

Run: `npx tsc --noEmit 2>&1 | Select-String "status-banner"`

Expected: Errors in participant-shell.tsx about changed props — fixed in Task 3.

---

### Task 3: Add content section header to the shell

**Files:**
- Modify: `src/components/layout/participant-shell.tsx`

The section heading (tab label in tab color) renders at the top of the scrollable `<main>` area, before the tab content. It becomes the page-level heading for the active participant view. The status banner moves from its current position (between top bar and main) to inside `<main>`, below the heading. Both scroll with content — they are page elements, not shell chrome.

- [ ] **Step 1: Update the shell layout**

```tsx
import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ParticipantContextRail } from "@/components/layout/participant-context-rail";
import { ParticipantNavRail } from "@/components/layout/participant-nav-rail";
import { ParticipantStatusBanner } from "@/components/layout/participant-status-banner";
import { ParticipantTopBar } from "@/components/layout/participant-top-bar";
import { TABS, type TabId } from "@/lib/constants";

interface ReleasedQuestion {
  id: string;
  title: string;
  isCurrent: boolean;
}

interface StatusCapabilities {
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}

export interface ParticipantShellProps {
  sessionTitle: string;
  joinCode: string;
  nickname: string;
  sessionSlug: string;
  prompt: string;
  promptLabel: string;
  capabilities: StatusCapabilities;

  releasedQuestions?: ReleasedQuestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion?: (questionId: string | null) => void;
  questionHeader?: ReactNode;

  contribute: ReactNode;
  explore: ReactNode;
  fight: ReactNode;
  me: ReactNode;
  activeTab: TabId;
  onActiveTabChange: (tab: TabId) => void;
}

export function ParticipantShell({
  sessionTitle,
  joinCode,
  nickname,
  sessionSlug,
  prompt,
  promptLabel,
  capabilities,
  releasedQuestions,
  selectedQuestionId,
  onSelectQuestion,
  questionHeader,
  contribute,
  explore,
  fight,
  me,
  activeTab,
  onActiveTabChange,
}: ParticipantShellProps) {
  const content: Record<TabId, ReactNode> = {
    contribute,
    explore,
    fight,
    me,
  };

  const tab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm lg:max-w-none">
      <ParticipantTopBar
        sessionTitle={sessionTitle}
        joinCode={joinCode}
        nickname={nickname}
        sessionSlug={sessionSlug}
      />

      <div className="lg:hidden">{questionHeader}</div>

      <div className="flex min-h-0 flex-1">
        <ParticipantNavRail
          activeTab={activeTab}
          onTabChange={onActiveTabChange}
        />

        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          <h1
            className="font-display text-lg font-semibold"
            style={{ color: tab?.color }}
          >
            {tab?.label}
          </h1>
          <ParticipantStatusBanner
            activeTab={activeTab}
            {...capabilities}
          />
          <div className="mt-3">
            {content[activeTab]}
          </div>
        </main>

        <ParticipantContextRail
          prompt={prompt}
          promptLabel={promptLabel}
          releasedQuestions={releasedQuestions}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={onSelectQuestion}
        />
      </div>

      <BottomTabBar
        activeTab={activeTab}
        onTabChange={onActiveTabChange}
        className="lg:hidden"
      />
    </div>
  );
}
```

Key changes vs. current:
- Remove `activeTab` from `ParticipantTopBar` props (no longer accepted)
- Remove `<ParticipantStatusBanner>` from between top bar and main content
- Add `tab` lookup from `TABS`
- Inside `<main>`: render `<h1>` section heading in tab color → `<ParticipantStatusBanner>` (desktop-only hint) → tab content in `<div className="mt-3">`
- Heading and banner scroll with content — they are page elements, not fixed shell chrome

- [ ] **Step 2: Verify full TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: PASS (all three files updated together)

---

### Task 4: Remove duplicate titles from tab content and add CTAs

**Files:**
- Modify: `src/pages/participant-workspace-page.tsx`

Now that the shell renders a section heading, cards that repeat the section name in their title are redundant. The inline gating/blocking cards remain (they serve as mobile's status mechanism) but lose their duplicate titles and gain CTAs where useful.

- [ ] **Step 1: Update FightTabContent card titles and add CTA**

In the `FightTabContent` component, change the two fallback cards.

Add `onNavigateToTab` to `FightTabContentProps`:
```tsx
interface FightTabContentProps {
  // ... existing props ...
  onNavigateToTab?: (tab: TabId) => void;
}
```

Thread it from the parent call site:
```tsx
<FightTabContent
  // ... existing props ...
  onNavigateToTab={handleTabChange}
/>
```

Change the gating card (fight enabled but no contribution):

Old:
```tsx
<Card title="Fight needs a contribution first">
  <p className="text-sm text-[var(--c-muted)]">
    Submit a response to this question before you open a Fight thread.
  </p>
</Card>
```

New:
```tsx
<Card>
  <p className="text-sm text-[var(--c-muted)]">
    Submit a response before you can open a Fight thread.
  </p>
  <Button
    type="button"
    variant="secondary"
    className="mt-3"
    onClick={() => onNavigateToTab?.("contribute")}
  >
    Go to Contribute
  </Button>
</Card>
```

Change the unavailable card (fight not enabled):

Old:
```tsx
<Card title="Fight is unavailable">
  <p className="text-sm text-[var(--c-muted)]">
    The instructor has not enabled Fight for this question yet.
  </p>
</Card>
```

New:
```tsx
<Card>
  <p className="text-sm text-[var(--c-muted)]">
    The instructor has not enabled Fight for this question yet.
  </p>
</Card>
```

- [ ] **Step 2: Update Contribute "paused" card title**

In the contribute tab content, remove the title that duplicates the section heading context:

Old:
```tsx
<Card title="Contributions are paused">
  <p className="text-sm text-[var(--c-muted)]">
    This question is browseable, but new contributions are closed until the instructor
    reopens it.
  </p>
</Card>
```

New:
```tsx
<Card>
  <p className="text-sm text-[var(--c-muted)]">
    This question is browseable, but new contributions are closed until the instructor reopens it.
  </p>
</Card>
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`

Expected: PASS

---

### Task 5: Visual QA

- [ ] **Step 1: Start dev server and verify**

Run: `npm run dev`

Check the following in browser at the demo session:

1. **Top bar**: Shows only favicon, "TalkTok", session title, join code badge, theme toggle. No section heading row. No accent strip. Has hairline bottom border for separation.
2. **Content header**: Each tab shows its name as a colored heading at the top of the scrollable content area.
3. **Desktop status hint**: Shows a one-line message below the heading when relevant (e.g. "Add your points" on Contribute). Hidden when nothing to say.
4. **Mobile: no persistent banner**: No status text appears between the heading and content on mobile viewports. Gating/blocking info is in the inline cards only.
5. **Bottom tabs**: Per-tab signature colors still work (from phase 09d).
6. **Nav rail (desktop)**: Per-tab signature colors still work.
7. **Fight tab (no contribution)**: Heading says "Fight", card has no "Fight" title, body says "Submit a response before you can open a Fight thread." with "Go to Contribute" CTA button.
8. **Fight tab (not enabled)**: Card has no "Fight is unavailable" title, just the explanation.
9. **Contribute tab (paused)**: Card has no "Contributions are paused" title, just the explanation.
10. **Explore tab (locked)**: Existing inline notice "Peer responses remain private..." still visible inside StreamTab content.
11. **Dark mode**: Top bar uses `--c-topbar` dark token, content header colors are readable on dark canvas.
12. **Scrolling**: Section heading scrolls with content (not fixed chrome).

- [ ] **Step 2: Check vertical chrome budget on mobile**

Mobile fixed chrome should be at most:
- Top bar: ~48px (one row, session identity)
- Question header (if questions released): ~48px
- Bottom tab bar: ~56px
- **Total fixed: ~104-152px**

Everything else (section heading, inline notices, cards) is inside the scrollable content area.
