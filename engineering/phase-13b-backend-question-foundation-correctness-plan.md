# Phase 13b: Backend Question Foundation And Correctness Plan

## Purpose

Phase 13b implements the backend foundation for the question-centric model approved in `engineering/phase-13a-question-centric-session-model-spec.md`.

It is a backend-first migration phase. The goal is to make Convex understand sessions as rooms with multiple questions before the learner and instructor UI is rebuilt around that model.

This phase should not try to redesign the frontend. It should keep existing screens working through compatibility reads while adding the backend contracts that Phase 14 can consume.

## Core Direction

The existing backend is mostly session-scoped. The new model needs question-scoped discussion state:

- one session can contain multiple questions;
- one released question can be marked current;
- non-current released questions can still be browsed;
- each question owns its own submissions, categories, synthesis, semantic analysis, argument links, and visibility/capability state;
- the existing `sessions.openingPrompt` becomes the first/default question during migration.

Use Convex widen, migrate, narrow discipline:

1. Add optional fields and new tables first.
2. Update code to dual-read old and new data.
3. Update all new writes to include question context.
4. Backfill existing rows to default questions.
5. Verify.
6. Only later make question fields required and remove old compatibility paths.

`@convex-dev/migrations` is already installed and should be used for the non-trivial backfills, with dry-run support before touching deployed data.

## Slice 13b-1: Question Foundation And Compatibility

### Goal

Introduce first-class questions without breaking existing sessions, demos, or instructor/participant queries.

### Files

- `convex/schema.ts`
- `convex/sessions.ts`
- `convex/sessionTemplates.ts`
- `convex/instructorControls.ts`
- `convex/participantWorkspace.ts`
- `convex/instructorCommandCenter.ts`
- `convex/demo.ts`
- `convex/stageDemo.ts`
- new `convex/sessionQuestions.ts`
- migration files under the repo's Convex migration location

### Schema Changes

Add `sessionQuestions`:

- `sessionId`
- `slug`
- `title`
- `prompt`
- `status`: `draft | released | archived`
- `isCurrent`
- `contributionsOpen`
- `peerResponsesVisible`
- `categoryBoardVisible`
- `categorySummariesVisible`
- `synthesisVisible`
- `personalReportsVisible`
- `fightEnabled`
- `repliesEnabled`
- `upvotesEnabled`
- `createdAt`
- `updatedAt`
- `releasedAt`
- `archivedAt`

Indexes:

- `by_sessionId`
- `by_sessionId_and_slug`
- `by_sessionId_and_status`
- `by_sessionId_and_isCurrent`

Widen `sessions`:

- add optional `currentQuestionId`
- keep `openingPrompt`, `phase`, and `currentAct` for compatibility

### Backend APIs

Create query/mutation helpers in `sessionQuestions.ts`:

- `listForSession`
- `getCurrentForSession`
- `createQuestion`
- `updateQuestion`
- `releaseQuestion`
- `archiveQuestion`
- `setCurrentQuestion`
- `setContributionState`
- `updateVisibility`
- internal `getOrCreateDefaultQuestion`
- internal `resolveQuestionForSession`

Rules:

- only one question per session may have `isCurrent: true`;
- setting a draft question current should either reject or release it explicitly first;
- archiving the current question must either reject or move current focus to another released question;
- slug uniqueness is per session.

### Compatibility Reads

Update existing overview/workspace queries to return:

- `questions`
- `currentQuestion`
- `selectedQuestion` when an optional question selector is provided later
- legacy fields still shaped so current UI does not crash

During this slice, existing screens may continue using session-level data. The important part is that the backend starts returning question metadata.

### New Writes

Update session creation and template-based session creation:

- create the session first;
- create one default released/current question from `openingPrompt`;
- patch `sessions.currentQuestionId`;
- keep `sessions.openingPrompt` in sync for now.

### Backfill

Migration:

- for every existing session with no question, create a default question from `openingPrompt`;
- mark it `released`, `isCurrent`, and `contributionsOpen`;
- patch `sessions.currentQuestionId`;
- do not delete or rewrite `openingPrompt`.

Use the migrations component for deployed data. For local/demo-only recovery, an internal batch mutation may be useful, but it should not replace the tracked migration.

### Acceptance Criteria

- Existing sessions have exactly one default current question after migration.
- New sessions automatically create a default current question.
- Instructor and participant pages still load.
- `pnpm exec convex codegen` succeeds.
- `pnpm exec tsc -b` succeeds.

## Slice 13b-2: Question-Scoped Submissions And Learner Workspace Contract

### Goal

Attach participant contributions and normal replies to questions while preserving old session-scoped submissions during migration.

### Files

- `convex/schema.ts`
- `convex/submissions.ts`
- `convex/participantWorkspace.ts`
- `convex/followUps.ts`
- `convex/reactions.ts`
- `convex/instructorCommandCenter.ts`
- migration files

### Schema Changes

Widen `submissions`:

- add optional `questionId`
- keep existing `sessionId`

Indexes:

- `by_questionId`
- `by_questionId_and_createdAt`
- `by_participantId_and_questionId`
- `by_parentSubmissionId` if normal replies are not already indexed well enough

If follow-up prompts and follow-up responses are currently session-scoped, widen:

- `followUpPrompts.questionId`
- `followUpTargets.questionId`

Reactions should remain entity-based, but any question-aware query should resolve the target entity's question.

### Backend Behaviour

Update submission creation:

- accept optional `questionId`;
- default to the session's current question when omitted;
- reject if the target question does not belong to the session;
- reject top-level contribution if the question is archived or contributions are closed;
- allow normal replies only when `repliesEnabled` is true and the parent submission belongs to the same question.

Define submission kinds clearly:

- top-level contribution;
- additional point;
- normal reply;
- follow-up response.

Fight turns should stay in Fight tables, not become normal replies.

### Workspace Query Contract

Update `participantWorkspace` to return a question-aware shape:

- all visible/released questions;
- current question;
- selected question if provided;
- own contributions for selected/current question;
- released peer responses for selected/current question when allowed;
- follow-up prompts for selected/current question;
- per-question capability flags.

Keep old return fields populated from the current/default question so the existing frontend remains compatible until Phase 14.

### Backfill

Migration:

- find each session's default/current question;
- patch existing submissions missing `questionId`;
- patch follow-up prompts and targets missing `questionId`.

### Acceptance Criteria

- New submissions are written with `questionId`.
- Existing submissions are readable through the default question.
- Reply creation cannot cross question boundaries.
- Participant workspace can be consumed by both old UI and future question tabs.
- `pnpm exec convex codegen` and `pnpm exec tsc -b` pass.

## Slice 13b-3: Question-Scoped Categories And Recategorisation

### Goal

Make categorisation per-question and preserve instructor/learner decisions when AI suggestions refresh.

### Files

- `convex/schema.ts`
- `convex/categorisation.ts`
- `convex/categoryManagement.ts`
- `convex/recategorisation.ts`
- `convex/participantWorkspace.ts`
- `convex/instructorCommandCenter.ts`
- migration files

### Schema Changes

Widen:

- `categories.questionId`
- `submissionCategories.questionId`
- `recategorizationRequests.questionId`

Indexes:

- `categories.by_questionId`
- `categories.by_questionId_and_slug`
- `submissionCategories.by_questionId`
- `submissionCategories.by_submissionId_and_questionId`
- `recategorizationRequests.by_questionId`

### Backend Behaviour

Categorisation trigger:

- accept optional `questionId`;
- default to current question;
- load only submissions for that question;
- load only categories for that question;
- create categories scoped to that question.

AI assignment application:

- replace only `suggested` assignments for the target question;
- preserve `confirmed` assignments;
- preserve `recategorization_requested` assignments;
- skip AI reassignment for submissions with confirmed or contested placement;
- do not delete historical assignments for archived categories.

Archived category display:

- keep archived categories resolvable by participant and instructor views;
- show archived metadata instead of broken or uncategorised labels;
- only move assignments away from archived categories through explicit instructor action.

Recategorisation:

- request must include or resolve `questionId`;
- requested category must belong to the same question;
- approved requests should produce `confirmed` assignments;
- rejected requests should not be overwritten by the next AI refresh unless the assignment is still only suggested.

### Backfill

Migration:

- assign existing categories to each session's default question;
- assign existing submission-category rows from their submission's question where possible;
- assign recategorisation requests from the associated submission/category question.

### Acceptance Criteria

- Running categorisation on one question does not affect another question.
- Confirmed assignments survive AI refresh.
- Recategorisation-requested assignments survive AI refresh.
- Archived-category assignments still render with useful category metadata.
- Stream/category filters work from question-scoped assignments.

## Slice 13b-4: Question-Scoped AI Artifacts, Baseline, Semantic State, And Argument Map

### Goal

Move generated intelligence to question scope, add the hidden baseline as a first-class artifact, and prevent repeated refreshes from accumulating stale derived state.

### Files

- `convex/schema.ts`
- `convex/aiFeedback.ts`
- `convex/synthesis.ts`
- `convex/personalReports.ts`
- `convex/semantic.ts`
- `convex/argumentMap.ts`
- `convex/llm.ts`
- `convex/jobs.ts`
- `convex/audit.ts`
- new `convex/questionBaselines.ts`
- migration files

### Schema Changes

Add `questionBaselines`:

- `sessionId`
- `questionId`
- `status`: `queued | processing | ready | error`
- `promptTemplateKey`
- `provider`
- `model`
- `baselineText`
- `summary`
- `generatedAt`
- `error`
- `createdAt`
- `updatedAt`

Indexes:

- `by_questionId`
- `by_sessionId`
- `by_questionId_and_status`

Widen where relevant:

- `synthesisArtifacts.questionId`
- `synthesisQuotes.questionId`
- `semanticEmbeddingJobs.questionId`
- `semanticEmbeddings.questionId`
- `semanticSignals.questionId`
- `argumentLinks.questionId`
- `aiJobs.questionId`
- `llmCalls.questionId`
- `auditEvents.questionId`

Personal reports should stay participant/session aware in the first pass, but the report generation context must become question-aware. Do not force one report per question until the UI decision is made.

### Baseline Behaviour

Baseline:

- generated after a question is confirmed/released;
- visible to instructor-side diagnostics only;
- not exposed to learners as a correct answer;
- used as context for private feedback and personal reports;
- regenerated manually when the prompt changes materially.

Feedback:

- when a baseline exists for the submission's question, include it in the prompt context;
- when baseline generation is missing or failed, feedback still runs with cohort/rubric context.

### Synthesis Behaviour

Generate synthesis per question:

- category summaries use categories/submissions for the target question;
- class synthesis uses that question's discussion state;
- published/final artifacts remain preserved;
- queued/processing/draft working artifacts can be reused or replaced intentionally;
- repeated generate clicks should not create unbounded duplicate draft artifacts.

### Semantic Behaviour

Embedding jobs:

- accept optional `questionId`;
- default to current question;
- include only question-scoped submissions, categories, and synthesis artifacts;
- keep immutable submission embeddings keyed by content hash;
- for mutable categories and synthesis artifacts, delete or supersede older active embeddings for the same `entityType + entityId` before inserting the new one.

Novelty signals:

- compute within the target question;
- do not mix submissions from different questions.

### Argument Map Behaviour

Argument-map generation:

- accept optional `questionId`;
- default to current question;
- use categories, submissions, and synthesis for that question;
- default to refreshing existing LLM-generated links;
- delete old LLM-generated links for that question before inserting regenerated links;
- preserve any future manual/non-LLM links.

### Backfill

Migration:

- attach existing synthesis artifacts and quotes to the default question;
- attach existing semantic jobs/embeddings/signals to the default question where the entity is question-scoped;
- attach existing argument links to the default question;
- attach AI jobs, LLM calls, and audit events to the default question when they clearly relate to submissions/categories/synthesis/semantic/argument-map work.

Rows that cannot be safely inferred should remain session-scoped with `questionId` absent and be handled by compatibility reads.

### Acceptance Criteria

- Baseline exists as a backend object and is instructor-only.
- Feedback can use baseline when available without requiring it.
- Synthesis generation is question-scoped.
- Embedding refresh does not leave stale active embeddings for mutable entities.
- Argument-map refresh does not duplicate old LLM links.
- Job/audit rows can be filtered by question where relevant.

## Slice 13b-5: Instructor Question Controls And Capability Rules

### Goal

Expose backend controls for question lifecycle, visibility, and capability settings. This enables Phase 14 to build the instructor UI without inventing frontend-only state.

### Files

- `convex/sessionQuestions.ts`
- `convex/instructorControls.ts`
- `convex/sessions.ts`
- `convex/participants.ts`
- `convex/submissions.ts`
- `convex/followUps.ts`
- `convex/fightMe.ts`
- `convex/instructorCommandCenter.ts`
- `convex/audit.ts`

### Capability Helpers

Add small backend helpers:

- `canJoinSession(session)`
- `canViewQuestion(session, question)`
- `canSubmitToQuestion(session, question)`
- `canReplyToQuestion(session, question)`
- `canAnswerFollowUp(session, question, prompt)`
- `canUseFightMe(session, question)`
- `canRequestRecategorisation(session, question)`

Rules:

- closed sessions reject new joins;
- closed sessions reject new submissions, follow-up responses, Fight starts, and Fight turns;
- archived questions reject new contributions;
- contribution closed questions reject new top-level contributions;
- replies are controlled separately through `repliesEnabled`;
- Fight is controlled through `fightEnabled`;
- view capability and write capability are separate.

### Instructor Mutations

Ensure backend mutations exist for:

- create/edit question;
- release question;
- archive question;
- set current question;
- open/close contributions;
- toggle peer response visibility;
- toggle category board visibility;
- toggle summaries visibility;
- toggle synthesis visibility;
- toggle personal report visibility;
- toggle replies;
- toggle Fight;
- toggle upvotes.

Each state-changing mutation should write an audit event with `sessionId`, `questionId` when applicable, action type, and timestamp.

### Overview Contract

Update instructor overview to return:

- question list;
- current question;
- per-question counts for submissions, categories, uncategorised items, recategorisation requests, synthesis, personal reports, embeddings, signals, and argument links;
- latest relevant AI jobs per question;
- compatibility aggregates for the current/default question.

Avoid expensive unbounded counting where possible. If a count is demo-scale only, keep it bounded or document it in the code path.

### Acceptance Criteria

- Backend can fully manage question lifecycle without frontend-only state.
- Current question changes are atomic and leave only one current question.
- Closed session rules are enforced server-side.
- Per-question visibility/capability flags are returned to frontend queries.
- Instructor overview has enough data for Phase 14 UI panels.

## Slice 13b-6: Demo Seed, Migration Hardening, And Verification

### Goal

Make the demo prove the new backend model and lock down the migration enough that Phase 14 can proceed safely.

### Files

- `convex/demo.ts`
- `convex/stageDemo.ts`
- `convex/sessionTemplates.ts`
- `engineering/*` docs if contracts need a note
- tests where practical

### Demo Data

Update demo seed to include:

- one main session;
- at least three questions;
- one current question;
- one released non-current browsable question;
- one draft or archived question for instructor controls;
- top-level contributions on more than one question;
- normal replies on at least one question;
- categories scoped to each seeded question;
- one recategorisation example;
- upvotes on submissions/replies;
- Fight examples tied to question-scoped targets;
- question baseline for at least the main question;
- synthesis and semantic/argument-map state tied to the main question.

### Reset And Backfill Hardening

Demo reset:

- delete in repeated batches until no target rows remain;
- report leftover counts if capped;
- avoid assuming a single batch clears all tables.

Migration verification:

- dry-run migrations before applying;
- add verification queries or scripts for:
  - sessions without questions;
  - sessions with zero or multiple current questions;
  - submissions without resolvable question context;
  - categories without resolvable question context;
  - question-scoped derived rows whose entity belongs to another question.

### Tests And Checks

Run after each slice:

- `pnpm exec convex codegen`
- `pnpm exec tsc -b`
- targeted `pnpm test` where tests exist

If lint is still known to fail from unrelated React issues, do not make 13b depend on full lint. Record the remaining lint failures in the slice notes instead.

### Acceptance Criteria

- Demo can be reset and reseeded into question-centric state.
- Demo has enough data for Phase 14 to build the new learner tabs.
- Migration verification finds no missing default questions.
- No question has more than one current question per session.
- Core backend checks pass.

## Implementation Order

Implement in this order:

1. 13b-1 Question foundation and compatibility.
2. 13b-2 Question-scoped submissions and workspace contract.
3. 13b-3 Question-scoped categories and recategorisation.
4. 13b-4 Question-scoped AI artifacts, baseline, semantic state, and argument map.
5. 13b-5 Instructor question controls and capability rules.
6. 13b-6 Demo seed, migration hardening, and verification.

Do not implement all slices in one commit. Each slice should be independently reviewable and should leave the app in a runnable state.

## Later Narrowing Pass

After Phase 14 consumes the new contracts and the deployed data is backfilled:

- make `questionId` required on truly question-scoped tables;
- remove fallback reads that infer default question from `sessions.openingPrompt`;
- de-emphasize or remove learner-facing dependence on `phase` and `currentAct`;
- decide whether personal reports become per-question, session-wide, or both;
- decide whether old rich reaction kinds remain hidden compatibility data or are removed from the core product.

## Non-Goals

- Add authentication.
- Build the Phase 14 learner tab UI.
- Build a separate conference mode.
- Remove all legacy session fields immediately.
- Expose the baseline to learners.
- Convert Fight into normal replies.
- Rewrite all Convex files at once.
