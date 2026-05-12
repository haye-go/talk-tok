# UI Phase 09c: Participant Shell Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the participant shell from a mobile-only single-column layout to a responsive, well-structured workspace with proper top bar, status banner, and desktop 3-zone layout — fulfilling the shell contract defined in `engineering/ui-phase-09b-learner-tab-contracts.md`.

**Architecture:** The participant shell gains two new shell-level layers (top bar + status banner) and a responsive layout that switches between mobile (single column + bottom tabs) and desktop (left nav rail + center content + right context rail). Card gets a `tone` variant to replace ad-hoc surface painting. The existing `ThreePanelLayout` pattern informs the desktop grid but we build a participant-specific layout since the column responsibilities differ from the instructor shell.

**Tech Stack:** React, Tailwind CSS v4 (OKLCH tokens, cascade layers), Phosphor icons, TanStack Router, Convex (read-only — no backend changes)

**Spec references:**
- `engineering/ui-phase-09-learner-workspace-rethink-plan.md` — product direction
- `engineering/ui-phase-09b-learner-tab-contracts.md` — shell contract and tab responsibilities

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `src/components/layout/participant-top-bar.tsx` | Always-render header: session identity, nickname, demo controls |
| `src/components/layout/participant-status-banner.tsx` | Capability-driven orientation: what's open, available, locked |
| `src/components/layout/participant-nav-rail.tsx` | Desktop vertical tab rail (replaces bottom tabs at lg) |
| `src/components/layout/participant-context-rail.tsx` | Desktop right rail: prompt card, question switcher, session metadata |

### Modified files

| File | Changes |
|---|---|
| `src/components/ui/card.tsx` | Add `tone` variant prop (neutral, cream, alert) |
| `src/components/layout/participant-shell.tsx` | Responsive 3-zone layout, integrate top bar + banner, hide bottom tabs on desktop |
| `src/components/layout/bottom-tab-bar.tsx` | Add `className` pass-through for `lg:hidden` |
| `src/pages/participant-workspace-page.tsx` | Pass new props to shell (session data, capabilities, prompt), remove ad-hoc surface overrides |
| `src/components/demo/demo-identity-bar.tsx` | Refactor into a composable strip that mounts inside ParticipantTopBar |
| `src/lib/constants.ts` | No changes needed — TABS already defines Contribute/Explore/Fight/Me |

### Deleted files

| File | Reason |
|---|---|
| `src/components/layout/act-progress-bar.tsx` | Dead code — no longer imported anywhere after the question-centric migration |

---

## Surface Hierarchy Rules

These rules replace the current ad-hoc surface mixing. All tasks below follow them.

| Token | Usage | Example |
|---|---|---|
| `--c-canvas` | App background only. Never on cards or content blocks. | Shell `<div>` background |
| `--c-surface-soft` | Default container surface. Cards, panels, content blocks. | `Card` default tone |
| `--c-surface-strong` | Shell-level banners, utility rows, nav rail active states. | Status banner, nav rail bg |
| `--c-sig-cream` | Emphasis blocks with intent: prompt focus, milestone cards. | Active prompt card only |
| `--c-sig-sky/coral/slate` | Semantic accent: demo identity, fight state, category placement. | DemoIdentityBar, fight header |

---

## Task 1: Card `tone` Variant

Add a `tone` prop to Card to eliminate inline surface overrides across the participant page.

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1.1: Add tone prop and tone classes**

```tsx
// src/components/ui/card.tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  tone?: "neutral" | "cream" | "alert";
}

const toneClass: Record<NonNullable<CardProps["tone"]>, string> = {
  neutral:
    "border-[var(--c-hairline)] bg-[var(--c-surface-soft)]",
  cream:
    "border-[var(--c-sig-mustard)]/30 bg-[var(--c-sig-cream)]",
  alert:
    "border-[var(--c-error)]/40 bg-[color-mix(in_oklch,var(--c-error),transparent_92%)]",
};

export function Card({
  className,
  title,
  eyebrow,
  action,
  tone = "neutral",
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-md border p-4 text-[var(--c-body)]",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {title || eyebrow || action ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-display text-base font-medium text-[var(--c-ink)]">{title}</h2>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
```

- [ ] **Step 1.2: Verify no regressions**

Run: `npx tsc --noEmit`
Expected: clean — the default `tone="neutral"` matches the old hard-coded classes exactly.

- [ ] **Step 1.3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(card): add tone variant prop (neutral, cream, alert)"
```

---

## Task 2: ParticipantTopBar

A compact, always-visible header providing session identity, participant nickname, and demo controls when applicable.

**Files:**
- Create: `src/components/layout/participant-top-bar.tsx`
- Modify: `src/components/demo/demo-identity-bar.tsx` (refactor to composable)

### Design spec

- Height: ~48px (`min-h-12`)
- Background: `bg-[var(--c-canvas)]` with `border-b border-[var(--c-hairline)]`
- Left: session title (truncated, `font-display text-sm font-medium`) + join code Badge (tone="slate", small)
- Right: "as {nickname}" muted text + ThemeToggle
- When demo persona active: merge demo controls (Back, Switch, Restore) into the right side, replace the nickname text with "Viewing as **{nickname}**"

- [ ] **Step 2.1: Refactor DemoIdentityBar into a composable component**

The current `DemoIdentityBar` renders its own full-width bar. Refactor it to export a `DemoIdentityControls` component that returns just the control buttons (Back, Switch, Restore) without the outer bar container, so it can be composed inside `ParticipantTopBar`.

```tsx
// src/components/demo/demo-identity-bar.tsx
import { ArrowLeft, ArrowsClockwise, Swap } from "@phosphor-icons/react";
import {
  getDemoNickname,
  isDemoClientKey,
  restoreOriginalClientKey,
} from "@/lib/client-identity";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

interface DemoIdentityControlsProps {
  sessionSlug: string;
}

export function DemoIdentityControls({ sessionSlug }: DemoIdentityControlsProps) {
  if (sessionSlug !== DEMO_SESSION_SLUG || !isDemoClientKey()) return null;

  function handleRestore() {
    restoreOriginalClientKey();
    window.location.reload();
  }

  return (
    <>
      <a
        href={routes.home()}
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
      >
        <ArrowLeft size={12} /> Back
      </a>
      <a
        href={routes.demoPersonas()}
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
      >
        <Swap size={12} /> Switch
      </a>
      <button
        type="button"
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
        onClick={handleRestore}
      >
        <ArrowsClockwise size={12} /> Restore
      </button>
    </>
  );
}

export function getDemoDisplayNickname(sessionSlug: string): string | null {
  if (sessionSlug !== DEMO_SESSION_SLUG || !isDemoClientKey()) return null;
  return getDemoNickname();
}
```

- [ ] **Step 2.2: Create ParticipantTopBar**

```tsx
// src/components/layout/participant-top-bar.tsx
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
    <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--c-hairline)] bg-[var(--c-canvas)] px-4">
      <div className="flex min-w-0 items-center gap-2">
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
    </header>
  );
}
```

- [ ] **Step 2.3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 2.4: Commit**

```bash
git add src/components/demo/demo-identity-bar.tsx src/components/layout/participant-top-bar.tsx
git commit -m "feat: add ParticipantTopBar with session identity and demo controls"
```

---

## Task 3: ParticipantStatusBanner

A capability-driven orientation banner that tells the learner what's open, available, and locked.

**Files:**
- Create: `src/components/layout/participant-status-banner.tsx`

### Design spec

- Background: `bg-[var(--c-surface-strong)]`
- Full width inside the shell, compact (no border-radius — it spans edge to edge)
- Primary line: bold, what's open now
- Secondary line: muted, what's available / what's locked
- Border-bottom hairline

### Capability model

The banner derives display from these flags (all available from the workspace query + session):

```typescript
interface StatusBannerCapabilities {
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}
```

- [ ] **Step 3.1: Create ParticipantStatusBanner**

```tsx
// src/components/layout/participant-status-banner.tsx

interface ParticipantStatusBannerProps {
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}

export function ParticipantStatusBanner({
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  canSeeCategorySummary,
  synthesisVisible,
  fightEnabled,
  personalReportsVisible,
}: ParticipantStatusBannerProps) {
  const primary = derivePrimaryLine({
    contributionsOpen,
    hasContributions,
    canSeeRawPeerResponses,
    synthesisVisible,
  });
  const available = deriveAvailableChips({
    canSeeCategorySummary,
    canSeeRawPeerResponses,
    fightEnabled,
    personalReportsVisible,
    synthesisVisible,
  });
  const locked = deriveLockedChips({
    canSeeRawPeerResponses,
    canSeeCategorySummary,
    synthesisVisible,
    personalReportsVisible,
  });

  return (
    <div className="shrink-0 border-b border-[var(--c-hairline)] bg-[var(--c-surface-strong)] px-4 py-2">
      <p className="font-display text-xs font-medium text-[var(--c-ink)]">{primary}</p>
      {available.length > 0 && (
        <p className="mt-0.5 text-[11px] text-[var(--c-muted)]">
          Available: {available.join(" · ")}
        </p>
      )}
      {locked.length > 0 && (
        <p className="mt-0.5 text-[11px] text-[var(--c-muted)]">
          Not yet released: {locked.join(" · ")}
        </p>
      )}
    </div>
  );
}

function derivePrimaryLine({
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  synthesisVisible,
}: Pick<
  ParticipantStatusBannerProps,
  "contributionsOpen" | "hasContributions" | "canSeeRawPeerResponses" | "synthesisVisible"
>) {
  if (synthesisVisible) return "Review the class synthesis";
  if (canSeeRawPeerResponses && hasContributions)
    return "Explore the class discussion";
  if (hasContributions) return "Your points are submitted";
  if (contributionsOpen) return "Add your points";
  return "Session in progress";
}

function deriveAvailableChips({
  canSeeCategorySummary,
  canSeeRawPeerResponses,
  fightEnabled,
  personalReportsVisible,
  synthesisVisible,
}: Pick<
  ParticipantStatusBannerProps,
  | "canSeeCategorySummary"
  | "canSeeRawPeerResponses"
  | "fightEnabled"
  | "personalReportsVisible"
  | "synthesisVisible"
>) {
  const chips: string[] = [];
  if (canSeeRawPeerResponses) chips.push("peer responses");
  if (canSeeCategorySummary) chips.push("categories");
  if (synthesisVisible) chips.push("synthesis");
  if (fightEnabled) chips.push("Fight");
  if (personalReportsVisible) chips.push("personal report");
  return chips;
}

function deriveLockedChips({
  canSeeRawPeerResponses,
  canSeeCategorySummary,
  synthesisVisible,
  personalReportsVisible,
}: Pick<
  ParticipantStatusBannerProps,
  | "canSeeRawPeerResponses"
  | "canSeeCategorySummary"
  | "synthesisVisible"
  | "personalReportsVisible"
>) {
  const chips: string[] = [];
  if (!canSeeRawPeerResponses) chips.push("peer responses");
  if (!canSeeCategorySummary) chips.push("categories");
  if (!synthesisVisible) chips.push("synthesis");
  if (!personalReportsVisible) chips.push("personal report");
  return chips;
}
```

- [ ] **Step 3.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3.3: Commit**

```bash
git add src/components/layout/participant-status-banner.tsx
git commit -m "feat: add ParticipantStatusBanner with capability-driven orientation"
```

---

## Task 4: ParticipantNavRail (Desktop Side Nav)

A vertical tab rail that replaces the bottom tab bar on desktop.

**Files:**
- Create: `src/components/layout/participant-nav-rail.tsx`

### Design spec

- Width: `w-[200px]` on desktop
- Background: `bg-[var(--c-surface-soft)]` with right border
- Each tab: icon (20px) + label, vertical stack
- Active tab: `bg-[var(--c-surface-strong)]` with left 2px accent border in `--c-primary`
- Hidden on mobile (`hidden lg:flex`)
- Below tabs: session code + compact "as {nickname}" at the bottom of the rail

- [ ] **Step 4.1: Create ParticipantNavRail**

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
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition",
                active
                  ? "border-l-2 border-[var(--c-primary)] bg-[var(--c-surface-strong)] font-medium text-[var(--c-ink)]"
                  : "border-l-2 border-transparent text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]",
              )}
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

- [ ] **Step 4.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 4.3: Commit**

```bash
git add src/components/layout/participant-nav-rail.tsx
git commit -m "feat: add ParticipantNavRail for desktop vertical tab navigation"
```

---

## Task 5: ParticipantContextRail (Desktop Right Rail)

A persistent right panel for desktop showing the active prompt, question switcher, and session metadata.

**Files:**
- Create: `src/components/layout/participant-context-rail.tsx`

### Design spec

- Width: `w-[300px]` on desktop
- Background: `bg-[var(--c-surface-soft)]` with left border
- Hidden on mobile (`hidden lg:flex`)
- Content sections (top to bottom):
  1. Active prompt card (cream tone, always visible)
  2. Question switcher pills (only when multiple released questions)
  3. Session metadata (participant count, visibility state)

- [ ] **Step 5.1: Create ParticipantContextRail**

```tsx
// src/components/layout/participant-context-rail.tsx
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface ReleasedQuestion {
  id: string;
  title: string;
  isCurrent: boolean;
}

interface ParticipantContextRailProps {
  prompt: string;
  promptLabel: string;
  releasedQuestions?: ReleasedQuestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion?: (questionId: string | null) => void;
  children?: ReactNode;
}

export function ParticipantContextRail({
  prompt,
  promptLabel,
  releasedQuestions,
  selectedQuestionId,
  onSelectQuestion,
  children,
}: ParticipantContextRailProps) {
  const questions = releasedQuestions ?? [];

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4 lg:flex">
      <Card tone="cream">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--c-on-sig-light-body)]">
          {promptLabel}
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
          &ldquo;{prompt}&rdquo;
        </p>
      </Card>

      {questions.length > 1 && onSelectQuestion ? (
        <div>
          <p className="mb-1.5 font-display text-[11px] font-medium text-[var(--c-muted)]">
            Questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((question) => {
              const active = selectedQuestionId === question.id;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() =>
                    onSelectQuestion(question.isCurrent ? null : question.id)
                  }
                  className={`rounded-pill border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                      : "border-[var(--c-hairline)] bg-[var(--c-canvas)] text-[var(--c-ink)] hover:bg-[var(--c-surface-strong)]"
                  }`}
                >
                  {question.title}
                  {question.isCurrent ? " (current)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {children}
    </aside>
  );
}
```

- [ ] **Step 5.2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 5.3: Commit**

```bash
git add src/components/layout/participant-context-rail.tsx
git commit -m "feat: add ParticipantContextRail for desktop persistent prompt and question nav"
```

---

## Task 6: Responsive ParticipantShell

Rebuild the shell to support both mobile and desktop layouts, integrating all new components.

**Files:**
- Modify: `src/components/layout/participant-shell.tsx`
- Modify: `src/components/layout/bottom-tab-bar.tsx` (add `lg:hidden`)

### Layout structure

**Mobile (< lg):**
```
┌──────────────────────────┐
│ ParticipantTopBar         │
│ ParticipantStatusBanner   │
│ questionHeader (if multi) │
├──────────────────────────┤
│ active tab content (flex-1│
│ overflow-y-auto)          │
├──────────────────────────┤
│ BottomTabBar              │
└──────────────────────────┘
```

**Desktop (>= lg):**
```
┌──────────────────────────────────────────────────┐
│ ParticipantTopBar (full width)                    │
│ ParticipantStatusBanner (full width)              │
├────────┬─────────────────────────┬───────────────┤
│ NavRail│ active tab content      │ ContextRail   │
│ 200px  │ flex-1, overflow-y-auto │ 300px         │
│        │                         │               │
└────────┴─────────────────────────┴───────────────┘
```

- [ ] **Step 6.1: Update BottomTabBar to hide on desktop**

In `src/components/layout/bottom-tab-bar.tsx`, the outer `<nav>` already accepts `className`. The shell will pass `lg:hidden` to hide it on desktop.

No code change needed in bottom-tab-bar.tsx — it already supports `className`. The shell change in step 6.2 handles this.

- [ ] **Step 6.2: Rewrite ParticipantShell**

```tsx
// src/components/layout/participant-shell.tsx
import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ParticipantContextRail } from "@/components/layout/participant-context-rail";
import { ParticipantNavRail } from "@/components/layout/participant-nav-rail";
import { ParticipantStatusBanner } from "@/components/layout/participant-status-banner";
import { ParticipantTopBar } from "@/components/layout/participant-top-bar";
import type { TabId } from "@/lib/constants";

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

  return (
    <div className="mx-auto flex h-dvh w-full flex-col bg-[var(--c-canvas)] shadow-sm lg:max-w-none">
      <ParticipantTopBar
        sessionTitle={sessionTitle}
        joinCode={joinCode}
        nickname={nickname}
        sessionSlug={sessionSlug}
      />
      <ParticipantStatusBanner {...capabilities} />

      {/* Mobile-only question header */}
      <div className="lg:hidden">{questionHeader}</div>

      {/* Body: single column on mobile, 3-zone on desktop */}
      <div className="flex min-h-0 flex-1">
        <ParticipantNavRail
          activeTab={activeTab}
          onTabChange={onActiveTabChange}
        />

        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          {content[activeTab]}
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

- [ ] **Step 6.3: Type-check**

Run: `npx tsc --noEmit`
Expected: will fail — `participant-workspace-page.tsx` still passes the old props. That's fixed in Task 7.

- [ ] **Step 6.4: Commit shell only**

```bash
git add src/components/layout/participant-shell.tsx
git commit -m "feat: responsive ParticipantShell with 3-zone desktop layout"
```

---

## Task 7: Wire ParticipantWorkspacePage to New Shell

Update the page to pass the new shell props and clean up ad-hoc surface overrides.

**Files:**
- Modify: `src/pages/participant-workspace-page.tsx`

### Key changes

1. Pass `sessionTitle`, `joinCode`, `nickname`, `sessionSlug`, `prompt`, `promptLabel`, `capabilities` to the shell
2. Pass `releasedQuestions`, `selectedQuestionId`, `onSelectQuestion` for the context rail
3. Remove the inline `questionHeader` on mobile — it's now handled by the shell (passed as `questionHeader` prop for the mobile-only slot)
4. Remove the `<DemoIdentityBar>` topBar — demo controls now live inside ParticipantTopBar
5. Replace the inline cream prompt `<div>` in the contribute tab with `<Card tone="cream">` on mobile (desktop gets it from the context rail, but mobile still needs it inline in the tab)
6. Remove the "Signed in as {nickname}" text at the bottom of contribute — it's now in the top bar

- [ ] **Step 7.1: Update the shell invocation**

Replace the `<ParticipantShell>` call in `participant-workspace-page.tsx`. The key section to change is the return statement starting around line 512:

```tsx
  const promptLabel = selectedQuestion?.isCurrent ? "Current question" : "Released question";

  return (
    <ParticipantShell
      sessionTitle={session.title}
      joinCode={session.joinCode}
      nickname={participant.nickname}
      sessionSlug={sessionSlug}
      prompt={selectedPrompt}
      promptLabel={promptLabel}
      capabilities={{
        contributionsOpen,
        hasContributions: topLevelContributions.length > 0,
        canSeeRawPeerResponses,
        canSeeCategorySummary,
        synthesisVisible: selectedQuestion?.synthesisVisible ?? false,
        fightEnabled: canUseFight,
        personalReportsVisible: selectedQuestion?.personalReportsVisible ?? false,
      }}
      releasedQuestions={releasedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        isCurrent: q.isCurrent,
      }))}
      selectedQuestionId={selectedQuestion?.id ?? null}
      onSelectQuestion={(questionId) =>
        setSelectedQuestionOverrideId(
          questionId as typeof selectedQuestionOverrideId,
        )
      }
      questionHeader={questionHeader}
      activeTab={activeTab}
      onActiveTabChange={handleTabChange}
      contribute={/* ... existing contribute content ... */}
      explore={/* ... existing explore content ... */}
      fight={/* ... existing fight content ... */}
      me={/* ... existing me content ... */}
    />
  );
```

- [ ] **Step 7.2: Clean up contribute tab content**

In the contribute tab JSX:

1. Replace the inline cream prompt div with `<Card tone="cream">`:

```tsx
<Card tone="cream">
  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--c-on-sig-light-body)]">
    {promptLabel}
  </p>
  <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
    &ldquo;{selectedPrompt}&rdquo;
  </p>
</Card>
```

This card shows on both mobile and desktop within the contribute tab. On desktop, the prompt also appears in the right context rail — the duplication is intentional (orientation vs. composition context).

2. Remove the `<p className="text-xs text-[var(--c-muted)]">Signed in as {participant.nickname}</p>` at the bottom — nickname is now in the top bar.

- [ ] **Step 7.3: Remove old DemoIdentityBar topBar usage**

Remove the `topBar={<DemoIdentityBar sessionSlug={sessionSlug} />}` prop — demo controls are now composed inside `ParticipantTopBar`.

Remove the `DemoIdentityBar` import if no longer used directly.

- [ ] **Step 7.4: Type-check and verify**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 7.5: Commit**

```bash
git add src/pages/participant-workspace-page.tsx
git commit -m "feat: wire participant workspace to responsive shell with capabilities"
```

---

## Task 8: Delete Dead Code

**Files:**
- Delete: `src/components/layout/act-progress-bar.tsx`
- Verify: no remaining imports

- [ ] **Step 8.1: Verify act-progress-bar is unused**

Run: `grep -r "act-progress-bar\|ActProgressBar" src/`
Expected: only the file itself (no imports from other files)

- [ ] **Step 8.2: Delete the file**

```bash
rm src/components/layout/act-progress-bar.tsx
```

- [ ] **Step 8.3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 8.4: Commit**

```bash
git add -A
git commit -m "chore: remove dead ActProgressBar (replaced by question-centric model)"
```

---

## Task 9: Visual QA and Polish

Manual verification pass on both mobile and desktop.

**Files:**
- Possibly modify: any file from Tasks 1-7 for spacing/alignment fixes

- [ ] **Step 9.1: Mobile QA**

Start dev server: `npx vite --host`

Open the demo session on a mobile viewport (Chrome DevTools, 390px wide).

Verify:
- Top bar shows session title + join code badge
- Status banner shows correct capability state
- Question header pills appear when multi-question
- Bottom tab bar is visible and functional
- All 4 tabs render correctly
- Tab switching works and updates URL
- Demo persona controls appear in top bar (not a separate bar)
- Scroll works correctly in the content area (no overflow issues)

- [ ] **Step 9.2: Desktop QA**

Open the same session at full desktop width (1280px+).

Verify:
- Top bar spans full width
- Status banner spans full width
- Left nav rail shows 4 tabs with active indicator
- Center content fills available space
- Right rail shows prompt card and question switcher
- Bottom tab bar is hidden
- Clicking nav rail tabs switches content
- No horizontal scroll, no content overflow
- Content area scrolls independently from the rails

- [ ] **Step 9.3: Fix any spacing/alignment issues found**

Address any visual issues discovered in steps 9.1-9.2.

- [ ] **Step 9.4: Commit**

```bash
git add -A
git commit -m "fix: visual QA polish for participant shell upgrade"
```

---

## Summary

| Task | What it does | Files created/modified |
|---|---|---|
| 1 | Card tone variant | `card.tsx` |
| 2 | ParticipantTopBar + refactored demo controls | `participant-top-bar.tsx`, `demo-identity-bar.tsx` |
| 3 | ParticipantStatusBanner | `participant-status-banner.tsx` |
| 4 | ParticipantNavRail (desktop) | `participant-nav-rail.tsx` |
| 5 | ParticipantContextRail (desktop) | `participant-context-rail.tsx` |
| 6 | Responsive ParticipantShell | `participant-shell.tsx` |
| 7 | Wire workspace page to new shell | `participant-workspace-page.tsx` |
| 8 | Delete dead ActProgressBar | `act-progress-bar.tsx` |
| 9 | Visual QA | Any file needing polish |
