# Phase 15: AI Workflow Observability, Question-Scoped Status, And Release Clarity

## Purpose

Phase 15 updates the AI-facing product surface after the question-centric backend of Phase 13 and the learner/instructor frontend restructuring of Phase 14.

The backend is already real. The remaining problem is not "do these AI features exist?" but "can users understand what state they are in, what question they apply to, why they are blocked, and whether the output is hidden, failed, or simply not generated yet?"

This phase should make the existing AI system legible and trustworthy.

It depends on:

- `engineering/phase-13a-question-centric-session-model-spec.md`
- `engineering/phase-13b-backend-question-foundation-correctness-plan.md`
- `engineering/phase-14-frontend-question-centric-navigation-plan.md`

## What Phase 13 And 14 Already Changed

Phase 15 must start from the code that now exists, not from older assumptions.

### Already Implemented In Phase 13

- first-class question baselines in `convex/questionBaselines.ts`
- question-scoped AI jobs in `convex/jobs.ts`
- question-scoped semantic jobs, embeddings, signals, and readiness in `convex/semantic.ts`
- question-scoped argument-map generation in `convex/argumentMap.ts`
- baseline-aware private feedback in `convex/aiFeedback.ts`
- baseline-aware personal reports in `convex/personalReports.ts`
- question-scoped categorisation, synthesis, and report workflows
- question-centric demo data proving those contracts

### Already Implemented In Phase 14

- learner workspace now uses `Contribute`, `Explore`, `Fight`, and `Me`
- immediate private feedback is rendered inline in `Contribute`
- `Me` is the learner's private archive, report, and reflection space
- question selection and question-scoped learner browsing are in place
- admin retrieval / models / protection pages are now explicitly marked as read-only or pending
- projector no longer shows the old placeholder category copy
- router navigation no longer relies on broad `window.location.href` reloads in common paths

### Consequence For Phase 15

Phase 15 should not re-solve:

- baseline as a backend object;
- argument-map duplicate refresh semantics;
- mutable entity embedding refresh cleanup;
- learner act-model navigation;
- basic admin/projector honesty work already done in 14-8.

Instead, it should focus on the remaining observability and product-clarity gaps.

## Current AI Workflows And Reality

## Submission Feedback

Frontend now lives primarily in:

- `src/pages/participant-session-page.tsx`
- `src/components/contribute/contribution-thread-card.tsx`
- `src/components/myzone/my-zone-tab.tsx`

Backend:

- `convex/participantWorkspace.ts`
- `convex/submissions.ts`
- `convex/aiFeedback.ts`
- `convex/questionBaselines.ts`
- `convex/llm.ts`

Flow:

1. Learner submits through `participantWorkspace.submitAndQueueFeedback`.
2. Backend creates the submission.
3. Backend queues private feedback generation.
4. Feedback prompt may use baseline context, rubric context, and cohort context.
5. Learner sees feedback state inline in `Contribute` and again in `Me`.

What is real:

- feedback generation is real;
- baseline context is real when available;
- feedback is question-scoped and private.

Remaining issue:

- if submission creation succeeds but feedback queueing fails, the learner can still experience the action as failed even though the contribution was saved.

## Categorisation

Frontend:

- `src/pages/instructor-session-page.tsx`
- learner category/filter surfaces in `Explore`

Backend:

- `convex/categorisation.ts`
- `convex/categoryManagement.ts`
- `convex/recategorisation.ts`
- `convex/participantWorkspace.ts`
- `convex/instructorCommandCenter.ts`

What is real:

- categorisation is a real AI workflow;
- it is now question-scoped;
- confirmed and contested assignment preservation was part of Phase 13.

Remaining issue:

- instructor UI still exposes only limited queued/error feedback;
- completion and failure are still too easy to miss;
- learners can still experience category-driven surfaces as "broken" when assignments are absent, delayed, archived, or hidden by visibility.

## Synthesis

Frontend:

- `src/pages/instructor-session-page.tsx`
- `src/components/synthesis/synthesis-artifact-card.tsx`
- learner synthesis surfaces in `Explore` and `Me`

Backend:

- `convex/synthesis.ts`
- `convex/participantWorkspace.ts`

What is real:

- category summaries, class synthesis, and opposing views are real generated artifacts;
- artifacts move through `draft -> published -> final`;
- participant visibility is still controlled by question/session visibility rules.

Remaining issue:

- instructors can generate and publish, but the UI still does not explain visibility clearly enough;
- participants still need clearer empty states distinguishing:
  - nothing generated;
  - generated but not published;
  - published/final but hidden by visibility policy.

## Personal Reports

Frontend:

- `src/pages/instructor-session-page.tsx`
- `src/pages/review-page.tsx`
- `src/components/myzone/my-zone-tab.tsx`

Backend:

- `convex/personalReports.ts`
- `convex/participantWorkspace.ts`

What is real:

- reports are real and use participant submissions, private feedback, question baseline context, question synthesis, and fight context;
- `Me` already surfaces released report content when available;
- learners can still self-request reports through `review-page.tsx`.

Remaining issue:

- the product policy is still mixed:
  - reports are conceptually instructor-released;
  - but participants can still generate their own report;
- instructor UI progress/error visibility is still limited;
- learner-facing report state is not fully aligned with the intended release model.

## Baselines

Frontend:

- currently only indirect learner-facing references in feedback/report copy
- no dedicated instructor baseline diagnostics panel yet

Backend:

- `convex/questionBaselines.ts`
- `convex/aiFeedback.ts`
- `convex/personalReports.ts`

What is real:

- baselines are first-class backend objects;
- generation is question-scoped;
- baselines are instructor-side only;
- baseline context is already consumed by feedback and personal reports.

Remaining issue:

- there is still no clear instructor-visible baseline status, timestamp, error, or regenerate affordance in the main workflow.

## Semantic Embeddings And Novelty

Frontend:

- `src/pages/instructor-session-page.tsx`

Backend:

- `convex/semantic.ts`
- `convex/llm.ts`

What is real:

- embedding generation is real;
- novelty signals are real;
- mutable category/synthesis embeddings already supersede stale rows;
- signal refresh is question-scoped.

Remaining issue:

- the UI still treats semantic analysis too much like one feature;
- embeddings, novelty, argument map, and drift are related but operationally distinct;
- job progress and error detail remain too subtle.

## Argument Map

Frontend:

- `src/pages/instructor-session-page.tsx`
- `src/components/instructor/argument-map-graph.tsx`

Backend:

- `convex/argumentMap.ts`
- `convex/llm.ts`

What is real:

- argument-map generation is real;
- graph rendering is real;
- refresh semantics already default to replacing old LLM-generated links.

Remaining issue:

- instructors still get weak visibility when no links are produced or the job fails;
- the graph only feels "alive" after successful links exist, not while the workflow is queued or blocked.

## Cross-Cutting Gaps That Phase 15 Must Fix

### 1. Real Job State Exists But UI Often Uses Local Spinner State

Current instructor UI still relies on local flags such as:

- `embeddingQueued`
- `argMapQueued`
- `generatingReports`
- `triggeringCategorisation`

Those are useful for immediate optimism, but they should not be the source of truth. Phase 15 should move panels to real Convex job subscriptions wherever possible.

Primary source surfaces already exist:

- `convex/jobs.ts`
- `convex/semantic.ts` job status
- `convex/instructorCommandCenter.ts` latest-job summaries

### 2. Question Scope Must Be Visible In The UI

After Phase 13 and 14, AI actions conceptually belong to a question, not just a session.

Phase 15 should make the UI explicit about:

- which question a job applies to;
- whether actions default to the current question;
- whether an instructor is viewing current-question status or session-wide aggregate status.

Recommended default:

- AI actions target the current question unless the instructor explicitly selects another released question.

### 3. Readiness Must Be Feature-Specific, Not Lumped

Semantic analysis currently exposes a single `missingPrerequisites` list such as:

- `embeddings`
- `novelty_signals`
- `argument_links`

That is useful as raw data, but the UI should split it into separate cards or strips:

- embeddings state
- novelty state
- argument-map state
- drift state

Otherwise one missing output makes adjacent features feel broken.

### 4. Visibility And Release State Are Still Easy To Misread

The product now has multiple independent states:

- generated vs not generated
- queued vs processing vs success vs error
- draft vs published vs final
- visible vs hidden
- released question vs non-current released question
- report exists vs report released

Phase 15 should explicitly label these states instead of forcing users to infer them from missing content.

### 5. Partial Failure Handling Is Still Weak

Important case:

- contribution saved;
- feedback queue failed.

The learner should see:

- the contribution immediately;
- an explicit feedback error state;
- a retry path that does not imply the contribution was lost.

The same principle applies elsewhere:

- report requested but hidden by release;
- synthesis exists but is not yet visible to learners;
- semantic signals cannot refresh because embeddings do not exist yet.

### 6. Operational AI Readiness Is Still Hidden

The backend depends on:

- enabled model settings;
- prompt templates;
- OpenAI configuration;
- budget checks;
- optional demo toggles and failure toggles.

Phase 15 should add a compact instructor/admin AI readiness surface rather than leaving these as backend mysteries.

## Updated Phase 15 Scope

Phase 15 should implement:

1. AI job observability strips and panels.
2. Question-scoped instructor AI control state.
3. Feature-specific readiness and blocked-state messaging.
4. Release/visibility clarity for synthesis and reports.
5. Partial-failure UX fixes for submission feedback and related flows.
6. Instructor baseline diagnostics.
7. AI readiness diagnostics for prompts, models, keys, and budget failures.

It should not:

- redesign the learner tab model again;
- invent a new baseline product model;
- redo Phase 13 backend scoping;
- redo Phase 14 navigation work;
- expose baseline text to learners.

## Recommended Slice Breakdown

Implement Phase 15 in separate reviewable slices, as with 13b and 14.

### 15-1: AI Job Status Surfaces

Goal:

- show real queued / processing / success / error state for:
  - categorisation
  - synthesis
  - personal reports
  - baseline generation
  - argument map
  - embeddings

Implementation direction:

- subscribe to `jobs.listForSession` and existing semantic status queries;
- show latest job type, status, progress, error, and updated time;
- prefer backend state over local booleans.

Acceptance:

- AI buttons no longer feel inert when work is queued or failed;
- instructors can tell whether a workflow is running, done, or broken.

### 15-2: Question-Scoped Instructor AI Panels

Goal:

- make instructor AI controls clearly target the current question or an explicitly selected question.

Implementation direction:

- thread current/selected `questionId` through AI controls where appropriate;
- label each panel with the active question context;
- avoid session-wide ambiguity for question-scoped workflows.

Acceptance:

- instructors can tell which question they are generating AI outputs for.

### 15-3: Semantic Panel Decomposition

Goal:

- split semantic analysis into distinct operational surfaces:
  - embeddings
  - novelty
  - argument map
  - drift

Implementation direction:

- keep shared summary counts if useful;
- separate readiness/error/empty states per feature;
- explain that `Refresh Signals` needs embeddings but not argument links;
- explain that drift depends on categorisation and follow-up data.

Acceptance:

- semantic features stop feeling coupled or mysteriously blocked.

### 15-4: Release And Visibility Clarity

Goal:

- make synthesis and report visibility understandable on both instructor and learner sides.

Implementation direction:

- in instructor UI, label artifacts and reports with:
  - draft: instructor only
  - published: released, still subject to visibility
  - final: final version, still subject to visibility
- in learner UI, distinguish:
  - nothing generated
  - generated but not released
  - released but not visible yet for this question/session state

Acceptance:

- fewer cases where "nothing is showing" is ambiguous.

### 15-5: Baseline Diagnostics

Goal:

- expose baseline generation state to instructors without exposing baseline text to learners.

Implementation direction:

- show baseline status, generated time, provider/model, last error, and regenerate action;
- question-scoped, near other AI controls.

Acceptance:

- instructors can verify whether hidden baseline comparison context actually exists.

### 15-6: AI Readiness Diagnostics

Goal:

- provide a compact diagnostic surface for operational AI prerequisites.

Implementation direction:

- summarize:
  - OpenAI key readiness
  - enabled model by feature
  - prompt existence by feature
  - recent LLM failures
  - budget hard-stop state
  - demo/failure toggles if they can block work

Acceptance:

- AI failure modes become diagnosable from the product surface rather than only from code or Convex logs.

### 15-7: Partial-Failure UX Handling

Goal:

- stop treating saved-but-unanalyzed learner contributions as full submission failure.

Implementation direction:

- split submit success from feedback queue success;
- preserve the new contribution in `Contribute` even when feedback queueing fails;
- show retryable inline feedback-error state;
- review equivalent mixed-state handling for reports and synthesis where needed.

Acceptance:

- contribution save and feedback generation are legible as separate outcomes.

## Specific Implications From The Current Code

These should guide implementation details.

### Reports Use Mixed Mode

Approved direction:

- instructor can generate reports for the session
- learner can still call `personalReports.generateMine` in `src/pages/review-page.tsx`
- learner `Me` tab already uses `personalReportsVisible`

Phase 15 should preserve this mixed model:

- learners may request report generation for themselves;
- instructors may generate reports across the session;
- report visibility and learner-facing framing must still make the release state explicit.

That means the UI should distinguish:

- report not generated yet;
- report generating;
- report generated but not released for the current question;
- report generated and released.

The goal is not to remove learner self-service generation. The goal is to make the mixed policy legible.

### Instructor Page Still Needs Real Job-Driven State

Current instructor page still contains several local optimistic booleans and ad hoc messages.

Phase 15 should reduce those and replace them with:

- subscribed job status;
- per-question status cards;
- explicit errors from backend job rows where available.

### Baseline Exists But Is Operationally Invisible

`convex/questionBaselines.ts` is real and should now be surfaced in instructor diagnostics. Phase 15 should not describe baseline as missing.

### Semantic Readiness Is Already Exposed In Backend But Too Raw

`convex/semantic.ts` already gives:

- latest embedding job
- embedding count
- signal count
- argument link count
- readiness flags
- latest argument-map job

Phase 15 should build a clearer UI on top of that, not redesign the backend contract from scratch.

## Suggested Implementation Order

1. 15-1 AI job status surfaces
2. 15-2 question-scoped instructor AI panels
3. 15-3 semantic panel decomposition
4. 15-4 release and visibility clarity
5. 15-5 baseline diagnostics
6. 15-6 AI readiness diagnostics
7. 15-7 partial-failure UX handling

## Verification Checklist

- categorisation shows real queued / processing / success / error state
- baseline generation shows real queued / processing / success / error state
- synthesis generation shows status even before learner-visible artifacts appear
- report generation shows instructor-visible progress and clear learner-visible release state
- embedding generation shows queued / processing / success / error without relying only on count changes
- `Refresh Signals` explains when embeddings are missing
- argument-map generation shows status even when zero valid links are produced
- learner contribution remains visible when feedback queueing fails
- learner sees inline feedback error/retry state distinct from contribution save state
- instructor can tell which question an AI action targets
- learner empty states distinguish "not generated" from "not released" from "hidden by current visibility"
- instructors can inspect baseline readiness without exposing baseline text to learners
- AI readiness diagnostics explain missing prompts/models/keys/budget stops clearly

## Chosen Product Decisions

- Personal reports remain mixed-mode:
  - instructor bulk generation is allowed
  - learner self-generation is allowed
  - release state must still be visible and understandable

## Non-Goals

- redo the Phase 14 learner navigation model
- expose baseline text to learners
- remove learner self-service report generation
- redesign the visual identity
- rebuild Convex AI workflows that are already implemented and working
