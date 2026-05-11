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
import { resolveQuestionForRead, resolveQuestionIdForWrite } from "./questionScope";

type EntityType = Doc<"argumentLinks">["sourceEntityType"];
type LinkType = Doc<"argumentLinks">["linkType"];

type ArgumentNode = {
  entityType: EntityType;
  entityId: string;
  label: string;
  body?: string;
  categoryId?: Id<"categories">;
  participantId?: Id<"participants">;
};

type GeneratedLink = {
  sourceEntityType: EntityType;
  sourceEntityId: string;
  targetEntityType: EntityType;
  targetEntityId: string;
  linkType: LinkType;
  strength: number;
  confidence: number;
  rationale?: string;
};

const CATEGORY_LIMIT = 80;
const SUBMISSION_LIMIT = 140;
const ARTIFACT_LIMIT = 80;
const LINK_LIMIT = 320;
const NODE_BODY_LIMIT = 220;

const entityTypeValidator = v.union(
  v.literal("submission"),
  v.literal("category"),
  v.literal("synthesisArtifact"),
  v.literal("fightThread"),
);

const linkTypeValidator = v.union(
  v.literal("supports"),
  v.literal("contradicts"),
  v.literal("extends"),
  v.literal("questions"),
  v.literal("bridges"),
);

const generatedLinkValidator = v.object({
  sourceEntityType: entityTypeValidator,
  sourceEntityId: v.string(),
  targetEntityType: entityTypeValidator,
  targetEntityId: v.string(),
  linkType: linkTypeValidator,
  strength: v.number(),
  confidence: v.number(),
  rationale: v.optional(v.string()),
});

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function clamp01(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function isEntityType(value: unknown): value is EntityType {
  return (
    value === "submission" ||
    value === "category" ||
    value === "synthesisArtifact" ||
    value === "fightThread"
  );
}

function isLinkType(value: unknown): value is LinkType {
  return (
    value === "supports" ||
    value === "contradicts" ||
    value === "extends" ||
    value === "questions" ||
    value === "bridges"
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function preview(value: string, limit = NODE_BODY_LIMIT) {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

function artifactText(artifact: Doc<"synthesisArtifacts">) {
  return [
    artifact.summary,
    ...artifact.keyPoints,
    ...artifact.uniqueInsights,
    ...artifact.opposingViews,
  ]
    .filter(Boolean)
    .join(" ");
}

function toLink(row: Doc<"argumentLinks">) {
  return {
    id: row._id,
    questionId: row.questionId,
    sourceEntityType: row.sourceEntityType,
    sourceEntityId: row.sourceEntityId,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId,
    linkType: row.linkType,
    strength: row.strength,
    confidence: row.confidence,
    rationale: row.rationale,
    source: row.source,
    aiJobId: row.aiJobId,
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

function nodeKey(entityType: EntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

export const generateForSession = mutation({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    refreshExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `argument-map:${session._id}:${questionId}`,
      throws: true,
    });

    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "argument_map",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId,
      type: "argument_map",
      status: "queued",
      requestedBy: "instructor",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "argument_map.generate_requested",
      targetType: "aiJob",
      targetId: jobId,
      metadataJson: { refreshExisting: Boolean(args.refreshExisting) },
      createdAt: now,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.argumentMap.runGenerateForSession,
      { jobId, refreshExisting: args.refreshExisting ?? true },
      { name: "argumentMap.runGenerateForSession", retry: true },
    );

    return await ctx.db.get(jobId);
  },
});

export const loadArgumentContext = internalQuery({
  args: {
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Argument map job not found.");
    }

    const session = await ctx.db.get(job.sessionId);

    if (!session) {
      throw new Error("Session not found for argument map job.");
    }

    const question = job.questionId ? await ctx.db.get(job.questionId) : null;
    const [categories, submissions, artifacts, assignments] = job.questionId
      ? await Promise.all([
          ctx.db
            .query("categories")
            .withIndex("by_questionId", (q) => q.eq("questionId", job.questionId))
            .take(CATEGORY_LIMIT),
          ctx.db
            .query("submissions")
            .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", job.questionId))
            .order("asc")
            .take(SUBMISSION_LIMIT),
          ctx.db
            .query("synthesisArtifacts")
            .withIndex("by_questionId", (q) => q.eq("questionId", job.questionId))
            .order("desc")
            .take(ARTIFACT_LIMIT),
          ctx.db
            .query("submissionCategories")
            .withIndex("by_questionId", (q) => q.eq("questionId", job.questionId))
            .take(SUBMISSION_LIMIT * 2),
        ])
      : await Promise.all([
          ctx.db
            .query("categories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(CATEGORY_LIMIT),
          ctx.db
            .query("submissions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("asc")
            .take(SUBMISSION_LIMIT),
          ctx.db
            .query("synthesisArtifacts")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(ARTIFACT_LIMIT),
          ctx.db
            .query("submissionCategories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(SUBMISSION_LIMIT * 2),
        ]);
    const categoryBySubmission = new Map(
      assignments.map((assignment) => [assignment.submissionId, assignment.categoryId]),
    );

    return {
      job,
      session: {
        id: session._id,
        title: session.title,
        openingPrompt: question?.prompt ?? session.openingPrompt,
      },
      categories: categories
        .filter((category) => category.status === "active")
        .map((category) => ({
          id: category._id,
          slug: category.slug,
          name: category.name,
          description: category.description ?? "",
        })),
      submissions: submissions.map((submission) => ({
        id: submission._id,
        participantId: submission.participantId,
        categoryId: categoryBySubmission.get(submission._id),
        kind: submission.kind,
        body: submission.body,
      })),
      artifacts: artifacts.map((artifact) => ({
        id: artifact._id,
        categoryId: artifact.categoryId,
        kind: artifact.kind,
        status: artifact.status,
        title: artifact.title,
        text: artifactText(artifact),
      })),
    };
  },
});

export const markJobProcessing = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
      updatedAt: Date.now(),
    });
  },
});

export const markJobSuccess = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
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

export const markJobError = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
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

export const applyGeneratedLinks = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
    jobId: v.id("aiJobs"),
    refreshExisting: v.boolean(),
    links: v.array(generatedLinkValidator),
  },
  handler: async (ctx, args) => {
    if (args.refreshExisting) {
      const existing = args.questionId
        ? await ctx.db
            .query("argumentLinks")
            .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
            .take(LINK_LIMIT)
        : await ctx.db
            .query("argumentLinks")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .take(LINK_LIMIT);

      for (const link of existing) {
        if (link.sessionId === args.sessionId && link.source === "llm") {
          await ctx.db.delete(link._id);
        }
      }
    }

    const now = Date.now();
    let inserted = 0;

    for (const link of args.links.slice(0, LINK_LIMIT)) {
      await ctx.db.insert("argumentLinks", {
        sessionId: args.sessionId,
        questionId: args.questionId,
        sourceEntityType: link.sourceEntityType,
        sourceEntityId: link.sourceEntityId,
        targetEntityType: link.targetEntityType,
        targetEntityId: link.targetEntityId,
        linkType: link.linkType,
        strength: link.strength,
        confidence: link.confidence,
        rationale: link.rationale,
        source: "llm",
        aiJobId: args.jobId,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted };
  },
});

export const runGenerateForSession = internalAction({
  args: {
    jobId: v.id("aiJobs"),
    refreshExisting: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const context = await ctx.runQuery(internal.argumentMap.loadArgumentContext, {
        jobId: args.jobId,
      });
      await ctx.runMutation(internal.argumentMap.markJobProcessing, { jobId: args.jobId });

      const validNodeKeys = new Set<string>();
      for (const category of context.categories) {
        validNodeKeys.add(`category:${category.id}`);
      }
      for (const submission of context.submissions) {
        validNodeKeys.add(`submission:${submission.id}`);
      }
      for (const artifact of context.artifacts) {
        validNodeKeys.add(`synthesisArtifact:${artifact.id}`);
      }

      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: context.job.sessionId,
        questionId: context.job.questionId,
        feature: "argument_map",
        promptKey: "argument_map.session.v1",
        variables: {
          sessionTitle: context.session.title,
          openingPrompt: context.session.openingPrompt,
          categoriesJson: JSON.stringify(context.categories),
          submissionsJson: JSON.stringify(context.submissions),
          artifactsJson: JSON.stringify(context.artifacts),
        },
      });
      const rawLinks = Array.isArray(result.data.links) ? result.data.links : [];
      const links: GeneratedLink[] = [];

      for (const rawLink of rawLinks) {
        const link = asRecord(rawLink);
        const sourceEntityType = link.sourceEntityType;
        const targetEntityType = link.targetEntityType;
        const linkType = link.linkType;
        const sourceEntityId = typeof link.sourceEntityId === "string" ? link.sourceEntityId : "";
        const targetEntityId = typeof link.targetEntityId === "string" ? link.targetEntityId : "";

        if (
          !isEntityType(sourceEntityType) ||
          !isEntityType(targetEntityType) ||
          !isLinkType(linkType) ||
          !validNodeKeys.has(`${sourceEntityType}:${sourceEntityId}`) ||
          !validNodeKeys.has(`${targetEntityType}:${targetEntityId}`) ||
          sourceEntityId === targetEntityId
        ) {
          continue;
        }

        links.push({
          sourceEntityType,
          sourceEntityId,
          targetEntityType,
          targetEntityId,
          linkType,
          strength: clamp01(link.strength, 0.5),
          confidence: clamp01(link.confidence, 0.5),
          rationale: typeof link.rationale === "string" ? link.rationale.slice(0, 500) : undefined,
        });
      }

      const applied = await ctx.runMutation(internal.argumentMap.applyGeneratedLinks, {
        sessionId: context.job.sessionId,
        questionId: context.job.questionId,
        jobId: args.jobId,
        refreshExisting: args.refreshExisting,
        links,
      });
      await ctx.runMutation(internal.argumentMap.markJobSuccess, {
        jobId: args.jobId,
        progressDone: applied.inserted,
      });
    } catch (error) {
      await ctx.runMutation(internal.argumentMap.markJobError, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Argument map generation failed.",
      });
      throw error;
    }
  },
});

export const listLinksForSession = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const rows =
      args.questionId && question
        ? await ctx.db
            .query("argumentLinks")
            .withIndex("by_questionId", (q) => q.eq("questionId", question._id))
            .order("desc")
            .take(LINK_LIMIT)
        : await ctx.db
            .query("argumentLinks")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(LINK_LIMIT);

    return rows.filter((row) => row.sessionId === session._id).map(toLink);
  },
});

export const getGraph = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = args.questionId ? question?._id : undefined;
    const [categories, submissions, participants, artifacts, assignments, links] =
      await Promise.all([
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
              .query("submissions")
              .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(SUBMISSION_LIMIT)
          : ctx.db
              .query("submissions")
              .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(SUBMISSION_LIMIT),
        ctx.db
          .query("participants")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(SUBMISSION_LIMIT),
        questionId
          ? ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(ARTIFACT_LIMIT)
          : ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(ARTIFACT_LIMIT),
        questionId
          ? ctx.db
              .query("submissionCategories")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .take(SUBMISSION_LIMIT * 2)
          : ctx.db
              .query("submissionCategories")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .take(SUBMISSION_LIMIT * 2),
        questionId
          ? ctx.db
              .query("argumentLinks")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(LINK_LIMIT)
          : ctx.db
              .query("argumentLinks")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(LINK_LIMIT),
      ]);
    const participantsById = new Map(
      participants.map((participant) => [participant._id, participant]),
    );
    const categoryBySubmission = new Map(
      assignments.map((assignment) => [assignment.submissionId, assignment.categoryId]),
    );
    const nodes: ArgumentNode[] = [
      ...categories
        .filter((category) => category.status === "active")
        .map((category) => ({
          entityType: "category" as const,
          entityId: category._id,
          label: category.name,
          body: category.description,
        })),
      ...submissions.map((submission) => {
        const participant = participantsById.get(submission.participantId);

        return {
          entityType: "submission" as const,
          entityId: submission._id,
          label: participant ? `${participant.nickname}'s response` : "Participant response",
          body: preview(submission.body),
          categoryId: categoryBySubmission.get(submission._id),
          participantId: submission.participantId,
        };
      }),
      ...artifacts.map((artifact) => ({
        entityType: "synthesisArtifact" as const,
        entityId: artifact._id,
        label: artifact.title,
        body: preview(artifactText(artifact)),
        categoryId: artifact.categoryId,
      })),
    ];

    return {
      session: {
        id: session._id,
        slug: session.slug,
        title: session.title,
      },
      nodes,
      links: links.map(toLink),
      caps: {
        categoriesCapped: categories.length === CATEGORY_LIMIT,
        submissionsCapped: submissions.length === SUBMISSION_LIMIT,
        artifactsCapped: artifacts.length === ARTIFACT_LIMIT,
        linksCapped: links.length === LINK_LIMIT,
      },
    };
  },
});

export const getVisualizationGraph = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);
    const questionId = args.questionId ? question?._id : undefined;
    const [categories, submissions, participants, artifacts, assignments, links, reactions] =
      await Promise.all([
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
              .query("submissions")
              .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(SUBMISSION_LIMIT)
          : ctx.db
              .query("submissions")
              .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(SUBMISSION_LIMIT),
        ctx.db
          .query("participants")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(SUBMISSION_LIMIT),
        questionId
          ? ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(ARTIFACT_LIMIT)
          : ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(ARTIFACT_LIMIT),
        questionId
          ? ctx.db
              .query("submissionCategories")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .take(SUBMISSION_LIMIT * 2)
          : ctx.db
              .query("submissionCategories")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .take(SUBMISSION_LIMIT * 2),
        questionId
          ? ctx.db
              .query("argumentLinks")
              .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
              .order("desc")
              .take(LINK_LIMIT)
          : ctx.db
              .query("argumentLinks")
              .withIndex("by_session", (q) => q.eq("sessionId", session._id))
              .order("desc")
              .take(LINK_LIMIT),
        ctx.db
          .query("reactions")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(SUBMISSION_LIMIT * 3),
      ]);
    const participantsById = new Map(
      participants.map((participant, index) => [participant._id, { participant, index }]),
    );
    const categoriesById = new Map(categories.map((category) => [category._id, category]));
    const categoryBySubmission = new Map<Id<"submissions">, Id<"categories">>();
    const submissionCountsByCategory = new Map<Id<"categories">, number>();
    const reactionCountsBySubmission = new Map<Id<"submissions">, number>();
    const degreeByNodeKey = new Map<string, number>();

    for (const assignment of assignments) {
      if (!categoryBySubmission.has(assignment.submissionId)) {
        categoryBySubmission.set(assignment.submissionId, assignment.categoryId);
        submissionCountsByCategory.set(
          assignment.categoryId,
          (submissionCountsByCategory.get(assignment.categoryId) ?? 0) + 1,
        );
      }
    }

    for (const reaction of reactions) {
      reactionCountsBySubmission.set(
        reaction.submissionId,
        (reactionCountsBySubmission.get(reaction.submissionId) ?? 0) + 1,
      );
    }

    for (const link of links) {
      const sourceKey = nodeKey(link.sourceEntityType, link.sourceEntityId);
      const targetKey = nodeKey(link.targetEntityType, link.targetEntityId);
      degreeByNodeKey.set(sourceKey, (degreeByNodeKey.get(sourceKey) ?? 0) + 1);
      degreeByNodeKey.set(targetKey, (degreeByNodeKey.get(targetKey) ?? 0) + 1);
    }

    const activeCategories = categories.filter((category) => category.status === "active");
    const categoryOrder = new Map(activeCategories.map((category, index) => [category._id, index]));
    const nodes = [
      ...activeCategories.map((category) => {
        const key = nodeKey("category", category._id);
        const count = submissionCountsByCategory.get(category._id) ?? 0;

        return {
          nodeKey: key,
          entityType: "category" as const,
          entityId: category._id,
          label: category.name,
          body: category.description,
          categoryId: category._id,
          categorySlug: category.slug,
          categoryName: category.name,
          categoryColor: category.color,
          weight: 2 + count + (degreeByNodeKey.get(key) ?? 0),
          radiusScore: Math.min(1, 0.35 + count / 12),
          clusterKey: category.slug,
          colorKey: category.color ?? category.slug,
          xHint: (categoryOrder.get(category._id) ?? 0) * 120,
          yHint: 0,
        };
      }),
      ...submissions.map((submission) => {
        const categoryId = categoryBySubmission.get(submission._id);
        const category = categoryId ? categoriesById.get(categoryId) : undefined;
        const participantInfo = participantsById.get(submission.participantId);
        const key = nodeKey("submission", submission._id);
        const reactionCount = reactionCountsBySubmission.get(submission._id) ?? 0;

        return {
          nodeKey: key,
          entityType: "submission" as const,
          entityId: submission._id,
          label: participantLabel(
            session,
            participantInfo?.participant,
            participantInfo?.index ?? 0,
          ),
          body: preview(submission.body),
          categoryId,
          categorySlug: category?.slug,
          categoryName: category?.name,
          categoryColor: category?.color,
          participantId: submission.participantId,
          weight: 1 + reactionCount + (degreeByNodeKey.get(key) ?? 0),
          radiusScore: Math.min(
            1,
            0.25 + reactionCount / 10 + (degreeByNodeKey.get(key) ?? 0) / 12,
          ),
          clusterKey: category?.slug ?? "uncategorized",
          colorKey: category?.color ?? "uncategorized",
          xHint:
            ((categoryId ? categoryOrder.get(categoryId) : undefined) ?? activeCategories.length) *
            120,
          yHint: 120 + reactionCount * 8,
        };
      }),
      ...artifacts.map((artifact, index) => {
        const category = artifact.categoryId ? categoriesById.get(artifact.categoryId) : undefined;
        const key = nodeKey("synthesisArtifact", artifact._id);

        return {
          nodeKey: key,
          entityType: "synthesisArtifact" as const,
          entityId: artifact._id,
          label: artifact.title,
          body: preview(artifactText(artifact)),
          categoryId: artifact.categoryId,
          categorySlug: category?.slug,
          categoryName: category?.name,
          categoryColor: category?.color,
          weight: 2 + (degreeByNodeKey.get(key) ?? 0),
          radiusScore: Math.min(1, 0.45 + (degreeByNodeKey.get(key) ?? 0) / 10),
          clusterKey: category?.slug ?? "synthesis",
          colorKey: category?.color ?? "synthesis",
          xHint:
            ((artifact.categoryId ? categoryOrder.get(artifact.categoryId) : undefined) ?? index) *
            120,
          yHint: 260,
        };
      }),
    ];
    const nodeKeys = new Set(nodes.map((node) => node.nodeKey));
    const edges = links
      .map((link) => {
        const sourceKey = nodeKey(link.sourceEntityType, link.sourceEntityId);
        const targetKey = nodeKey(link.targetEntityType, link.targetEntityId);

        return {
          id: link._id,
          sourceKey,
          targetKey,
          sourceEntityType: link.sourceEntityType,
          sourceEntityId: link.sourceEntityId,
          targetEntityType: link.targetEntityType,
          targetEntityId: link.targetEntityId,
          linkType: link.linkType,
          strength: link.strength,
          confidence: link.confidence,
          weight: Math.max(0.05, link.strength * link.confidence),
          rationale: link.rationale,
          source: link.source,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt,
        };
      })
      .filter((edge) => nodeKeys.has(edge.sourceKey) && nodeKeys.has(edge.targetKey));

    return {
      session: {
        id: session._id,
        slug: session.slug,
        title: session.title,
      },
      nodes,
      edges,
      layout: {
        suggestedRenderer: "force",
        clusterField: "clusterKey",
        colorField: "colorKey",
        radiusField: "radiusScore",
      },
      caps: {
        categoriesCapped: categories.length === CATEGORY_LIMIT,
        submissionsCapped: submissions.length === SUBMISSION_LIMIT,
        artifactsCapped: artifacts.length === ARTIFACT_LIMIT,
        linksCapped: links.length === LINK_LIMIT,
        reactionsCapped: reactions.length === SUBMISSION_LIMIT * 3,
      },
    };
  },
});
