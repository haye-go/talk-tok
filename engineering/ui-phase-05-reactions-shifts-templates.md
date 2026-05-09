# UI Phase 05: Final Feature Wiring

## Purpose

Wire all remaining backend features into the UI. This is the final UI phase, covering:

- Phase 10: Reactions, position shifts, session templates, summary gate
- Phase 11A + 11C: Demo seed/reset/health/simulation toggles
- Phase 11B + 12B: Semantic visualization (novelty radar, category drift, argument map)
- Phase 12A: Observability drilldown, budget dashboard, demo ops status
- Misc: Update stale demo constant

## Prerequisites

- All backend phases complete (10, 11A, 11B, 11C, 12A, 12B)
- UI Phase 04 complete (synthesis and personal reports wired)

## Backend Contracts Used

### Reactions (Phase 10)

| API                               | Surface               | Notes                                                                                      |
| --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `api.reactions.toggle`            | Stream/response cards | `{ sessionSlug, clientKey, submissionId, kind }` — toggles on/off, returns updated counts  |
| `api.reactions.listForSubmission` | Response cards        | `{ submissionId }` — returns `{ counts: { agree, sharp, question, spark, changed_mind } }` |
| `api.reactions.listForSession`    | Instructor overview   | `{ sessionSlug }` — returns per-submission counts + recent reactions                       |

Reaction kinds and their display:

- `agree` → 👍 "Agree"
- `sharp` → ⚡ "Sharp"
- `question` → ❓ "Question"
- `spark` → ✨ "Spark"
- `changed_mind` → 🔄 "Changed my mind"

### Position Shifts (Phase 10)

| API                                 | Surface                               | Notes                                                                           |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| `api.positionShifts.record`         | Participant: challenge/synthesize act | `{ sessionSlug, clientKey, reason, influencedBy?, submissionId?, categoryId? }` |
| `api.positionShifts.listMine`       | My Zone tab                           | `{ sessionSlug, clientKey }` — participant's own shifts                         |
| `api.positionShifts.listForSession` | Instructor overview                   | `{ sessionSlug }` — all session shifts                                          |

### Session Templates (Phase 10)

| API                                              | Surface                      | Notes                                                                                   |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------- |
| `api.sessionTemplates.list`                      | Templates page               | `{ includeArchived? }` — returns array of template objects                              |
| `api.sessionTemplates.create`                    | Templates page (create form) | All session settings as args                                                            |
| `api.sessionTemplates.createFromSession`         | Instructor session page      | `{ sessionSlug, name?, description? }` — saves current session as template              |
| `api.sessionTemplates.createSessionFromTemplate` | Templates page               | `{ templateId, title?, openingPrompt?, joinCode? }` — creates new session from template |
| `api.sessionTemplates.archive`                   | Templates page               | `{ templateId }`                                                                        |

### Semantic & Argument Map (Phase 11B + 12B)

| API                                      | Surface                 | Notes                                                                                                |
| ---------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `api.semantic.getSemanticStatus`         | Instructor session page | `{ sessionSlug }` — returns readiness flags, counts, caps, missing prerequisites                     |
| `api.semantic.queueEmbeddingsForSession` | Instructor session page | `{ sessionSlug, entityTypes? }` — queues embedding generation job                                    |
| `api.semantic.refreshSignalsForSession`  | Instructor session page | `{ sessionSlug }` — recomputes novelty signals from existing embeddings                              |
| `api.semantic.getNoveltyRadar`           | Instructor session page | `{ sessionSlug }` — returns novelty distribution, top distinctive, common cluster, category averages |
| `api.semantic.getCategoryDrift`          | Instructor session page | `{ sessionSlug }` — returns time slices with category counts, transitions, position shifts           |
| `api.argumentMap.generateForSession`     | Instructor session page | `{ sessionSlug, refreshExisting? }` — queues argument link generation                                |
| `api.argumentMap.getVisualizationGraph`  | Instructor session page | `{ sessionSlug }` — returns nodes with layout hints, edges with weights, cluster/color keys          |

Semantic status readiness fields:

- `canShowNoveltyRadar: boolean`
- `canShowArgumentMap: boolean`
- `missingPrerequisites: string[]`

### Demo Management (Phase 11A + 11C)

| API                       | Surface         | Notes                                                                                      |
| ------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `api.demo.seed`           | Admin demo page | `{ resetExisting? }` — creates demo session, returns slug + counts                         |
| `api.demo.resetSession`   | Admin demo page | `{ confirmation: "RESET DEMO SESSION", sessionSlug?, deleteSession? }` — deletes demo data |
| `api.demo.getDemoSession` | Admin demo page | no args — returns demo session info or null                                                |
| `api.demo.health`         | Admin demo page | `{ sessionSlug? }` — returns deployment readiness check                                    |
| `api.demo.setToggle`      | Admin demo page | `{ key, enabled, valueJson? }` — sets simulation toggle                                    |
| `api.demo.listToggles`    | Admin demo page | no args — returns all demo toggles                                                         |

Toggle keys: `simulateAiFailure`, `simulateBudgetExceeded`, `simulateSlowAi`

### Observability & Budget (Phase 12A)

| API                                | Surface                  | Notes                                                                                   |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `api.llmObservability.summary`     | Admin observability page | `{ sessionSlug?, sinceMs? }` — aggregate usage with byFeature breakdown (already wired) |
| `api.llmObservability.recentCalls` | Admin observability page | `{ sessionSlug?, limit? }` — recent call rows (already wired)                           |
| `api.budget.getSessionSpend`       | Instructor session page  | `{ sessionId }` — session spend, warn/hard-stop thresholds                              |

## Scope

### Task 0: Build ReactionBar component

**File:** `src/components/reactions/reaction-bar.tsx` (new)

A horizontal row of reaction buttons that appear on submission/response cards.

Props:

```ts
interface ReactionBarProps {
  submissionId: string;
  sessionSlug: string;
  clientKey: string;
  counts?: { agree: number; sharp: number; question: number; spark: number; changed_mind: number };
  myReactions?: string[]; // kinds I've toggled on
}
```

Rendering:

- 5 small pill buttons, each showing icon + count (if > 0).
- Pressing a button calls `api.reactions.toggle({ sessionSlug, clientKey, submissionId, kind })`.
- Active (toggled-on) reactions get a highlighted background.
- Compact layout: icons only at ≤320px, icon + count at wider.

### Task 1: Add reactions to StreamTab response cards

**File:** `src/components/stream/stream-tab.tsx`

Changes:

- Each peer response card gets a ReactionBar below the response text.
- Only show reactions when `canSeeRawPeerResponses` is true.
- Pass sessionSlug and clientKey through (needs to be threaded from participant-session-page).

### Task 2: Add reactions to SubmissionCard (instructor view)

**File:** `src/components/submission/submission-card.tsx`

Changes:

- Show aggregate reaction counts below submission text in instructor view.
- Display as small inline badges: "👍 3 ⚡ 1 ✨ 2".
- Read-only (instructor doesn't toggle reactions).

### Task 3: Build PositionShiftForm component

**File:** `src/components/shifts/position-shift-form.tsx` (new)

A form for participants to record when their thinking has changed.

Props:

```ts
interface PositionShiftFormProps {
  sessionSlug: string;
  clientKey: string;
  onRecorded?: () => void;
}
```

Rendering:

- "My thinking changed" header with ArrowsClockwise icon.
- Textarea for `reason` (required, 5-1000 chars).
- Optional textarea for `influencedBy` ("What influenced this shift?").
- Submit button calling `api.positionShifts.record`.
- Compact accordion-style: collapsed by default, expands on click.

### Task 4: Add position shift form to Challenge/Synthesize acts

**File:** `src/components/acts/challenge-act.tsx` and `src/components/acts/synthesize-act.tsx`

Changes:

- Replace the static placeholder in challenge-act with a real PositionShiftForm.
- Add a PositionShiftForm at the bottom of synthesize-act.
- Thread sessionSlug and clientKey through from participant-session-page.

### Task 5: Show position shift history in MyZoneTab

**File:** `src/components/myzone/my-zone-tab.tsx`

Changes:

- Add a "Position Shifts" section showing the participant's recorded shifts.
- Query `api.positionShifts.listMine` from participant-session-page and pass as prop.
- Each shift card: reason text, optional "influenced by" note, timestamp.
- Styled with ArrowsClockwise icon and mustard accent.

### Task 6: Rewrite TemplatesPage with real data

**File:** `src/pages/templates-page.tsx`

Current state: Placeholder `EmptyState`.

New implementation:

- Query `api.sessionTemplates.list` for all active templates.
- Show template cards with: name, description, mode preset badge, settings summary (visibility, anonymity, tone, word limit, feature flags), preset category count.
- "Create from Template" button on each card → calls `api.sessionTemplates.createSessionFromTemplate`, navigates to new session.
- "Archive" button → calls `api.sessionTemplates.archive`.
- "Create Template" button/form at top (or dialog) for manual template creation.
- Empty state when no templates exist.

### Task 7: Add "Save as Template" to instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Changes:

- Add a "Save as Template" button in the left panel (below QR code card).
- On click, calls `api.sessionTemplates.createFromSession({ sessionSlug })`.
- Show success feedback (toast or inline message).

### Task 8: Update session-new-page to support template selection

**File:** `src/pages/session-new-page.tsx`

Changes:

- Query `api.sessionTemplates.list` at top of page.
- If templates exist, show a "Start from Template" section before the manual form.
- Each template as a compact card with "Use This" button.
- "Use This" calls `api.sessionTemplates.createSessionFromTemplate({ templateId })` and navigates to the new session.
- Manual form remains unchanged below.

### Task 9: Thread sessionSlug/clientKey to new components

**File:** `src/pages/participant-session-page.tsx`

Changes:

- Pass `sessionSlug` and `clientKey` to StreamTab, ChallengeAct, SynthesizeAct for reactions and position shifts.
- Query `api.positionShifts.listMine` and pass results to MyZoneTab.

### Task 10: Summary gate awareness

**File:** `src/components/acts/challenge-act.tsx`

Changes:

- If `summaryGateEnabled` is true on the session and no published/final synthesis artifacts exist, show a notice: "Follow-up responses require the instructor to publish synthesis results first."
- Check `ws?.synthesis.publishedArtifacts.length` + `ws?.synthesis.finalArtifacts.length`.

### Task 11: Semantic status and trigger controls on instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Add a "Semantic Analysis" section in the center panel (below Synthesis Dashboard).

Query `api.semantic.getSemanticStatus({ sessionSlug })`.

Rendering:

- Readiness status: green/amber/red indicator based on `readiness.canShowNoveltyRadar` and `readiness.canShowArgumentMap`.
- Missing prerequisites list (if any) as inline warnings.
- MetricTiles: embedding count, novelty signal count, argument link count.
- "Generate Embeddings" button → calls `api.semantic.queueEmbeddingsForSession({ sessionSlug })`. Show spinner while job is processing.
- "Refresh Novelty Signals" button → calls `api.semantic.refreshSignalsForSession({ sessionSlug })`.
- "Generate Argument Map" button → calls `api.argumentMap.generateForSession({ sessionSlug })`. Show spinner while job is processing.

### Task 12: Novelty radar cards on instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Query `api.semantic.getNoveltyRadar({ sessionSlug })` — only render when `semanticStatus?.readiness.canShowNoveltyRadar` is true.

Add a "Novelty Radar" card in the center panel:

- Distribution bar: low / medium / high counts as colored segments.
- "Top Distinctive" list: up to 5 submissions with participant label, category badge, novelty band badge, body preview, rationale.
- "Category Averages" row: category badges with average novelty score.
- Capped indicator if `caps.signalsCapped`.

### Task 13: Category drift cards on instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Query `api.semantic.getCategoryDrift({ sessionSlug })` — render when data available.

Add a "Category Drift" card in the center panel:

- Time slice table: rows = slices (labeled by round/phase), columns = categories, cells = submission counts. Color intensity by count.
- Transitions summary: "N responses moved from X to Y" for significant transitions.
- Position shifts summary: count of recorded shifts with recent reason previews.
- Capped indicators where applicable.

### Task 14: Argument map cards on instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Query `api.argumentMap.getVisualizationGraph({ sessionSlug })` — only render when `semanticStatus?.readiness.canShowArgumentMap` is true.

Add an "Argument Map" card in the center panel (card-based MVP, no D3):

- Node list grouped by `clusterKey`: each node shows label, body preview, category badge, weight indicator.
- Edge list: "A supports/contradicts/extends/questions/bridges B" with confidence badge and rationale tooltip.
- Node count and edge count summary at top.
- Capped indicator if applicable.
- Layout hint display: `suggestedRenderer` field shown as a note ("optimized for force-directed layout").

### Task 15: Build admin demo management page

**File:** `src/pages/admin-demo-page.tsx` (new)

Add a new admin page for demo management, register in router under `/instructor/admin/demo`.

Queries:

- `api.demo.getDemoSession` — current demo session info.
- `api.demo.health` — deployment readiness.
- `api.demo.listToggles` — simulation toggle states.

Mutations:

- `api.demo.seed` — seed demo session.
- `api.demo.resetSession` — reset with confirmation dialog.
- `api.demo.setToggle` — toggle simulation flags.

Rendering:

- **Demo Session card**: if session exists, show slug, join code, title, phase, current act. If null, show "No demo session seeded" with a "Seed Demo" button.
- **Health card**: model settings count, prompt templates count, protection settings count, component flags (rateLimiter, aiWorkpool, actionCache, smartTags), session-level counts (participants, submissions, categories, aiJobs, llmCalls, semanticEmbeddings, argumentLinks). Green/red indicators for each.
- **Simulation Toggles card**: Switch components for each toggle key (`simulateAiFailure`, `simulateBudgetExceeded`, `simulateSlowAi`). On toggle, call `api.demo.setToggle({ key, enabled })`.
- **Actions card**: "Seed Demo" button (with `resetExisting` checkbox), "Reset Demo" button with confirmation input (must type "RESET DEMO SESSION").

### Task 16: Register admin demo page in router and navigation

**File:** `src/router.tsx`, `src/lib/routes.ts`, `src/components/layout/admin-shell.tsx`

Changes:

- Add route `/instructor/admin/demo` → `AdminDemoPage`.
- Add `adminDemo` to routes helper.
- Add "Demo" nav link in admin shell sidebar (if nav links exist there).

### Task 17: Enhance admin observability page

**File:** `src/pages/admin-observability-page.tsx`

Current state: Shows summary metrics, byFeature table, and recent calls table. Export button is non-functional.

Enhancements:

- **Session filter**: optional session slug input to filter summary and calls by session.
- **Budget section**: query `api.budget.getSessionSpend` when a session is selected. Show spend amount, warn threshold, hard-stop status as MetricTiles.
- **Export button**: wire the Export button to download `recentCalls` data as CSV (client-side conversion using `recentCalls` query with higher limit).
- **Call row expansion**: clicking a row in recent calls shows an expanded detail panel with all fields: promptTemplateKey, cachedInputTokens, reasoningTokens, raw error text (if status is error).

### Task 18: Update DEMO_SESSION_SLUG constant

**File:** `src/lib/constants.ts`

Change:

```ts
// Before
export const DEMO_SESSION_SLUG = "demo-discussion";
// After
export const DEMO_SESSION_SLUG = "useless-university-lessons-demo";
```

This aligns the frontend constant with Phase 11C's university demo seed. Used as route defaults for `routes.session()`, `routes.instructorSession()`, `routes.instructorProjector()`.

### Task 19: Cleanup and verification

- Remove any remaining mock data references in changed files.
- Run `pnpm exec tsc -b --pretty false` — must pass clean.
- Run `pnpm vitest run` — all tests pass.
- Verify dev server loads without errors.

## Implementation Order

1. Task 18: Update demo constant (trivial, removes stale reference)
2. Task 0: ReactionBar component
3. Task 3: PositionShiftForm component
4. Tasks 1, 2: Wire reactions to stream and submission cards
5. Tasks 4, 5: Wire position shifts to acts and My Zone
6. Task 9: Thread props through participant-session-page
7. Task 10: Summary gate awareness
8. Task 6: Templates page rewrite
9. Tasks 7, 8: Save as template + template selection on creation
10. Tasks 11, 12, 13, 14: Semantic visualization on instructor session page
11. Tasks 15, 16: Demo management admin page + routing
12. Task 17: Observability enhancements
13. Task 19: Verification

## Files Changed

| File                                            | Change                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/constants.ts`                          | Update `DEMO_SESSION_SLUG` to university demo slug                                                          |
| `src/components/reactions/reaction-bar.tsx`     | **New**: toggle-able reaction pill buttons                                                                  |
| `src/components/shifts/position-shift-form.tsx` | **New**: accordion form for recording position shifts                                                       |
| `src/components/stream/stream-tab.tsx`          | Add ReactionBar to peer responses                                                                           |
| `src/components/submission/submission-card.tsx` | Add aggregate reaction counts (instructor view)                                                             |
| `src/components/acts/challenge-act.tsx`         | Replace static placeholder with PositionShiftForm + summary gate notice                                     |
| `src/components/acts/synthesize-act.tsx`        | Add PositionShiftForm                                                                                       |
| `src/components/myzone/my-zone-tab.tsx`         | Add position shift history section                                                                          |
| `src/pages/templates-page.tsx`                  | Rewrite: real template list, create, archive, use                                                           |
| `src/pages/instructor-session-page.tsx`         | Add "Save as Template" button, semantic analysis section, novelty radar, category drift, argument map cards |
| `src/pages/session-new-page.tsx`                | Add template selection section                                                                              |
| `src/pages/participant-session-page.tsx`        | Thread sessionSlug/clientKey, query position shifts                                                         |
| `src/pages/admin-demo-page.tsx`                 | **New**: demo seed/reset/health/toggles admin page                                                          |
| `src/pages/admin-observability-page.tsx`        | Add session filter, budget section, export, call detail expansion                                           |
| `src/router.tsx`                                | Add `/instructor/admin/demo` route                                                                          |
| `src/lib/routes.ts`                             | Add `adminDemo` route helper                                                                                |
| `src/components/layout/admin-shell.tsx`         | Add Demo nav link                                                                                           |

## Files NOT Changed

- `convex/` — no backend changes
- `src/components/fight/` — no fight changes
- `src/hooks/` — no new hooks needed

## Non-Goals

- D3 force-directed graph rendering (argument map uses card-based MVP)
- D3 alluvial/Sankey chart for category drift (card-based MVP)
- Radar chart for novelty (card-based MVP)
- Real-time graph recomputation on every write
- Framer Motion animations (separate concern)
- Auth model or access control changes
- CSV server-side generation (client-side conversion only)
