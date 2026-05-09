# Phase 12B: Semantic Visualization Contracts Backend

## Purpose

Extend the semantic backend so the frontend can build card-based and D3-based visualizations without needing backend changes during UI implementation.

This phase is backend-only. D3 rendering remains frontend/designer-owned.

## Current Baseline

Already available:

- `semanticEmbeddingJobs`
- `semanticEmbeddings`
- `semanticSignals`
- `argumentLinks`
- `api.semantic.queueEmbeddingsForSession`
- `api.semantic.getSemanticStatus`
- `api.semantic.listSignalsForSession`
- `api.semantic.listSignalsForSubmission`
- `api.argumentMap.generateForSession`
- `api.argumentMap.getGraph`
- `api.argumentMap.listLinksForSession`

Current semantic signals include novelty bands derived from submission embedding distance.

## Scope

### 1. Novelty Radar Contract

Add a visualization-ready novelty query:

- `api.semantic.getNoveltyRadar`

Return:

- session snapshot
- novelty distribution by band
- top distinctive submissions
- low-novelty/common-cluster examples
- category-level novelty averages
- participant-safe labels
- capped-result flags

Rules:

- novelty is a contribution signal, not AI-authorship detection.
- do not expose raw private feedback.
- include rationale text where available.

### 2. Category Drift Contract

Add a category drift contract for card-based MVP and later D3/alluvial charts:

- `api.semantic.getCategoryDrift`

Return rounds or time slices using existing data:

- initial submissions
- follow-up prompt rounds
- synthesis publication timestamps where useful
- category assignment counts per slice
- new/emerging categories
- archived/merged categories if available
- participant movement signals where recategorization/position-shift data exists

Recommended output:

```ts
{
  slices: Array<{
    key: string;
    label: string;
    startsAt?: number;
    endsAt?: number;
    categoryCounts: Array<{
      categoryId: Id<"categories">;
      categorySlug: string;
      categoryName: string;
      count: number;
    }>;
  }>;
  transitions: Array<{
    fromSliceKey: string;
    toSliceKey: string;
    fromCategoryId?: Id<"categories">;
    toCategoryId?: Id<"categories">;
    count: number;
  }>;
}
```

MVP can approximate drift from submission `createdAt`, `followUpPromptId`, and assignment timestamps. Do not overclaim causality.

### 3. Argument Map Enhancement Contract

Extend graph output for D3 and non-D3 renderers:

- stable node keys
- node type
- display label
- category color
- participant-safe display name
- node weight
- edge weight
- edge confidence
- edge rationale
- recommended layout hints

Candidate query:

- extend `api.argumentMap.getGraph`
- or add `api.argumentMap.getVisualizationGraph`

Recommended layout hints:

- `clusterKey`
- `colorKey`
- `radiusScore`
- `xHint`
- `yHint`

The backend should not compute an actual D3 force layout. It should return enough semantic metadata for the frontend to render.

### 4. Semantic Signal Refresh

Add explicit refresh action/mutation where needed:

- recompute novelty signals from existing embeddings
- optionally derive simple support/duplicate/isolated signals from similarity thresholds
- keep AI/LLM opposition generation in `argumentMap`, not in the novelty refresh path

Candidate contract:

- `api.semantic.refreshSignalsForSession`

### 5. Semantic Readiness Status

Add a single query to tell frontend whether visualization widgets can render:

- embeddings queued/processing/success/error
- number of embeddings
- number of novelty signals
- number of argument links
- latest argument-map job
- missing prerequisites

Candidate:

- extend `api.semantic.getSemanticStatus`

## Non-Goals

- No smart tags.
- No frontend D3 code.
- No automatic embedding on every submission.
- No real-time graph recomputation on every write.
- No punitive AI-detection labels.

## Implementation Notes

- Use bounded indexed reads.
- Prefer category and prompt rounds over arbitrary time buckets for drift.
- Keep all route navigation slug-based; Convex IDs may be returned inside data payloads but not used in URL construction.
- Use existing `followUpPrompts`, `submissionCategories`, `categories`, `submissions`, `positionShiftEvents`, `semanticSignals`, and `argumentLinks`.
- Use existing `aiJobs` for job status; add new job types only if required.

## Frontend Handoff Shape

The frontend designer should be able to wire:

- novelty cards or radar chart from `getNoveltyRadar`
- drift cards or alluvial chart from `getCategoryDrift`
- argument map cards or D3 force graph from `getVisualizationGraph` or enhanced `getGraph`
- readiness/loading/error states from `getSemanticStatus`

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec tsc -b
```

Optional after implementation:

```bash
pnpm run build
```

## Acceptance Criteria

- Frontend can render novelty distribution without extra client-side aggregation.
- Frontend can render category drift from a stable backend shape.
- Frontend can render argument graph from stable node and edge keys.
- Frontend can show semantic readiness and missing prerequisites.
- No frontend files are touched.

