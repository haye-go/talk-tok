# UI Phase 13d: Instructor Shell Migration Plan

Date: 2026-05-13
Status: implementation plan
Audience: frontend implementation engineer (or LLM agent executing the work)

## References

- Visual target: [docs/instructor-shell-prototype.html](../docs/instructor-shell-prototype.html) — the HTML prototype that is authoritative for layout and component composition.
- Source of design intent: [ui-phase-13c-instructor-frontend-designer-handoff.md](./ui-phase-13c-instructor-frontend-designer-handoff.md).
- Source of preservation rules and commit sequence: [ui-phase-13b-instructor-reference-repair-implementation-plan.md](./ui-phase-13b-instructor-reference-repair-implementation-plan.md).
- Original visual reference: [docs/codex-instructor-v3.html](../docs/codex-instructor-v3.html).

## Goal

Switch the instructor session UI from `src/pages/instructor-session-page.tsx` (a 2476-line monolith) to a clean three-workspace shell that matches the prototype, without dropping any existing capability.

The prototype already settles every layout question. This plan only maps current code to its new home and sequences the work.

---

## 1. Current State Inventory

### 1.1 Files involved

| File | Role | Action |
|---|---|---|
| `src/pages/instructor-session-page.tsx` | 2476-line monolith. Owns all state, mutations, queries, and JSX for left/center/right. | Shrink to a thin router that picks a workspace; relocate JSX into workspace components. |
| `src/components/layout/instructor-shell.tsx` | 3-column layout primitive (left/center/right). | Keep. Already correct shape; only the top bar slot changes. |
| `src/components/layout/instructor-top-bar.tsx` | Top bar with session title, act progress, prev/next phase buttons. | Replace contents — remove act/phase progression (acts no longer exist), add TalkTok logo + brand. |
| `src/components/layout/instructor-brand-bar.tsx` | Logo + theme toggle bar (used elsewhere). | Reuse the brand pattern inside the new top bar. |
| `src/components/instructor/ai-job-status-panel.tsx` | Reusable status grid (label/status/detail/tone). | Reuse as-is in Reports tab AI Job History section. |
| `src/components/instructor/argument-map-graph.tsx` | D3 force-graph for the argument map. | Reuse as-is in Reports → Argument Map section. Confirm prop signature still matches data hook. |
| `src/components/instructor/question-manager-panel.tsx` | Wraps `SessionControlsCard` + metric tiles. | Used in Setup; split — `SessionControlsCard` lives in Setup as a section; question metrics move into a dedicated `QuestionManagerPanel` rewrite. |
| `src/components/instructor/session-controls-card.tsx` | Visibility, settings, save flow. | Reuse as-is in Setup → Session Settings. |
| `src/hooks/use-instructor-overview.ts` | `useQuery(api.instructorCommandCenter.overview, …)` — one query for everything. | Keep temporarily as a fallback. Add focused per-workspace hooks alongside. |
| `src/hooks/use-instructor-room.ts` | `useQuery(api.instructorCommandCenter.room, …)`. | Keep, this is already aligned with the new shell. |
| `src/hooks/use-instructor-similarity-map.ts` | (Exists per phase-13b reference.) | Reuse in Room → Similarity mode. |

### 1.2 Current Convex mutations wired in the page

These are the action surfaces the new components must call. None are deleted; some move to a different UI surface.

| Mutation | Current trigger | New owner |
|---|---|---|
| `api.categorisation.triggerForSession` | "Run categorisation" in uncategorized section + right rail | Right rail Quick Actions + Room Needs Attention `Assign now` |
| `api.instructorControls.updatePhase` | Top bar prev/next | **Deleted from UI** (acts no longer exist). Mutation can remain in Convex for now; flag for cleanup. |
| `api.instructorControls.updateVisibility` | Right rail "Release summaries / responses / Hide room" | Right rail Release+Interaction switch rows (Contributions/Peer responses/Category board/Synthesis/Reports) |
| `api.instructorControls.updateSettings` | `QuestionManagerPanel` save | Setup → Session Settings save |
| `api.synthesis.generateCategorySummary` | Per-category "Summarize" buttons in Room Categories + Setup | Reports → Synthesis master-detail (per-category Regenerate button) |
| `api.synthesis.generateClassSynthesis` | Reports tab + right rail Quick Actions | Reports → Synthesis master-detail "Generate All" / "Opposing Views" + Right rail Quick Actions |
| `api.personalReports.generateForSession` | Reports tab "Generate All Reports" | Reports → Personal Reports master-detail header |
| `api.sessionTemplates.createFromSession` | "Save as Template" in Setup Categories Taxonomy | Setup → Access & Sharing section |
| `api.categoryManagement.create` | Add category form (Room Categories + Setup) | Setup → Category Taxonomy only (REMOVE from Room) |
| `api.categoryManagement.update` | Rename inline form (Room Categories + Setup) | Setup → Category Taxonomy only (REMOVE from Room) |
| `api.followUps.create` | Per-category "Follow-up" button (Room + Setup) | Setup → Follow-up Prompts + Right rail Quick Actions ("Launch / Create brand-new") |
| `api.recategorisation.decide` | Recategorisation Requests card in Room | Room → Needs Attention recategorisation row |
| `api.semantic.queueEmbeddingsForSession` | Similarity mode + Reports embeddings | Reports → Embeddings Status |
| `api.semantic.refreshSignalsForSession` | Reports Novelty Signals card | Reports → Novelty Signals |
| `api.argumentMap.generateForSession` | Reports Argument Map Readiness card | Reports → Argument Map header |
| `api.questionBaselines.generateForQuestion` | Setup baseline card | Setup → AI Readiness & Baseline |

### 1.3 Current Convex queries

| Query | Powers | New owner |
|---|---|---|
| `api.instructorCommandCenter.overview` | The monolith overview blob | Keep as shell fallback; new focused queries take over per-workspace |
| `api.instructorCommandCenter.room` | Room thread data | Room workspace |
| `api.recategorisation.listForSession` | Recategorisation requests | Room Needs Attention + counter |
| `api.semantic.getSemanticStatus` | Job status / readiness | Reports + right rail counter source |
| `api.semantic.getSimilarityMap` | Cluster view | Room → Similarity mode |
| `api.semantic.getNoveltyRadar` | Reports Novelty Radar | Reports |
| `api.semantic.getCategoryDrift` | Reports Category Drift | Reports |
| `api.argumentMap.getVisualizationGraph` | Reports Argument Map | Reports |
| `api.jobs.listForSession` | AI job status panel | Reports |
| `api.questionBaselines.getForQuestion` | Setup baseline diagnostic | Setup |
| `api.modelSettings.list` | AI readiness checks | Setup |
| `api.promptTemplates.list` | AI readiness checks | Setup |
| `api.budget.getSessionSpend` | AI readiness budget % | Setup |
| `api.llmObservability.recentCalls` | AI readiness failure list | Setup |
| `api.demo.listToggles` | AI readiness demo checks | Setup |

### 1.4 Current local state (`useState` in the monolith)

The 27 useState variables migrate as follows:

| State | Concern | New home |
|---|---|---|
| `generatingClass`, `generatingOpposing` | Synthesis generation loading | Reports → SynthesisMasterDetailPanel |
| `generatingReports`, `reportGenerationError` | Personal reports loading | Reports → PersonalReportsMasterDetailPanel |
| `triggeringCategorisation`, `categorisationMessage`, `categorisationError` | Right rail action state | Right rail quick action component |
| `generatingCategoryId` | Per-category summary loading | Reports SynthesisMasterDetailPanel (per-row state) |
| `savingTemplate`, `templateSaved` | Save as template | Setup → Access & Sharing |
| `embeddingQueued`, `argMapQueued` | Reports queue indicators | Reports → Embeddings / Argument Map sections |
| `baselineGenerating`, `baselineError`, `openAiKeyState` | Setup baseline + readiness | Setup → AI Readiness & Baseline |
| `decidingRecatId` | Recategorisation in-flight | Room → Needs Attention row |
| `showAddCategory`, `addCategoryName`, `addCategoryDescription`, `savingCategory`, `categoryError` | Add-category form | Setup → Category Taxonomy editor |
| `editingCategoryId`, `editingCategoryName`, `editingCategoryDescription` | Rename inline form | Setup → Category Taxonomy editor |
| `followUpCategoryId`, `followUpPrompt`, `savingFollowUp`, `followUpError` | Follow-up draft form | Setup → Follow-up Prompts |

---

## 2. Component Mapping Table

This is the master mapping every workspace renderer should follow.

### 2.1 Currently in the left sidebar (post-recent commits)

The left sidebar today is already navigation-only (per the inventory). No change is needed beyond keeping the Room Modes section conditional on `tab === "room"`. The new design adds nothing here.

### 2.2 Currently in the right rail

| Today | Action |
|---|---|
| Persistent Live Rail header | Keep |
| Selected Question card | Keep; absorb the question switcher list into the same card |
| Question switcher section | Merge into Selected Question card as a clickable list |
| Release + Interaction card (read-only) | **Convert to interactive toggles** that fire `updateVisibility` and the interaction toggles (replies/upvotes/fight). Add a `Reports gate` row. |
| Live Counters card | Keep |
| Quick Live Actions card | Keep. Add explicit "Launch saved follow-up" and "Create brand-new follow-up" rows. |
| Live Activity section | Keep |
| (missing) Presence | **Add** new `PresenceRailSection` with connected count + sample chip list |

### 2.3 Currently in Room (`workspaceTab === "room"`)

| Today | Action |
|---|---|
| Room header (question title + prompt + mode toggle) | Move question title + prompt into an `ActiveQuestionContextBar` component; keep mode toggle but visually distinct (border-bottom underline tabs) |
| Needs Attention section (recat count, uncategorized count, AI job errors) | Convert to actionable rows: `NeedsAttentionPanel` with recat preview + accept/reject inline, uncategorized assign, similarity cluster prompt |
| **Recategorisation Requests card (currently its own section)** | Fold into `NeedsAttentionPanel` rows |
| Latest mode threads | New `ThreadStream` component using root-with-replies cards |
| **Categories mode** (currently includes Add Category form, rename inline form, Follow-up form, Summarize button) | Strip all CRUD/edit/follow-up/summarize controls. Keep only read-mode grouping. Move all controls to Setup or Reports. |
| Uncategorized section under Categories mode | Promote to a first-class section above the category groups |
| Similarity mode (clusters) | Keep mostly; rename to fit new ClusterCard shape; add `promote / merge / ignore` row actions |
| **Input Patterns** (currently shows under Reports header) | **Relocate to Room** as a compact chip bar `InputPatternsBar` below Needs Attention |
| **Consensus Pulse** (currently shows under Reports header) | **Relocate to Room** as a compact placeholder card `ConsensusPulseStub` beside Input Patterns |

### 2.4 Currently in Setup (`workspaceTab === "setup"`)

| Today | Action |
|---|---|
| `QuestionManagerPanel` (uses `SessionControlsCard` + metric tiles) | Split: extract a `QuestionListEditor` (release/draft/edit per question) and keep `SessionControlsCard` as the Settings section |
| Category Taxonomy card (with Add Category form, rename inline form, follow-up form, summarize button) | Split into two sections: `CategoryTaxonomyEditor` (name/description CRUD only) and `FollowUpDraftEditor` (draft list + create) |
| Join Access card (QR + projector link), Save as Template | Move into `AccessAndSharingSection` |
| Hidden Baseline Diagnostics | Move into `AiReadinessSection` |
| AI Readiness card (models, prompts, budget, recent failures) | Keep contents; restyle as a grid inside `AiReadinessSection` |

### 2.5 Currently in Reports (`workspaceTab === "reports"`)

| Today | Action |
|---|---|
| Reports header | Keep, restyled |
| `AiJobStatusPanel` | Keep; move to bottom of Reports as `AiJobHistorySection` |
| Consensus Pulse stub | **Move to Room** |
| Input Patterns card | **Move to Room** |
| Synthesis card (status badges + counts + Class Synthesis button + latest preview) | Replace with `SynthesisMasterDetailPanel` (artifact list on left, reading pane on right). Subsumes class synthesis, opposing views, and per-category summaries. |
| Synthesis Artifacts card (recent artifacts list) | Folded into the master-detail list |
| Personal Reports card (header, counts, generate all, recent list) | Replace with `PersonalReportsMasterDetailPanel` (student list left, report reading pane right) |
| Embeddings card | Keep; rename `EmbeddingsStatusSection` |
| Novelty Signals card | Keep; rename `NoveltySignalsSection` |
| Argument Map Readiness card | Merge with the Argument Map graph into one full-width `ArgumentMapSection` |
| Category Drift Readiness | Merge into `CategoryDriftSection` (horizontal distribution bars) |
| Novelty Radar card | Keep; restyle as full-width `NoveltyRadarSection` with legend + per-category novelty count chips |
| Category Drift table | Keep; promote to full-width with horizontal bars |
| Argument Map (uses `ArgumentMapGraph`) | Keep; promote to full-width `ArgumentMapSection`; add Top Relationships footer |
| Recent Submissions card | **Delete from Reports** (Reports is review-only; live submissions belong in Room) |

---

## 3. New Components to Build

All paths under `src/components/instructor/`. Names use the project's kebab-case file convention.

### 3.1 Shell-level

| New file | Purpose | Notes |
|---|---|---|
| `instructor-session-shell.tsx` (rewrite of existing) | Top-level orchestrator. Reads URL params (`tab`, `mode`, `questionId`), dispatches to workspace components, owns the left rail + right rail. | Should be < 200 lines. No mutations here. |
| `instructor-top-bar.tsx` (rewrite) | TalkTok logo + brand + session title + join code + settings gear + theme toggle. Drop act prev/next. | Logo: pull `<img src="/favicon.svg" />` per existing brand pattern. |
| `instructor-left-rail.tsx` | Session identity block, Room/Setup/Reports nav, conditional Room Modes section, footer note. | Pure nav. No mutations. |
| `instructor-right-rail.tsx` | Container for: SelectedQuestionRailCard, ReleaseInteractionRailCard, PresenceRailCard, LiveCountersRailCard, QuickActionsRailCard, LiveActivityRailSection. | Reads shell query data + dispatches mutations. |

### 3.2 Room workspace

| New file | Purpose |
|---|---|
| `room-workspace.tsx` | Top-level Room renderer. Reads `mode` URL param, renders ActiveQuestionContextBar + RoomModeTabs + RoomStatChips + NeedsAttentionPanel + InputPatternsBar + ConsensusPulseStub + the mode-specific renderer. |
| `active-question-context-bar.tsx` | The pale-blue surface bar showing question title + prompt + Released chip. |
| `room-mode-tabs.tsx` | Underline-style mode tabs (Latest / Categories / Similarity). |
| `room-stat-chips.tsx` | Inline pill counters (active, submitted, uncategorized, pending recat). |
| `needs-attention-panel.tsx` | Default-open collapsible. Renders 3 row types: uncategorized count, recategorisation preview rows with accept/reject, similarity cluster opportunity. Calls `api.recategorisation.decide` and `api.categorisation.triggerForSession`. |
| `input-patterns-bar.tsx` | Compact chip bar showing pattern → count. Read-only. Reads from a `roomData.inputPatterns` field. |
| `consensus-pulse-stub.tsx` | Static placeholder card per spec rule. Marked `placeholder` until backend provides data. |
| `thread-stream.tsx` | Latest-mode renderer. Maps root threads to ThreadCard. |
| `thread-card.tsx` | A root thread with nested replies. Compact meta chips (category, upvotes, replies, recat state). Used by Latest, Categories, Similarity modes. |
| `room-categories-board.tsx` | Categories-mode renderer (read-only). Uncategorized section first, then category containers with nested ThreadCards. No CRUD. |
| `room-similarity-clusters.tsx` | Similarity-mode renderer. Maps clusters to ClusterCard with promote/merge/ignore row actions. |
| `cluster-card.tsx` | One semantic cluster. Header (label, count, avg similarity), action buttons, nested ThreadCards. |

### 3.3 Setup workspace

| New file | Purpose |
|---|---|
| `setup-workspace.tsx` | Top-level Setup renderer. Composes QuestionListEditor, SessionControlsCard, CategoryTaxonomyEditor, FollowUpDraftEditor, AiReadinessSection, AccessAndSharingSection. |
| `question-list-editor.tsx` | Question list with release/draft/current badges, Edit and Release row actions. Calls `api.instructorControls.updateVisibility` (for release flow) and a new question CRUD path if needed. |
| `category-taxonomy-editor.tsx` | Add category form + per-category Rename / Edit description. Owns `showAddCategory` etc. Calls `api.categoryManagement.create` / `.update`. |
| `follow-up-draft-editor.tsx` | List of follow-up drafts + create-new form. Owns `followUpCategoryId` etc. Calls `api.followUps.create`. |
| `ai-readiness-section.tsx` | Grid of: Baseline, Categorisation, Synthesis, Reports, Embeddings, Argument Map readiness. Includes baseline regenerate button. Reads `api.questionBaselines.getForQuestion`, `api.modelSettings.list`, `api.promptTemplates.list`, `api.budget.getSessionSpend`, `api.llmObservability.recentCalls`, `api.demo.listToggles`. |
| `access-and-sharing-section.tsx` | Join link, copy button, QR code placeholder, Save as Template button. Calls `api.sessionTemplates.createFromSession`. |
| (reused) `session-controls-card.tsx` | Already exists at `src/components/instructor/session-controls-card.tsx`. Use directly inside `setup-workspace.tsx` as the Session Settings section. |

### 3.4 Reports workspace

| New file | Purpose |
|---|---|
| `reports-workspace.tsx` | Top-level Reports renderer. |
| `synthesis-master-detail-panel.tsx` | The two-column synthesis viewer. Left: artifact list (Class Synthesis, Opposing Views, per-category). Right: reading pane with selected artifact. Header has "Generate All" + "Opposing Views". Per-row Regenerate buttons. Calls `api.synthesis.generateClassSynthesis` and `api.synthesis.generateCategorySummary`. |
| `personal-reports-master-detail-panel.tsx` | The two-column personal-report viewer. Left: student list with status dots. Right: per-student report (stats + assessment text + peer feedback). Header has summary counters + Generate All Reports. Calls `api.personalReports.generateForSession`. |
| `argument-map-section.tsx` | Full-width wrapper around the existing `argument-map-graph.tsx`. Header with Generate Map + Refresh buttons. Top Relationships footer list. Calls `api.argumentMap.generateForSession`. Reads `api.argumentMap.getVisualizationGraph`. |
| `novelty-radar-section.tsx` | Full-width radar chart placeholder + legend + per-category novelty count chips. Reads `api.semantic.getNoveltyRadar`. |
| `category-drift-section.tsx` | Full-width horizontal distribution bars per category. Reads `api.semantic.getCategoryDrift`. |
| `embeddings-status-section.tsx` | Compact status row with regenerate button. Calls `api.semantic.queueEmbeddingsForSession`. |
| `novelty-signals-section.tsx` | Compact list of novelty signal rows. Calls `api.semantic.refreshSignalsForSession`. |
| `ai-job-history-section.tsx` | Reuses `ai-job-status-panel.tsx`. |

### 3.5 Right rail components

| New file | Purpose |
|---|---|
| `right-rail/selected-question-rail-card.tsx` | Selected question display + question switcher list. |
| `right-rail/release-interaction-rail-card.tsx` | Interactive switch rows: Contributions, Peer responses, Category board, Synthesis, Reports, Reports gate, Replies, Upvotes, Fight. Calls `api.instructorControls.updateVisibility` and the interaction toggle mutations. |
| `right-rail/presence-rail-card.tsx` | Connected/active/idle counts + sample name chips. Reads from a new `roomData.presence` field. |
| `right-rail/live-counters-rail-card.tsx` | Four metric tiles. |
| `right-rail/quick-actions-rail-card.tsx` | Run categorisation, Generate synthesis, Launch saved follow-up, Create brand-new follow-up. |
| `right-rail/live-activity-rail-section.tsx` | Compact activity feed. |

---

## 4. Data Hook Plan

Per phase-13b, the new shell uses focused queries instead of one overview blob.

### 4.1 New hooks (build alongside the existing ones)

| Hook | Wraps | Returns |
|---|---|---|
| `useInstructorShell(sessionSlug, questionId?)` | `api.instructorCommandCenter.shell` (new query) | session summary, active question, released question list, selected question fallback, right-rail counters, live visibility state, live interaction state. |
| `useInstructorRoom(sessionSlug, questionId?)` | `api.instructorCommandCenter.room` (already exists) | selected question, latest root threads, nested replies, category assignment per root, root-level reply/upvote counts, uncategorized roots, pending recategorisation count + rows, category-grouped root threads, similarity readiness, similarity clusters. **New fields needed:** `inputPatterns`, `presence`. |
| `useInstructorSetup(sessionSlug, questionId?)` | `api.instructorCommandCenter.setup` (new query) | question list, selected question config, category definitions, follow-up drafts, baseline status, join/session access, template readiness, AI readiness state. |
| `useInstructorReports(sessionSlug, questionId?)` | `api.instructorCommandCenter.reports` (new query) | synthesis status + artifacts, category summaries, personal report status + artifacts, argument map status + data, semantic/novelty review status, report release status, relevant AI job history. |

### 4.2 Backend fields to verify or add

Before writing the new queries, confirm the following data already exists or add it:

- **`presence`**: per-user connection state. May already exist via existing presence flow used by participant-shell. If yes, expose to instructor; if no, add to shell query.
- **`inputPatterns`**: aggregated rhetorical pattern counts per question. Spec lists Input Patterns as a preserved surface; data shape must be sourced. If it's currently rendered in Reports, the backend already returns it — locate the field and pull it into the room query as well.
- **`recategorisationRows` with thread preview**: the current `api.recategorisation.listForSession` returns request data, but the new Needs Attention row design needs the thread title/snippet + current category + suggested category. Verify and extend if missing.
- **`similarityClusterOpportunity`**: a flag/count indicating "1 cluster may deserve a new category". Used in Needs Attention. May need a small backend computation.

Read `convex/_generated/ai/guidelines.md` before adding any queries.

### 4.3 Migration strategy for hooks

Don't delete `useInstructorOverview` immediately. Steps:

1. Add new query handlers in Convex for shell/setup/reports (room already exists).
2. Add new hooks alongside the old one.
3. Migrate each workspace component to its focused hook one at a time.
4. Once all callers of `useInstructorOverview` are gone, remove the hook and the `overview` query.

---

## 5. URL/Routing

The page already supports `?tab=room|setup|reports&mode=latest|categories|similarity&questionId={id}`. No change needed. Verification:

- Open Room from listing → `tab=room`.
- Open Setup from listing → `tab=setup`.
- Browser back/forward preserves `tab` + `mode`.
- `tab=room` with no `mode` defaults to `latest`.
- Question switcher updates `questionId` and rerenders Room/Reports content.

If any of the above is currently broken, fix during Commit 1.

---

## 6. Implementation Sequence

Each commit must compile, typecheck, and not regress any existing capability. Pre-commit hook must pass without `--no-verify`.

### Commit 1 — `fix(instructor-ui): replace top bar with brand and remove acts`

Touches: `src/components/layout/instructor-top-bar.tsx`, `src/components/layout/instructor-shell.tsx`, `src/lib/constants.ts` (if it exports `ACTS`).

Changes:
- Remove `ACTS`, `actIndex`, `onPreviousAct`, `onNextAct` from the top bar.
- Render TalkTok logo (`<img src="/favicon.svg" />`) + brand text in the left of the top bar.
- Keep session title, join code, participant count.
- Keep settings gear + theme toggle.
- Update `InstructorShell` props to drop `actIndex` / `onPreviousAct` / `onNextAct`.
- Verify nothing else in the app uses `useAct`. Leave the hook for now if other pages use it.

Acceptance: top bar renders with logo + title + code, no prev/next buttons.

### Commit 2 — `feat(instructor-ui): add focused workspace queries and hooks`

Touches: `convex/instructorCommandCenter.ts`, `src/hooks/use-instructor-shell.ts` (new), `src/hooks/use-instructor-setup.ts` (new), `src/hooks/use-instructor-reports.ts` (new).

Changes:
- Add `shell`, `setup`, `reports` queries to `instructorCommandCenter.ts` per §4.1. Reuse existing helpers where possible — these are largely projections of the current overview blob.
- Add the three new hooks. Do not remove `useInstructorOverview` yet.

Acceptance: typecheck passes. Existing page still works (still on `useInstructorOverview`).

### Commit 3 — `refactor(instructor-ui): extract right rail to its own components`

Touches: `src/components/instructor/right-rail/*.tsx`, `src/pages/instructor-session-page.tsx`.

Changes:
- Create the 6 right-rail components per §3.5.
- Replace the right-rail JSX in the page with a single `<InstructorRightRail />`.
- Right rail reads from `useInstructorShell` for question + counters; mutations stay wired identically.
- Convert the Release+Interaction read-only display into interactive `switch-pill` controls that call `updateVisibility` etc.
- Add Presence card + Reports gate row (Presence reads from new `roomData.presence` field; if not yet available, show a placeholder until commit 6).

Acceptance: right rail looks like the prototype's right rail. No regression in any mutation. Visibility releases still work.

### Commit 4 — `refactor(instructor-ui): extract left rail to its own component`

Touches: `src/components/instructor/instructor-left-rail.tsx` (new), `src/pages/instructor-session-page.tsx`.

Changes:
- Pull session header + Room/Setup/Reports nav + Room Modes nav into `InstructorLeftRail`.
- Page renders `<InstructorLeftRail tab=… mode=… onChangeTab=… onChangeMode=… />`.

Acceptance: left rail visually matches the prototype. No mutations move.

### Commit 5 — `refactor(instructor-ui): split reports into its own workspace component`

Touches: `src/components/instructor/reports-workspace.tsx` and the per-section files under §3.4. `src/pages/instructor-session-page.tsx` shrinks.

Changes:
- Build `SynthesisMasterDetailPanel` (master-detail; absorbs Class Synthesis, Opposing Views, and per-category summaries). This is the most important visual change — do not regress to vertical card stacks.
- Build `PersonalReportsMasterDetailPanel` (student list + reading pane).
- Build `ArgumentMapSection` (full-width; reuses existing `ArgumentMapGraph`).
- Build `NoveltyRadarSection` (full-width + legend + per-category chips).
- Build `CategoryDriftSection` (full-width horizontal bars).
- Build `EmbeddingsStatusSection`, `NoveltySignalsSection`, `AiJobHistorySection` (reuses `AiJobStatusPanel`).
- Page renders `<ReportsWorkspace />` when `tab === "reports"`.
- All mutations preserved.

Acceptance: Reports tab matches the prototype. All buttons fire the same mutations. No "wall of vertical cards" left. Argument Map gets full horizontal width.

### Commit 6 — `refactor(instructor-ui): split setup into its own workspace component`

Touches: `src/components/instructor/setup-workspace.tsx` and the per-section files under §3.3.

Changes:
- Build `QuestionListEditor`, `CategoryTaxonomyEditor`, `FollowUpDraftEditor`, `AiReadinessSection`, `AccessAndSharingSection`.
- Reuse the existing `SessionControlsCard` directly.
- Page renders `<SetupWorkspace />` when `tab === "setup"`.
- All current setup mutations preserved.

Acceptance: Setup tab matches the prototype. Category create/rename works. Follow-up draft works. Save as Template works. Baseline regenerate works.

### Commit 7 — `feat(instructor-ui): rebuild room as thread-first workspace`

Touches: `src/components/instructor/room-workspace.tsx`, plus all Room sub-components per §3.2.

Changes:
- Build `ActiveQuestionContextBar`, `RoomModeTabs`, `RoomStatChips`.
- Build `NeedsAttentionPanel` with the new actionable rows (uncategorized assign, recategorisation accept/reject with thread preview, similarity cluster opportunity).
- Build `InputPatternsBar` and `ConsensusPulseStub` (relocated from Reports).
- Build `ThreadStream` + `ThreadCard` for Latest mode.
- Build `RoomCategoriesBoard` (read-only) for Categories mode — strip every CRUD/follow-up/summarize control out of this surface.
- Build `RoomSimilarityClusters` + `ClusterCard` for Similarity mode.
- Page renders `<RoomWorkspace />` when `tab === "room"`.

Acceptance: Room matches the prototype across all three modes. Recategorisation can be approved/rejected from Needs Attention. Categories mode has zero edit controls. Similarity has promote/merge/ignore actions.

### Commit 8 — `chore(instructor-ui): collapse session page to thin router`

Touches: `src/pages/instructor-session-page.tsx`.

Changes:
- Page should now be < 200 lines.
- Reads URL params.
- Renders `<InstructorShell>` with the three workspace components by tab.
- Owns no mutations directly. Owns no local form state.
- Remove the now-unused 27 `useState` calls and the helper handlers that have been distributed to workspace components.

Acceptance: line count drop confirmed. All flows still work.

### Commit 9 — `style(instructor-ui): apply final visual contract from prototype`

Touches: any component that still uses generic carding instead of the prototype's structural style.

Changes:
- Apply the flatter v3 reference style. Use rail groups instead of card stacks. Use the project's existing CSS variables (`--c-canvas`, `--c-surface-soft`, `--c-ink`, etc.) for parity with dark mode.
- Active question background distinct from header/page background.
- Reduce generic carding.

Acceptance: page visually matches `docs/instructor-shell-prototype.html`.

### Commit 10 — `chore(instructor-ui): remove obsolete overview hook and verify`

Touches: `src/hooks/use-instructor-overview.ts`, `convex/instructorCommandCenter.ts`.

Changes:
- Verify no callers of `useInstructorOverview` remain.
- Remove the hook and the `overview` query export.
- Verify routes: `tab=room&mode=latest`, `tab=room&mode=categories`, `tab=room&mode=similarity`, `tab=setup`, `tab=reports`.
- Run typecheck + lint. Document any unrelated failures separately.

Acceptance: clean tree, no orphan imports, all routes pass.

---

## 7. Risks and Watch-Outs

| Risk | Mitigation |
|---|---|
| Synthesis section regresses back to vertical card stacks under time pressure. | The master-detail pattern is non-negotiable per the prototype. If the artifact list grows beyond 8 categories, the left column scrolls; do not flatten into stacks. |
| Personal Reports gets cut to a name list because the prototype "looks too rich". | Keep the master-detail panel. The screenshot's "every student gets a card" pattern is worse. |
| Category editing leaks back into Room → Categories mode. | The Categories mode renderer must take no mutations. Pass only display data + a "Manage in Setup →" link. |
| Setup forms leak into the right rail because it's "right there". | Right rail is read-status + interactive toggles + quick actions only. No form fields. |
| Argument Map gets squeezed into a half-width card. | The `ArgumentMapSection` is full-width by spec. The D3 force graph needs the room. |
| Similarity Mode and Argument Map get conflated. | Similarity = Room (live reading). Argument Map = Reports (post-processed artifact). They use different data shapes already; do not share components. |
| Capability silently disappears because a panel didn't fit cleanly. | Cross-check against the preservation audit in §8 before commit 10. |
| `updateVisibility` rows in the right rail are wired to the wrong field. | The current overview blob already returns the correct visibility state. Toggles should fire `updateVisibility` and reflect the returned state, not local optimistic-only. |
| Acts/phase code lingers somewhere else after Commit 1. | Grep for `useAct`, `ACTS`, `actIndex`, `onPreviousAct`, `onNextAct` after the commit. |
| Phase 17 similarity data shape changes during this work. | The Similarity mode uses `api.semantic.getSimilarityMap` which already exists. Don't change its contract; just consume what's there. |

---

## 8. Preservation Audit

Going through phase-13b's preservation list section by section, confirming each surface has a destination.

### Setup (preserve)

| Surface | Destination |
|---|---|
| Question manager + release/selection | Setup → `QuestionListEditor` |
| Session controls (title, prompt, word limit, category cap, anonymity, critique tone) | Setup → `SessionControlsCard` (reused) |
| Category creation | Setup → `CategoryTaxonomyEditor` |
| Category rename / edit description | Setup → `CategoryTaxonomyEditor` |
| Category taxonomy display | Setup → `CategoryTaxonomyEditor` |
| Category-scoped follow-up drafting | Setup → `FollowUpDraftEditor` |
| Baseline generation + status | Setup → `AiReadinessSection` |
| Prompt template readiness / AI configuration checks | Setup → `AiReadinessSection` |
| Join URL + QR code | Setup → `AccessAndSharingSection` |
| Save as Template | Setup → `AccessAndSharingSection` |

### Room (preserve)

| Surface | Destination |
|---|---|
| Live thread/recent submissions, thread-root-first | Room → `ThreadStream`, `RoomCategoriesBoard`, `RoomSimilarityClusters` |
| Presence status (for live moderation) | Right rail → `PresenceRailCard` |
| Recategorisation request review (approve/reject) | Room → `NeedsAttentionPanel` row |
| Uncategorized root-thread visibility | Room → `NeedsAttentionPanel` + Categories mode |
| Category summary generation as lightweight action | Reports → `SynthesisMasterDetailPanel` per-row Regenerate (the action is preserved, location changed deliberately) |
| Follow-up launch/create as live facilitation | Right rail → `QuickActionsRailCard` ("Launch saved follow-up" + "Create brand-new follow-up") |
| Fight status as a live interaction state | Right rail → `ReleaseInteractionRailCard` row |
| Live Activity feed (if compact) | Right rail → `LiveActivityRailSection` |

### Right Rail (preserve)

| Surface | Destination |
|---|---|
| Current/selected question context | Right rail → `SelectedQuestionRailCard` |
| Question switcher | Right rail → `SelectedQuestionRailCard` (folded in) |
| Release summaries action/status | Right rail → `ReleaseInteractionRailCard` row |
| Release responses action/status | Right rail → `ReleaseInteractionRailCard` row |
| Raw responses visible/private state | Right rail → `ReleaseInteractionRailCard` row |
| Fight enabled/disabled | Right rail → `ReleaseInteractionRailCard` row |
| Reports gate state | Right rail → `ReleaseInteractionRailCard` row (NEW row) |
| Run categorisation | Right rail → `QuickActionsRailCard` |
| Generate synthesis quick action | Right rail → `QuickActionsRailCard` |
| Live counters (typing, submitted, idle, uncategorized, pending recat) | Right rail → `LiveCountersRailCard` |

### Reports (preserve)

| Surface | Destination |
|---|---|
| Synthesis panel + artifact cards | Reports → `SynthesisMasterDetailPanel` |
| Class synthesis generation | Reports → `SynthesisMasterDetailPanel` header |
| Opposing views generation | Reports → `SynthesisMasterDetailPanel` header |
| Personal report generation | Reports → `PersonalReportsMasterDetailPanel` header |
| Personal reports summary + recent previews | Reports → `PersonalReportsMasterDetailPanel` |
| AI job status panel/history | Reports → `AiJobHistorySection` (reuses `AiJobStatusPanel`) |
| Embeddings generation/status | Reports → `EmbeddingsStatusSection` |
| Novelty signals readiness | Reports → `NoveltySignalsSection` |
| Novelty Radar | Reports → `NoveltyRadarSection` |
| Category Drift | Reports → `CategoryDriftSection` |
| Argument Map graph + generation/status | Reports → `ArgumentMapSection` (wraps existing `ArgumentMapGraph`) |

### Preserve Or Rehome Deliberately

| Surface | Destination | Rationale |
|---|---|---|
| Consensus Pulse placeholder | Room → `ConsensusPulseStub` | Lives next to live discussion since it's a live-feel signal even though not yet implemented |
| Input Patterns | Room → `InputPatternsBar` | These are signals about how students are arguing; instructors need them while reading the live room |
| Recent Submissions | Folded into `ThreadStream` (Latest mode) | The "recent submissions" surface was a flat feed; the new Latest mode is its replacement |

### Capabilities flagged for explicit deletion decision

- **Act/phase prev-next**: explicitly being removed in Commit 1 per user direction. Document in PR.
- **Phase update mutation (`updatePhase`)**: leave in Convex schema for now; flag for cleanup if no other surface uses it. Do not delete inside this redesign.

If any other surface from the list above does not have a destination after implementation, flag it before committing 10 — do not silently drop it.

---

## 9. Quick Lookup: "Where does X live in the new design?"

This is the routing rule from phase-13c, adapted to specific components:

| Question | Answer |
|---|---|
| Where do I read the live discussion? | Room workspace (`ThreadStream` / `RoomCategoriesBoard` / `RoomSimilarityClusters`) |
| Where do I approve a recategorisation request? | Room → `NeedsAttentionPanel` row |
| Where do I rename a category? | Setup → `CategoryTaxonomyEditor` |
| Where do I draft a new follow-up prompt? | Setup → `FollowUpDraftEditor` |
| Where do I launch an already-drafted follow-up? | Right rail → `QuickActionsRailCard` |
| Where do I release responses to peers? | Right rail → `ReleaseInteractionRailCard` row |
| Where do I see the class synthesis? | Reports → `SynthesisMasterDetailPanel`, click Class Synthesis row |
| Where do I see one student's report? | Reports → `PersonalReportsMasterDetailPanel`, click student row |
| Where do I see the argument map? | Reports → `ArgumentMapSection` |
| Where do I see similarity clusters? | Room → Similarity mode (`RoomSimilarityClusters`) |
| Where do I see who is currently online? | Right rail → `PresenceRailCard` |
| Where do I save the session as a template? | Setup → `AccessAndSharingSection` |
| Where do I see if AI is ready (models, prompts, budget)? | Setup → `AiReadinessSection` |
| Where do I run categorisation? | Right rail → `QuickActionsRailCard` (or Room Needs Attention "Assign now") |

---

## 10. Done Criteria

The migration is complete when, in addition to phase-13b's checklist:

- `src/pages/instructor-session-page.tsx` is < 200 lines and contains no mutations.
- No instructor component owns more than one of: query, mutation set, form state for an unrelated concern.
- The visual diff against `docs/instructor-shell-prototype.html` is minor (typography, exact spacing, dark mode parity).
- Every entry in §8 has a confirmed destination.
- `useInstructorOverview` is removed.
- A reviewer can navigate Room → Setup → Reports without ever seeing a control that "feels like it belongs in the other tab".
