# Personal Reports Instructor Section Plan

## Goal

Upgrade the instructor dashboard's Personal Reports section from a thin status list into a useful triage view.

The instructor should be able to answer:

- Which participants already have reports?
- Which reports are processing or failed?
- Which participants need instructor attention?
- What is the short qualitative takeaway for each participant?
- Should I regenerate missing or failed reports?

This section should not become the full student-facing report reader. It should stay scan-friendly.

## Current Problem

The current UI shows:

- total/success/processing/error counts
- a "Generate All Reports" button
- recent rows with only participation band, reasoning band, and status

This is not enough because:

- rows do not show participant nickname
- rows do not show summary or qualitative takeaway
- error rows do not show error detail
- instructor cannot distinguish reports or decide what to do next
- Convex already stores richer report fields, but the instructor overview does not expose them

## Existing Backend Data

`personalReports` already stores:

- `participationBand`
- `reasoningBand`
- `originalityBand`
- `responsivenessBand`
- `summary`
- `contributionTrace`
- `argumentEvolution`
- `growthOpportunity`
- `error`
- `generatedAt`
- `updatedAt`

No schema migration is required for the first upgrade.

## Backend Contract Update

Update `convex/instructorCommandCenter.ts` so `reports.recent` includes participant identity and richer fields.

Add fields:

- `nickname`
- `participantSlug`
- `summary`
- `contributionTrace`
- `argumentEvolution`
- `growthOpportunity`
- `error`
- `generatedAt`
- `updatedAt`

Optional derived fields if easy and bounded:

- `submissionCount`
- `followUpCount`
- `fightCount`
- `hasReportableActivity`

Implementation note:

- Use the existing `participantsById` map for nickname/slug lookup.
- Keep the query bounded; do not add unbounded per-report reads.
- If derived counts are added, compute from already-loaded bounded `submissions` and `fightThreads`.

## UI Update

Update `src/pages/instructor-session-page.tsx`.

Top summary should remain:

- Total
- Success
- Processing
- Error

Add small operational actions:

- Generate missing/reuse existing current button label if backend only supports all
- Regenerate all can remain future unless `forceRegenerate` is wired
- Show generation error if mutation fails

Recent reports rows should show:

- participant nickname
- status badge
- four report bands when present:
  - Participation
  - Reasoning
  - Originality
  - Responsiveness
- short `summary` preview
- optional `contributionTrace` preview
- error message for failed reports
- generated/updated timestamp

Recommended row layout:

```text
Noah                                      success
Active · Strong · Above Avg · Responsive
Summary: Strong practical course idea, but follow-up stayed within one category.
Trace: Contributed to Life Skills synthesis.
Generated 2 min ago
```

Empty states:

- If no reports exist: "No personal reports generated yet."
- If reports are processing: show queued/processing count and keep rows visible.
- If failed: show error and allow the instructor to rerun generation.

## Do Not Do Yet

- Do not build a full report modal unless required.
- Do not add a new route for report drilldown yet.
- Do not show long report text fully expanded by default.
- Do not make schema changes unless a field is truly missing.
- Do not mix this with participant-facing personal report UI.

## Acceptance Criteria

- Instructor can identify each report by participant nickname.
- Instructor can see all four bands when available.
- Instructor can read a short summary/trace without opening another page.
- Failed report rows show useful error text.
- Existing `Generate All Reports` behavior remains.
- TypeScript and production build pass.

