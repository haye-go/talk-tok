# Instructor Workspace Execution Checklist

Date: 2026-05-12
Companion to: [ui-phase-13-instructor-workspace-shell-plan.md](./ui-phase-13-instructor-workspace-shell-plan.md)

## Usage

This is the only execution companion for the instructor workspace shell work.

Do not create separate frontend/backend sibling checklists unless the work is later split across different owners and this checklist becomes unmanageably large.

Use this file to track execution against the approved plan.

## Recommended Build Order

Do not implement this as one giant rewrite.

Build in this order:

1. shell route state and entry links
2. instructor shell layout and persistent right live rail
3. `Room` extraction with `Latest`, `Categories`, and `Needs Attention`
4. backend/query split needed to support shell and `Room`
5. Phase 17 backend and room-facing similarity contracts
6. `Similarity` room mode UI
7. `Setup` extraction
8. `Reports` extraction
9. cleanup of monolithic leftovers

Logic:

- Stages 1 to 3 create the stable instructor container.
- Stage 4 makes the data model match that container.
- Stages 5 and 6 plug similarity into an already-correct `Room` surface.
- Stages 7 and 8 finish the rest of the shell without blocking similarity.
- Stage 9 removes old overlap once the new surfaces are real.

## Recommended Commit Sequence

Use one commit per stage-sized slice.

Suggested commits:

1. `instructor shell route state and entry links`
2. `instructor workspace shell and live rail`
3. `instructor room latest categories and needs-attention`
4. `instructor shell query split and room data contracts`
5. `semantic cluster backend for instructor room similarity`
6. `instructor room similarity mode`
7. `instructor setup workspace extraction`
8. `instructor reports workspace extraction`
9. `instructor workspace cleanup`

Rule:

- Do not start the semantic similarity backend before the new `Room` shell exists.
- Do not block the semantic work on fully finishing `Setup` or `Reports`.

## 1. Route And Shell State

- Add shell-level state for:
  - `tab=room|setup|reports`
  - `mode=latest|categories|similarity`
  - `questionId=<sessionQuestionId>`
- Default to `tab=room` when no tab is supplied.
- Default `mode` only when `tab=room`.
- Default `questionId` to current question when omitted.
- Update route helpers if needed so URLs can generate `Open Room` and `Open Setup` links cleanly.
- Update the instructor dashboard/session list so each session exposes:
  - `Open Room`
  - `Open Setup`

Acceptance:

- instructor can enter the live session directly into `Room` or `Setup`
- URL reflects workspace state
- browser navigation preserves tab and mode changes cleanly

## 2. Shell Layout

- Refactor the instructor session route into a real workspace shell.
- Keep one unified instructor session page/route as the shell owner.
- Implement:
  - left rail
  - center workspace
  - persistent right live rail
- Ensure the current all-in-one stacked page no longer drives the whole experience.
- Keep the top-level experience aligned with the participant shell logic without copying the participant layout blindly.

Acceptance:

- `Room`, `Setup`, and `Reports` render within one stable shell
- right live rail persists across top-level tabs
- the page no longer reads like one long dashboard

## 3. Right Live Rail

- Add selected-question summary to the rail.
- Add question switcher to the rail.
- Add live release toggles:
  - contributions open/closed
  - peer responses hidden/released
  - category board hidden/released
  - synthesis hidden/released
  - reports hidden/released
- Add live interaction toggles:
  - replies on/off
  - upvotes on/off
  - fight on/off
- Add live counters:
  - typing
  - submitted
  - uncategorized
  - pending recategorisation
- Keep the rail compact.
- Do not add deep drafting or editing forms into the rail.

Acceptance:

- instructors can change live room state from any top-level tab
- the rail remains action-oriented rather than form-heavy

## 4. Room Tab

- Extract live moderation into a dedicated `Room` tab.
- Stop treating the room as a flat recent-submission list.
- Render room content as thread roots with nested replies.
- Add compact room header with selected question context and mode state.
- Add `Needs Attention` section inside `Room`.
- Make `Needs Attention` collapsible and default-open.

Acceptance:

- `Room` is clearly the live moderation surface
- room content is thread-first
- triage work happens inside `Room`, not in a separate queue page

## 5. Room Mode: Latest

- Build chronological thread-root rendering.
- Keep replies nested beneath root threads.
- Show compact thread metadata:
  - category
  - time
  - upvote count
  - reply count
  - moderation cues
- Ensure this mode consumes the same conceptual thread model as the participant experience.

Acceptance:

- the instructor can scan live room activity chronologically
- root/reply structure is preserved

## 6. Room Mode: Categories

- Build category-grouped room view.
- Show one category container/section per category.
- Show uncategorized roots in a separate explicit area.
- Keep category mode as a room-reading surface, not a category settings editor.
- Ensure lightweight moderation actions remain available from this mode.

Acceptance:

- the instructor can read the room through category buckets without leaving `Room`
- uncategorized roots are visible and actionable

## 7. Room Mode: Similarity

- Reserve `Similarity` as a first-class room mode now, even if implementation is partial at first.
- When Phase 17 data is available, render:
  - semantic clusters
  - representative cluster identity
  - root threads inside each cluster
  - nested replies under root threads
  - outlier area if needed
- Provide or prepare room actions for:
  - promote cluster to category
  - merge cluster into existing category
  - ignore cluster
  - rebuild/refresh clusters if supported
- If Phase 17 is not fully wired yet, ship a stable not-ready or limited-readiness state rather than redesigning later.

Acceptance:

- `Similarity` fits naturally beside `Latest` and `Categories`
- similarity clusters do not replace categories
- replies remain nested under roots

## 8. Needs Attention

- Include:
  - uncategorized root threads
  - pending recategorisation requests
  - similarity-driven cluster promotion opportunities when available
  - other unresolved live moderation tasks that block flow
- Keep the section compact enough to coexist with the main room content.
- Ensure actions can resolve issues quickly and return focus to the room.

Acceptance:

- unresolved moderation tasks are visible without taking over the whole page
- `Needs Attention` works as triage, not as another dashboard

## 9. Live Moderation Actions

- Ensure `Room` supports:
  - assign category to thread root
  - review/approve/reject recategorisation requests
  - create brand-new follow-up
  - launch follow-up
- Keep fast actions in `Room`.
- Keep heavier authoring/editing workflows in `Setup`.

Acceptance:

- instructors can facilitate live without bouncing between unrelated tabs

## 10. Setup Tab

- Extract question/category/follow-up/configuration work out of the monolithic page.
- Make `Setup` explicitly question-centric.
- Include:
  - question list or question switcher
  - current question selection / release management
  - question editing
  - category editing
  - follow-up drafting/editing
  - baseline generation/configuration
  - any non-urgent session configuration that does not belong in the live rail

Acceptance:

- `Setup` is the clear place for preparation and between-round changes
- live room reading no longer competes with setup forms

## 11. Reports Tab

- Extract report/review surfaces out of the live room page.
- Consolidate:
  - synthesis artifacts
  - personal reports
  - argument map
  - AI job review
  - semantic/observability review that is not urgent-live
- Keep argument map here, not in `Room`.
- Ensure this tab can still respect selected-question context where relevant.

Acceptance:

- `Reports` is the clear destination for review and analysis
- `Room` is no longer crowded by report-generation surfaces

## 12. Backend Query Split

- Reduce dependence on one oversized instructor overview query.
- Split data contracts into at least:
  - shell query
  - room query
  - setup query
  - reports query
- Ensure shell query returns:
  - session summary
  - current question summary
  - released question list
  - right-rail counters
  - right-rail visibility/interaction state
- Ensure room query returns:
  - selected question
  - thread-root-first room data
  - nested replies
  - uncategorized roots
  - recategorisation summary
  - category-grouped view
  - similarity summary or clusters as applicable
- Ensure setup query returns:
  - question config
  - category config
  - follow-up config
  - baseline status
- Ensure reports query returns:
  - synthesis artifacts
  - report summary
  - argument map status/data
  - AI/semantic status

Acceptance:

- the frontend no longer depends on one monolithic query payload
- each tab can load the data shape it actually needs

## 13. Mutation And Action Review

- Group mutations/actions into:
  - live control changes
  - room moderation actions
  - setup/configuration actions
  - reports/generation actions
- Check whether existing controls in:
  - [convex/instructorControls.ts](../convex/instructorControls.ts)
  - [convex/instructorCommandCenter.ts](../convex/instructorCommandCenter.ts)
  need question-scoped behavior instead of broad session-wide assumptions.
- Ensure live-toggle semantics align with the current participant thread model and release model.

Acceptance:

- action boundaries match the shell architecture
- live controls are not conflated with configuration workflows

## 14. Phase 17 Compatibility

- Keep `Similarity` mode aligned with:
  - [phase-17-threaded-similarity-map-plan.md](./phase-17-threaded-similarity-map-plan.md)
- Preserve these distinctions:
  - category board
  - similarity clusters
  - argument map
- Ensure thread-mode display remains the default unit in room surfaces.

Acceptance:

- the instructor shell does not need another IA rewrite when similarity ships fully

## 15. Cleanup

- Remove or narrow old monolithic page sections once the new tab owns the responsibility.
- Avoid leaving duplicate versions of the same surface in both the old page and new tab.
- Reassess:
  - [src/components/instructor/question-manager-panel.tsx](../src/components/instructor/question-manager-panel.tsx)
  - [src/components/instructor/session-controls-card.tsx](../src/components/instructor/session-controls-card.tsx)
  - [src/pages/instructor-session-page.tsx](../src/pages/instructor-session-page.tsx)
  to determine whether each should be repurposed, split, or retired.

Acceptance:

- the final instructor session experience is not a hybrid of old and new paradigms

## Final Acceptance Gate

The work is complete when all of the following are true:

- one instructor session shell owns `Room`, `Setup`, and `Reports`
- the right rail persists across top-level tabs
- `Room` supports `Latest`, `Categories`, and `Similarity`
- `Needs Attention` exists inside `Room` and is default-open
- room rendering is thread-root-first with nested replies
- `Setup` owns preparation/configuration work
- `Reports` owns synthesis/report/argument-map/review work
- the backend query shape is no longer monolithic
- similarity is accommodated without collapsing into category or argument-map semantics
