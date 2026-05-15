import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
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
import { requireInstructorPreviewPassword } from "./previewAuthGuard";
import { resolveQuestionForRead, resolveQuestionIdForWrite } from "./questionScope";

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
const CLUSTER_LIMIT = 80;
const CLUSTER_MEMBER_LIMIT = 300;
const DEFAULT_CLUSTER_JOIN_THRESHOLD = 0.6;
const MIN_CLUSTER_JOIN_THRESHOLD = 0.35;
const MAX_CLUSTER_JOIN_THRESHOLD = 0.95;
const NEAREST_EMBEDDING_LIMIT = 64;

type ReclusterSubmissionEmbedding = {
  embeddingId: Id<"semanticEmbeddings">;
  submissionId: Id<"submissions">;
  embedding: number[];
};

type ReclusterContext = {
  sessionId: Id<"sessions">;
  questionId: Id<"sessionQuestions"> | null;
  embeddings: ReclusterSubmissionEmbedding[];
} | null;

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
    questionId: row.questionId,
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
    questionId: row.questionId,
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

function normalizeClusterJoinThreshold(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CLUSTER_JOIN_THRESHOLD;
  }

  const bounded = Math.min(MAX_CLUSTER_JOIN_THRESHOLD, Math.max(MIN_CLUSTER_JOIN_THRESHOLD, value));

  return Math.round(bounded * 100) / 100;
}

export const queueEmbeddingsForSession = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    entityTypes: v.optional(v.array(entityTypeValidator)),
    clusterJoinThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `embedding:${session._id}:${questionId}`,
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
    const clusterJoinThreshold = normalizeClusterJoinThreshold(args.clusterJoinThreshold);
    const jobId = await ctx.db.insert("semanticEmbeddingJobs", {
      sessionId: session._id,
      questionId,
      status: "queued",
      requestedBy: "instructor",
      entityTypes,
      clusterJoinThreshold,
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

    const question = job.questionId ? await ctx.db.get(job.questionId) : null;
    const targets: SemanticTarget[] = [];

    if (job.entityTypes.includes("submission")) {
      const submissions = job.questionId
        ? await ctx.db
            .query("submissions")
            .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", job.questionId))
            .order("asc")
            .take(ENTITY_LIMIT)
        : await ctx.db
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
      const artifacts = job.questionId
        ? await ctx.db
            .query("synthesisArtifacts")
            .withIndex("by_questionId", (q) => q.eq("questionId", job.questionId))
            .order("desc")
            .take(ENTITY_LIMIT)
        : await ctx.db
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
      const categories = job.questionId
        ? await ctx.db
            .query("categories")
            .withIndex("by_questionId", (q) => q.eq("questionId", job.questionId))
            .take(ENTITY_LIMIT)
        : await ctx.db
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

    return { job, session, question, targets: targets.filter((target) => target.text.trim()) };
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
    questionId: v.optional(v.id("sessionQuestions")),
    entityType: entityTypeValidator,
    entityId: v.string(),
    contentHash: v.string(),
    textPreview: v.string(),
    embeddingModel: v.string(),
    dimensions: v.number(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("semanticEmbeddings")
      .withIndex("by_entity_and_hash", (q) =>
        q
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
          .eq("contentHash", args.contentHash),
      )
      .take(10);
    const existing = rows.find(
      (row) =>
        row.sessionId === args.sessionId &&
        (!args.questionId || !row.questionId || row.questionId === args.questionId),
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        questionId: existing.questionId ?? args.questionId,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    if (args.entityType === "category" || args.entityType === "synthesisArtifact") {
      const staleRows = await ctx.db
        .query("semanticEmbeddings")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", args.entityType).eq("entityId", args.entityId),
        )
        .take(20);

      for (const staleRow of staleRows) {
        if (
          staleRow.sessionId === args.sessionId &&
          (!args.questionId || !staleRow.questionId || staleRow.questionId === args.questionId)
        ) {
          await ctx.db.delete(staleRow._id);
        }
      }
    }

    return await ctx.db.insert("semanticEmbeddings", {
      sessionId: args.sessionId,
      questionId: args.questionId,
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

export const clearSemanticClustersForScope = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const members = args.questionId
      ? await ctx.db
          .query("semanticClusterMembers")
          .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
          .take(CLUSTER_MEMBER_LIMIT)
      : await ctx.db
          .query("semanticClusterMembers")
          .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
          .take(CLUSTER_MEMBER_LIMIT);
    const clusters = args.questionId
      ? await ctx.db
          .query("semanticClusters")
          .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
          .take(CLUSTER_LIMIT)
      : await ctx.db
          .query("semanticClusters")
          .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
          .take(CLUSTER_LIMIT);

    for (const member of members) {
      if (member.sessionId === args.sessionId) {
        await ctx.db.delete(member._id);
      }
    }

    for (const cluster of clusters) {
      if (cluster.sessionId === args.sessionId) {
        await ctx.db.delete(cluster._id);
      }
    }

    return { deletedMembers: members.length, deletedClusters: clusters.length };
  },
});

export const runEmbeddingJob = internalAction({
  args: {
    jobId: v.id("semanticEmbeddingJobs"),
  },
  handler: async (ctx, args) => {
    try {
      const { job, session, targets } = await ctx.runQuery(
        internal.semantic.loadEmbeddingJobContext,
        {
          jobId: args.jobId,
        },
      );
      const clusterJoinThreshold = normalizeClusterJoinThreshold(job.clusterJoinThreshold);
      await ctx.runMutation(internal.semantic.markEmbeddingJobProcessing, {
        jobId: job._id,
        progressTotal: targets.length,
      });

      let progressDone = 0;
      const submissionEmbeddings: Array<{
        submissionId: Id<"submissions">;
        embeddingId: Id<"semanticEmbeddings">;
        embedding: number[];
      }> = [];

      for (const target of targets) {
        const contentHash = await hashText(target.text);
        const result = await ctx.runAction(internal.llm.embedText, {
          sessionId: session._id,
          questionId: job.questionId,
          text: target.text.slice(0, 8000),
        });

        const embeddingId: Id<"semanticEmbeddings"> = await ctx.runMutation(
          internal.semantic.upsertEmbedding,
          {
            sessionId: session._id,
            questionId: job.questionId,
            entityType: target.entityType,
            entityId: target.entityId,
            contentHash,
            textPreview: target.text.slice(0, 240),
            embeddingModel: result.model,
            dimensions: result.dimensions,
            embedding: result.embedding,
          },
        );

        if (target.entityType === "submission") {
          submissionEmbeddings.push({
            submissionId: target.entityId as Id<"submissions">,
            embeddingId,
            embedding: result.embedding,
          });
        }
        progressDone += 1;
      }

      if (submissionEmbeddings.length > 0) {
        await ctx.runMutation(internal.semantic.clearSemanticClustersForScope, {
          sessionId: session._id,
          questionId: job.questionId,
        });

        for (const submissionEmbedding of submissionEmbeddings) {
          const nearest = await ctx.vectorSearch("semanticEmbeddings", "by_embedding", {
            vector: submissionEmbedding.embedding,
            limit: NEAREST_EMBEDDING_LIMIT,
            filter: (q) =>
              job.questionId ? q.eq("questionId", job.questionId) : q.eq("sessionId", session._id),
          });

          await ctx.runMutation(internal.semantic.assignSubmissionToSemanticCluster, {
            submissionId: submissionEmbedding.submissionId,
            clusterJoinThreshold,
            nearest: nearest
              .filter((neighbor) => neighbor._id !== submissionEmbedding.embeddingId)
              .map((neighbor) => ({
                embeddingId: neighbor._id,
                score: neighbor._score,
              })),
          });
        }
      }

      await ctx.runMutation(internal.semantic.refreshNoveltySignals, {
        sessionId: session._id,
        questionId: job.questionId,
      });
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

export const loadReclusterContext = internalQuery({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args): Promise<ReclusterContext> => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = question?._id;
    const rows = questionId
      ? await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_questionId_and_entity_type", (q) =>
            q.eq("questionId", questionId).eq("entityType", "submission"),
          )
          .take(EMBEDDING_LIMIT)
      : await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_session_and_entity_type", (q) =>
            q.eq("sessionId", session._id).eq("entityType", "submission"),
          )
          .take(EMBEDDING_LIMIT);

    return {
      sessionId: session._id,
      questionId: questionId ?? null,
      embeddings: rows
        .filter((row) => row.sessionId === session._id)
        .map((row) => ({
          embeddingId: row._id,
          submissionId: row.entityId as Id<"submissions">,
          embedding: row.embedding,
        })),
    };
  },
});

export const reclusterSimilarityMap = action({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    clusterJoinThreshold: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ processed: number; clusterJoinThreshold: number } | null> => {
    requireInstructorPreviewPassword(args.previewPassword);
    const context: ReclusterContext = await ctx.runQuery(internal.semantic.loadReclusterContext, {
      sessionSlug: args.sessionSlug,
      questionId: args.questionId,
    });

    if (!context) {
      return null;
    }

    const questionId = context.questionId ?? undefined;
    const clusterJoinThreshold = normalizeClusterJoinThreshold(args.clusterJoinThreshold);

    await ctx.runMutation(internal.semantic.clearSemanticClustersForScope, {
      sessionId: context.sessionId,
      questionId,
    });

    for (const submissionEmbedding of context.embeddings) {
      const nearest = await ctx.vectorSearch("semanticEmbeddings", "by_embedding", {
        vector: submissionEmbedding.embedding,
        limit: NEAREST_EMBEDDING_LIMIT,
        filter: (q) =>
          questionId ? q.eq("questionId", questionId) : q.eq("sessionId", context.sessionId),
      });

      await ctx.runMutation(internal.semantic.assignSubmissionToSemanticCluster, {
        submissionId: submissionEmbedding.submissionId,
        clusterJoinThreshold,
        nearest: nearest
          .filter((neighbor) => neighbor._id !== submissionEmbedding.embeddingId)
          .map((neighbor) => ({
            embeddingId: neighbor._id,
            score: neighbor._score,
          })),
      });
    }

    await ctx.runMutation(internal.semantic.refreshNoveltySignals, {
      sessionId: context.sessionId,
      questionId,
    });

    return {
      processed: context.embeddings.length,
      clusterJoinThreshold,
    };
  },
});

export const loadSubmissionEmbeddingContext = internalQuery({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      return null;
    }

    const session = await ctx.db.get(submission.sessionId);

    if (!session) {
      return null;
    }

    return { submission, session };
  },
});

export const loadEmbeddingRowsById = internalQuery({
  args: {
    embeddingIds: v.array(v.id("semanticEmbeddings")),
  },
  handler: async (ctx, args) => {
    const rows = await Promise.all(args.embeddingIds.map((embeddingId) => ctx.db.get(embeddingId)));

    return rows.filter((row): row is Doc<"semanticEmbeddings"> => Boolean(row));
  },
});

export const assignSubmissionToSemanticCluster = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    clusterJoinThreshold: v.optional(v.number()),
    nearest: v.array(
      v.object({
        embeddingId: v.id("semanticEmbeddings"),
        score: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (!submission || submission.kind === "fight_me_turn") {
      return null;
    }

    const now = Date.now();
    const isReply = Boolean(submission.parentSubmissionId);
    const rootSubmissionId = submission.parentSubmissionId ?? submission._id;
    const existingRows = await ctx.db
      .query("semanticClusterMembers")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(10);

    for (const existing of existingRows) {
      await ctx.db.delete(existing._id);
    }

    const parentMember = submission.parentSubmissionId
      ? (
          await ctx.db
            .query("semanticClusterMembers")
            .withIndex("by_submission", (q) => q.eq("submissionId", submission.parentSubmissionId!))
            .take(1)
        )[0]
      : null;
    const nearestMembers: Array<{
      member: Doc<"semanticClusterMembers">;
      score: number;
    }> = [];

    for (const neighbor of args.nearest) {
      const embedding = await ctx.db.get(neighbor.embeddingId);
      const neighborSubmissionId =
        embedding?.entityType === "submission" &&
        embedding.questionId === submission.questionId &&
        embedding.sessionId === submission.sessionId
          ? (embedding.entityId as Id<"submissions">)
          : undefined;

      if (!neighborSubmissionId || neighborSubmissionId === submission._id) {
        continue;
      }

      const member = (
        await ctx.db
          .query("semanticClusterMembers")
          .withIndex("by_submission", (q) => q.eq("submissionId", neighborSubmissionId))
          .take(1)
      )[0];

      if (member) {
        nearestMembers.push({ member, score: neighbor.score });
      }
    }

    const clusterJoinThreshold = normalizeClusterJoinThreshold(args.clusterJoinThreshold);
    const nearestCluster =
      nearestMembers.find((row) => row.score >= clusterJoinThreshold)?.member.clusterId ?? null;
    let clusterId = parentMember?.clusterId ?? nearestCluster;
    const score =
      parentMember && isReply
        ? 1
        : (nearestMembers.find((row) => row.member.clusterId === clusterId)?.score ?? 1);

    if (!clusterId) {
      const existingClusters = submission.questionId
        ? await ctx.db
            .query("semanticClusters")
            .withIndex("by_questionId", (q) => q.eq("questionId", submission.questionId))
            .take(CLUSTER_LIMIT)
        : await ctx.db
            .query("semanticClusters")
            .withIndex("by_session", (q) => q.eq("sessionId", submission.sessionId))
            .take(CLUSTER_LIMIT);

      clusterId = await ctx.db.insert("semanticClusters", {
        sessionId: submission.sessionId,
        questionId: submission.questionId,
        status: "active",
        label: `Cluster ${existingClusters.length + 1}`,
        source: "vector",
        clusterKind: "provisional",
        clusterJoinThreshold,
        rootSubmissionCount: isReply ? 0 : 1,
        messageCount: 0,
        representativeSubmissionId: isReply ? submission.parentSubmissionId : submission._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const membershipMode = isReply
      ? parentMember
        ? "reply_inherited"
        : "reply_direct"
      : "root_direct";
    const memberId = await ctx.db.insert("semanticClusterMembers", {
      sessionId: submission.sessionId,
      questionId: submission.questionId,
      clusterId,
      submissionId: submission._id,
      rootSubmissionId,
      memberKind: isReply ? "reply" : "root",
      membershipMode,
      score,
      createdAt: now,
      updatedAt: now,
    });
    const members = await ctx.db
      .query("semanticClusterMembers")
      .withIndex("by_cluster", (q) => q.eq("clusterId", clusterId))
      .take(CLUSTER_MEMBER_LIMIT);
    const rootSubmissionIds = new Set(members.map((member) => member.rootSubmissionId));

    await ctx.db.patch(clusterId, {
      rootSubmissionCount: rootSubmissionIds.size,
      messageCount: members.length,
      representativeSubmissionId: members.find((member) => member.memberKind === "root")
        ?.submissionId,
      updatedAt: now,
    });

    return await ctx.db.get(memberId);
  },
});

export const embedSubmissionAndAssign = internalAction({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.semantic.loadSubmissionEmbeddingContext, {
      submissionId: args.submissionId,
    });

    if (!context || context.submission.kind === "fight_me_turn") {
      return null;
    }

    const { submission, session } = context;
    const contentHash = await hashText(submission.body);
    const result = await ctx.runAction(internal.llm.embedText, {
      sessionId: session._id,
      questionId: submission.questionId,
      text: submission.body.slice(0, 8000),
    });
    const embeddingId: Id<"semanticEmbeddings"> = await ctx.runMutation(
      internal.semantic.upsertEmbedding,
      {
        sessionId: session._id,
        questionId: submission.questionId,
        entityType: "submission",
        entityId: submission._id,
        contentHash,
        textPreview: submission.body.slice(0, 240),
        embeddingModel: result.model,
        dimensions: result.dimensions,
        embedding: result.embedding,
      },
    );
    const nearest = await ctx.vectorSearch("semanticEmbeddings", "by_embedding", {
      vector: result.embedding,
      limit: NEAREST_EMBEDDING_LIMIT,
      filter: (q) =>
        submission.questionId
          ? q.eq("questionId", submission.questionId)
          : q.eq("sessionId", session._id),
    });

    await ctx.runMutation(internal.semantic.assignSubmissionToSemanticCluster, {
      submissionId: submission._id,
      nearest: nearest
        .filter((neighbor) => neighbor._id !== embeddingId)
        .map((neighbor) => ({
          embeddingId: neighbor._id,
          score: neighbor._score,
        })),
    });

    return { embeddingId };
  },
});

export const getSimilarityMap = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = question?._id;
    const [clusters, members, submissions, participants] = await Promise.all([
      questionId
        ? ctx.db
            .query("semanticClusters")
            .withIndex("by_questionId_and_status", (q) =>
              q.eq("questionId", questionId).eq("status", "active"),
            )
            .take(CLUSTER_LIMIT)
        : ctx.db
            .query("semanticClusters")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(CLUSTER_LIMIT),
      questionId
        ? ctx.db
            .query("semanticClusterMembers")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(CLUSTER_MEMBER_LIMIT)
        : ctx.db
            .query("semanticClusterMembers")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(CLUSTER_MEMBER_LIMIT),
      questionId
        ? ctx.db
            .query("submissions")
            .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
            .order("desc")
            .take(ENTITY_LIMIT)
        : ctx.db
            .query("submissions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(ENTITY_LIMIT),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT),
    ]);
    const submissionsById = new Map(submissions.map((submission) => [submission._id, submission]));
    const participantsById = new Map(
      participants.map((participant) => [participant._id, participant]),
    );
    const membersByCluster = new Map<Id<"semanticClusters">, typeof members>();

    for (const member of members) {
      const existing = membersByCluster.get(member.clusterId) ?? [];
      existing.push(member);
      membersByCluster.set(member.clusterId, existing);
    }

    const toMessage = (submission: Doc<"submissions">) => {
      const participant = participantsById.get(submission.participantId);

      return {
        id: submission._id,
        participantId: submission.participantId,
        nickname: participant?.nickname ?? "Unknown",
        body: submission.body,
        parentSubmissionId: submission.parentSubmissionId,
        kind: submission.kind,
        wordCount: submission.wordCount,
        createdAt: submission.createdAt,
      };
    };
    const clusterRootSizes = clusters.map(
      (cluster) =>
        (membersByCluster.get(cluster._id) ?? []).filter((member) => member.memberKind === "root")
          .length,
    );
    const averageClusterSize =
      clusterRootSizes.length > 0
        ? clusterRootSizes.reduce((sum, size) => sum + size, 0) / clusterRootSizes.length
        : 0;
    const appliedClusterJoinThreshold =
      clusters.find((cluster) => typeof cluster.clusterJoinThreshold === "number")
        ?.clusterJoinThreshold ?? DEFAULT_CLUSTER_JOIN_THRESHOLD;

    return {
      session: {
        id: session._id,
        slug: session.slug,
        title: session.title,
      },
      question: question
        ? {
            id: question._id,
            title: question.title,
            prompt: question.prompt,
            status: question.status,
          }
        : null,
      clusters: clusters.map((cluster) => {
        const clusterMembers = membersByCluster.get(cluster._id) ?? [];
        const rootMembers = clusterMembers.filter((member) => member.memberKind === "root");
        const replyMembersByRoot = new Map<Id<"submissions">, typeof members>();

        for (const member of clusterMembers) {
          if (member.memberKind !== "reply") {
            continue;
          }

          const existing = replyMembersByRoot.get(member.rootSubmissionId) ?? [];
          existing.push(member);
          replyMembersByRoot.set(member.rootSubmissionId, existing);
        }

        return {
          id: cluster._id,
          label: cluster.label,
          source: cluster.source,
          clusterKind: cluster.clusterKind,
          rootSubmissionCount: cluster.rootSubmissionCount,
          messageCount: cluster.messageCount,
          representativeSubmissionId: cluster.representativeSubmissionId,
          threads: rootMembers
            .map((member) => {
              const rootSubmission = submissionsById.get(member.submissionId);

              if (!rootSubmission) {
                return null;
              }

              return {
                root: toMessage(rootSubmission),
                membership: {
                  score: member.score,
                  membershipMode: member.membershipMode,
                },
                replies: (replyMembersByRoot.get(member.rootSubmissionId) ?? [])
                  .map((replyMember) => submissionsById.get(replyMember.submissionId))
                  .filter((submission): submission is Doc<"submissions"> => Boolean(submission))
                  .sort((left, right) => left.createdAt - right.createdAt)
                  .map(toMessage),
              };
            })
            .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread)),
          updatedAt: cluster.updatedAt,
        };
      }),
      diagnostics: {
        clusterJoinThreshold: appliedClusterJoinThreshold,
        singletonClusterCount: clusterRootSizes.filter((size) => size <= 1).length,
        averageClusterSize,
      },
      caps: {
        clusters: clusters.length === CLUSTER_LIMIT,
        members: members.length === CLUSTER_MEMBER_LIMIT,
        submissions: submissions.length === ENTITY_LIMIT,
      },
    };
  },
});

export const refreshNoveltySignals = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const embeddings = args.questionId
      ? await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_questionId_and_entity_type", (q) =>
            q.eq("questionId", args.questionId).eq("entityType", "submission"),
          )
          .take(ENTITY_LIMIT)
      : await ctx.db
          .query("semanticEmbeddings")
          .withIndex("by_session_and_entity_type", (q) =>
            q.eq("sessionId", args.sessionId).eq("entityType", "submission"),
          )
          .take(ENTITY_LIMIT);
    const existing = args.questionId
      ? await ctx.db
          .query("semanticSignals")
          .withIndex("by_questionId_and_signal_type", (q) =>
            q.eq("questionId", args.questionId).eq("signalType", "novelty"),
          )
          .take(SIGNAL_LIMIT)
      : await ctx.db
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

        maxSimilarity = Math.max(
          maxSimilarity,
          cosineSimilarity(embedding.embedding, other.embedding),
        );
      }

      const noveltyScore = Math.max(0, Math.min(1, 1 - maxSimilarity));
      const band = noveltyScore >= 0.32 ? "high" : noveltyScore >= 0.18 ? "medium" : "low";
      const submission = await ctx.db.get(embedding.entityId as Id<"submissions">);

      await ctx.db.insert("semanticSignals", {
        sessionId: args.sessionId,
        questionId: args.questionId,
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
    questionId: v.optional(v.id("sessionQuestions")),
    entityType: v.optional(entityTypeValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const rows =
      args.questionId && args.entityType
        ? await ctx.db
            .query("semanticEmbeddings")
            .withIndex("by_questionId_and_entity_type", (q) =>
              q.eq("questionId", args.questionId).eq("entityType", args.entityType!),
            )
            .take(EMBEDDING_LIMIT)
        : args.questionId
          ? await ctx.db
              .query("semanticEmbeddings")
              .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
              .take(EMBEDDING_LIMIT)
          : args.entityType
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

    return rows.filter((row) => row.sessionId === session._id).map(toEmbedding);
  },
});

export const getSemanticStatus = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = args.questionId ? question?._id : undefined;
    const [jobs, embeddings, signals, argumentLinks, aiJobs, submissions] = questionId
      ? await Promise.all([
          ctx.db
            .query("semanticEmbeddingJobs")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .order("desc")
            .take(20),
          ctx.db
            .query("semanticEmbeddings")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(EMBEDDING_LIMIT),
          ctx.db
            .query("semanticSignals")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(SIGNAL_LIMIT),
          ctx.db
            .query("argumentLinks")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(SIGNAL_LIMIT),
          ctx.db
            .query("aiJobs")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .order("desc")
            .take(80),
          ctx.db
            .query("submissions")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(ENTITY_LIMIT),
        ])
      : await Promise.all([
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
    const latestArgumentMapJob = aiJobs.find((job) => job.type === "argument_map") ?? null;
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
        canShowNoveltyRadar:
          embeddings.length > 0 && missingPrerequisites.includes("novelty_signals") === false,
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
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `semantic-refresh:${session._id}:${question?._id ?? "session"}`,
      throws: true,
    });

    return await ctx.runMutation(internal.semantic.refreshNoveltySignals, {
      sessionId: session._id,
      questionId: question?._id,
    });
  },
});

export const getNoveltyRadar = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = args.questionId ? question?._id : undefined;
    const [signals, submissions, participants, categories, assignments] = await Promise.all([
      questionId
        ? ctx.db
            .query("semanticSignals")
            .withIndex("by_questionId_and_signal_type", (q) =>
              q.eq("questionId", questionId).eq("signalType", "novelty"),
            )
            .order("desc")
            .take(SIGNAL_LIMIT)
        : ctx.db
            .query("semanticSignals")
            .withIndex("by_session_and_signal_type", (q) =>
              q.eq("sessionId", session._id).eq("signalType", "novelty"),
            )
            .order("desc")
            .take(SIGNAL_LIMIT),
      questionId
        ? ctx.db
            .query("submissions")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(ENTITY_LIMIT)
        : ctx.db
            .query("submissions")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(ENTITY_LIMIT),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(ENTITY_LIMIT),
      questionId
        ? ctx.db
            .query("categories")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(CATEGORY_LIMIT)
        : ctx.db
            .query("categories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(CATEGORY_LIMIT),
      questionId
        ? ctx.db
            .query("submissionCategories")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .order("desc")
            .take(ENTITY_LIMIT * 2)
        : ctx.db
            .query("submissionCategories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(ENTITY_LIMIT * 2),
    ]);
    const participantsById = new Map(
      participants.map((participant, index) => [participant._id, { participant, index }]),
    );
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
        const submission = signal.submissionId
          ? submissionsById.get(signal.submissionId)
          : undefined;
        const participantInfo = submission
          ? participantsById.get(submission.participantId)
          : undefined;
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
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = args.questionId ? question?._id : undefined;
    const [categories, followUps, submissions, assignments, positionShifts] = await Promise.all([
      questionId
        ? ctx.db
            .query("categories")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(CATEGORY_LIMIT)
        : ctx.db
            .query("categories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(CATEGORY_LIMIT),
      questionId
        ? ctx.db
            .query("followUpPrompts")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .take(FOLLOW_UP_LIMIT)
        : ctx.db
            .query("followUpPrompts")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(FOLLOW_UP_LIMIT),
      questionId
        ? ctx.db
            .query("submissions")
            .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
            .order("asc")
            .take(ENTITY_LIMIT)
        : ctx.db
            .query("submissions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("asc")
            .take(ENTITY_LIMIT),
      questionId
        ? ctx.db
            .query("submissionCategories")
            .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
            .order("desc")
            .take(ENTITY_LIMIT * 2)
        : ctx.db
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
    const participantSliceCategory = new Map<Id<"participants">, Map<string, Id<"categories">>>();

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
    questionId: v.optional(v.id("sessionQuestions")),
    signalType: v.optional(signalTypeValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const rows =
      args.questionId && args.signalType
        ? await ctx.db
            .query("semanticSignals")
            .withIndex("by_questionId_and_signal_type", (q) =>
              q.eq("questionId", args.questionId).eq("signalType", args.signalType!),
            )
            .order("desc")
            .take(SIGNAL_LIMIT)
        : args.questionId
          ? await ctx.db
              .query("semanticSignals")
              .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
              .order("desc")
              .take(SIGNAL_LIMIT)
          : args.signalType
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

    return rows.filter((row) => row.sessionId === session._id).map(toSignal);
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
