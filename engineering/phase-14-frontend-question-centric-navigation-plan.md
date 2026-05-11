# Phase 14: Frontend Question-Centric Navigation Plan

## Purpose

This phase records the current frontend findings and suggested fixes, then applies them to the question-centric learner and instructor model.

It depends on:

- `engineering/phase-13a-question-centric-session-model-spec.md`
- `engineering/phase-13b-backend-question-foundation-correctness-plan.md`

It focuses on React correctness, learner navigation clarity, capability-driven UI behavior, question-centric instructor controls, and maintainability.

## Current Findings

The frontend is a Vite + React + TanStack Router app with Convex subscriptions and mutations wired directly into pages and feature components. The core experience is implemented, but the frontend now has three kinds of pressure:

- React/lint correctness issues from newer React hook/compiler rules.
- Product-navigation tension between the older act model and the newer learner tab model.
- Maintainability pressure from very large page-level components, especially the instructor session page.
- Documentation and route contracts have drifted from the code.
- Some admin/demo/projector surfaces are still placeholders or partially wired.

TypeScript currently passes with `pnpm exec tsc -b`, but lint and formatting do not pass.

## Contract Corrections From Phase 13

Phase 14 should explicitly honor the approved product/backend model from Phase 13a and 13b.

That means the frontend plan must treat these as requirements, not optional design choices:

- released questions are browseable even when they are not current;
- current question is a nudge, not a hard gate;
- learner tabs stay visible at all times and render capability-aware empty states;
- frontend should consume backend capability/visibility flags instead of guessing from session phase;
- non-current questions may be visible but not writable;
- `Me` includes private feedback, report state, and baseline-derived comparison notes;
- the redesigned core UI foregrounds `upvote`;
- the instructor workspace is organized around question management, not phase progression.

If Phase 14 does not encode those rules directly, the frontend can drift back toward the older act model even with the correct backend in place.

## Check Results

### Formatting

`pnpm check` fails on formatting in:

- `src/pages/instructor-session-page.tsx`
- `engineering/personal-reports-instructor-section-plan.md`

### Lint

`pnpm lint` fails with React/compiler, Fast Refresh, and explicit `any` issues.

Representative files:

- `src/pages/participant-session-page.tsx`
- `src/pages/instructor-session-page.tsx`
- `src/pages/join-page.tsx`
- `src/pages/fight-page.tsx`
- `src/components/fight/fight-draft-composer.tsx`
- `src/components/instructor/argument-map-graph.tsx`
- `src/components/ui/button.tsx`
- `src/router.tsx`

### TypeScript

`pnpm exec tsc -b` passes.

### Tests

`pnpm test` passes, but coverage is currently shallow:

- helper tests for routes, slugging, telemetry, client identity, and act state;
- one App render smoke test;
- no meaningful page-level tests for participant/instructor flows;
- no tests for Convex data contract assumptions in the UI;
- no tests for admin pages, semantic panels, Fight Me flow, synthesis controls, or demo entry.

The current `act-state` tests still encode the old act-gated tab model, so they will need to change when the learner navigation model changes.

### Route Contract Drift

`src/lib/routes.ts` contains route entries that are missing from `engineering/route-registry.md`:

- `/join`
- `/demo/personas`
- `/instructor/admin/demo`

The route registry should be updated whenever the learner navigation work happens, otherwise engineering docs and code will continue to diverge.

### Placeholder And Partial-Wiring Surfaces

Known placeholder or partial surfaces:

- `src/pages/admin-retrieval-page.tsx`
  - static controls;
  - `Trigger Reindex` button is not wired to semantic embedding mutations;
  - retrieval settings are not persisted.
- `src/pages/admin-models-page.tsx`
  - displays model settings, but does not expose editing despite backend support.
- `src/pages/admin-protection-page.tsx`
  - displays protection settings, but does not expose editing despite backend support.
- `src/components/layout/projector-shell.tsx`
  - still says categories appear after Phase 03 and does not show live categories.
- `src/components/layout/instructor-shell.tsx`
  - contains fallback placeholder panels.
- `src/components/layout/participant-shell.tsx`
  - contains fallback placeholder tab content.
- `src/components/acts/submit-act.tsx`
  - still imports `MOCK_SESSION` and `MOCK_STREAM_RESPONSES`.

These are not all user-facing in normal paths, but they should be tracked so demo behaviour is not mistaken for complete wiring.

### Dependency Drift

Used dependencies include:

- `@base-ui/react` through `src/components/ui/switch.tsx`;
- `d3-force` through the argument map graph;
- `qrcode.react` through instructor/projector QR codes;
- `pretext` through display text;
- Convex rate limiter, workpool, and action cache through `convex/components.ts` and `convex/convex.config.ts`.

Packages present but not referenced in handwritten code during this inspection:

- `@convex-dev/action-retrier`
- `@convex-dev/presence`
- `@convex-dev/sharded-counter`
- `convex-batch-processor`
- `convex-mq`
- `convex-smart-tags`

These may be planned dependencies, but they should be either used, documented as planned, or removed later.

## Implementation Strategy

### 1. Fix React Correctness Before Product Refactors

Files:

- `src/pages/participant-session-page.tsx`
- `src/pages/instructor-session-page.tsx`
- `src/pages/join-page.tsx`
- `src/pages/fight-page.tsx`
- `src/components/fight/fight-draft-composer.tsx`
- `src/components/instructor/argument-map-graph.tsx`
- `src/hooks/use-act.ts`

Changes:

- Remove synchronous state mirroring inside `useEffect` where practical.
- Prefer lazy `useState` initializers for client key reads.
- For form state that is intentionally reset from server data, use explicit reset keys or controlled form models rather than broad `useEffect` mirroring.
- For argument-map layout, avoid setting empty layout state synchronously inside an effect; derive empty display state or schedule simulation state only when graph data exists.
- For selected graph node state, derive a safe selected key from available nodes where possible.

Expected result:

- React compiler lint errors are reduced without changing product behaviour.
- Less cascading render risk in common learner/instructor flows.

### 2. Replace `any` Casts With Convex-Aware Types

Files:

- `src/pages/instructor-session-page.tsx`
- `src/pages/admin-observability-page.tsx`
- `src/pages/admin-demo-page.tsx`
- `src/pages/session-new-page.tsx`
- `src/pages/templates-page.tsx`
- `src/components/fight/fight-home.tsx`
- `src/components/fight/fight-target-picker.tsx`
- `src/components/reactions/reaction-bar.tsx`
- `src/components/synthesis/synthesis-artifact-card.tsx`

Changes:

- Use `Id<"tableName">` where UI IDs are passed back into Convex mutations.
- Add small local types for semantic radar, category drift, report summary, observability rows, and demo toggles.
- Avoid broad `as any` on mutation args.
- Where Convex generated return types are awkward, create narrow view-model types at the component boundary.

Expected result:

- Lint improves.
- UI/backend contract drift becomes easier to catch before runtime.

### 3. Split The Instructor Session Page

Files:

- `src/pages/instructor-session-page.tsx`
- new components under `src/components/instructor/`
- optional hooks under `src/hooks/`

Suggested extraction:

- `QuestionManagerPanel`
- `SessionControlsPanel`
- `CategoryBoardPanel`
- `RecentSubmissionsPanel`
- `FollowUpPanel`
- `RecategorisationQueuePanel`
- `SynthesisPanel`
- `PersonalReportsPanel`
- `SemanticAnalysisPanel`
- `AiJobStatusPanel`
- `SessionSettingsForm`

Keep the page responsible for:

- route params,
- Convex query/mutation wiring,
- high-level loading/error states,
- passing typed props into panels.

The split should not be a cosmetic decomposition only. It should also shift the instructor workspace to the grouped control model approved in Phase 13a:

- Question setup:
  title, prompt, draft/released/archived state.
- Live focus:
  set current question, open/close contributions.
- Release:
  peer responses, category board, summaries, synthesis, personal reports.
- AI:
  baseline, categorisation, summaries, reports, semantic analysis, argument map.
- Interaction:
  replies, upvotes, Fight.

`QuestionManagerPanel` should become the top-level organizer for the instructor dashboard, because Phase 14 is supposed to move the dashboard from phase control to question control.

Expected result:

- The largest frontend file becomes easier to reason about.
- Future UI changes can target one panel at a time.

### 4. Implement Question-Centric Learner Navigation And Capability Model

Files:

- `src/lib/constants.ts`
- `src/components/layout/participant-shell.tsx`
- `src/components/layout/act-progress-bar.tsx`
- `src/pages/participant-session-page.tsx`
- `src/components/acts/*`
- `src/components/stream/stream-tab.tsx`
- `src/components/myzone/my-zone-tab.tsx`
- `src/components/fight/*`

Preferred direction:

- Move learner navigation to four tabs:
  - `Contribute`
  - `Explore`
  - `Fight`
  - `Me`
- Retire the act progress bar as primary learner navigation.
- Use the current highlighted question as the learner's primary context.
- Add a released-question selector wherever the learner needs to change question context.
- Land learners on the current question by default, but allow browsing other released questions without switching tabs.
- Treat current question as a nudge, not a hard gate.
- Keep backend `phase/currentAct` only as legacy/instructor compatibility state until removed or de-emphasized.
- Drive tab content from backend question/capability state first, not from local act assumptions.
- Preserve useful act content by moving it into the matching tabs:
  - Question prompt, top-level posts, inline private feedback, replies, and follow-up composer -> `Contribute`
  - Released peer responses, replies, categories, recategorisation, and synthesis -> `Explore`
  - Fight Me flows -> `Fight`
  - Feedback, history, report state, and baseline-derived comparison notes -> `Me`
- Show unavailable explanations inside each tab instead of hiding whole areas.
- Distinguish clearly between `visible` and `interactive`.
- A released question may be browseable but still closed for new top-level contributions, replies, upvotes, or Fight.
- Multiple top-level contributions remain first-class after the first post.
- Allow normal replies from Explore without treating them as Fight.
- Keep Fight as a separate structured challenge flow.

Expected result:

- Learners can explore available features without needing to understand sequential acts.
- The UI better supports class discussion, conference Q&A, and multiple contributions without introducing a separate conference-mode frontend.

#### Tab Requirements

`Contribute` should include:

- current/released question context;
- top-level contribution composer;
- immediate private feedback directly under the submitted contribution;
- queued/processing/error feedback state in the same inline location;
- feedback logic that may combine baseline, rubric, cohort comparison, and question-specific signals into one private response;
- follow-up prompts;
- category-targeted prompts when applicable;
- reply composer entry when launched from Explore;
- own contribution list;
- per-contribution actions:
  add follow-up, request recategorisation, view analysis, view in Explore, start Fight when allowed.

For multiple top-level contributions, each contribution may keep its own private feedback, but the newest contribution should be the default expanded feedback target.

`Explore` should include:

- released peer responses;
- normal replies;
- category board;
- question-aware filters;
- category summaries;
- published/final synthesis;
- upvote-first interactions;
- reply and Fight entry points with distinct language.

`Fight` should include:

- active fights;
- incoming challenges;
- completed fights;
- AI challenge path when enabled;
- clear unavailable state when Fight is off for the selected question.

`Me` should include:

- all learner contributions for the selected/current question context;
- private AI feedback;
- category placement;
- recategorisation request state;
- baseline-derived comparison notes when available;
- personal report when generated/released;
- Fight history;
- identity controls.

`Me` is the private archive and reflection hub, not the first place a learner must go to discover post-level feedback.
The first experience of feedback should happen inline in `Contribute` immediately after posting.

### 5. Use Router Navigation Consistently

Files:

- `src/pages/join-page.tsx`
- `src/pages/join-code-page.tsx`
- `src/pages/demo-personas-page.tsx`
- `src/pages/participant-session-page.tsx`
- `src/pages/instructor-dashboard-page.tsx`
- `src/pages/session-new-page.tsx`
- `src/pages/templates-page.tsx`
- `src/components/layout/instructor-brand-bar.tsx`
- `src/components/layout/instructor-top-bar.tsx`

Changes:

- Replace `window.location.href` with TanStack Router navigation where state should stay in-app.
- Keep direct anchors only for copyable/open-in-new-tab style navigation.
- Use route helpers from `src/lib/routes.ts` consistently.

Expected result:

- Fewer full page reloads.
- Better preservation of client state and smoother demo navigation.

### 6. Fix Fast Refresh Boundaries

Files:

- `src/components/ui/button.tsx`
- `src/router.tsx`

Changes:

- Move `buttonVariants` into a non-component utility file, or keep only component exports in `button.tsx`.
- Move `RootLayout` out of `router.tsx`, or keep router config free of component declarations.

Expected result:

- Fast Refresh lint errors are resolved.
- Development feedback loop becomes cleaner.

### 7. Review Design System And Interaction Consistency

Files:

- `src/styles/globals.css`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/components/reactions/reaction-bar.tsx`
- `src/components/stream/stream-tab.tsx`

Changes:

- Keep the global clickable cursor rule.
- Check dark-surface text inheritance carefully after the previous `.sig-dark` / button-link issue.
- Foreground `upvote` as the core reaction in the redesigned learner UI.
- De-emphasize or hide the legacy richer reaction set in the main interaction surface unless a specific workflow still requires it.
- Replace structural emoji icons where appropriate with Phosphor icons.
- Ensure interactive controls have accessible labels, visible focus states, and stable disabled states.
- Avoid hidden content behind bottom nav on small screens.

Expected result:

- Fewer visual regressions from global CSS.
- More consistent interaction affordances.

### 8. Bring Admin And Projector Surfaces Up To Current Backend Reality

Files:

- `src/pages/admin-retrieval-page.tsx`
- `src/pages/admin-models-page.tsx`
- `src/pages/admin-protection-page.tsx`
- `src/pages/admin-prompts-page.tsx`
- `src/components/layout/projector-shell.tsx`
- `src/pages/projector-page.tsx`

Changes:

- Wire retrieval/reindex controls to semantic embedding functions, or label the page clearly as pending.
- Add editing flows for model settings and protection settings if these admin pages are meant to be operational.
- Fix `AdminPromptsPage` render-time state update by moving prompt selection initialization into derived state or an effect-safe pattern.
- Replace projector placeholder category copy with live category/session summary data, or narrow the projector to QR/join-only until live panels are implemented.

Expected result:

- Admin pages no longer imply unavailable functionality.
- Projector mode reflects the real current session state.

### 9. Update Route And Test Contracts

Files:

- `engineering/route-registry.md`
- `src/lib/routes.ts`
- `src/lib/routes.test.ts`
- `src/lib/act-state.test.ts`
- new page/component tests where practical

Changes:

- Align `engineering/route-registry.md` with `src/lib/routes.ts`.
- Update tests when learner tabs replace act-gated navigation.
- Add smoke tests for:
  - join entry;
  - demo persona page;
  - participant shell with mocked workspace data;
  - instructor session page loading/error states;
  - semantic panel empty/ready states.

Expected result:

- Docs and tests reflect the current route surface.
- Future navigation refactors have useful regression coverage.

## Suggested Order

1. Formatting and lint correctness that does not change UX.
2. Replace `any` casts around Convex IDs and common data shapes.
3. Split `instructor-session-page.tsx` into question-first panels.
4. Implement released-question selection and capability-driven learner tabs.
5. Normalize router navigation.
6. Polish global CSS, upvote-first interactions, and mobile tab behavior.
7. Update admin/projector partial surfaces.
8. Update route docs and tests.

## Staged Implementation Slices

Phase 14 should be implemented as separate reviewable slices with one commit per slice.

### 14-1: Frontend Correctness And Lint-Safe Cleanup

Scope:

- React/compiler-safe cleanup that does not intentionally change product behavior.
- Remove unsafe state mirroring where practical.
- Stabilize the argument-map graph effect flow.
- Resolve the most direct Fast Refresh boundary issues only if they are part of this cleanup pass.

Target files are expected to include:

- `src/pages/participant-session-page.tsx`
- `src/pages/instructor-session-page.tsx`
- `src/pages/join-page.tsx`
- `src/pages/fight-page.tsx`
- `src/components/fight/fight-draft-composer.tsx`
- `src/components/instructor/argument-map-graph.tsx`
- `src/hooks/use-act.ts`
- `src/components/ui/button.tsx`
- `src/router.tsx`

Acceptance:

- targeted frontend checks improve;
- TypeScript still passes;
- no intended UX redesign yet.

### 14-2: Frontend Type-Contract Cleanup

Scope:

- remove broad `any` casts;
- tighten Convex ID typing;
- add narrow local view-model types where generated types are awkward;
- make page/component boundaries more explicit before bigger refactors.

Acceptance:

- mutation/query call sites are more type-safe;
- lint noise from `any` usage is reduced;
- no major visual changes.

### 14-3: Instructor Page Split

Scope:

- split `src/pages/instructor-session-page.tsx` into question-first panels;
- introduce `QuestionManagerPanel` as the top-level organizer;
- keep the page as the route/query/mutation shell;
- introduce `AiJobStatusPanel` if that helps keep AI state legible.

Acceptance:

- instructor page is materially smaller and easier to reason about;
- question management is visually/structurally top-level;
- existing instructor capabilities remain available.

### 14-4: Learner Question Navigation Foundation

Scope:

- replace learner-facing act navigation with a stable tab shell:
  `Contribute`, `Explore`, `Fight`, `Me`;
- add released-question selection;
- land learners on the current question by default;
- keep tabs visible at all times;
- drive tab availability messaging from backend capability flags.

Acceptance:

- learner can browse released questions without relying on old act progression;
- current question behaves as a nudge, not a hard gate;
- tabs no longer disappear based on legacy act assumptions.

### 14-5: Contribute Tab Behavior

Scope:

- make `Contribute` useful after the first post;
- render immediate private AI feedback inline under the submitted contribution;
- show queued/processing/error feedback state in the same location;
- support multiple top-level contributions as first-class;
- support follow-up and contribution actions from the same workspace.

Acceptance:

- learner posts and sees private feedback in the same workspace;
- `Contribute` remains active after submission;
- `Me` is no longer the first place a learner must go to find feedback.

### 14-6: Explore And Interaction Model

Scope:

- make `Explore` the cohort-facing discovery space;
- support normal replies from Explore;
- keep Fight entry points distinct from reply entry points;
- foreground `upvote` as the primary reaction surface;
- enforce visible-vs-interactive distinctions for non-current questions.

Acceptance:

- learners can reply normally without entering Fight;
- reaction UI is simpler and upvote-first;
- question visibility/capability rules are legible in Explore.

### 14-7: Fight And Me Completion

Scope:

- complete the `Fight` tab as the structured disagreement surface;
- complete `Me` as the private archive/report/comparison hub;
- show baseline-derived comparison notes when backend data exists without exposing the baseline text itself;
- make Fight-disabled and report-not-yet-released states clear.

Acceptance:

- Fight and Me behave as stable tabs, not leftover act surfaces;
- private analysis/report state is consolidated in Me;
- no baseline text is exposed directly to learners.

### 14-8: Router, Docs, Tests, Admin, And Projector Cleanup

Scope:

- normalize router navigation;
- update `engineering/route-registry.md`;
- update or replace act-era tests;
- add smoke coverage for the new learner/instructor shells where practical;
- either wire or clearly label admin/projector partial surfaces.

Acceptance:

- route docs match the code;
- navigation avoids unnecessary full reloads;
- tests reflect the new tab model;
- admin/projector surfaces no longer imply functionality they do not actually have.

## Verification Checklist

- `pnpm check` passes.
- `pnpm lint` passes or remaining warnings are documented.
- `pnpm exec tsc -b` passes.
- Learner lands on the current question but can browse other released questions.
- Learner tabs remain visible even when question capabilities are limited.
- Learner can tell the difference between content being hidden and interaction being disabled.
- Learner can join, submit, see queued or completed private feedback inline in `Contribute`, add follow-up, explore categories, reply normally, enter Fight, and view Me/report without act confusion.
- `Me` shows private feedback and baseline-derived comparison notes when backend data exists, without exposing the baseline itself.
- Explore foregrounds `upvote` as the primary reaction surface.
- Instructor can manage questions, current focus, visibility, interaction toggles, categories, follow-ups, synthesis, reports, semantic analysis, and argument map after page split.
- Demo persona entry does not full-reload unnecessarily.
- Dark surface buttons and links remain readable.
- Bottom navigation does not obscure content on mobile.
- `engineering/route-registry.md` matches `src/lib/routes.ts`.
- Admin retrieval/model/protection pages are either wired or clearly marked as display-only/pending.
- Projector page no longer contains outdated Phase 03 placeholder copy.

## Non-Goals

- Add authentication.
- Rewrite the backend.
- Replace the visual identity.
- Introduce a new UI library.
- Convert the app to Next.js.
- Expose the hidden baseline text directly to learners.
- Invent frontend-only capability rules that bypass the Phase 13 backend contract.
- Create a separate conference-mode frontend.
- Collapse Fight into normal reply behavior.
