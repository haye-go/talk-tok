# UI Phase 02b: Page Design Upgrades

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the 4 existing pages that have working Convex integration but bare/placeholder UI to match the TalkTok design spec (warm cream canvas, signature color accents, designed components, proper act-switching). All Convex queries, mutations, and state logic must be preserved — only the rendered JSX changes.

**Architecture:** Replace generic Card-based layouts with the designed act components (from Phase 02) and new layout structures. Keep all `useQuery`, `useMutation`, state hooks, and form handlers intact.

**Tech Stack:** Existing components from Phase 02, Tailwind CSS with OKLCH tokens, Phosphor icons

**Prerequisite:** UI Phase 02 screen content components exist.

**Critical rule:** Do NOT remove or modify any Convex query/mutation calls, form handlers, or state management. Only change the JSX that renders inside those data-loading patterns.

---

## Pages to Upgrade

| Page                            | Current State                                                | Target State                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `participant-session-page.tsx`  | Generic Cards, no act switching, basic stream/my-zone        | Act-aware content (SubmitAct/DiscoverAct/ChallengeAct/SynthesizeAct), StreamTab, MyZoneTab with peach header, FightThread                                                              |
| `instructor-session-page.tsx`   | Basic MetricTiles + plain submission list + participant list | Full command center: category board with sig-color borders, consensus pulse, activity feed with colored dots, presence bar, designed metrics                                           |
| `instructor-dashboard-page.tsx` | Plain Card list with eyebrow text                            | Session cards with status badges (sig-color), participant count badges, session code chips, visual hierarchy                                                                           |
| `session-new-page.tsx`          | Single Card form with 4 fields                               | Full config form: mode preset pills, preset categories with sig-color chips, visibility/anonymity/word-limit/tone settings grid, toggles row, session code preview with sig-slate chip |

---

### Task 1: Participant Session Page — Act-Aware Content

**Files:**

- Modify: `src/pages/participant-session-page.tsx`

**What to preserve:** All Convex queries (`useQuery` for session, lobby, participant, submissions), all mutations (`updateNickname`, `touchPresence`, `createSubmission`), all `useEffect` hooks, all form handlers, all error/loading states.

**What to change:** The JSX inside the `<ParticipantShell>` render — specifically the `main`, `stream`, `fightMe`, and `myZone` props.

- [ ] **Step 1: Import the act components**

Add imports at the top:

```tsx
import { SubmitAct } from "@/components/acts/submit-act";
import { DiscoverAct } from "@/components/acts/discover-act";
import { ChallengeAct } from "@/components/acts/challenge-act";
import { SynthesizeAct } from "@/components/acts/synthesize-act";
import { StreamTab } from "@/components/stream/stream-tab";
import { MyZoneTab } from "@/components/myzone/my-zone-tab";
import { FightThread } from "@/components/fight/fight-thread";
```

- [ ] **Step 2: Replace the `main` prop content**

Replace the `main` prop JSX with act-aware rendering. The existing page already has `session.currentAct` from Convex. Use it to switch which act component renders:

```tsx
main={
  <div className="grid gap-4">
    {session.currentAct === "submit" && (
      <SubmitAct
        topic={session.openingPrompt}
        wordLimit={session.responseSoftLimitWords ?? 200}
        critiqueTone={session.critiqueToneDefault}
      />
    )}
    {session.currentAct === "discover" && <DiscoverAct />}
    {session.currentAct === "challenge" && <ChallengeAct />}
    {session.currentAct === "synthesize" && <SynthesizeAct />}
    {submissionError && (
      <InlineAlert tone="error">{submissionError}</InlineAlert>
    )}
  </div>
}
```

Note: The SubmitAct currently uses mock data internally. Once backend delivers real submission flow, the mock imports inside SubmitAct will be swapped for props passed from this page. For now, the visual design is correct.

Keep the existing `ResponseComposer` with its `onSubmit` handler below the act component so submission still works — or integrate the existing handler into SubmitAct's composer via prop.

- [ ] **Step 3: Replace the `stream` prop content**

Replace the stream tab with the designed StreamTab component, keeping the existing lobby presence data:

```tsx
stream={
  <div className="grid gap-4">
    {lobby && (
      <PresenceBar
        typing={lobby.aggregate.typing}
        submitted={lobby.aggregate.submitted}
        idle={lobby.aggregate.idle}
      />
    )}
    <StreamTab />
  </div>
}
```

Import `PresenceBar`:

```tsx
import { PresenceBar } from "@/components/stream/presence-bar";
```

- [ ] **Step 4: Replace the `fightMe` prop content**

```tsx
fightMe={<FightThread />}
```

This renders the mock Fight Me thread. Backend wiring comes in a later phase.

- [ ] **Step 5: Upgrade the `myZone` prop content**

Keep the existing `mySubmissions` query and `SubmissionCard` rendering, but wrap it with the MyZoneTab header and styled layout. Keep the nickname form and follow-up composer:

```tsx
myZone={
  <div className="grid gap-4">
    {/* Peach header */}
    <div className="-mx-4 -mt-4 bg-[var(--c-sig-peach)] px-4 py-4">
      <h2 className="font-display text-lg font-medium text-[var(--c-on-sig-light)]">My Zone</h2>
      <p className="text-xs text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.7 }}>
        Your responses and analysis
      </p>
    </div>

    {/* Existing submission cards with designed styling */}
    {mySubmissions === undefined && <LoadingState label="Loading your responses..." />}
    {mySubmissions?.length === 0 && (
      <p className="text-sm text-[var(--c-muted)]">Your submitted responses appear here.</p>
    )}
    {mySubmissions && mySubmissions.length > 0 && (
      <div className="grid gap-3">
        {mySubmissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            showAuthor={false}
            onAddFollowUp={(submissionId) => setFollowUpParentId(submissionId)}
          />
        ))}
      </div>
    )}

    {/* Keep existing follow-up composer */}
    {followUpParentId && (
      <Card
        title="Add follow-up"
        action={
          <Button type="button" variant="ghost" size="sm" onClick={() => setFollowUpParentId(null)}>
            Cancel
          </Button>
        }
      >
        <ResponseComposer
          softWordLimit={session.responseSoftLimitWords}
          submitLabel="Add follow-up"
          placeholder="Add a clarification or extra point..."
          onSubmit={(_text, _tone, submission) =>
            handleCreateSubmission(submission, "additional_point", followUpParentId)
          }
        />
      </Card>
    )}

    {/* Keep existing nickname form */}
    <Card title="Nickname">
      <form className="grid gap-3" onSubmit={handleNicknameSubmit}>
        <Input label="Visible nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} error={nicknameError ?? undefined} />
        <Button type="submit" variant="secondary">Update nickname</Button>
      </form>
    </Card>
  </div>
}
```

- [ ] **Step 6: Type check and verify**

```bash
vp check
```

Navigate to `/session/demo-discussion`. Verify act content renders (cream topic card in Submit, feedback card in Discover, etc.). Verify submissions still work. Verify stream shows presence bar. Verify Fight Me shows the thread layout. Verify My Zone has peach header.

- [ ] **Step 7: Commit**

```bash
git add src/pages/participant-session-page.tsx
git commit -m "feat: upgrade participant session page with designed act components"
```

---

### Task 2: Instructor Command Center — Full Design

**Files:**

- Modify: `src/pages/instructor-session-page.tsx`

**What to preserve:** All Convex queries (session, lobby, submissions), QR code generation, routes, all data loading patterns.

**What to change:** The JSX inside `<InstructorShell>` — left/center/right panel content.

- [ ] **Step 1: Upgrade left panel — Category Board**

Replace the basic QR + config cards with a designed category board. Since real categories don't exist yet (backend Phase 07), use MOCK_CATEGORIES for the category board while keeping the real QR code and session config:

```tsx
import { MOCK_CATEGORIES, MOCK_ACTIVITY_FEED } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { PresenceBar } from "@/components/stream/presence-bar";
```

Left panel structure:

1. QR code card (keep existing — real data)
2. Category cards with signature-color left borders, counts, action buttons (Rename/Split/Pin/Follow-up)
3. Uncategorized queue with "Run categorization" button
4. Overlap detection alert (yellow-tinted card)

- [ ] **Step 2: Upgrade center panel — Metrics + Consensus + Distribution**

Replace basic MetricTiles with:

1. Metrics row: Submitted (with green color), Categories count, Recat Requests, Avg Originality (mustard)
2. Typing presence bar (use real lobby aggregate data)
3. Consensus pulse (horizontal stacked bar: coral/mustard/sky)
4. Response distribution card (CSS dot-grid MVP version)
5. Keep real submission list below (with SubmissionCard)

- [ ] **Step 3: Upgrade right panel — Activity Feed**

Replace basic participant list with designed activity feed:

1. Use `MOCK_ACTIVITY_FEED` for event rows (real activity feed comes with backend Phase 12)
2. Each row: colored dot (category color), participant name, action description, telemetry label, timestamp
3. Keep existing real participant list below as "Recent Participants" section

- [ ] **Step 4: Type check and verify**

```bash
vp check
```

Navigate to `/instructor/session/demo-discussion`. Verify the 3-panel layout shows: category board with colored borders (left), metrics + consensus pulse (center), activity feed with colored dots (right). Verify QR code still generates. Verify real data from Convex still loads.

- [ ] **Step 5: Commit**

```bash
git add src/pages/instructor-session-page.tsx
git commit -m "feat: upgrade instructor command center with designed panels"
```

---

### Task 3: Instructor Dashboard — Designed Session Cards

**Files:**

- Modify: `src/pages/instructor-dashboard-page.tsx`

**What to preserve:** Convex session list query, navigation, create button, empty/loading states.

**What to change:** Session card rendering — add status badges, sig-color accents, better visual hierarchy.

- [ ] **Step 1: Upgrade session cards**

Each session card should show:

- Session title (font-display, medium weight)
- Status badge using sig-colors: Draft = neutral, Open = sky, Active = peach, Closed = slate
- Session code chip (sig-slate badge)
- Participant count with icon
- Opening prompt preview (truncated, body text)
- "Open" button

Replace the Card-per-session rendering with:

```tsx
<div
  key={session.slug}
  className="flex items-start justify-between gap-4 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4"
>
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <h2 className="truncate font-display text-base font-medium text-[var(--c-ink)]">
        {session.title}
      </h2>
      <Badge tone="sky">{session.currentAct}</Badge>
      <Badge tone="slate">{session.joinCode}</Badge>
    </div>
    <p className="mt-1 line-clamp-2 text-sm text-[var(--c-body)]">{session.openingPrompt}</p>
    <p className="mt-2 text-xs text-[var(--c-muted)]">
      {session.participantCount ?? 0} participants
    </p>
  </div>
  <Button
    type="button"
    onClick={() => (window.location.href = routes.instructorSession(session.slug))}
  >
    Open
  </Button>
</div>
```

- [ ] **Step 2: Type check and verify**

```bash
vp check
```

Navigate to `/instructor`. Verify session cards have status badges, code chips, and proper hierarchy.

- [ ] **Step 3: Commit**

```bash
git add src/pages/instructor-dashboard-page.tsx
git commit -m "feat: upgrade instructor dashboard with designed session cards"
```

---

### Task 4: Session Creation — Full Config Form

**Files:**

- Modify: `src/pages/session-new-page.tsx`

**What to preserve:** Convex `createSession` mutation, form submission handler, error state, isSubmitting state.

**What to change:** Form layout — add all config fields from the design spec.

- [ ] **Step 1: Upgrade form layout**

Replace the single Card form with a full configuration layout:

1. **Mode preset pills** — row of 3 buttons (Class Discussion / Conference Q&A / Workshop) styled like tone pills, replacing the `<select>` dropdown
2. **Title + Topic** — keep existing inputs (already good)
3. **Settings grid (2x2)** — Visibility mode dropdown, Anonymity dropdown, Soft word limit number input, Default critique tone (ToneSelector component)
4. **Preset categories** — tag input showing sig-color chips (cream/peach/sky) with "+" add button. For MVP, this is visual-only; backend doesn't support preset categories yet.
5. **Toggles row** — Fight Me enabled, Summary Gate, Telemetry enabled (use Switch component)
6. **Session code preview** — large sig-slate chip with the code, "Regenerate" link. Keep existing joinCode input but style it as the preview.
7. **Actions row** — "Save as Template" secondary + "Go Live" primary (keep existing submit handler on "Go Live")

- [ ] **Step 2: Import additional components**

```tsx
import { ToneSelector } from "@/components/submission/tone-selector";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 3: Type check and verify**

```bash
vp check
```

Navigate to `/instructor/session/new`. Verify the form shows all config fields with proper styling. Verify submitting still creates a session via Convex.

- [ ] **Step 4: Commit**

```bash
git add src/pages/session-new-page.tsx
git commit -m "feat: upgrade session creation form with full design config"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run full checks**

```bash
vp check
vp test
```

- [ ] **Step 2: Visual verification**

| Page                      | Route                                 | Check                                                                                                                             |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Participant session       | `/session/demo-discussion`            | Act components render per act, cream topic card visible, stream has presence bar, Fight Me shows thread, My Zone has peach header |
| Instructor command center | `/instructor/session/demo-discussion` | Category board with colored borders, metrics row with sig-colors, consensus pulse bar, activity feed with dots                    |
| Instructor dashboard      | `/instructor`                         | Session cards have status badges, code chips, proper hierarchy                                                                    |
| Session creation          | `/instructor/session/new`             | Mode pills, settings grid, toggle row, code preview chip                                                                          |

- [ ] **Step 3: Commit if any final fixes**

```bash
git add -A
git commit -m "chore: complete UI Phase 02b design upgrades"
```

---

## What This Plan Produces

After 5 tasks:

- All 4 pages upgraded from bare UI to designed layouts matching the spec
- All existing Convex integration preserved (queries, mutations, form handlers)
- Participant session page switches act content based on `session.currentAct`
- Instructor command center has the full 3-panel designed layout
- Dashboard has proper session cards with visual hierarchy
- Session creation has the full config form

## What Comes Next

- **UI Phase 03: Backend Wiring** — Replace mock data inside act components with real Convex query data as backend phases deliver
- **UI Phase 04: Interaction Polish** — Framer Motion, loading skeletons, error recovery
