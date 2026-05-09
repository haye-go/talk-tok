# UI Phase 04: Synthesis & Personal Reports Wiring

## Purpose

Wire the Phase 9 synthesis artifacts and personal reports backend into the participant and instructor UIs. This phase replaces all remaining mock data in the Synthesize act and Review page with real Convex queries and mutations, and adds instructor-side synthesis controls.

## Prerequisites

- Phase 09 backend complete (`convex/synthesis.ts`, `convex/personalReports.ts`)
- UI Phase 03 complete (all other acts, tabs, and pages wired to real data)
- Overview queries already return synthesis/report fields additively

## Backend Contracts Used

### Queries (read-only)

| API                                                                   | Surface                                  | Notes                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `participantWorkspace.overview` → `synthesis.publishedArtifacts`      | SynthesizeAct                            | Array of published artifacts (kind, title, summary, keyPoints, uniqueInsights, opposingViews) |
| `participantWorkspace.overview` → `synthesis.finalArtifacts`          | SynthesizeAct                            | Same shape, final status                                                                      |
| `participantWorkspace.overview` → `personalReport`                    | SynthesizeAct CTA, MyZoneTab, ReviewPage | Single latest report with bands + narrative fields                                            |
| `instructorCommandCenter.overview` → `synthesis.artifactCounts`       | Instructor synthesis panel               | Count by status                                                                               |
| `instructorCommandCenter.overview` → `synthesis.recentArtifacts`      | Instructor synthesis panel               | Up to 8 recent artifacts with full metadata                                                   |
| `instructorCommandCenter.overview` → `synthesis.latestClassSynthesis` | Instructor synthesis panel               | Latest class_synthesis artifact or null                                                       |
| `instructorCommandCenter.overview` → `reports.summary`                | Instructor reports panel                 | Counts by status + total                                                                      |
| `instructorCommandCenter.overview` → `reports.recent`                 | Instructor reports panel                 | Up to 12 recent reports with participant IDs and bands                                        |
| `api.personalReports.getMine`                                         | ReviewPage                               | Dedicated query for full report (fallback if overview hasn't loaded)                          |

### Mutations (write)

| API                                      | Surface                                  | Notes                                                         |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `api.synthesis.generateCategorySummary`  | Instructor: per-category button          | `{ sessionSlug, categoryId }`                                 |
| `api.synthesis.generateClassSynthesis`   | Instructor: class synthesis button       | `{ sessionSlug, kind? }` — kind defaults to `class_synthesis` |
| `api.synthesis.publishArtifact`          | Instructor: artifact card action         | `{ sessionSlug, artifactId }` — draft → published             |
| `api.synthesis.finalizeArtifact`         | Instructor: artifact card action         | `{ sessionSlug, artifactId }` — published → final             |
| `api.synthesis.archiveArtifact`          | Instructor: artifact card action         | `{ sessionSlug, artifactId }` — any → archived                |
| `api.personalReports.generateMine`       | Participant: "Generate My Report" button | `{ sessionSlug, clientKey }`                                  |
| `api.personalReports.generateForSession` | Instructor: batch generate button        | `{ sessionSlug }`                                             |

## Scope

### Participant Side

#### Task 0: Rewrite SynthesizeAct to consume real data

**File:** `src/components/acts/synthesize-act.tsx`

Current state: Uses `MOCK_CATEGORIES`, ignores the `categories` prop already being passed.

New props:

```ts
interface SynthesizeActProps {
  publishedArtifacts?: Array<{
    id: string;
    categoryId?: string;
    kind: string;
    status: string;
    title: string;
    summary?: string;
    keyPoints?: string[];
    uniqueInsights?: string[];
    opposingViews?: string[];
    generatedAt?: number;
    publishedAt?: number;
    finalizedAt?: number;
  }>;
  finalArtifacts?: Array</* same shape */>;
  personalReport?: {
    id: string;
    status: string;
    participationBand?: string;
    reasoningBand?: string;
    originalityBand?: string;
    responsivenessBand?: string;
    summary?: string;
    contributionTrace?: string;
    argumentEvolution?: string;
    growthOpportunity?: string;
    error?: string;
    generatedAt?: number;
  } | null;
  sessionSlug: string;
  clientKey: string;
  onNavigateToReport?: () => void;
}
```

Rendering:

- Merge `publishedArtifacts` + `finalArtifacts` into one list, sorted by `updatedAt` desc.
- Group `category_summary` artifacts by category. Show each with title, summary, keyPoints as bullet list, uniqueInsights count link.
- Show `class_synthesis` / `final_summary` / `opposing_views` artifacts as distinct sections with appropriate icons (Sparkle, Scales, Eye).
- If no artifacts exist, show empty state: "No class synthesis available yet."
- Personal report CTA at bottom:
  - If `personalReport` is null → "Generate My Report" button calling `api.personalReports.generateMine`.
  - If `personalReport.status` is `queued` or `processing` → spinner with "Generating your report..."
  - If `personalReport.status` is `success` → summary preview + "View Full Report" link navigating to review page.
  - If `personalReport.status` is `error` → error message + "Retry" button.
- Remove `MOCK_CATEGORIES` import.

#### Task 1: Rewrite ReviewPage to consume real report data

**File:** `src/pages/review-page.tsx`

Current state: Hardcoded mock content with MetricTile and Card components.

Changes:

- Add `useParams` to get `sessionSlug`.
- Add `useState` + `useEffect` for `clientKey` (same pattern as participant-session-page).
- Query `api.personalReports.getMine` with `{ sessionSlug, clientKey }`.
- Show loading state while query is undefined.
- Show "No report yet" with "Generate Report" CTA if query returns null.
- When report exists and status is `success`:
  - **Band badges row**: 4 MetricTiles for participationBand, reasoningBand, originalityBand, responsivenessBand with human labels.
  - **Summary card**: report.summary in a Card.
  - **Contribution Trace card**: report.contributionTrace.
  - **Argument Evolution card**: report.argumentEvolution.
  - **Growth Opportunity**: report.growthOpportunity in cream-bg panel (existing style).
- When status is `queued`/`processing`: loading spinner.
- When status is `error`: error state with retry button.
- Band display labels:
  - participation: quiet → "Quiet", active → "Active", highly_active → "Highly Active"
  - reasoning: emerging → "Emerging", solid → "Solid", strong → "Strong", exceptional → "Exceptional"
  - originality: common → "Common", above_average → "Above Avg", distinctive → "Distinctive", novel → "Novel"
  - responsiveness: limited → "Limited", responsive → "Responsive", highly_responsive → "Highly Responsive"

#### Task 2: Update participant-session-page to pass synthesis data

**File:** `src/pages/participant-session-page.tsx`

Changes:

- Pass synthesis artifacts and personal report from workspace to SynthesizeAct:
  ```tsx
  <SynthesizeAct
    publishedArtifacts={ws?.synthesis.publishedArtifacts}
    finalArtifacts={ws?.synthesis.finalArtifacts}
    personalReport={ws?.personalReport}
    sessionSlug={sessionSlug}
    clientKey={clientKey!}
    onNavigateToReport={() => navigate({ to: routes.review(sessionSlug) })}
  />
  ```
- Pass personal report summary to MyZoneTab (new optional prop):
  ```tsx
  <MyZoneTab
    ...existing props...
    personalReport={ws?.personalReport}
  />
  ```

#### Task 3: Add personal report summary to MyZoneTab

**File:** `src/components/myzone/my-zone-tab.tsx`

Changes:

- Add optional `personalReport` prop (same shape as workspace return).
- If report exists and status is `success`, show a compact card at the top of My Zone:
  - Band badges in a row (participation, reasoning, originality, responsiveness).
  - One-line summary.
  - "View Full Report" link.
- If report is `queued`/`processing`, show small processing indicator.

### Instructor Side

#### Task 4: Add synthesis controls to instructor session page

**File:** `src/pages/instructor-session-page.tsx`

Changes to **left panel** (below categories):

- Per-category "Summarize" button next to each category card. Calls `api.synthesis.generateCategorySummary({ sessionSlug, categoryId })`.
- Show small status indicator on categories that already have a summary artifact (draft/published/final).

New **center panel section** (below existing content):

- **Synthesis Dashboard Card**:
  - Artifact count tiles: draft / published / final / error (from `overview.synthesis.artifactCounts`).
  - "Generate Class Synthesis" button calling `api.synthesis.generateClassSynthesis({ sessionSlug })`.
  - "Generate Opposing Views" button calling `api.synthesis.generateClassSynthesis({ sessionSlug, kind: "opposing_views" })`.

#### Task 5: Build SynthesisArtifactCard component

**File:** `src/components/synthesis/synthesis-artifact-card.tsx` (new)

Props:

```ts
interface SynthesisArtifactCardProps {
  artifact: {
    id: string;
    kind: string;
    status: string;
    title: string;
    summary?: string;
    keyPoints?: string[];
    uniqueInsights?: string[];
    opposingViews?: string[];
    error?: string;
    generatedAt?: number;
    publishedAt?: number;
  };
  sessionSlug: string;
  isInstructor?: boolean;
}
```

Rendering:

- Kind icon: category_summary → BookOpen, class_synthesis → Sparkle, opposing_views → Scales, final_summary → Flag.
- Status badge with appropriate tone (queued/processing → warning, draft → neutral, published → sky, final → success, error → error).
- Summary text, keyPoints as bullet list, uniqueInsights as italic items.
- Instructor-only action row:
  - draft → "Publish" button (calls `publishArtifact`)
  - published → "Finalize" button (calls `finalizeArtifact`)
  - any non-archived → "Archive" button (calls `archiveArtifact`, ghost/danger variant)
  - queued/processing → disabled spinner
  - error → error message + "Regenerate" link

#### Task 6: Build instructor reports panel

**File:** `src/pages/instructor-session-page.tsx` (extend right panel or add to center)

Add a "Personal Reports" section:

- Summary tiles from `overview.reports.summary`: total, queued, processing, success, error counts.
- "Generate All Reports" button calling `api.personalReports.generateForSession({ sessionSlug })`.
- Recent reports list from `overview.reports.recent` showing participant band badges and status.

#### Task 7: Add synthesis artifact list to instructor right panel

**File:** `src/pages/instructor-session-page.tsx`

Add below activity feed:

- "Synthesis Artifacts" section header.
- List of `overview.synthesis.recentArtifacts` rendered as compact SynthesisArtifactCard instances.
- If `overview.synthesis.latestClassSynthesis` exists, highlight it at top.

### Cleanup

#### Task 8: Remove mock data references

- Remove `MOCK_CATEGORIES` import from `synthesize-act.tsx` (already done by Task 0).
- Remove mock content from `review-page.tsx` (already done by Task 1).
- Verify no remaining mock imports in synthesis-related components.

#### Task 9: Type check and test

- Run `pnpm exec tsc -b --pretty false` — must pass clean.
- Run `pnpm vitest run` — all tests pass.
- Verify dev server loads without errors.

## Implementation Order

1. Task 5: SynthesisArtifactCard (new component, no dependencies)
2. Task 0: SynthesizeAct rewrite (uses SynthesisArtifactCard for participant view)
3. Task 1: ReviewPage rewrite
4. Task 3: MyZoneTab personal report section
5. Task 2: participant-session-page wiring
6. Tasks 4, 6, 7: Instructor synthesis + reports controls
7. Task 8: Cleanup
8. Task 9: Verification

## Files Changed

| File                                                   | Change                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `src/components/acts/synthesize-act.tsx`               | Rewrite: real data props, artifact display, report CTA      |
| `src/pages/review-page.tsx`                            | Rewrite: real report query, band display, narrative cards   |
| `src/pages/participant-session-page.tsx`               | Pass synthesis + report data to SynthesizeAct and MyZoneTab |
| `src/components/myzone/my-zone-tab.tsx`                | Add personal report summary card                            |
| `src/pages/instructor-session-page.tsx`                | Add synthesis controls, artifact list, report generation    |
| `src/components/synthesis/synthesis-artifact-card.tsx` | **New**: shared artifact card with instructor actions       |

## Files NOT Changed

- `convex/` — no backend changes
- `src/components/fight/` — no fight changes
- `src/components/acts/discover-act.tsx` — no changes
- `src/components/acts/challenge-act.tsx` — no changes
- `src/hooks/` — no new hooks needed (overview queries already return synthesis data)

## Non-Goals

- D3 argument map visualization (stretch, separate phase)
- CSV/PDF export of reports
- Cross-session analytics
- Smart-tags hierarchy browser
- Synthesis quote expansion/collapse with animations (can add in motion phase)
- Artifact diff/versioning UI
