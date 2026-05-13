# Phase 13a: Question-Centric Session Model Spec

## Purpose

This spec defines the next major TalkTok product model before implementation.

It replaces learner-facing acts with a stable workspace, and it expands a session from a single-prompt discussion into a room that can contain multiple instructor-controlled questions.

This is a product and architecture spec. It does not implement code.

## Core Decision

TalkTok should use one unified discussion model for class discussions, workshops, conference Q&A, and demos.

Do not build a separate "conference mode" with different behavior. A conference Q&A still usually has one current topic being addressed at a time. The useful model is:

- a session can contain multiple questions;
- one question is highlighted as the current focus;
- released non-current questions can still be browsed;
- each released question can optionally remain open for contribution;
- upvotes can help prioritise responses or questions;
- instructor controls visibility and capabilities per question.

Mode presets may still exist, but they should only change labels/defaults, not the underlying architecture.

Examples:

- Class discussion preset: instructor-authored prompts, private-first, longer responses.
- Q&A preset: shorter contributions, upvotes more prominent, audience-submitted prompts may be enabled later.
- Debate lab preset: Fight enabled by default.

## Product Model

### Session

A session is the live room.

It owns:

- title;
- join code;
- participant roster;
- global defaults;
- list of questions;
- the currently highlighted question;
- session-level close/open state;
- default visibility/capability policy.

The existing `sessions.openingPrompt` should become the first/default question during migration or compatibility handling.

### Question

A question is the primary discussion unit.

It owns:

- title or short label;
- prompt body;
- status:
  - draft;
  - released;
  - archived;
- contribution state:
  - open;
  - closed;
- visibility state:
  - peer responses hidden/visible;
  - category board hidden/visible;
  - category summaries hidden/visible;
  - synthesis hidden/visible;
  - personal reports not released/released;
- AI baseline state;
- category state;
- synthesis state;
- semantic/argument-map state.

One released question may be marked as the session's current focus.

Non-current released questions may remain visible and optionally open. Current focus is a nudge, not a hard gate.

### Submission

A submission belongs to a question.

Submission kinds should distinguish:

- top-level contribution;
- normal reply;
- follow-up response;
- additional point;
- fight turn only if still represented in the submissions table for compatibility.

Preferred boundary:

- normal replies remain discussion submissions with `parentSubmissionId`;
- Fight turns remain in `fightThreads` / `fightTurns` and reference the relevant discussion entity.

### Reply

Normal replies are part of the discussion.

They should support:

- clarification;
- agreement with added reasoning;
- "building on this";
- a question back to the poster;
- soft disagreement;
- elaboration on a category or point.

Explore may provide reply entry points. The full writing experience can still route through or share the Contribute composer.

### Fight

Fight is not a normal reply.

Fight is a structured challenge space with deliberate disagreement, sides, turns, and optional AI debrief.

It may start from:

- a specific response;
- a category;
- a synthesis claim;
- a participant's own contribution;
- an AI challenger flow.

Fight artifacts can reference discussion entities, but should not be counted as normal reply threads.

## Learner Workspace

Learner navigation should use four stable tabs:

- `Contribute`
- `Explore`
- `Fight`
- `Me`

Tabs should always be visible. Do not hide or block tabs. If a feature is unavailable, show a clear empty or unavailable state explaining why.

Remove learner-facing act navigation as the main mental model.

### Contribute

The active writing workspace.

It should include:

- current highlighted question;
- selector for released questions if more than one is visible;
- top-level contribution composer;
- active instructor follow-up prompts;
- category-targeted prompts;
- normal reply composer when launched from Explore;
- own contribution list;
- per-contribution actions:
  - add follow-up;
  - view analysis;
  - request recategorisation;
  - view in Explore;
  - start Fight when enabled.

Contribute must remain useful after the first post. Multiple top-level contributions are first-class.

### Explore

The class-facing discovery workspace.

It should include:

- released responses;
- normal replies;
- category board;
- filters;
- category summaries;
- published/final synthesis;
- upvotes;
- reply entry points;
- Fight entry points when enabled.

Explore can allow starting a normal reply. It can also allow starting a Fight, but the UI language must keep those choices distinct.

Examples:

- `Reply`
- `Ask a follow-up`
- `Challenge in Fight`

### Fight

The structured disagreement workspace.

It should include:

- active fight;
- incoming challenges;
- completed fights;
- AI challenge option if enabled;
- start-fight options from eligible targets.

If Fight is disabled, keep the tab visible and explain that the instructor has not enabled structured challenges for this session/question.

### Me

The private personal workspace.

It should include:

- all of the learner's contributions;
- private AI feedback;
- category placement;
- recategorisation request status;
- comparison notes derived from the hidden baseline;
- personal report when generated/released;
- Fight history;
- participant identity controls.

Use `Me`, not `You`, as the tab label.

## Instructor Workspace

The instructor dashboard should shift from phase control to question control.

Primary instructor actions:

- create/edit questions;
- release questions;
- set current highlighted question;
- open/close contributions per question;
- run or refresh hybrid categorisation;
- confirm or edit categories;
- release peer responses;
- release category board;
- generate category summaries;
- generate class synthesis for a question;
- publish/finalize synthesis;
- enable/disable Fight;
- generate personal reports;
- monitor AI job state and errors.

Controls should be grouped logically so the instructor is not faced with a raw matrix of toggles.

Recommended grouped controls:

- Question setup:
  - title;
  - prompt;
  - draft/released/archive.
- Live focus:
  - set as current;
  - contribution open/closed.
- Release:
  - peer responses;
  - category board;
  - summaries;
  - synthesis;
  - personal reports.
- AI:
  - generate baseline;
  - categorise/refresh suggestions;
  - generate summaries;
  - generate reports;
  - semantic analysis/argument map.
- Interaction:
  - upvotes enabled;
  - normal replies enabled;
  - Fight enabled.

## Capability Model

Capabilities should be derived per question.

Representative capabilities:

- `canViewQuestion`
- `isCurrentQuestion`
- `canSubmitTopLevel`
- `canReply`
- `canSubmitFollowUps`
- `canUpvote`
- `canSeePeerResponses`
- `canSeeCategoryBoard`
- `canSeeCategorySummaries`
- `canSeeSynthesis`
- `canUseFight`
- `canSeePrivateFeedback`
- `canSeeBaselineComparison`
- `canSeePersonalReport`
- `canRequestRecategorisation`

The UI rule:

- tabs always render;
- each tab renders live content, partial content, or an explanation;
- capability state should explain what is unavailable and why.

## Hybrid Categorisation

Use hybrid categorisation.

This means:

- AI can suggest categories and assignments;
- instructor controls confirmation and release;
- categorisation can run manually;
- optional auto-suggest can run in batches;
- confirmed assignments are preserved;
- participant recategorisation requests are preserved;
- AI refresh must not overwrite settled instructor decisions.

Recommended batching logic:

- run manually when instructor clicks;
- optionally auto-queue after enough uncategorised new submissions exist;
- optionally debounce by time window;
- do not run per individual post by default.

Reasoning:

- manual-only is predictable but less live;
- per-post AI is costly and can constantly reshuffle the board;
- hybrid gives live assistance while preserving trust and instructor control.

## AI Baseline

Each confirmed question should support a hidden instructor-side baseline.

Baseline behavior:

- generated once after the question is confirmed or released;
- not visible to participants;
- visible to instructor for diagnostics/context;
- used as context for private feedback and personal reports;
- not treated as a correct answer;
- regenerated only by instructor action or when the question prompt materially changes.

This fills the original product intent: learners receive analysis of their response relative to the cohort and relative to an LLM-generated baseline.

Backend implication:

- add first-class baseline state rather than hiding this inside feedback text.

Possible table:

- `questionBaselines`
  - `questionId`
  - `status`
  - `promptTemplateKey`
  - `model`
  - `baselineText`
  - `summary`
  - `generatedAt`
  - `error`

## Upvotes And Reactions

Simplify the core reaction model around upvotes.

Recommended:

- primary universal reaction: `upvote`;
- keep richer reactions out of the core UI for now;
- future secondary actions can be added only if they support a clear workflow.

Why:

- upvotes work for class and Q&A;
- they help prioritise attention;
- they reduce cognitive load;
- they avoid reaction clutter in Explore.

Existing reaction kinds can remain in data during migration, but the redesigned core UI should foreground upvote.

## Data Model Direction

The current schema is mostly session-scoped. The new model needs question scope.

Likely additions:

- `sessionQuestions`
- `questionBaselines`
- possibly `questionVisibility` if visibility becomes too large for the question row.

Likely fields on `sessionQuestions`:

- `sessionId`
- `slug`
- `title`
- `prompt`
- `status`
- `isCurrent`
- `contributionsOpen`
- `peerResponsesVisible`
- `categoryBoardVisible`
- `categorySummariesVisible`
- `synthesisVisible`
- `personalReportsVisible`
- `fightEnabled`
- `upvotesEnabled`
- `createdAt`
- `updatedAt`
- `releasedAt`
- `archivedAt`

Existing tables that should gain `questionId` or equivalent scope:

- `submissions`
- `categories`
- `submissionCategories`
- `recategorizationRequests`
- `followUpPrompts`
- `followUpTargets`
- `synthesisArtifacts`
- `synthesisQuotes`
- `personalReports`
- `semanticEmbeddingJobs`
- `semanticEmbeddings`
- `semanticSignals`
- `argumentLinks`
- `aiJobs`
- `llmCalls`
- `auditEvents`

Some tables may remain session-scoped but should include question context where useful:

- `participants`
- `fightThreads`
- `fightTurns`
- `fightDebriefs`
- `reactions`
- `positionShiftEvents`

Fight threads should reference the question and the entity they challenge.

## Migration / Compatibility Strategy

Avoid a hard rewrite.

Recommended staged migration:

1. Add `sessionQuestions`.
2. Create a default question for each existing session from `sessions.openingPrompt`.
3. Add optional `questionId` fields to question-scoped tables.
4. Backfill existing rows to the default question.
5. Update queries to prefer `questionId`, with fallback to session-level rows during transition.
6. Once stable, make `questionId` required for new rows.
7. Later remove or de-emphasize `sessions.openingPrompt`.

This should follow Convex widen-migrate-narrow style so existing demo data and Railway preview do not break.

## Frontend Migration Direction

### Participant

Replace act-driven participant rendering with question-aware tabs.

Participant page should:

- subscribe to a question-aware workspace query;
- know current highlighted question;
- show released question selector where relevant;
- keep all four tabs visible;
- render unavailable states rather than hiding tabs;
- stop relying on `firstInitialResponse` as the primary learner state.

### Instructor

Split the current instructor session page into panels before or during this work.

Likely panels:

- `QuestionManagerPanel`
- `QuestionControlsPanel`
- `CategoryPanel`
- `SubmissionStreamPanel`
- `FollowUpPanel`
- `SynthesisPanel`
- `PersonalReportsPanel`
- `SemanticPanel`
- `AiJobStatusPanel`

Question manager should become the top-level organizer.

### Demo

Demo seed must include:

- one session;
- multiple questions;
- one current question;
- released/non-current question examples;
- baseline state;
- categorised responses;
- normal replies;
- upvotes;
- Fight examples;
- synthesis examples.

## AI Job Visibility

Every AI control should expose job status.

At minimum, show:

- latest job status;
- progress if available;
- latest error;
- last updated time;
- whether output is hidden because of visibility settings.

This applies to:

- baseline generation;
- feedback;
- categorisation;
- synthesis;
- personal reports;
- embeddings;
- novelty signals;
- argument map;
- Fight debriefs.

## Non-Goals

Do not add authentication as part of this phase.

Do not build a separate conference Q&A product mode.

Do not remove all existing session phase fields immediately.

Do not make Fight a normal reply type.

Do not expose the baseline to learners by default.

Do not add rich reaction complexity beyond upvote in the core redesigned UI.

## Open Decisions

These can be resolved during implementation planning:

- Whether audience/participants can create new top-level questions, or only instructors can create questions.
- Whether non-current questions remain open by default.
- Whether normal replies are always enabled or instructor-controlled per question.
- Whether personal reports are scoped per question, session-wide, or both.
- Whether upvotes apply to submissions only, or also questions, replies, categories, and synthesis claims.

Recommended default for the first implementation:

- instructor-created questions only;
- non-current released questions are browsable but closed unless instructor keeps them open;
- normal replies enabled per question;
- personal reports initially session-wide but question-aware;
- upvotes apply to submissions and normal replies first.

## Success Criteria

- A session can contain more than one question.
- Instructor can mark one released question as current.
- Participant lands on the current question but can browse other released questions.
- Learner tabs are stable: `Contribute`, `Explore`, `Fight`, `Me`.
- No learner-facing act progress is needed to understand the interface.
- Participants can make multiple top-level contributions.
- Participants can reply normally from Explore without starting Fight.
- Fight remains a separate structured challenge workflow.
- Categorisation preserves confirmed and contested decisions.
- AI baseline exists as first-class hidden instructor-side state.
- AI job status is visible enough that buttons do not feel inert.
- Demo seed clearly demonstrates the question-centric model.

## Relationship To Existing Plans

This spec supersedes the learner-facing act model described in earlier UI plans.

It builds on:

- `engineering/ui-phase-09-learner-workspace-rethink-plan.md`
- `engineering/ui-phase-09b-learner-tab-contracts.md`
- `engineering/phase-13b-backend-question-foundation-correctness-plan.md`
- `engineering/phase-14-frontend-question-centric-navigation-plan.md`
- `engineering/phase-15-ai-workflow-visibility-and-wiring-plan.md`

The most important change from the earlier learner notes is that the workspace is now explicitly question-centric, and the final tab label is `Me`.
