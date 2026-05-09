# Phase 11B: Embeddings and Argument Map Backend

## Purpose

Add the backend substrate for embeddings, novelty signals, opposition/support links, and graph-ready argument-map data.

This phase is backend-only. It does not require D3 or frontend graphing, but returns data shapes that a D3 or card-based UI can consume later.

## Scope

- Store embeddings for submissions and synthesis artifacts.
- Queue embedding generation on instructor/manual trigger.
- Store semantic signals such as novelty, duplicate, bridge, support, opposition, and isolated viewpoints.
- Generate argument links with AI from bounded session context.
- Provide graph-ready query output with nodes and edges.

## Backend Contracts

### Embeddings

Tables:

- `semanticEmbeddings`
- `semanticEmbeddingJobs`

Expose:

- `api.semantic.queueEmbeddingsForSession`
- `api.semantic.listEmbeddingsForSession`
- `api.semantic.getSemanticStatus`

Rules:

- Embedding generation is background work.
- Embeddings are not on the critical submission path.
- Use content hash to avoid duplicate embedding rows for unchanged content.

### Novelty Radar

Novelty radar means "how distinctive or contributive is this response relative to the session", not AI-authorship detection.

Signals:

- `semantic_distance`
- `rare_concept`
- `reference_beyond`
- `classmate_pickup`
- `synthesis_inclusion`

Expose:

- `api.semantic.listSignalsForSession`
- `api.semantic.listSignalsForSubmission`

### Argument Map

Tables:

- `argumentLinks`

Link types:

- `supports`
- `contradicts`
- `extends`
- `questions`
- `bridges`

Expose:

- `api.argumentMap.generateForSession`
- `api.argumentMap.getGraph`
- `api.argumentMap.listLinksForSession`

Graph contract:

- `nodes`: submissions, categories, synthesis artifacts
- `edges`: argument links with type, strength, confidence, rationale

## Non-Goals

- No D3 rendering.
- No mandatory vector search UI.
- No smart-tags component integration.
- No automated per-submission embedding on every write.

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec tsc -b --pretty false --force
```

Full TypeScript may still report unrelated frontend work-in-progress errors.

