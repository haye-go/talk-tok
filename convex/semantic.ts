import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { aiWorkpool, rateLimiter } from "./components";

type EntityType = Doc<"semanticEmbeddings">["entityType"];
type SemanticTarget = {
  entityType: EntityType;
  entityId: string;
  text: string;
};

const ENTITY_LIMIT = 120;
const EMBEDDING_LIMIT = 240;
const SIGNAL_LIMIT = 240;
const CATEGORY_LIMIT = 100;
const FOLLOW_UP_LIMIT = 40;
const POSITION_SHIFT_LIMIT = 120;

const entityTypeValidator = v.union(
  v.literal("submission"),
  v.literal("synthesisArtifact"),
  v.literal("category"),
  v.literal("fightThread"),
  v.literal("followUpPrompt"),
);

const signalTypeValidator = v.union(
  v.literal("novelty"),
  v.literal("duplicate"),
  v.literal("opposition"),
  v.literal("support"),
  v.literal("bridge"),
  v.literal("isolated"),
);

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function textForArtifact(artifact: Doc<"synthesisArtifacts">) {
  return [
    artifact.title,
    artifact.summary,
    ...artifact.keyPoints,
    ...artifact.uniqueInsights,
    ...artifact.opposingViews,
  ]
    .filter(Boolean)
    .join("\n");
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function hashText(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toEmbedding(row: Doc<"semanticEmbeddings">) {
  return {
    id: row._id,
    sessionId: row.sessionId,
    entityType: row.entityType,
    entityId: row.entityId,
    contentHash: row.contentHash,
    textPreview: row.textPreview,
    embeddingModel: row.embeddingModel,
    dimensions: row.dimensions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSignal(row: Doc<"semanticSignals">) {
  return {
    id: row._id,
    sessionId: row.sessionId,
    submissionId: row.submissionId,
    participantId: row.participantId,
    categoryId: row.categoryId,
    signalType: row.signalType,
    band: row.band,
    score: row.score,
    rationale: row.rationale,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    sourceEmbeddingId: row.sourceEmbeddingId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function participantLabel(
  session: Doc<"sessions">,
  participant: Doc<"participants"> | undefined,
  fallbackIndex: number,
) {
  if (!participant) {
    return `Participant ${fallbackIndex + 1}`;
  }

  return session.anonymityMode === "nicknames_visible"
    ? participant.nickname
    : `Participant ${fallbackIndex + 1}`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export const queueEmbeddingsForSession = mutation({
  args: {
    sessionSlug: v.string(),
    entityTypes: v.optional(v.array(entityTypeValidator)),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `embedding:${session._id}`,
      throws: true,
    });

    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "embedding",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const now = Date.now();
    const entityTypes = args.entityTypes ?? ["submission", "synthesisArtifact", "category"];
    const jobId = await ctx.db.insert("semanticEmbeddingJobs", {
      sessionId: session._id,
      status: "queued",
      requestedBy: "instructor",
      entityTypes,
      createdAt: now,
      updatedAt: now,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.semantic.runEmbeddingJob,
      { jobId },
      { name: "semantic.runEmbeddingJob", retry: true },
    );

    return await ctx.db.get(jobId);
  },
});

export const loadEmbeddingJobContext = internalQuery({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Semantic embedding job not found.");
    }

    const session = await ctx.db.get(job.sessionId);

    if (!session) {
      throw new Error("Session not found for semantic embedding job.");
    }

    const targets: SemanticTarget[] = [];

    if (job.entityTypes.includes("submission")) {
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("asc")
        .take(ENTITY_LIMIT);

      for (const submission of submissions) {
        if (submission.kind === "fight_me_turn") {
          continue;
        }

        targets.push({
          entityType: "submission",
          entityId: submission._id,
          text: submission.body,
        });
      }
    }

    if (job.entityTypes.includes("synthesisArtifact")) {
      const artifacts = await ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(ENTITY_LIMIT);

      for (const artifact of artifacts) {
        targets.push({
          entityType: "synthesisArtifact",
          entityId: artifact._id,
          text: textForArtifact(artifact),
        });
      }
    }

    if (job.entityTypes.includes("category")) {
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT);

      for (const category of categories) {
        targets.push({
          entityType: "category",
          entityId: category._id,
          text: [category.name, category.description].filter(Boolean).join("\n"),
        });
      }
    }

    return { job, session, targets: targets.filter((target) => target.text.trim()) };
  },
});

export const markEmbeddingJobProcessing = internalMutation({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
    progressTotal: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
      progressTotal: args.progressTotal,
      progressDone: 0,
      updatedAt: Date.now(),
    });
  },
});

export const upsertEmbedding = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    entityType: entityTypeValidator,
    entityId: v.string(),
    contentHash: v.string(),
    textPreview: v.string(),
    embeddingModel: v.string(),
    dimensions: v.number(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("semanticEmbeddings")
      .withIndex("by_entity_and_hash", (q) =>
        q
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
          .eq("contentHash", args.contentHash),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("semanticEmbeddings", {
      sessionId: args.sessionId,
      entityType: args.entityType,
      entityId: args.entityId,
      contentHash: args.contentHash,
      textPreview: args.textPreview,
      embeddingModel: args.embeddingModel,
      dimensions: args.dimensions,
      embedding: args.embedding,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markEmbeddingJobSuccess = internalMutation({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
    progressDone: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: args.progressDone,
      updatedAt: Date.now(),
    });
  },
});

export const markEmbeddingJobError = internalMutation({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const runEmbeddingJob = internalAction({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
  },
  handler: async (ctx, args) => {
    try {
      const { job, session, targets } = await ctx.runQuery(internal.semantic.loadEmbeddingJobContext, {
        jobId: args.jobId,
      });
      await ctx.runMutation(internal.semantic.markEmbeddingJobProcessing, {
        jobId: job._id,
        progressTotal: targets.length,
      });

      let progressDone = 0;

      for (const target of targets) {
        const contentHash = await hashText(target.text);
        const result = await ctx.runAction(internal.llm.embedText, {
          sessionId: session._id,
          text: target.text.slice(0, 8000),
        });

        await ctx.runMutation(internal.semantic.upsertEmbedding, {
          sessionId: session._id,
          entityType: target.entityType,
          entityId: target.entityId,
          contentHash,
          textPreview: target.text.slice(0, 240),
          embeddingModel: result.model,
          dimensions: result.dimensions,
          embedding: result.embedding,
        });
        progressDone += 1;
      }

      await ctx.runMutation(internal.semantic.refreshNoveltySignals, { sessionId: session._id });
      await ctx.runMutation(internal.semantic.markEmbeddingJobSuccess, {
        jobId: job._id,
        progressDone,
      });
    } catch (error) {
      await ctx.runMutation(internal.semantic.markEmbeddingJobError, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Semantic embedding job failed.",
      });
      throw error;
    }
  },
});

export const refreshNoveltySignals = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const embeddings = await ctx.db
      .query("semanticEmbeddings")
      .withIndex("by_session_and_entity_type", (q) =>
        q.eq("sessionId", args.sessionId).eq("entityType", "submission"),
      )
      .take(ENTITY_LIMIT);
    const existing = await ctx.db
      .query("semanticSignals")
      .withIndex("by_session_and_signal_type", (q) =>
        q.eq("sessionId", args.sessionId).eq("signalType", "novelty"),
      )
      .take(SIGNAL_LIMIT);

    for (const signal of existing) {
      await ctx.db.delete(signal._id);
    }

    const now = Date.now();
    let inserted = 0;

    for (const embedding of embeddings) {
      let maxSimilarity = 0;

      for (const other of embeddings) {
        if (other._id === embedding._id) {
          continue;
        }

        maxSimilarity = Math.max(maxSimilarity, cosineSimilarity(embedding.embedding, other.embedding));
      }

      const noveltyScore = Math.max(0, Math.min(1, 1 - maxSimilarity));
      const band = noveltyScore >= 0.32 ? "high" : noveltyScore >= 0.18 ? "medium" : "low";
      const submission = await ctx.db.get(embedding.entityId as Id<"submissions">);

      await ctx.db.insert("semanticSignals", {
        sessionId: args.sessionId,
        submissionId: submission?._id,
        participantId: submission?.participantId,
        signalType: "novelty",
        band,
        score: noveltyScore,
        rationale:
          band === "high"
            ? "This response is semantically distant from most other submitted points."
            : band === "medium"
              ? "This response has some distinctive angle but overlaps with other points."
              : "This response is close to common class patterns.",
        sourceEmbeddingId: embedding._id,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted };
  },
});

export const listEmbeddingsForSession = query({
  args: {
    sessionSlug: v.string(),
    entityType: v.optional(entityTypeValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const rows = args.entityType
      ? await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_session_and_entity_type", (q) =>
            q.eq("sessionId", session._id).eq("entityType", args.entityType!),
          )
          .take(EMBEDDING_LIMIT)
      : await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(EMBEDDING_LIMIT);

    return rows.map(toEmbedding);
  },
});

export const getSemanticStatus = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [jobs, embeddings, signals, argumentLinks, aiJobs, submissions] = await Promise.all([
      ctx.db
        .query("semanticEmbeddingJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(20),
      ctx.db
        .query("semanticEmbeddings")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(EMBEDDING_LIMIT),
      ctx.db
        .query("semanticSignals")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SIGNAL_LIMIT),
      ctx.db
        .query("argumentLinks")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SIGNAL_LIMIT),
      ctx.db
        .query("aiJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(80),
      ctx.db
        .query("submissions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT),
    ]);
    const latestArgumentMapJob =
      aiJobs.find((job) => job.type === "argument_map") ?? null;
    const missingPrerequisites = [
      embeddings.length === 0 ? "embeddings" : null,
      signals.filter((signal) => signal.signalType === "novelty").length === 0
        ? "novelty_signals"
        : null,
      argumentLinks.length === 0 ? "argument_links" : null,
    ].filter((value): value is string => value !== null);

    return {
      latestJob: jobs[0] ?? null,
      jobs,
      embeddingCount: embeddings.length,
      signalCount: signals.length,
      noveltyCount: signals.filter((signal) => signal.signalType === "novelty").length,
      argumentLinkCount: argumentLinks.length,
      latestArgumentMapJob,
      submissionCount: submissions.length,
      readiness: {
        canShowNoveltyRadar: embeddings.length > 0 && missingPrerequisites.includes("novelty_signals") === false,
        canShowArgumentMap: argumentLinks.length > 0,
        missingPrerequisites,
      },
      caps: {
        embeddingsCapped: embeddings.length === EMBEDDING_LIMIT,
        signalsCapped: signals.length === SIGNAL_LIMIT,
        argumentLinksCapped: argumentLinks.length === SIGNAL_LIMIT,
        submissionsCapped: submissions.length === ENTITY_LIMIT,
      },
    };
  },
});

export const refreshSignalsForSession = mutation({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `semantic-refresh:${session._id}`,
      throws: true,
    });

    return await ctx.runMutation(internal.semantic.refreshNoveltySignals, {
      sessionId: session._id,
    });
  },
});

export const getNoveltyRadar = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [signals, submissions, participants, categories, assignments] = await Promise.all([
      ctx.db
        .query("semanticSignals")
        .withIndex("by_session_and_signal_type", (q) =>
          q.eq("sessionId", session._id).eq("signalType", "novelty"),
        )
        .order("desc")
        .take(SIGNAL_LIMIT),
      ctx.db
        .query("submissions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT),
      ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      ctx.db
        .query("submissionCategories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(ENTITY_LIMIT * 2),
    ]);
    const participantsById = new Map(participants.map((participant, index) => [
      participant._id,
      { participant, index },
    ]));
    const submissionsById = new Map(submissions.map((submission) => [submission._id, submission]));
    const categoriesById = new Map(categories.map((category) => [category._id, category]));
    const categoryBySubmission = new Map<Id<"submissions">, Id<"categories">>();

    for (const assignment of assignments) {
      if (!categoryBySubmission.has(assignment.submissionId)) {
        categoryBySubmission.set(assignment.submissionId, assignment.categoryId);
      }
    }

    const distribution = { low: 0, medium: 0, high: 0 };
    const categoryScores = new Map<Id<"categories">, number[]>();
    const examples = signals
      .filter((signal) => signal.submissionId)
      .map((signal) => {
        const submission = signal.submissionId ? submissionsById.get(signal.submissionId) : undefined;
        const participantInfo = submission ? participantsById.get(submission.participantId) : undefined;
        const categoryId = signal.submissionId
          ? categoryBySubmission.get(signal.submissionId)
          : undefined;
        const category = categoryId ? categoriesById.get(categoryId) : undefined;

        distribution[signal.band] += 1;

        if (categoryId) {
          const scores = categoryScores.get(categoryId) ?? [];
          scores.push(signal.score);
          categoryScores.set(categoryId, scores);
        }

        return {
          signalId: signal._id,
          submissionId: signal.submissionId,
          participantId: signal.participantId,
          participantLabel: participantLabel(
            session,
            participantInfo?.participant,
            participantInfo?.index ?? 0,
          ),
          categoryId,
          categorySlug: category?.slug,
          categoryName: category?.name,
          categoryColor: category?.color,
          band: signal.band,
          score: signal.score,
          rationale: signal.rationale,
          bodyPreview: submission?.body.slice(0, 220),
          createdAt: signal.createdAt,
        };
      });

    const categoryAverages = Array.from(categoryScores.entries()).map(([categoryId, scores]) => {
      const category = categoriesById.get(categoryId);

      return {
        categoryId,
        categorySlug: category?.slug ?? "unknown",
        categoryName: category?.name ?? "Unknown category",
        categoryColor: category?.color,
        averageNoveltyScore: average(scores),
        signalCount: scores.length,
      };
    });

    return {
      session: {
        id: session._id,
        slug: session.slug,
        title: session.title,
      },
      distribution,
      topDistinctive: examples
        .filter((example) => example.band === "high")
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
      commonClusterExamples: examples
        .filter((example) => example.band === "low")
        .sort((a, b) => a.score - b.score)
        .slice(0, 8),
      categoryAverages: categoryAverages.sort(
        (a, b) => b.averageNoveltyScore - a.averageNoveltyScore,
      ),
      caps: {
        signalsCapped: signals.length === SIGNAL_LIMIT,
        submissionsCapped: submissions.length === ENTITY_LIMIT,
        categoriesCapped: categories.length === CATEGORY_LIMIT,
      },
    };
  },
});

export const getCategoryDrift = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [categories, followUps, submissions, assignments, positionShifts] = await Promise.all([
      ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      ctx.db
        .query("followUpPrompts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(FOLLOW_UP_LIMIT),
      ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("asc")
        .take(ENTITY_LIMIT),
      ctx.db
        .query("submissionCategories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(ENTITY_LIMIT * 2),
      ctx.db
        .query("positionShiftEvents")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(POSITION_SHIFT_LIMIT),
    ]);
    const categoriesById = new Map(categories.map((category) => [category._id, category]));
    const followUpsSorted = [...followUps].sort(
      (a, b) => a.roundNumber - b.roundNumber || a.createdAt - b.createdAt,
    );
    const sliceDefs = [
      {
        key: "initial",
        label: "Initial responses",
        startsAt: submissions.find((submission) => !submission.followUpPromptId)?.createdAt,
        endsAt: undefined as number | undefined,
        order: 0,
      },
      ...followUpsSorted.map((prompt, index) => ({
        key: `follow-up-${prompt.slug}`,
        label: `Round ${prompt.roundNumber}: ${prompt.title}`,
        startsAt: prompt.activatedAt ?? prompt.createdAt,
        endsAt: prompt.closedAt,
        order: index + 1,
        followUpPromptId: prompt._id,
      })),
    ];
    const sliceByPrompt = new Map(
      followUpsSorted.map((prompt) => [prompt._id, `follow-up-${prompt.slug}`]),
    );
    const sliceOrder = new Map(sliceDefs.map((slice) => [slice.key, slice.order]));
    const categoryBySubmission = new Map<Id<"submissions">, Id<"categories">>();

    for (const assignment of assignments) {
      if (!categoryBySubmission.has(assignment.submissionId)) {
        categoryBySubmission.set(assignment.submissionId, assignment.categoryId);
      }
    }

    const countsBySlice = new Map<string, Map<Id<"categories">, number>>();
    const uncategorizedBySlice = new Map<string, number>();
    const participantSliceCategory = new Map<
      Id<"participants">,
      Map<string, Id<"categories">>
    >();

    for (const submission of submissions) {
      const sliceKey = submission.followUpPromptId
        ? (sliceByPrompt.get(submission.followUpPromptId) ?? "initial")
        : "initial";
      const categoryId = categoryBySubmission.get(submission._id);

      if (!categoryId) {
        uncategorizedBySlice.set(sliceKey, (uncategorizedBySlice.get(sliceKey) ?? 0) + 1);
        continue;
      }

      const categoryCounts = countsBySlice.get(sliceKey) ?? new Map<Id<"categories">, number>();
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
      countsBySlice.set(sliceKey, categoryCounts);

      const perParticipant =
        participantSliceCategory.get(submission.participantId) ??
        new Map<string, Id<"categories">>();
      perParticipant.set(sliceKey, categoryId);
      participantSliceCategory.set(submission.participantId, perParticipant);
    }

    const transitionCounts = new Map<string, number>();

    for (const perParticipant of participantSliceCategory.values()) {
      const ordered = Array.from(perParticipant.entries()).sort(
        ([sliceA], [sliceB]) => (sliceOrder.get(sliceA) ?? 0) - (sliceOrder.get(sliceB) ?? 0),
      );

      for (let index = 1; index < ordered.length; index += 1) {
        const [fromSliceKey, fromCategoryId] = ordered[index - 1];
        const [toSliceKey, toCategoryId] = ordered[index];
        const key = `${fromSliceKey}:${fromCategoryId}->${toSliceKey}:${toCategoryId}`;
        transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
      }
    }

    const slices = sliceDefs.map((slice) => {
      const categoryCounts = countsBySlice.get(slice.key) ?? new Map<Id<"categories">, number>();

      return {
        key: slice.key,
        label: slice.label,
        startsAt: slice.startsAt,
        endsAt: slice.endsAt,
        categoryCounts: Array.from(categoryCounts.entries()).map(([categoryId, count]) => {
          const category = categoriesById.get(categoryId);

          return {
            categoryId,
            categorySlug: category?.slug ?? "unknown",
            categoryName: category?.name ?? "Unknown category",
            categoryColor: category?.color,
            count,
          };
        }),
        uncategorizedCount: uncategorizedBySlice.get(slice.key) ?? 0,
      };
    });
    const transitions = Array.from(transitionCounts.entries()).map(([key, count]) => {
      const match = key.match(/^(.+):([^:]+)->(.+):([^:]+)$/);
      const fromSliceKey = match?.[1] ?? "unknown";
      const fromCategoryId = match?.[2] as Id<"categories"> | undefined;
      const toSliceKey = match?.[3] ?? "unknown";
      const toCategoryId = match?.[4] as Id<"categories"> | undefined;
      const fromCategory = fromCategoryId ? categoriesById.get(fromCategoryId) : undefined;
      const toCategory = toCategoryId ? categoriesById.get(toCategoryId) : undefined;

      return {
        fromSliceKey,
        toSliceKey,
        fromCategoryId,
        fromCategorySlug: fromCategory?.slug,
        fromCategoryName: fromCategory?.name,
        toCategoryId,
        toCategorySlug: toCategory?.slug,
        toCategoryName: toCategory?.name,
        count,
      };
    });

    return {
      session: {
        id: session._id,
        slug: session.slug,
        title: session.title,
      },
      slices,
      transitions,
      positionShifts: positionShifts.map((event) => ({
        id: event._id,
        participantId: event.participantId,
        submissionId: event.submissionId,
        categoryId: event.categoryId,
        reason: event.reason,
        influencedBy: event.influencedBy,
        createdAt: event.createdAt,
      })),
      caps: {
        categoriesCapped: categories.length === CATEGORY_LIMIT,
        followUpsCapped: followUps.length === FOLLOW_UP_LIMIT,
        submissionsCapped: submissions.length === ENTITY_LIMIT,
        assignmentsCapped: assignments.length === ENTITY_LIMIT * 2,
        positionShiftsCapped: positionShifts.length === POSITION_SHIFT_LIMIT,
      },
    };
  },
});

export const listSignalsForSession = query({
  args: {
    sessionSlug: v.string(),
    signalType: v.optional(
      signalTypeValidator,
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const rows = args.signalType
      ? await ctx.db
          .query("semanticSignals")
          .withIndex("by_session_and_signal_type", (q) =>
            q.eq("sessionId", session._id).eq("signalType", args.signalType!),
          )
          .order("desc")
          .take(SIGNAL_LIMIT)
      : await ctx.db
          .query("semanticSignals")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(SIGNAL_LIMIT);

    return rows.map(toSignal);
  },
});

export const listSignalsForSubmission = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("semanticSignals")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("desc")
      .take(40);

    return rows.map(toSignal);
  },
});
