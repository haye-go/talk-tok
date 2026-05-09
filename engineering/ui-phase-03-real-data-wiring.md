# UI Phase 03: Real Data Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data imports in UI components with real Convex data from the two overview queries (`api.participantWorkspace.overview` and `api.instructorCommandCenter.overview`) and wire interactive controls (phase transitions, follow-up composer, recategorisation) to real mutations.

**Architecture:** The backend provides two "god queries" that return everything each surface needs in one call. The frontend consumes these, maps the returned data shapes into component props, and calls mutations for user actions. No new Convex files — this phase is frontend-only.

**Tech Stack:** Convex React hooks (`useQuery`, `useMutation`), existing component library, TypeScript

**Prerequisite:** Backend Phases 1-7 complete. UI Phases 01a, 02, 02b complete.

**Critical rule:** Do NOT modify any `convex/*.ts` files. Only modify `src/` files.

---

## Backend API Summary

### Participant Surface

**Primary query:** `api.participantWorkspace.overview({ sessionSlug, clientKey })`

Returns:

- `session` — slug, title, phase, currentAct, visibilityMode, critiqueToneDefault, responseSoftLimitWords, fightMeEnabled, summaryGateEnabled
- `participant` — id, nickname, role, presenceState
- `visibility` — mode, canSeeCategorySummary, canSeeRawPeerResponses
- `mySubmissions[]` — body, kind, wordCount, inputPattern, compositionMs, pasteEventCount, createdAt, followUpPromptId
- `feedbackBySubmission[]` — status, tone, reasoningBand, originalityBand, specificityBand, summary, strengths, improvement, nextQuestion, error
- `assignmentsBySubmission[]` — submissionId, categoryId, categorySlug, categoryName, confidence, rationale, status
- `recategorisationRequests[]` — submissionId, currentCategoryId, requestedCategoryId, reason, status, instructorNote
- `categorySummary[]` — id, slug, name, description, color, assignmentCount (visibility-gated)
- `recentPeerResponses[]` — body, nickname, kind, inputPattern, createdAt (visibility-gated)
- `activeFollowUps[]` — id, slug, title, prompt, instructions, targetMode, roundNumber, targets[], myResponseCount
- `recentJobs[]` — type, status, error
- `myZoneHistory` — initialResponses[], followUpResponses[], timeline[]

**Submission mutation:** `api.participantWorkspace.submitAndQueueFeedback({ sessionSlug, clientKey, body, kind, tone, telemetry, followUpPromptId? })`

**Recategorisation:** `api.recategorisation.request({ sessionSlug, clientKey, submissionId, requestedCategoryId?, suggestedCategoryName?, reason })`

### Instructor Surface

**Primary query:** `api.instructorCommandCenter.overview({ sessionSlug })`

Returns:

- `session` — full snapshot including participantCount
- `presenceAggregate` — typing, submitted, idle, offline, total
- `submissionAggregate` — total, byInputPattern{}, byKind{}
- `categories[]` — id, slug, name, description, color, source, status, assignmentCount
- `uncategorizedCount`
- `pendingRecategorisationCount`
- `jobSummary` — { feedback: {queued, processing, success, error}, categorisation: {...}, ... }
- `recentSubmissions[]` — with participant name, category assignment, inputPattern
- `recentAuditEvents[]` — action, actorType, targetType, metadataJson, createdAt
- `followUpSummary` — activeCount, recentPrompts[]

**Phase control:** `api.instructorControls.updatePhase({ sessionSlug, phase, currentAct? })`
**Visibility control:** `api.instructorControls.updateVisibility({ sessionSlug, visibilityMode })`
**Categorisation trigger:** `api.categorisation.triggerForSession({ sessionSlug })`
**Category CRUD:** `api.categoryManagement.create/update/archive`
**Recategorisation decisions:** `api.recategorisation.decide({ ... })`
**Follow-up creation:** `api.followUps.create({ sessionSlug, title?, prompt, instructions?, targetMode, categoryIds?, activateNow? })`
**Follow-up status:** `api.followUps.setStatus({ sessionSlug, followUpSlug, status })`

---

## Tone Value Fix

Before any wiring work, fix the tone ID mismatch.

### Task 0: Fix Tone Values

**Files:**

- Modify: `src/lib/mock-data.ts`
- Modify: `src/components/submission/tone-selector.tsx`

- [ ] **Step 1: Update CRITIQUE_TONES ids to match backend**

In `src/lib/mock-data.ts`, change:

```ts
export const CRITIQUE_TONES = [
  { id: "gentle", label: "Kind" },
  { id: "direct", label: "Direct" },
  { id: "spicy", label: "Spicy" },
  { id: "roast", label: "Roast" },
] as const;
```

Also update `MOCK_SESSION.critiqueTone` from `"spicy"` to `"spicy"` (this one is already correct).
Update `MOCK_FEEDBACK.tone` from `"spicy"` to `"spicy"` (also already correct).

The key change is `"supportive"` → `"gentle"`. The display label "Kind" stays.

- [ ] **Step 2: Verify ToneSelector still renders**

The ToneSelector uses `CRITIQUE_TONES` directly, so the id change flows through automatically.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "fix: align critique tone ids with backend enum (supportive → gentle)"
```

---

## Participant Data Wiring

### Task 1: Create Participant Workspace Hook

**Files:**

- Create: `src/hooks/use-participant-workspace.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useParticipantWorkspace(sessionSlug: string, clientKey: string | null) {
  const data = useQuery(
    api.participantWorkspace.overview,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );

  return data;
}

export type ParticipantWorkspace = NonNullable<ReturnType<typeof useParticipantWorkspace>>;
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-participant-workspace.ts
git commit -m "feat: add useParticipantWorkspace hook for overview query"
```

---

### Task 2: Wire DiscoverAct to Real Feedback + Categories

**Files:**

- Modify: `src/components/acts/discover-act.tsx`
- Modify: `src/components/feedback/feedback-card.tsx`

- [ ] **Step 1: Update FeedbackCard to show full multi-band feedback**

The backend returns `reasoningBand`, `originalityBand`, `specificityBand`, `summary`, `strengths`, `improvement`, `nextQuestion`. The current FeedbackCard only shows a single originality slider and one text block.

Update FeedbackCard to accept the full feedback shape:

```tsx
interface FeedbackCardProps {
  tone: string;
  status: "queued" | "processing" | "success" | "error";
  reasoningBand?: string;
  originalityBand?: string;
  specificityBand?: string;
  summary?: string;
  strengths?: string;
  improvement?: string;
  nextQuestion?: string;
  telemetryLabel?: string;
  error?: string;
}
```

Render:

- Status indicator (pending spinner if queued/processing, error alert if failed)
- Originality slider (map band names to percentages: common=25, above_average=50, distinctive=75, novel=95)
- Summary text (the main qualitative paragraph)
- Strengths section (if present)
- Improvement section (if present)
- Next question prompt (if present)
- Reasoning + specificity as small badge indicators

- [ ] **Step 2: Update DiscoverAct to accept real data via props**

Change DiscoverAct from importing mock data to accepting props:

```tsx
interface DiscoverActProps {
  feedback?: ParticipantWorkspace["feedbackBySubmission"][0] | null;
  categories?: ParticipantWorkspace["categorySummary"];
  assignment?: ParticipantWorkspace["assignmentsBySubmission"][0] | null;
  telemetryLabel?: string;
  onRequestRecategorisation?: (submissionId: string) => void;
}
```

When no feedback exists yet, show "Waiting for AI analysis..." with a pending indicator.

- [ ] **Step 3: Commit**

```bash
git add src/components/acts/discover-act.tsx src/components/feedback/feedback-card.tsx
git commit -m "feat: wire DiscoverAct and FeedbackCard to real backend data shapes"
```

---

### Task 3: Wire ChallengeAct to Real Follow-Ups

**Files:**

- Modify: `src/components/acts/challenge-act.tsx`

- [ ] **Step 1: Update ChallengeAct to accept follow-up data**

Change from hardcoded mock follow-up to props:

```tsx
interface ChallengeActProps {
  activeFollowUps?: ParticipantWorkspace["activeFollowUps"];
  categories?: ParticipantWorkspace["categorySummary"];
  fightMeEnabled?: boolean;
  onSubmitFollowUpResponse?: (followUpPromptId: string, text: string, tone: string) => void;
}
```

Render:

- List of active follow-ups as prompt cards (real data from `activeFollowUps[]`)
- Each follow-up shows: title, prompt text, target info (all / specific categories), response composer if not yet responded (`myResponseCount === 0`)
- Fight Me CTA (unchanged, but gated by `fightMeEnabled`)
- Position shift flag (unchanged)

- [ ] **Step 2: Commit**

```bash
git add src/components/acts/challenge-act.tsx
git commit -m "feat: wire ChallengeAct to real follow-up data"
```

---

### Task 4: Wire StreamTab to Real Peer Responses

**Files:**

- Modify: `src/components/stream/stream-tab.tsx`

- [ ] **Step 1: Update StreamTab to accept real data**

Change from importing `MOCK_STREAM_RESPONSES` / `MOCK_CATEGORIES` to props:

```tsx
interface StreamTabProps {
  peerResponses?: ParticipantWorkspace["recentPeerResponses"];
  categories?: ParticipantWorkspace["categorySummary"];
  visibility?: ParticipantWorkspace["visibility"];
  presenceTyping?: number;
  presenceSubmitted?: number;
  presenceIdle?: number;
}
```

When `visibility.canSeeRawPeerResponses` is false, show a message instead of the stream.
When `visibility.canSeeCategorySummary` is true, show category filter chips.

Map backend category `color` field to badge tones. Create a helper function:

```ts
function categoryColorToTone(color?: string): BadgeProps["tone"] {
  if (!color) return "neutral";
  const map: Record<string, BadgeProps["tone"]> = {
    sky: "sky",
    peach: "peach",
    mustard: "mustard",
    coral: "coral",
    slate: "slate",
    yellow: "yellow",
    cream: "cream",
  };
  return map[color] ?? "neutral";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/stream/stream-tab.tsx
git commit -m "feat: wire StreamTab to real peer responses with visibility gating"
```

---

### Task 5: Wire MyZoneTab to Real History

**Files:**

- Modify: `src/components/myzone/my-zone-tab.tsx`

- [ ] **Step 1: Update MyZoneTab to accept real workspace data**

Change from importing `MOCK_SUBMISSION` to props:

```tsx
interface MyZoneTabProps {
  myZoneHistory?: ParticipantWorkspace["myZoneHistory"];
  feedbackBySubmission?: ParticipantWorkspace["feedbackBySubmission"];
  assignmentsBySubmission?: ParticipantWorkspace["assignmentsBySubmission"];
  recategorisationRequests?: ParticipantWorkspace["recategorisationRequests"];
}
```

Render:

- Initial responses with category assignment badges
- Feedback status per submission (pending/ready/error)
- Follow-up responses grouped by follow-up prompt
- Recategorisation request status
- Keep peach header

When data is undefined (loading), show LoadingState.

- [ ] **Step 2: Commit**

```bash
git add src/components/myzone/my-zone-tab.tsx
git commit -m "feat: wire MyZoneTab to real workspace history"
```

---

### Task 6: Rewrite Participant Session Page to Use Overview Query

**Files:**

- Modify: `src/pages/participant-session-page.tsx`

This is the biggest task. The page currently calls multiple individual queries. Replace with one `useParticipantWorkspace` call plus the existing submission mutation.

- [ ] **Step 1: Replace data fetching**

Remove individual queries:

- `api.sessions.getBySlug`
- `api.participants.restore`
- `api.participants.listLobby`
- `api.submissions.listMine`
- `api.submissions.listForSession`

Replace with:

```tsx
const workspace = useParticipantWorkspace(sessionSlug, clientKey);
```

Keep: `updateNickname`, `touchPresence` mutations.

Replace submission creation with:

```tsx
const submitAndQueue = useMutation(api.participantWorkspace.submitAndQueueFeedback);
```

- [ ] **Step 2: Pass real data to act components**

```tsx
main={
  <div className="grid gap-4">
    {workspace.session.currentAct === "submit" && (
      <>
        <TopicCard topic={workspace.session.openingPrompt} />
        <ResponseComposer
          softWordLimit={workspace.session.responseSoftLimitWords}
          onSubmit={async (_text, _tone, submission) => {
            await submitAndQueue({
              sessionSlug,
              clientKey: clientKey!,
              body: submission.body,
              kind: "initial",
              tone: submission.tone,
              telemetry: submission.telemetry,
            });
          }}
        />
      </>
    )}
    {workspace.session.currentAct === "discover" && (
      <DiscoverAct
        feedback={workspace.feedbackBySubmission[0] ?? null}
        categories={workspace.categorySummary}
        assignment={workspace.assignmentsBySubmission[0] ?? null}
      />
    )}
    {workspace.session.currentAct === "challenge" && (
      <ChallengeAct
        activeFollowUps={workspace.activeFollowUps}
        categories={workspace.categorySummary}
        fightMeEnabled={workspace.session.fightMeEnabled}
      />
    )}
    {workspace.session.currentAct === "synthesize" && (
      <SynthesizeAct categories={workspace.categorySummary} />
    )}
  </div>
}
```

- [ ] **Step 3: Pass real data to stream/myZone/fightMe tabs**

Wire StreamTab with `workspace.recentPeerResponses`, `workspace.categorySummary`, `workspace.visibility`.

Wire MyZoneTab with `workspace.myZoneHistory`, `workspace.feedbackBySubmission`, `workspace.assignmentsBySubmission`, `workspace.recategorisationRequests`.

Wire Fight Me tab with `workspace.fightMe` data (see Task 6b below).

- [ ] **Step 4: Type check and verify**

```bash
vp check
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/participant-session-page.tsx
git commit -m "feat: wire participant session page to participantWorkspace.overview"
```

---

## Fight Me Data Wiring

Phase 08 delivered a comprehensive Fight Me backend. The current mock FightThread/FightBubble/FightDebrief components need significant updates to support the real data model.

### Task 6b: Redesign Fight Me Components for Real Backend

**Files:**

- Modify: `src/components/fight/fight-bubble.tsx`
- Modify: `src/components/fight/fight-debrief.tsx`
- Modify: `src/components/fight/fight-thread.tsx`
- Create: `src/components/fight/fight-home.tsx`
- Create: `src/components/fight/fight-challenge-card.tsx`
- Create: `src/components/fight/fight-draft-composer.tsx`
- Create: `src/components/fight/fight-countdown.tsx`
- Create: `src/components/fight/fight-target-picker.tsx`

**Key differences from mock design:**

1. **Two modes:** `vs_ai` (AI generates counterarguments) and `real_1v1` (player picks an opposing response to challenge). The Fight Me tab needs a home screen where participants choose which mode and pick a target.

2. **Challenge lifecycle:** For real_1v1, the attacker selects a defender's response → challenge is created as `pending_acceptance` → defender has 20s to accept/decline → if accepted, 4-turn debate with 60s per turn. The UI needs: target picker, pending state with countdown, accept/decline for defenders, active turn indicator.

3. **Draft autosave:** Participants can draft while waiting for acceptance. The UI needs a composer that throttle-saves via `api.fightMe.saveDraft` every 2-3 seconds.

4. **Turn-based flow:** 4 turns (attacker → defender → attacker → defender). Each turn has a 60s deadline. The UI needs a countdown timer and "whose turn is it" indicator.

5. **Debrief shape:** Backend returns `attackerStrength`, `defenderStrength`, `strongerRebuttal`, `nextPractice`, `summary` — different from the mock's `defended`/`weaker`/`stronger`.

- [ ] **Step 1: Create FightHome component**

The Fight Me tab's default view when no active fight exists. Shows:

- "vs AI" button — calls `api.fightMe.createVsAi` with the participant's own submission
- "Challenge a Response" button — opens target picker
- List of past fight threads (`workspace.fightMe.mine`) with status badges
- Pending incoming challenges (`workspace.fightMe.pendingIncoming`) with accept/decline buttons and countdown

```tsx
interface FightHomeProps {
  myFights: ParticipantWorkspace["fightMe"]["mine"];
  pendingIncoming: ParticipantWorkspace["fightMe"]["pendingIncoming"];
  currentFight: ParticipantWorkspace["fightMe"]["current"] | null;
  fightMeEnabled: boolean;
  sessionSlug: string;
  clientKey: string;
  onNavigateToThread: (fightSlug: string) => void;
}
```

- [ ] **Step 2: Create FightTargetPicker component**

Shows available opposing responses to challenge. Uses `api.fightMe.findAvailableTargets`.

```tsx
interface FightTargetPickerProps {
  sessionSlug: string;
  clientKey: string;
  onCreateChallenge: (defenderSubmissionId: string) => void;
  onCancel: () => void;
}
```

Each target shows: nickname, response preview, word count. Tapping creates a challenge.

- [ ] **Step 3: Create FightCountdown component**

A small countdown timer showing seconds remaining. Used for both acceptance deadline (20s) and turn deadline (60s).

```tsx
interface FightCountdownProps {
  deadlineAt: number;
  label?: string;
  onExpired?: () => void;
}
```

Uses `requestAnimationFrame` or a 1s interval to update.

- [ ] **Step 4: Create FightDraftComposer component**

A textarea that auto-saves drafts via `api.fightMe.saveDraft` every 2-3 seconds, with a "Submit Turn" button that calls `api.fightMe.submitTurn`.

```tsx
interface FightDraftComposerProps {
  sessionSlug: string;
  fightSlug: string;
  clientKey: string;
  isMyTurn: boolean;
  turnDeadlineAt?: number;
  existingDraft?: string;
}
```

- [ ] **Step 5: Update FightBubble for real turn data**

Accept the full turn shape from backend:

```tsx
interface FightBubbleProps {
  role: "attacker" | "defender" | "ai";
  body: string;
  turnNumber: number;
  status: "submitted" | "missed";
  source: "manual" | "draft_timeout" | "ai";
  nickname?: string;
  isMe?: boolean;
}
```

Show "missed" turns with muted/strikethrough styling. Show "auto-submitted" indicator for `draft_timeout` source.

- [ ] **Step 6: Update FightDebrief for real debrief shape**

Backend returns `attackerStrength`, `defenderStrength`, `strongerRebuttal`, `nextPractice`, `summary` with a `status` field (queued/processing/success/error).

```tsx
interface FightDebriefProps {
  status: "queued" | "processing" | "success" | "error";
  summary?: string;
  attackerStrength?: string;
  defenderStrength?: string;
  strongerRebuttal?: string;
  nextPractice?: string;
  error?: string;
}
```

Show pending/loading state when status is queued/processing. Show error state when failed.

- [ ] **Step 7: Rewrite FightThread to use real data**

The fight-page route (`/session/:sessionSlug/fight/:fightSlug`) should call `api.fightMe.getThread` for the full thread data including turns, debrief, and current draft.

```tsx
interface FightThreadProps {
  sessionSlug: string;
  fightSlug: string;
  clientKey: string;
}
```

The component:

1. Calls `useQuery(api.fightMe.getThread, { sessionSlug, fightSlug, clientKey })`
2. Shows the challenge context (attacker/defender submissions)
3. Renders turns as FightBubble components
4. Shows FightDraftComposer when it's the participant's turn
5. Shows FightCountdown for active turn deadline
6. Shows FightDebrief when thread is completed
7. Shows pending acceptance state with countdown for pending_acceptance threads

- [ ] **Step 8: Wire Fight Me tab in participant session page**

The Fight Me tab content should show:

- `FightHome` when no active/current fight (using `workspace.fightMe`)
- Direct navigation to the active thread when `workspace.fightMe.current` exists

- [ ] **Step 9: Commit**

```bash
git add src/components/fight/ src/pages/fight-page.tsx src/pages/participant-session-page.tsx
git commit -m "feat: wire Fight Me to real backend with challenge lifecycle, drafts, countdowns, and debrief"
```

---

## Instructor Data Wiring

### Task 7: Create Instructor Command Center Hook

**Files:**

- Create: `src/hooks/use-instructor-overview.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useInstructorOverview(sessionSlug: string) {
  return useQuery(api.instructorCommandCenter.overview, { sessionSlug });
}

export type InstructorOverview = NonNullable<ReturnType<typeof useInstructorOverview>>;
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-instructor-overview.ts
git commit -m "feat: add useInstructorOverview hook"
```

---

### Task 8: Wire Instructor Command Center to Real Data

**Files:**

- Modify: `src/pages/instructor-session-page.tsx`

- [ ] **Step 1: Replace data fetching with overview query**

Remove individual queries (`api.sessions.getBySlug`, `api.participants.listLobby`, `api.submissions.listForSession`). Remove `MOCK_CATEGORIES` and `MOCK_ACTIVITY_FEED` imports.

Replace with:

```tsx
const overview = useInstructorOverview(sessionSlug);
```

- [ ] **Step 2: Wire left panel — real categories**

Replace mock category cards with `overview.categories`. Map each category's `color` field to badge tones. Show real `assignmentCount`. Show `overview.uncategorizedCount`. Show `overview.pendingRecategorisationCount`.

Wire "Run categorization" button to `api.categorisation.triggerForSession`.
Wire category rename to `api.categoryManagement.update`.

- [ ] **Step 3: Wire center panel — real metrics and presence**

Use `overview.submissionAggregate.total` for submitted count.
Use `overview.categories.length` for category count.
Use `overview.pendingRecategorisationCount` for recat requests.
Use `overview.presenceAggregate` for PresenceBar (real data, already partially wired).
Use `overview.jobSummary` for AI job status indicators.

- [ ] **Step 4: Wire right panel — real activity feed**

Replace `MOCK_ACTIVITY_FEED` with `overview.recentAuditEvents`. Map audit event `action` field to activity feed display (submit, recat, followup, fightme, shift).

- [ ] **Step 5: Wire phase/visibility controls**

Add mutations:

```tsx
const updatePhase = useMutation(api.instructorControls.updatePhase);
const updateVisibility = useMutation(api.instructorControls.updateVisibility);
```

Wire the "Prev" / "Next" act buttons to call `updatePhase` with the appropriate phase/act values.

- [ ] **Step 6: Wire follow-up creation**

Add a follow-up composer section (can be a modal or inline panel) that calls `api.followUps.create`. Show `overview.followUpSummary` for active follow-up status.

- [ ] **Step 7: Type check and verify**

```bash
vp check
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/instructor-session-page.tsx
git commit -m "feat: wire instructor command center to real overview data and controls"
```

---

### Task 9: Wire Admin Pages to Real Data

**Files:**

- Modify: `src/pages/admin-models-page.tsx`
- Modify: `src/pages/admin-prompts-page.tsx`
- Modify: `src/pages/admin-protection-page.tsx`
- Modify: `src/pages/admin-observability-page.tsx`

- [ ] **Step 1: Wire admin-models to real model settings**

Replace `MOCK_PROVIDERS` and `MOCK_FEATURE_ASSIGNMENTS` with `useQuery(api.modelSettings.list)` (if available) or keep mock data with a TODO comment for later wiring.

- [ ] **Step 2: Wire admin-prompts to real prompt templates**

Replace `MOCK_PROMPT` with `useQuery(api.promptTemplates.list)`. Wire save to `useMutation(api.promptTemplates.update)`.

- [ ] **Step 3: Wire admin-protection to real protection settings**

Wire to `api.protection.listForSession` and `api.protection.update`.

- [ ] **Step 4: Wire admin-observability to real LLM data**

Wire summary tiles to `api.llmObservability.summary`. Wire recent calls table to `api.llmObservability.recentCalls`.

- [ ] **Step 5: Type check, verify, commit**

```bash
vp check
git add src/pages/admin-*.tsx
git commit -m "feat: wire admin pages to real Convex APIs"
```

---

### Task 10: Create Category Color Mapping Utility

**Files:**

- Create: `src/lib/category-colors.ts`

- [ ] **Step 1: Create the mapping**

```ts
import type { BadgeProps } from "@/components/ui/badge";

const CATEGORY_COLOR_CYCLE: NonNullable<BadgeProps["tone"]>[] = [
  "sky",
  "peach",
  "mustard",
  "coral",
  "slate",
  "yellow",
  "cream",
];

export function categoryColorToTone(
  color?: string | null,
  index?: number,
): NonNullable<BadgeProps["tone"]> {
  if (color && isKnownTone(color)) return color as NonNullable<BadgeProps["tone"]>;
  if (typeof index === "number") return CATEGORY_COLOR_CYCLE[index % CATEGORY_COLOR_CYCLE.length];
  return "neutral";
}

function isKnownTone(color: string): boolean {
  return ["sky", "peach", "mustard", "coral", "slate", "yellow", "cream", "neutral"].includes(
    color,
  );
}
```

This handles three cases:

1. Backend category has a known color string → use it directly
2. Backend category has no color → assign by index from the cycle
3. Unknown color string → fallback to neutral

- [ ] **Step 2: Commit**

```bash
git add src/lib/category-colors.ts
git commit -m "feat: add category color to badge tone mapping utility"
```

---

### Task 11: Update Session Creation Form Visibility Options

**Files:**

- Modify: `src/pages/session-new-page.tsx`

- [ ] **Step 1: Update visibility dropdown to match backend**

Change the select options from the two-option design to match the three backend modes:

```tsx
<select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
  <option value="private_until_released">Private until released</option>
  <option value="category_summary_only">Category summaries only</option>
  <option value="raw_responses_visible">Raw responses visible</option>
</select>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/session-new-page.tsx
git commit -m "fix: update visibility options to match backend three-mode enum"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Type check**

```bash
vp check
```

- [ ] **Step 2: Run tests**

```bash
vp test
```

- [ ] **Step 3: Visual verification**

| Surface                   | What to check                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Participant Submit        | Real submission goes through, feedback queued                                                                       |
| Participant Discover      | Real feedback card renders with bands, real category placement                                                      |
| Participant Challenge     | Real follow-up prompts from instructor appear                                                                       |
| Participant Stream        | Real peer responses (when visibility allows), category filters from real categories                                 |
| Participant My Zone       | Real submission history with feedback status, fight records                                                         |
| Participant Fight Me tab  | FightHome shows past fights, pending incoming challenges; target picker works; challenge creation works             |
| Fight Me thread page      | Real turns render, countdown timers tick, draft autosave works, debrief shows when complete                         |
| Instructor Command Center | Real categories with assignment counts, real presence, real audit feed, phase controls work, fight activity visible |
| Instructor Dashboard      | Real session list                                                                                                   |
| Admin Observability       | Real LLM call data                                                                                                  |

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: UI Phase 03 real data wiring complete"
```

---

## What This Plan Produces

After 13 tasks (0-12):

- All mock data imports removed from live pages (mock-data.ts stays for reference/testing)
- Participant pages consume `participantWorkspace.overview` — one reactive query for all state
- Instructor pages consume `instructorCommandCenter.overview` — one reactive query for all state
- Phase/visibility controls wired to real mutations
- Follow-up creation and display wired
- FeedbackCard shows full multi-band AI feedback
- Category colors mapped from backend to design system
- Tone values aligned between frontend and backend
- Admin pages wired to real observability/prompt/protection APIs
- **Fight Me fully wired** — challenge lifecycle (create/accept/decline/cancel), target picker, draft autosave, turn-based debate with countdowns, vs AI mode, real debrief with status

## What Comes Next

- **UI Phase 04: Interaction Polish** — Framer Motion animations, AI pending/loading skeletons, error recovery flows, reconnection states
- **UI Phase 05: Visualizations** — card-based MVP (novelty, drift, consensus), then D3 stretch
