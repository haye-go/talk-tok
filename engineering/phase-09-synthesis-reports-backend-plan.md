# Phase 09: Synthesis and Reports Backend

## Purpose

Add backend-only support for shared class synthesis, category summaries, representative quotes, opposing views, contribution traces, and participant personal reports.

This phase exposes additive Convex contracts for the frontend designer to connect later. It must not modify frontend UI files and must not rename existing backend fields used by UI Phase 03.

## Scope

- Generate instructor-controlled synthesis artifacts.
- Publish shared synthesis artifacts to participants.
- Generate category-level summaries with key points and representative quotes.
- Generate class-level final synthesis with unique viewpoints and opposing views.
- Generate participant personal reports for My Zone and review screens.
- Track synthesis/report AI jobs, prompt versions, errors, retries, and LLM costs through existing telemetry.
- Extend instructor and participant overview queries with additive synthesis/report state.

## Product Decisions

- Publication is explicit. Generated synthesis starts as instructor-only `draft`.
- Participants only see `published` or `final` artifacts.
- Raw participant text remains collapsed by default; representative quotes can be shown according to session anonymity settings.
- Class synthesis must not expose private AI feedback, private Fight Me debriefs, or unpublished recategorisation notes.
- Personal reports are private to the participant and visible to the instructor for the demo.
- Reports should frame telemetry as soft behavioral signals, never proof of cheating or misconduct.
- Heavy generation runs in the background and never blocks submission, follow-up, or Fight Me flows.

## Schema Changes

Additive only:

- `synthesisArtifacts`
- `synthesisQuotes`
- `personalReports`
- `positionShiftEvents` if not already covered by existing response metadata
- add `personal_report` to AI job types if separate from `synthesis`

No data migration should be required. Existing session data can simply have no synthesis artifacts until generated.

## Artifact Types

### Shared Synthesis Artifacts

Use `synthesisArtifacts.kind` values:

- `category_summary`
- `class_synthesis`
- `opposing_views`
- `contribution_trace`
- `final_summary`

Use `synthesisArtifacts.status` values:

- `queued`
- `processing`
- `draft`
- `published`
- `final`
- `error`
- `archived`

Recommended core fields:

- `sessionId`
- optional `categoryId`
- `kind`
- `status`
- `title`
- `summary`
- `keyPoints`
- `uniqueInsights`
- `opposingViews`
- `sourceCounts`
- `promptTemplateId`
- `modelSettingId`
- `jobId`
- `error`
- `generatedAt`
- `publishedAt`
- `finalizedAt`

### Representative Quotes

Use a separate `synthesisQuotes` table instead of embedding an unbounded quote array.

Recommended fields:

- `artifactId`
- `sessionId`
- `submissionId`
- `participantId`
- `quote`
- `quoteRole`: `representative`, `unique`, `opposing`, `follow_up`, `fight_me`
- `displayName`
- `anonymizedLabel`
- `isVisibleToParticipants`

### Personal Reports

Use `personalReports.status` values:

- `queued`
- `processing`
- `success`
- `error`

Recommended report fields:

- `sessionId`
- `participantId`
- `status`
- `participationBand`
- `reasoningBand`
- `originalityBand`
- `responsivenessBand`
- `summary`
- `contributionTrace`
- `argumentEvolution`
- `growthOpportunity`
- `citedArtifactIds`
- `jobId`
- `error`
- `generatedAt`

## Backend Contracts

### `api.synthesis.generateCategorySummary`

Creates or regenerates a category summary artifact.

Inputs:

- `sessionSlug`
- `categoryId`
- optional `forceRegenerate`

Rules:

- Artifact starts as `queued` or `processing`, then becomes `draft`.
- The generated artifact is instructor-only until explicitly published.
- Reads category assignments, top submissions, follow-up responses, and relevant Fight Me summaries.
- Does not include private feedback text.

### `api.synthesis.generateClassSynthesis`

Creates or regenerates a class-level synthesis artifact.

Inputs:

- `sessionSlug`
- optional `includeDraftCategorySummaries`
- optional `forceRegenerate`

Rules:

- Prefer using existing category summaries as context when available.
- Include key categories, cross-cutting points, unique viewpoints, and opposing views.
- Use bounded reads and background generation.

### `api.synthesis.publishArtifact`

Publishes a draft synthesis artifact.

Inputs:

- `sessionSlug`
- `artifactId`

Rules:

- Only `draft` artifacts can be published.
- Writes an audit event.
- Participant overview can include the artifact after publication.

### `api.synthesis.finalizeArtifact`

Marks a published artifact as final.

Rules:

- Final artifacts are stable review artifacts.
- Writes an audit event.

### `api.synthesis.archiveArtifact`

Archives a draft, published, or final artifact.

Rules:

- Archived artifacts are hidden from participant-facing queries.
- Writes an audit event.

### `api.synthesis.listForSession`

Instructor-facing query for all synthesis artifacts in a session.

Returns:

- artifact metadata
- status
- category linkage
- quote count
- source counts
- latest job/error state

### `api.synthesis.listPublishedForParticipant`

Participant-facing query for published/final artifacts.

Rules:

- Applies session visibility and anonymity settings.
- Does not return instructor-only draft artifacts.
- Does not return raw private feedback or admin metadata.

### `api.personalReports.generateMine`

Queues a personal report for the calling participant device.

Inputs:

- `sessionSlug`
- `clientKey`
- optional `forceRegenerate`

Rules:

- Participant must belong to the session.
- A recent successful report can be reused unless `forceRegenerate` is true.
- Report generation uses the participant's responses, follow-up replies, category placements, recategorisation outcomes, Fight Me activity, and contribution trace.

### `api.personalReports.generateForSession`

Instructor-triggered batch queue for participant reports.

Inputs:

- `sessionSlug`
- optional `participantIds`
- optional `forceRegenerate`

Rules:

- Uses bounded background work.
- Should be safe for 200 participants by batching work.
- Does not block instructor command center reads.

### `api.personalReports.getMine`

Participant-facing query for their own report status and output.

### `api.personalReports.listForSession`

Instructor-facing query for report status by participant.

## Prompt Templates

Add editable defaults:

- `synthesis.category.v1`
- `synthesis.class.v1`
- `synthesis.opposing_views.v1`
- `report.personal.v1`

Rules:

- No synthesis/report prompt should be hardcoded invisibly.
- Each generation stores prompt template ID/version metadata.
- Structured JSON output should be validated before saving generated artifacts.

## View-Model Additions

### Participant Workspace

Add only optional/new fields to `api.participantWorkspace.overview`:

- `synthesis.publishedArtifacts`
- `synthesis.finalArtifacts`
- `personalReport`

Do not rename existing fields used by UI Phase 03.

### Instructor Command Center

Add only optional/new fields to `api.instructorCommandCenter.overview`:

- `synthesis.artifactCounts`
- `synthesis.recentArtifacts`
- `synthesis.latestClassSynthesis`
- `reports.summary`
- `reports.recent`

Do not rename existing fields used by UI Phase 03.

## Protection and Privacy Rules

- Respect session visibility mode.
- Respect anonymity mode for representative quotes.
- Keep unpublished drafts instructor-only.
- Keep personal reports private to the participant plus instructor/admin for the demo.
- Do not include raw private feedback in shared synthesis.
- Do not include content flagged by moderation unless explicitly instructor-approved.
- Do not present telemetry as proof of AI use.
- Use background jobs, rate limits, and cooldowns for heavy generation.

## Parallel Work With UI Phase 03

UI Phase 03 can run in parallel with this backend phase if these boundaries hold:

- Phase 09 only changes `convex/` and this `engineering/phase-09-synthesis-reports-backend-plan.md` file.
- UI Phase 03 only changes `src/`.
- Phase 09 is additive: it adds new queries, mutations, tables, and optional overview fields.
- Phase 09 does not rename or remove `api.participantWorkspace.overview`, `api.instructorCommandCenter.overview`, `api.followUps.*`, or `api.fightMe.*`.
- Phase 09 does not change existing enum values used by the UI.
- Do not run global formatting that modifies untracked UI plan files.

Known UI Phase 03 plan contract notes:

- The actual instructor overview shape currently uses grouped fields such as `presence`, `responses`, `recategorisation`, `jobs`, `activity`, and `followUps`; the UI plan text references older names like `presenceAggregate`, `submissionAggregate`, and `jobSummary`.
- The actual `api.followUps.setStatus` contract uses `followUpPromptId`, not `followUpSlug`.
- The frontend worker should rely on generated Convex API/types or inspect current query results instead of copying those stale field names literally.

## Non-Goals

- No frontend wiring.
- No D3 argument map.
- No full smart-tags hierarchy browser.
- No cross-session analytics dashboard.
- No CSV export.
- No automated phase switching.
- No invasive live draft monitoring.

## Implementation Order

1. Add schema tables and indexes.
2. Add prompt template defaults.
3. Add internal helpers to gather bounded synthesis/report context.
4. Add background generation actions and artifact persistence mutations.
5. Add public instructor synthesis APIs.
6. Add participant/instructor personal report APIs.
7. Add optional synthesis/report fields to overview queries.
8. Add audit events and LLM telemetry linkage.
9. Run codegen and verification gates.

## Verification

Run targeted gates:

```bash
npx convex codegen
vp test
pnpm exec tsc -b --pretty false
pnpm run build
```

Run targeted formatting/checking for changed backend and plan files. Avoid global `vp check --fix` while frontend workers have untracked files.

## Acceptance Criteria

- Instructor can queue category summary generation.
- Instructor can queue class synthesis generation.
- Instructor can publish, finalize, and archive synthesis artifacts.
- Participants only see published/final synthesis artifacts.
- Personal reports can be queued and read by the relevant participant.
- Instructor can see report generation status for the session.
- Generated artifacts store prompt/model/job metadata.
- LLM calls are tracked in existing observability.
- Existing UI Phase 03 backend contracts remain compatible.
- No frontend UI files are changed.
- Gates pass.
