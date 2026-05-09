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

export const generateForSession = mutation({
  args: {
    sessionSlug: v.string(),
    refreshExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `argument-map:${session._id}`,
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
      type: "argument_map",
      status: "queued",
      requestedBy: "instructor",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      sessionId: session._id,
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
      { jobId, refreshExisting: Boolean(args.refreshExisting) },
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

    const [categories, submissions, artifacts, assignments] = await Promise.all([
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
        openingPrompt: session.openingPrompt,
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
    jobId: v.id("aiJobs"),
    refreshExisting: v.boolean(),
    links: v.array(generatedLinkValidator),
  },
  handler: async (ctx, args) => {
    if (args.refreshExisting) {
      const existing = await ctx.db
        .query("argumentLinks")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(LINK_LIMIT);

      for (const link of existing) {
        if (link.source === "llm") {
          await ctx.db.delete(link._id);
        }
      }
    }

    const now = Date.now();
    let inserted = 0;

    for (const link of args.links.slice(0, LINK_LIMIT)) {
      await ctx.db.insert("argumentLinks", {
        sessionId: args.sessionId,
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
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const rows = await ctx.db
      .query("argumentLinks")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(LINK_LIMIT);

    return rows.map(toLink);
  },
});

export const getGraph = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [categories, submissions, participants, artifacts, assignments, links] =
      await Promise.all([
        ctx.db
          .query("categories")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(CATEGORY_LIMIT),
        ctx.db
          .query("submissions")
          .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(SUBMISSION_LIMIT),
        ctx.db
          .query("participants")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
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
        ctx.db
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
