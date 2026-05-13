# UI Phase 12G: Me Current-Session Participation Analysis Plan

## Purpose

Rebuild the participant `Me` tab as the learner's current-session participation analysis surface.

The `Me` tab should not be a duplicate contribution archive, fight replay, settings page, or second copy of `Contribute`. Its primary job is to help a learner understand what their participation in the current session showed, what they contributed to the room, and what they should take away.

This plan is scoped only to the current session. It does not include previous-session discovery, cross-session learner history, or a global learning journal.

## Product Position

Use `contribution`, not `response`, as the core language.

Some sessions are prompt-response sessions. Some are Q&A sessions where participants ask questions rather than answering an instructor prompt. The `Me` tab must value both.

Supported participation forms:

- Answers to instructor prompts.
- Learner questions.
- Clarifications.
- Challenges.
- Examples.
- Reflections.
- Replies to peers.
- Fight/debate turns.
- Position shifts.

The learner-facing promise:

> Here is what your participation in this session shows, what you contributed to the discussion, and what you can take away.

The anti-goal:

> Here is another long list of your posts.

## Current State

Current `Me` is mostly implemented in:

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`
- `convex/participantWorkspace.ts`
- `convex/personalReports.ts`
- `convex/positionShifts.ts`
- `convex/fightMe.ts`
- `convex/reactions.ts`

Current behavior mixes these jobs:

- Personal report preview/status.
- Contribution archive grouped by question.
- Expanded contribution detail.
- Per-post feedback blocks.
- Reply/follow-up bodies.
- Recategorization workflow state.
- Fight history.
- Position shifts.
- Nickname/settings.

This is too much operational replay. The archive work from `ui-phase-12f-me-archive-threaded-model-plan.md` remains useful as source material, but the visible `Me` product direction should now be report-first.

## Currently Available Signals

The backend already has enough raw material for a useful current-session learner report.

### Personal Report

Source:

- `convex/personalReports.ts`
- `personalReports` table

Available fields:

- `participationBand`
- `reasoningBand`
- `originalityBand`
- `responsivenessBand`
- `summary`
- `contributionTrace`
- `argumentEvolution`
- `growthOpportunity`
- `citedArtifactIds`
- `status`
- `generatedAt`

Use:

- Main report status.
- Headline summary.
- Strength/growth framing.
- Contribution trace.
- Argument development.

Current gap:

- The report is stored per session and participant, but generation context currently resolves around a selected/current question when one exists. For multi-question sessions, `Me` needs an explicitly session-wide learner analysis contract.

### Submission And Contribution Data

Source:

- `submissions` table
- `participantWorkspace.overview`
- `myArchiveByQuestion`

Available fields:

- `body`
- `kind`
- `questionId`
- `parentSubmissionId`
- `followUpPromptId`
- `wordCount`
- `compositionMs`
- `pasteEventCount`
- `keystrokeCount`
- `inputPattern`
- `createdAt`

Use:

- Current-session contribution count.
- Questions engaged.
- Replies and follow-ups.
- Compact evidence excerpts.
- Timing and progression across session.
- Soft context for participation pattern.

Do not use:

- Telemetry as misconduct proof.
- Full post listing as the primary UI.

### Per-Contribution Feedback

Source:

- `submissionFeedback` table
- `participantWorkspace.feedbackBySubmission`

Available fields:

- `reasoningBand`
- `originalityBand`
- `specificityBand`
- `summary`
- `strengths`
- `improvement`
- `nextQuestion`
- `status`

Use:

- Aggregate reasoning/originality/specificity patterns.
- Extract repeated strengths and improvement themes.
- Support the report with source signals.

Do not use:

- Full feedback blocks inline for every post in `Me`.

### Categories And Themes

Source:

- `submissionCategories`
- `categories`
- `participantWorkspace.assignmentsBySubmission`
- `participantWorkspace.categorySummary`

Available fields:

- Category name.
- Category description.
- Category color.
- Assignment status.
- Confidence/rationale.

Use:

- Categories touched.
- Dominant themes.
- Per-question contribution topics.
- Room connection summary.

### Reactions

Source:

- `reactions` table
- `convex/reactions.ts`
- `participantWorkspace` thread stats

Available kinds:

- `agree`
- `sharp`
- `question`
- `spark`
- `changed_mind`

Use:

- Peer resonance.
- Questions or ideas that triggered discussion.
- Compact footprint metrics.

Gap:

- `Me` needs reaction counts received on the learner's own contributions across the current session. If not already surfaced cleanly in the analysis contract, add it there rather than calculating in the UI.

### Position Shifts

Source:

- `positionShiftEvents`
- `convex/positionShifts.ts`
- `api.positionShifts.listMine`

Available fields:

- `reason`
- `influencedBy`
- `submissionId`
- `categoryId`
- `createdAt`

Use:

- Thinking movement section.
- Learner self-reflection.
- Evidence of changed understanding.

### Fight/Debate Debriefs

Source:

- `fightThreads`
- `fightTurns`
- `fightDebriefs`
- `convex/fightMe.ts`

Available debrief fields:

- `summary`
- `attackerStrength`
- `defenderStrength`
- `strongerRebuttal`
- `nextPractice`

Use:

- Debate learning.
- Strengths in argumentation.
- Next practice.

Do not use:

- Full fight replay in `Me`.

### Published Synthesis Artifacts

Source:

- `synthesisArtifacts`
- `participantWorkspace.synthesis`
- `participantWorkspace.synthesisView`
- instructor reports workspace

Available fields:

- `title`
- `summary`
- `keyPoints`
- `uniqueInsights`
- `opposingViews`
- `sourceCounts`
- visibility/status

Use:

- Connect learner contributions to published room takeaways.
- Reference class-level ideas only when published/final and learner-visible.

Do not use:

- Draft synthesis.
- Hidden instructor-only artifacts.
- Hidden baselines.

### Semantic Signals And Clusters

Source:

- `semanticSignals`
- `semanticClusters`
- `semanticClusterMembers`
- `convex/semantic.ts`

Available signals:

- Novelty score/band.
- Similarity cluster membership.
- Category drift.

Use:

- Distinctive ideas.
- Common vs unusual contributions.
- Clusters the learner contributed to.
- Movement across categories over time.

Gap:

- Learner-specific semantic summary is not exposed directly. Add a learner-safe query/contract rather than exposing raw instructor review objects.

### Argument Links

Source:

- `argumentLinks`
- `convex/argumentMap.ts`

Available link types:

- `supports`
- `contradicts`
- `extends`
- `questions`
- `bridges`

Use:

- Describe how learner contributions connected to the room.
- Identify whether they extended, questioned, bridged, or challenged ideas.

Gap:

- Current graph is instructor-facing. `Me` needs a filtered learner-owned derivation, not the full graph.

## Instructor Consolidation To Reuse

The instructor dashboard already consolidates:

- Question summaries.
- Synthesis artifacts.
- Category summaries.
- Semantic readiness.
- Novelty radar.
- Similarity clusters.
- Category drift.
- Argument map.
- Personal report jobs.
- Fight summaries.

`Me` should reuse learner-safe outputs from these systems instead of inventing parallel logic.

Safe to reuse:

- Published/final synthesis.
- Public categories.
- Learner's own contributions.
- Learner's own feedback.
- Learner's own position shifts.
- Learner's own fight debriefs.
- Learner-owned semantic/argument summaries.

Not safe to expose:

- Instructor hidden baseline text.
- Draft synthesis.
- Hidden reports for other participants.
- Full novelty radar with peer identities.
- Full argument graph if it exposes hidden or non-learner-owned interpretation.
- Any private peer analysis.

## Required Backend Direction

Add a consolidated learner-analysis contract.

Recommended public query:

```ts
participantAnalysis.getMyCurrentSessionAnalysis({
  sessionSlug,
  clientKey,
})
```

Recommended optional mutation:

```ts
participantAnalysis.generateMyCurrentSessionAnalysis({
  sessionSlug,
  clientKey,
  forceRegenerate?: boolean,
})
```

The query should be usable even before LLM generation completes. It should return deterministic metrics and report status from existing data. If a generated report is ready, it enriches the same contract.

Do not make the UI assemble this from many unrelated queries. The UI should consume one coherent learner-facing object.

## Proposed Analysis Contract

```ts
type CurrentSessionAnalysis = {
  status:
    | "hidden"
    | "not_generated"
    | "queued"
    | "processing"
    | "ready"
    | "error";

  generatedAt?: number;
  error?: string;

  headlineSummary?: string;
  topTakeaways: string[];
  strengths: string[];
  growthOpportunity?: string;

  participationFootprint: {
    questionsEngaged: number;
    contributions: number;
    questionsAsked: number;
    replies: number;
    followUps: number;
    fights: number;
    positionShifts: number;
    reactionsReceived: number;
    categoriesTouched: number;
  };

  contributionPatterns: {
    primaryModes: ContributionIntent[];
    reasoningPattern?: string;
    originalityPattern?: string;
    responsivenessPattern?: string;
    specificityPattern?: string;
    questionQualityPattern?: string;
  };

  questionInsights: Array<{
    questionId: string | null;
    title: string;
    prompt?: string;
    contributionCount: number;
    takeaway?: string;
    dominantContributionType: ContributionIntent | "mixed";
    categories: string[];
  }>;

  thinkingMovement: {
    summary?: string;
    positionShifts: Array<{
      reason: string;
      influencedBy?: string;
      createdAt: number;
    }>;
  };

  roomConnection: {
    summary?: string;
    linkedSynthesisIdeas: string[];
    distinctiveIdeas: string[];
    clusters: string[];
    argumentMoves: Array<"supports" | "contradicts" | "extends" | "questions" | "bridges">;
  };

  evidence: Array<{
    questionId: string | null;
    questionTitle: string;
    excerpts: Array<{
      id: string;
      bodyPreview: string;
      contributionIntent: ContributionIntent;
      createdAt: number;
    }>;
  }>;
};

type ContributionIntent =
  | "answer"
  | "question"
  | "clarification"
  | "challenge"
  | "example"
  | "reflection"
  | "reply";
```

## Contribution Intent

`Me` needs to understand whether a learner was answering, asking, challenging, clarifying, giving examples, reflecting, or replying.

Recommended path:

1. Start with heuristic inference in the consolidated analysis query:
   - `kind === "reply"` -> `reply`
   - question mark or interrogative opening -> `question` or `clarification`
   - challenge markers -> `challenge`
   - example markers -> `example`
   - reflective markers -> `reflection`
   - otherwise -> `answer`
2. Include `contributionIntent` in LLM report context.
3. Later, if accuracy matters, add a persisted `contributionIntent` field or a lightweight classification job.

Do not block the first implementation on a schema migration unless needed.

## LLM Consolidation

The LLM should consolidate structured signals into learner-facing takeaways. It should not be the only source of metrics.

Inputs:

- Contributions grouped by question.
- Inferred contribution intent.
- Feedback summaries.
- Category assignments.
- Reaction counts received.
- Position shifts.
- Fight debriefs.
- Published/final synthesis artifacts.
- Learner-owned semantic novelty/cluster signals.
- Learner-owned argument links.

Output:

- `headlineSummary`
- `topTakeaways`
- `strengths`
- `growthOpportunity`
- `questionInsights`
- `contributionPatterns`
- `thinkingMovement.summary`
- `roomConnection.summary`

Prompt language must be mode-aware:

- Use `contribution`, not `response`.
- Treat strong questions as valuable contributions.
- In Q&A mode, analyze question quality, curiosity pattern, depth of inquiry, follow-through, and discussion value.
- Use telemetry only as soft context.
- Avoid accusatory language.
- Do not reveal hidden instructor-only material.

## Frontend Direction

Replace `Me` as an archive with report-first sections.

### Section 1: Your Takeaway

Purpose:

- Highest-value learner summary.
- One short paragraph.
- Two to four takeaways.
- One next step.

States:

- Hidden by instructor.
- Not generated.
- Generating.
- Ready.
- Error.

### Section 2: What You Contributed

Purpose:

- Compact participation footprint.
- Supports the analysis without becoming the main page.

Metrics:

- Contributions.
- Questions asked.
- Questions engaged.
- Replies/follow-ups.
- Fights.
- Position shifts.
- Reactions received.
- Categories touched.

### Section 3: What Your Contributions Showed

Purpose:

- Interpretive analysis from report and feedback.

Content:

- Reasoning pattern.
- Originality pattern.
- Specificity pattern.
- Responsiveness pattern.
- Question quality pattern when applicable.

### Section 4: How Your Thinking Moved

Purpose:

- Show development across the session.

Content:

- Argument evolution.
- Position shifts.
- Follow-up development.
- Fight/debate learning.

### Section 5: How You Connected To The Room

Purpose:

- Show relationship between learner contributions and the wider discussion.

Content:

- Categories touched.
- Published synthesis ideas connected to learner contributions.
- Distinctive ideas.
- Similarity clusters.
- Argument moves.

### Section 6: Evidence

Purpose:

- Optional source material.
- Collapsed by default.

Rules:

- Show excerpts, not full post archive.
- Group by question.
- Cap visible excerpts per question.
- Provide expand controls only if useful.
- It is acceptable to omit this section if the generated report and metrics are strong enough.

## What To Remove Or Demote From Current Me

Remove from the main visible flow:

- Full expanded contribution archive.
- Full reply bodies.
- Full per-post feedback cards.
- Recategorization workflow details.
- Fight thread replay.
- Settings/nickname as a major section.

Allow as low-priority/collapsed only:

- Evidence excerpts.
- Compact fight history link.
- Compact settings/profile link.

Keep elsewhere:

- Active post management belongs in `Contribute`.
- Room interaction belongs in `Explore`.
- Debate thread content belongs in `Fight`.
- Operational settings belong in settings/profile area.

## Implementation Stages

### Stage 1: Backend Analysis Contract

Files likely involved:

- `convex/participantAnalysis.ts` new file.
- `convex/participantWorkspace.ts` only if reusing existing helper logic is necessary.
- `convex/personalReports.ts` if report context/generation needs to become session-wide.
- `convex/schema.ts` only if new persistence fields are required.

Tasks:

- Add `getMyCurrentSessionAnalysis`.
- Resolve session and participant from `sessionSlug` and `clientKey`.
- Load current-session learner-owned data.
- Derive deterministic footprint metrics.
- Derive collapsed evidence excerpts.
- Derive contribution intent heuristically.
- Include latest personal report status if present.
- Return a stable object even when no report exists.

Verification:

- Typecheck.
- Manual query through the participant page.
- No hidden instructor artifacts are returned.

### Stage 2: Report Context Correction

Files likely involved:

- `convex/personalReports.ts`
- `convex/promptTemplates.ts`

Tasks:

- Ensure personal report generation can summarize the full current session, not only the selected/current question.
- Feed grouped contributions by question.
- Include contribution intent.
- Include reaction counts received.
- Include fight debriefs.
- Include position shifts.
- Include published/final synthesis artifacts only.
- Update prompt language from response-focused to contribution-focused.
- Add Q&A-aware instructions.

Verification:

- Generated JSON still matches stored fields.
- Existing instructor report generation still works.
- Prompt does not ask for unavailable fields.

### Stage 3: Optional Enriched Analysis Output

Files likely involved:

- `convex/participantAnalysis.ts`
- `convex/personalReports.ts`
- `convex/schema.ts` if persisted fields are added.

Tasks:

- Decide whether to reuse `personalReports` fields or add a richer `participantAnalyses` table.
- If reusing `personalReports`, map fields into the new `CurrentSessionAnalysis` contract.
- If adding persistence, use a separate table so legacy personal reports remain stable.

Recommended first pass:

- Do not add a new table unless the existing report fields are too limiting.
- Use the new query as an adapter over existing report data plus deterministic computed stats.

Verification:

- No migration required for first pass.
- UI can render useful states without new persisted report fields.

### Stage 4: Frontend Me Tab Rewrite

Files likely involved:

- `src/components/myzone/my-zone-tab.tsx`
- `src/pages/participant-workspace-page.tsx`
- New focused components under `src/components/myzone/` if needed.

Tasks:

- Replace archive-first layout with report-first layout.
- Render `Your Takeaway`.
- Render `What You Contributed`.
- Render `What Your Contributions Showed`.
- Render `How Your Thinking Moved`.
- Render `How You Connected To The Room`.
- Render collapsed `Evidence` only after the analysis sections.
- Remove prominent inline archive expansion behavior.
- Keep empty/loading/hidden/error states explicit.

Verification:

- Me is useful with zero report but existing contribution data.
- Me is useful with generated report.
- Me does not duplicate Contribute/Fight.
- Evidence is collapsed by default.

### Stage 5: Participant Workspace Wiring Cleanup

Files likely involved:

- `src/pages/participant-workspace-page.tsx`
- `src/hooks/use-participant-workspace.ts`
- `convex/participantWorkspace.ts`

Tasks:

- Replace multiple Me-specific props with one analysis object where possible.
- Keep `positionShifts`, `personalReport`, and archive props only if still needed by other surfaces.
- Avoid making `MyZoneTab` responsible for backend aggregation.

Verification:

- Props to `MyZoneTab` are smaller and conceptually aligned.
- No active workflow state is lost from Contribute/Explore/Fight.

### Stage 6: UX Polish And Copy Pass

Tasks:

- Replace `response` wording with `contribution` where Me is concerned.
- Add Q&A-aware labels: `Questions you raised`, `Ideas you added`, `Discussion moves`.
- Keep metrics compact.
- Avoid over-carded visual structure.
- Use collapsed evidence affordance with clear labels.
- Keep mobile hierarchy report-first.

Verification:

- First screenful shows learner takeaway, not archive.
- Post list is not visually dominant.
- Copy works for both answer sessions and Q&A sessions.

## Suggested Commit Sequence

1. `feat(participant-analysis): add current-session learner analysis query`
2. `fix(personal-reports): make learner report contribution-aware and session-wide`
3. `refactor(me): consume consolidated learner analysis contract`
4. `fix(me): replace archive-first layout with report-first sections`
5. `chore(me): collapse evidence and remove duplicated workflow detail`
6. `test(participant-analysis): cover current-session analysis derivations`

If the existing personal report fields are enough, combine commits 1 and 2 carefully. If schema persistence is needed, make it its own commit before UI work.

## Testing Checklist

Backend:

- Participant with no submissions.
- Participant with answer-style submissions.
- Participant with Q&A-style questions.
- Participant with replies/follow-ups.
- Participant with fights and debriefs.
- Participant with position shifts.
- Participant with reactions received.
- Multi-question session.
- Reports hidden.
- Report queued/processing.
- Report ready.
- Report error.

Frontend:

- Mobile first screenful shows takeaway/status.
- Desktop layout does not over-expand evidence.
- Evidence collapsed by default.
- No full fight replay in Me.
- No recategorization workflow block in Me.
- No full per-post feedback blocks in Me.
- Works when LLM report is absent.
- Works when LLM report is present.

Privacy:

- Hidden instructor baseline is never returned.
- Draft synthesis is never returned.
- Other participants' private reports are never returned.
- Peer identities follow session anonymity rules.
- Telemetry is not presented accusatorily.

## Open Implementation Decision

The main decision before implementation:

- First pass should probably adapt existing `personalReports` plus computed metrics through `participantAnalysis.getMyCurrentSessionAnalysis`.
- A new persisted `participantAnalyses` table should only be added if the existing `personalReports` fields cannot support the desired report structure cleanly.

Recommended path:

- Start with the adapter/query approach.
- Update the report prompt to be contribution-aware and session-wide.
- Only introduce new persistence after the UI proves the contract needs richer saved fields.
