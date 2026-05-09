# UI Phase 02: Screen Content (Mock Data)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder content in all page shells with actual screen layouts using mock data. These screens can be built in parallel with backend Phases 02-08 because they don't depend on live Convex queries — they render static/mock content that will later be swapped for real data.

**Architecture:** Each page gets its own content components composed from the existing UI primitives (Card, Badge, Button, Input, etc.) plus new feature-specific components (response composer, feedback card, category card, etc.). Mock data lives in a shared `src/lib/mock-data.ts` file.

**Tech Stack:** React, existing UI component library, mock data objects, Tailwind CSS with OKLCH tokens

**Prerequisite:** UI Phase 01a (design alignment) complete.

---

## Build Order

Screens are ordered by dependency — earlier screens introduce components reused by later ones.

1. **Join + Lobby** — introduces session code display, nickname input
2. **Submit Act** — introduces response composer, tone selector, stream preview
3. **Discover Act** — introduces feedback card, originality slider, category chips
4. **Challenge Act** — introduces follow-up prompt card, Fight Me CTA, position shift
5. **Fight Me thread + debrief** — introduces chat bubbles, debrief sections
6. **Stream tab** — introduces filter bar, response stream list
7. **My Zone** — introduces response history cards, telemetry labels
8. **Synthesize Act** — introduces synthesis cards, report CTA
9. **Session Creation** — introduces full configuration form
10. **Instructor Command Center** — introduces category board, metrics, activity feed, consensus pulse
11. **Admin screens** — introduces provider cards, prompt editor, settings forms, observability tables

---

## Shared Mock Data

### Task 1: Create Mock Data File

**Files:**

- Create: `src/lib/mock-data.ts`

- [ ] **Step 1: Create mock data**

Create `src/lib/mock-data.ts`:

```ts
export const MOCK_SESSION = {
  title: "Ethics of AI in Healthcare",
  code: "SPARK",
  slug: "ethics-ai-healthcare",
  participantCount: 28,
  submittedCount: 24,
  topic:
    "Should AI be allowed to make medical diagnoses without human oversight? Consider legal, ethical, and practical dimensions.",
  mode: "class_discussion" as const,
  visibility: "immediate" as const,
  anonymity: "nickname_visible" as const,
  wordLimit: 200,
  critiqueTone: "spicy" as const,
  fightMeEnabled: true,
  telemetryEnabled: true,
  summaryGate: false,
};

export const MOCK_PARTICIPANT = {
  nickname: "Alex_the_Thinker",
  role: "participant" as const,
};

export const MOCK_CATEGORIES = [
  {
    id: "cat-1",
    name: "Liability & Law",
    color: "sky" as const,
    count: 8,
    summary:
      "Responsibility gap between developers and hospitals, insurance frameworks don't cover AI errors, regulatory lag behind deployment speed.",
  },
  {
    id: "cat-2",
    name: "Patient Autonomy",
    color: "peach" as const,
    count: 6,
    summary:
      "Informed consent challenges with probabilistic diagnoses, power imbalance in doctor-AI-patient triad, erosion of trust.",
  },
  {
    id: "cat-3",
    name: "Cost & Access",
    color: "mustard" as const,
    count: 5,
    summary:
      "Affordability gaps between institutions, rural hospital infrastructure limits, resource allocation trade-offs.",
  },
  {
    id: "cat-4",
    name: "Trust & Accuracy",
    color: "coral" as const,
    count: 5,
    summary:
      "Algorithmic bias in training data, error rate transparency, explainability requirements for clinical decisions.",
  },
  { id: "cat-5", name: "Uncategorized", color: "neutral" as const, count: 4, summary: "" },
];

export const MOCK_SUBMISSION = {
  id: "sub-1",
  text: "I believe AI should assist but not replace doctors because the liability question is unresolved. If an AI misdiagnoses, who is responsible — the hospital, the developer, or the AI itself?",
  categoryId: "cat-1",
  categoryName: "Liability & Law",
  categoryColor: "sky" as const,
  createdAt: Date.now() - 120_000,
  telemetry: { durationMs: 154_000, label: "Composed gradually", pasteEvents: 0 },
};

export const MOCK_FEEDBACK = {
  tone: "spicy" as const,
  originality: 0.68,
  text: "Liability angle? Everyone and their lawyer thinks of that. But you hinted at something spicier — the responsibility gap between devs and hospitals. Push THAT thread harder, it's where your actual brain showed up.",
};

export const MOCK_STREAM_RESPONSES = [
  {
    id: "r-1",
    nickname: "Sam",
    text: "Cost is the biggest barrier to AI adoption in healthcare. Rural hospitals can't afford the infrastructure.",
    categoryColor: "mustard" as const,
    telemetry: { durationMs: 8_000, label: "Likely pasted", pasteEvents: 1 },
    originality: "med" as const,
  },
  {
    id: "r-2",
    nickname: "Maya",
    text: "The responsibility gap between AI developers and deploying hospitals creates an accountability vacuum that existing malpractice law can't fill.",
    categoryColor: "sky" as const,
    telemetry: { durationMs: 134_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-3",
    nickname: "Priya",
    text: "Patient consent must come first. Without informed consent specific to AI-assisted diagnosis, we're violating fundamental medical ethics.",
    categoryColor: "peach" as const,
    telemetry: { durationMs: 98_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-4",
    nickname: "Jake",
    text: "AI bias in training data means marginalized communities get worse diagnoses. That's not a feature — it's discrimination laundered through technology.",
    categoryColor: "coral" as const,
    telemetry: { durationMs: 112_000, label: "Revised actively", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-5",
    nickname: "Wei",
    text: "The real question isn't whether AI should diagnose, but who profits from replacing doctors with algorithms.",
    categoryColor: "mustard" as const,
    telemetry: { durationMs: 67_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "above avg" as const,
  },
];

export const MOCK_FIGHT_ME_TURNS = [
  {
    role: "ai" as const,
    text: "You claim the liability gap is the core issue, but consider: we already have this exact problem with medical devices. Pacemakers malfunction, surgical robots fail. Courts have decades of product liability precedent. What makes AI diagnostics fundamentally different?",
  },
  {
    role: "student" as const,
    text: "Medical devices have clear failure modes — a pacemaker either fires or it doesn't. AI diagnostics are probabilistic and opaque. When an AI says '87% chance of cancer,' who is liable for the 13%? The manufacturer? The hospital that chose that threshold?",
  },
  {
    role: "ai" as const,
    text: "Good distinction on probabilistic vs deterministic. But you're dodging: doctors are ALSO probabilistic. A radiologist reading a scan is giving a probability estimate, just without the number. Isn't the real difference just transparency?",
  },
];

export const MOCK_DEBRIEF = {
  defended:
    "The distinction between probabilistic and deterministic failure modes was sharp and well-supported.",
  weaker:
    "You didn't address the transparency argument directly — the AI's point about doctors also being probabilistic was left hanging.",
  stronger:
    "Arguing that doctor probabilism has built-in accountability (malpractice law, professional licensing) while AI probabilism currently has no equivalent framework.",
};

export const MOCK_ACTIVITY_FEED = [
  {
    type: "submit" as const,
    name: "Maya",
    category: "Liability",
    categoryColor: "sky" as const,
    originality: "High" as const,
    telemetryLabel: "2m 14s · composed gradually",
    time: "just now",
  },
  {
    type: "recat" as const,
    name: "Jake",
    fromCategory: "Autonomy",
    toCategory: "Cost",
    time: "1m ago",
  },
  { type: "followup" as const, name: "Priya", time: "2m ago" },
  { type: "fightme" as const, name: "Alex", time: "3m ago" },
  {
    type: "submit" as const,
    name: "Sam",
    category: "Trust",
    categoryColor: "coral" as const,
    originality: "Med" as const,
    telemetryLabel: "8s · likely pasted",
    time: "4m ago",
  },
  {
    type: "submit" as const,
    name: "Rina",
    category: "Liability",
    categoryColor: "sky" as const,
    originality: "High" as const,
    telemetryLabel: "3m 45s · revised actively",
    time: "5m ago",
  },
  { type: "shift" as const, name: "Wei", category: "Autonomy", time: "6m ago" },
  {
    type: "submit" as const,
    name: "Dan",
    category: "Uncategorized",
    categoryColor: "neutral" as const,
    originality: "—" as const,
    telemetryLabel: "",
    time: "7m ago",
  },
];

export const CRITIQUE_TONES = [
  { id: "supportive", label: "Kind" },
  { id: "direct", label: "Direct" },
  { id: "spicy", label: "Spicy" },
  { id: "roast", label: "Roast" },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "feat: add shared mock data for UI screen development"
```

---

## Participant Screens

### Task 2: Join Screen

**Files:**

- Create: `src/components/session/session-code-display.tsx`
- Modify: `src/pages/join-page.tsx`

- [ ] **Step 1: Create SessionCodeDisplay component**

Create `src/components/session/session-code-display.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface SessionCodeDisplayProps {
  code: string;
  size?: "sm" | "lg";
  className?: string;
}

export function SessionCodeDisplay({ code, size = "lg", className }: SessionCodeDisplayProps) {
  return (
    <div
      className={cn(
        "rounded-md border-2 border-[var(--c-hairline)] bg-[var(--c-surface-raised,var(--c-surface-soft))] px-4 py-3 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "font-display font-semibold tracking-[0.3em] text-[var(--c-sig-slate)]",
          size === "lg" ? "text-3xl" : "text-lg",
        )}
      >
        {code}
      </div>
      {size === "lg" && <div className="mt-1 text-xs text-[var(--c-muted)]">Session Code</div>}
    </div>
  );
}
```

- [ ] **Step 2: Build the Join page content**

Replace the content of `src/pages/join-page.tsx` with a full join screen layout. The page should render:

- TalkTok wordmark (Plus Jakarta Sans, centered)
- Session code display (pre-filled from route param or empty input)
- Nickname input field
- "Join Discussion" primary button (full width)
- "or scan QR code to auto-fill" secondary text
- Error state for invalid code (inline alert below code field)

Use the existing `Input`, `Button`, `Card`, and `SessionCodeDisplay` components. Use `MOCK_SESSION.code` as default value.

- [ ] **Step 3: Commit**

```bash
git add src/components/session/session-code-display.tsx src/pages/join-page.tsx
git commit -m "feat: build join page with session code display and nickname input"
```

---

### Task 3: Submit Act Content

**Files:**

- Create: `src/components/submission/response-composer.tsx`
- Create: `src/components/submission/tone-selector.tsx`
- Create: `src/components/submission/stream-preview.tsx`
- Create: `src/components/acts/submit-act.tsx`

- [ ] **Step 1: Create ToneSelector component**

Create `src/components/submission/tone-selector.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { CRITIQUE_TONES } from "@/lib/mock-data";

interface ToneSelectorProps {
  value: string;
  onChange: (tone: string) => void;
  className?: string;
}

export function ToneSelector({ value, onChange, className }: ToneSelectorProps) {
  return (
    <div className={cn("flex gap-1 font-display", className)}>
      {CRITIQUE_TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          onClick={() => onChange(tone.id)}
          className={cn(
            "rounded-pill px-2.5 py-1 text-[10px] font-medium border transition-colors",
            value === tone.id
              ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
              : "border-[var(--c-hairline)] bg-transparent text-[var(--c-muted)]",
          )}
        >
          {tone.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ResponseComposer component**

Create `src/components/submission/response-composer.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneSelector } from "@/components/submission/tone-selector";
import { cn } from "@/lib/utils";

interface ResponseComposerProps {
  wordLimit?: number;
  defaultTone?: string;
  onSubmit?: (text: string, tone: string) => void;
  className?: string;
}

export function ResponseComposer({
  wordLimit = 200,
  defaultTone = "spicy",
  onSubmit,
  className,
}: ResponseComposerProps) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState(defaultTone);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const atLimit = wordCount >= wordLimit;
  const nearLimit = wordCount >= wordLimit * 0.8;

  return (
    <div
      className={cn(
        "rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3",
        className,
      )}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your perspective..."
        className="w-full resize-y border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none"
        style={{ minHeight: 100, fontFamily: "var(--font-body)" }}
      />
      <div className="mt-2 flex items-center justify-between border-t border-[var(--c-hairline)] pt-2">
        <span
          className={cn(
            "text-[10px]",
            atLimit
              ? "text-[var(--c-error)]"
              : nearLimit
                ? "text-[var(--c-sig-mustard)]"
                : "text-[var(--c-muted)]",
          )}
        >
          {wordCount}/{wordLimit} words
        </span>
        <ToneSelector value={tone} onChange={setTone} />
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() => onSubmit?.(text, tone)}
        disabled={wordCount === 0}
      >
        Submit
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create StreamPreview component**

Create `src/components/submission/stream-preview.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StreamItem {
  nickname: string;
  text: string;
  categoryColor: NonNullable<BadgeProps["tone"]>;
}

interface StreamPreviewProps {
  items: StreamItem[];
  typingCount?: number;
  submittedCount?: number;
  className?: string;
}

export function StreamPreview({
  items,
  typingCount = 0,
  submittedCount = 0,
  className,
}: StreamPreviewProps) {
  return (
    <div className={cn(className)}>
      <div className="mb-1.5 text-xs text-[var(--c-muted)]">
        {typingCount} others responding · {submittedCount} submitted
      </div>
      <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-2 text-xs text-[var(--c-body)]",
              i > 0 && "border-t border-[var(--c-hairline)]",
            )}
          >
            <strong
              style={{
                color: `var(--c-sig-${item.categoryColor === "neutral" ? "slate" : item.categoryColor})`,
              }}
            >
              {item.nickname}:
            </strong>{" "}
            {item.text.slice(0, 60)}...
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SubmitAct composite component**

Create `src/components/acts/submit-act.tsx`:

```tsx
import { ResponseComposer } from "@/components/submission/response-composer";
import { StreamPreview } from "@/components/submission/stream-preview";
import { MOCK_SESSION, MOCK_STREAM_RESPONSES } from "@/lib/mock-data";

export function SubmitAct() {
  return (
    <div className="space-y-3">
      {/* Topic card */}
      <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
        <p className="text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
          "{MOCK_SESSION.topic}"
        </p>
      </div>

      {/* Composer */}
      <ResponseComposer
        wordLimit={MOCK_SESSION.wordLimit}
        defaultTone={MOCK_SESSION.critiqueTone}
      />

      {/* Stream preview */}
      <StreamPreview
        items={MOCK_STREAM_RESPONSES.map((r) => ({
          nickname: r.nickname,
          text: r.text,
          categoryColor: r.categoryColor,
        }))}
        typingCount={18}
        submittedCount={MOCK_SESSION.submittedCount}
      />
    </div>
  );
}
```

- [ ] **Step 5: Wire SubmitAct into participant shell**

Update `src/pages/participant-session-page.tsx` to pass `<SubmitAct />` as the `main` prop to `ParticipantShell` when the current act is "submit".

- [ ] **Step 6: Verify and commit**

```bash
vp check
vp dev
```

Navigate to `/session/demo-discussion`. Verify:

- Cream topic card with readable dark text
- Composer with word count, tone pills, submit button
- Stream preview with colored nicknames
- Tab bar with Plus Jakarta Sans labels

```bash
git add -A
git commit -m "feat: build Submit act with response composer, tone selector, and stream preview"
```

---

### Task 4-11: Remaining Screens

The remaining tasks follow the same pattern. Each creates feature-specific components and wires them into the page shell. Full code for each will be written in detail when this plan is executed. The structure for each:

**Task 4: Discover Act** — FeedbackCard, OriginalitySlider, CategoryChips, CategoryPlacement components → DiscoverAct composite
**Task 5: Challenge Act** — FollowUpPromptCard, FightMeCTA, PositionShiftCard → ChallengeAct composite
**Task 6: Fight Me Thread** — FightMeBubble, FightMeRebuttalComposer, FightMeDebrief → FightMePage
**Task 7: Stream Tab** — CategoryFilterBar, ResponseStreamItem, PresenceBar → StreamTab composite
**Task 8: My Zone** — MyZoneHeader, ResponseHistoryCard, FightMeRecord, RecatStatus → MyZoneTab composite
**Task 9: Synthesize Act** — SynthesisCategoryCard, PersonalReportCTA → SynthesizeAct composite
**Task 10: Session Creation** — SessionConfigForm (full form with mode presets, categories, settings grid, toggles, code preview) → SessionNewPage
**Task 11: Instructor Command Center** — CategoryBoardPanel, MetricsRow, PresenceIndicator, ConsensusPulse, ResponseDistribution, ActivityFeedPanel → InstructorSessionPage
**Task 12: Admin Screens** — ProviderCard, ModelTable, PromptEditorLayout, SettingsForm, ObservabilityDashboard → Admin pages

---

## What This Plan Produces

After all 12 tasks:

- All 16 page routes render actual screen content (not placeholders)
- ~25 new feature-specific components built from existing UI primitives
- Mock data drives all screens, ready to swap for Convex queries
- Every screen matches the refined design preview (warm cream light, dark surface dark, signature color accents, Plus Jakarta Sans tabs)
- No backend dependency — can be built entirely in parallel with Phases 02-08

## What Comes Next

- **UI Phase 03: Backend Wiring** — Replace mock data with Convex `useQuery`/`useMutation` hooks as backend phases deliver real data contracts
- **UI Phase 04: Interaction Polish** — Framer Motion animations, loading skeletons, AI pending states, error recovery
- **UI Phase 05: Visualizations** — Card-based MVP visualizations (novelty radar, category drift, consensus pulse), then D3 stretch
