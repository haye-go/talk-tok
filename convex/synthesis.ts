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

type JsonRecord = Record<string, unknown>;
type ArtifactKind = Doc<"synthesisArtifacts">["kind"];
type QuoteRole = Doc<"synthesisQuotes">["quoteRole"];

const SYNTHESIS_SUBMISSION_LIMIT = 180;
const CATEGORY_SUBMISSION_LIMIT = 120;
const CATEGORY_LIMIT = 100;
const ARTIFACT_LIMIT = 80;
const QUOTE_LIMIT = 12;

const artifactKindValidator = v.union(
  v.literal("category_summary"),
  v.literal("class_synthesis"),
  v.literal("opposing_views"),
  v.literal("contribution_trace"),
  v.literal("final_summary"),
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function stringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function quoteRoleOrDefault(value: unknown): QuoteRole {
  if (
    value === "representative" ||
    value === "unique" ||
    value === "opposing" ||
    value === "follow_up" ||
    value === "fight_me"
  ) {
    return value;
  }

  return "representative";
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toArtifact(artifact: Doc<"synthesisArtifacts">, quoteCount = 0) {
  return {
    id: artifact._id,
    sessionId: artifact.sessionId,
    categoryId: artifact.categoryId,
    kind: artifact.kind,
    status: artifact.status,
    title: artifact.title,
    summary: artifact.summary,
    keyPoints: artifact.keyPoints,
    uniqueInsights: artifact.uniqueInsights,
    opposingViews: artifact.opposingViews,
    sourceCounts: artifact.sourceCounts,
    promptTemplateKey: artifact.promptTemplateKey,
    llmCallId: artifact.llmCallId,
    aiJobId: artifact.aiJobId,
    error: artifact.error,
    quoteCount,
    generatedAt: artifact.generatedAt,
    publishedAt: artifact.publishedAt,
    finalizedAt: artifact.finalizedAt,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
  };
}

function toQuote(quote: Doc<"synthesisQuotes">) {
  return {
    id: quote._id,
    artifactId: quote.artifactId,
    submissionId: quote.submissionId,
    participantId: quote.participantId,
    quote: quote.quote,
    quoteRole: quote.quoteRole,
    displayName: quote.displayName,
    anonymizedLabel: quote.anonymizedLabel,
    isVisibleToParticipants: quote.isVisibleToParticipants,
    createdAt: quote.createdAt,
  };
}

async function artifactWithQuotes(ctx: QueryCtx, artifact: Doc<"synthesisArtifacts">) {
  const quotes = await ctx.db
    .query("synthesisQuotes")
    .withIndex("by_artifact", (q) => q.eq("artifactId", artifact._id))
    .take(QUOTE_LIMIT);

  return {
    ...toArtifact(artifact, quotes.length),
    quotes: quotes.map(toQuote),
  };
}

async function createQueuedArtifact(
  ctx: MutationCtx,
  args: {
    session: Doc<"sessions">;
    categoryId?: Id<"categories">;
    kind: ArtifactKind;
    requestedBy: "instructor" | "system";
    title: string;
  },
) {
  const now = Date.now();
  const jobId = await ctx.db.insert("aiJobs", {
    sessionId: args.session._id,
    type: "synthesis",
    status: "queued",
    requestedBy: args.requestedBy,
    createdAt: now,
    updatedAt: now,
  });
  const artifactId = await ctx.db.insert("synthesisArtifacts", {
    sessionId: args.session._id,
    categoryId: args.categoryId,
    kind: args.kind,
    status: "queued",
    title: args.title,
    keyPoints: [],
    uniqueInsights: [],
    opposingViews: [],
    sourceCounts: {},
    aiJobId: jobId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.runMutation(internal.audit.record, {
    sessionId: args.session._id,
    actorType: args.requestedBy,
    action: `synthesis.${args.kind}.queued`,
    targetType: "synthesisArtifact",
    targetId: artifactId,
    metadataJson: { jobId, categoryId: args.categoryId },
  });

  return { artifactId, jobId };
}

export const generateCategorySummary = mutation({
  args: {
    sessionSlug: v.string(),
    categoryId: v.id("categories"),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const category = await ctx.db.get(args.categoryId);

    if (!session || !category || category.sessionId !== session._id) {
      throw new Error("Category not found in this session.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `synthesis:${session._id}`,
      throws: true,
    });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "synthesis",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    if (!args.forceRegenerate) {
      const existing = await ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_category", (q) => q.eq("categoryId", category._id))
        .order("desc")
        .take(10)
        .then((rows) =>
          rows.find(
            (row) =>
              row.kind === "category_summary" &&
              row.status !== "error" &&
              row.status !== "archived",
          ),
        );

      if (existing) {
        return toArtifact(existing);
      }
    }

    const { artifactId, jobId } = await createQueuedArtifact(ctx, {
      session,
      categoryId: category._id,
      kind: "category_summary",
      requestedBy: "instructor",
      title: `${category.name} Summary`,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.synthesis.generateArtifact,
      { artifactId, jobId },
      { name: "synthesis.generateArtifact", retry: true },
    );

    return toArtifact((await ctx.db.get(artifactId))!);
  },
});

export const generateClassSynthesis = mutation({
  args: {
    sessionSlug: v.string(),
    kind: v.optional(
      v.union(
        v.literal("class_synthesis"),
        v.literal("opposing_views"),
        v.literal("final_summary"),
      ),
    ),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `synthesis:${session._id}`,
      throws: true,
    });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "synthesis",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const kind = args.kind ?? "class_synthesis";

    if (!args.forceRegenerate) {
      const existing = await ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session_and_kind", (q) => q.eq("sessionId", session._id).eq("kind", kind))
        .order("desc")
        .take(10)
        .then((rows) => rows.find((row) => row.status !== "error" && row.status !== "archived"));

      if (existing) {
        return toArtifact(existing);
      }
    }

    const title =
      kind === "final_summary"
        ? "Final Discussion Summary"
        : kind === "opposing_views"
          ? "Opposing Views"
          : "Class Synthesis";
    const { artifactId, jobId } = await createQueuedArtifact(ctx, {
      session,
      kind,
      requestedBy: "instructor",
      title,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.synthesis.generateArtifact,
      { artifactId, jobId },
      { name: "synthesis.generateArtifact", retry: true },
    );

    return toArtifact((await ctx.db.get(artifactId))!);
  },
});

export const publishArtifact = mutation({
  args: {
    sessionSlug: v.string(),
    artifactId: v.id("synthesisArtifacts"),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const artifact = await ctx.db.get(args.artifactId);

    if (!session || !artifact || artifact.sessionId !== session._id) {
      throw new Error("Synthesis artifact not found in this session.");
    }

    if (artifact.status !== "draft") {
      throw new Error("Only draft synthesis artifacts can be published.");
    }

    const now = Date.now();
    await ctx.db.patch(artifact._id, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "synthesis.published",
      targetType: "synthesisArtifact",
      targetId: artifact._id,
      metadataJson: { kind: artifact.kind },
    });

    return toArtifact((await ctx.db.get(artifact._id))!);
  },
});

export const finalizeArtifact = mutation({
  args: {
    sessionSlug: v.string(),
    artifactId: v.id("synthesisArtifacts"),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const artifact = await ctx.db.get(args.artifactId);

    if (!session || !artifact || artifact.sessionId !== session._id) {
      throw new Error("Synthesis artifact not found in this session.");
    }

    if (artifact.status !== "published") {
      throw new Error("Only published synthesis artifacts can be finalized.");
    }

    const now = Date.now();
    await ctx.db.patch(artifact._id, {
      status: "final",
      finalizedAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "synthesis.finalized",
      targetType: "synthesisArtifact",
      targetId: artifact._id,
      metadataJson: { kind: artifact.kind },
    });

    return toArtifact((await ctx.db.get(artifact._id))!);
  },
});

export const archiveArtifact = mutation({
  args: {
    sessionSlug: v.string(),
    artifactId: v.id("synthesisArtifacts"),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const artifact = await ctx.db.get(args.artifactId);

    if (!session || !artifact || artifact.sessionId !== session._id) {
      throw new Error("Synthesis artifact not found in this session.");
    }

    await ctx.db.patch(artifact._id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "synthesis.archived",
      targetType: "synthesisArtifact",
      targetId: artifact._id,
      metadataJson: { kind: artifact.kind },
    });

    return toArtifact((await ctx.db.get(artifact._id))!);
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("draft"),
        v.literal("published"),
        v.literal("final"),
        v.literal("error"),
        v.literal("archived"),
      ),
    ),
    kind: v.optional(artifactKindValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const artifacts = args.status
      ? await ctx.db
          .query("synthesisArtifacts")
          .withIndex("by_session_and_status", (q) =>
            q.eq("sessionId", session._id).eq("status", args.status!),
          )
          .order("desc")
          .take(ARTIFACT_LIMIT)
      : await ctx.db
          .query("synthesisArtifacts")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(ARTIFACT_LIMIT);

    return await Promise.all(
      artifacts
        .filter((artifact) => !args.kind || artifact.kind === args.kind)
        .map((artifact) => artifactWithQuotes(ctx, artifact)),
    );
  },
});

export const listPublishedForParticipant = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    if (session.visibilityMode === "private_until_released") {
      return [];
    }

    const [published, final] = await Promise.all([
      ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "published"),
        )
        .order("desc")
        .take(ARTIFACT_LIMIT),
      ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "final"),
        )
        .order("desc")
        .take(ARTIFACT_LIMIT),
    ]);

    return await Promise.all(
      [...published, ...final]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, ARTIFACT_LIMIT)
        .map(async (artifact) => {
          const result = await artifactWithQuotes(ctx, artifact);

          return {
            ...result,
            quotes: result.quotes
              .filter((quote) => quote.isVisibleToParticipants)
              .map((quote) => ({
                ...quote,
                displayName:
                  session.anonymityMode === "anonymous_to_peers"
                    ? quote.anonymizedLabel
                    : quote.displayName,
              })),
          };
        }),
    );
  },
});

export const loadArtifactContext = internalQuery({
  args: {
    artifactId: v.id("synthesisArtifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);

    if (!artifact) {
      throw new Error("Synthesis artifact not found.");
    }

    const session = await ctx.db.get(artifact.sessionId);

    if (!session) {
      throw new Error("Synthesis session not found.");
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(CATEGORY_LIMIT);
    const category = artifact.categoryId ? await ctx.db.get(artifact.categoryId) : null;
    const categorySummaries = await ctx.db
      .query("synthesisArtifacts")
      .withIndex("by_session_and_kind", (q) =>
        q.eq("sessionId", session._id).eq("kind", "category_summary"),
      )
      .order("desc")
      .take(60);
    const submissions =
      artifact.kind === "category_summary" && category
        ? await loadCategorySubmissions(ctx, artifact.sessionId, category._id)
        : await ctx.db
            .query("submissions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("asc")
            .take(SYNTHESIS_SUBMISSION_LIMIT);

    const participantIds = new Set(submissions.map((submission) => submission.participantId));
    const participants = new Map<Id<"participants">, Doc<"participants">>();

    for (const participantId of participantIds) {
      const participant = await ctx.db.get(participantId);

      if (participant) {
        participants.set(participant._id, participant);
      }
    }

    return {
      artifact,
      session,
      category,
      categories,
      categorySummaries: categorySummaries.filter((row) => row.status !== "archived"),
      submissions,
      participants: [...participants.values()],
    };
  },
});

async function loadCategorySubmissions(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  categoryId: Id<"categories">,
) {
  const assignments = await ctx.db
    .query("submissionCategories")
    .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
    .take(CATEGORY_SUBMISSION_LIMIT);
  const submissions = [];

  for (const assignment of assignments) {
    const submission = await ctx.db.get(assignment.submissionId);

    if (submission && submission.sessionId === sessionId) {
      submissions.push(submission);
    }
  }

  return submissions.sort((a, b) => a.createdAt - b.createdAt);
}

export const markArtifactProcessing = internalMutation({
  args: {
    artifactId: v.id("synthesisArtifacts"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.artifactId, { status: "processing", updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
  },
});

export const markArtifactSuccess = internalMutation({
  args: {
    artifactId: v.id("synthesisArtifacts"),
    jobId: v.id("aiJobs"),
    title: v.string(),
    summary: v.string(),
    keyPoints: v.array(v.string()),
    uniqueInsights: v.array(v.string()),
    opposingViews: v.array(v.string()),
    sourceCounts: v.any(),
    promptTemplateKey: v.string(),
    llmCallId: v.id("llmCalls"),
    quotes: v.array(
      v.object({
        submissionId: v.id("submissions"),
        participantId: v.id("participants"),
        quote: v.string(),
        quoteRole: v.union(
          v.literal("representative"),
          v.literal("unique"),
          v.literal("opposing"),
          v.literal("follow_up"),
          v.literal("fight_me"),
        ),
        displayName: v.string(),
        anonymizedLabel: v.string(),
        isVisibleToParticipants: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);

    if (!artifact) {
      throw new Error("Synthesis artifact not found.");
    }

    const existingQuotes = await ctx.db
      .query("synthesisQuotes")
      .withIndex("by_artifact", (q) => q.eq("artifactId", artifact._id))
      .take(100);

    for (const quote of existingQuotes) {
      await ctx.db.delete(quote._id);
    }

    const now = Date.now();
    for (const quote of args.quotes.slice(0, QUOTE_LIMIT)) {
      await ctx.db.insert("synthesisQuotes", {
        artifactId: artifact._id,
        sessionId: artifact.sessionId,
        ...quote,
        createdAt: now,
      });
    }

    await ctx.db.patch(artifact._id, {
      status: "draft",
      title: args.title,
      summary: args.summary,
      keyPoints: args.keyPoints,
      uniqueInsights: args.uniqueInsights,
      opposingViews: args.opposingViews,
      sourceCounts: args.sourceCounts,
      promptTemplateKey: args.promptTemplateKey,
      llmCallId: args.llmCallId,
      error: undefined,
      generatedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: 1,
      progressTotal: 1,
      updatedAt: now,
    });
  },
});

export const markArtifactError = internalMutation({
  args: {
    artifactId: v.id("synthesisArtifacts"),
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.artifactId, { status: "error", error: args.error, updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "error", error: args.error, updatedAt: now });
  },
});

export const generateArtifact = internalAction({
  args: {
    artifactId: v.id("synthesisArtifacts"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.synthesis.markArtifactProcessing, args);

    try {
      const {
        artifact,
        session,
        category,
        categories,
        categorySummaries,
        submissions,
        participants,
      } = await ctx.runQuery(internal.synthesis.loadArtifactContext, {
        artifactId: args.artifactId,
      });
      const participantsById = new Map(
        participants.map((participant) => [participant._id, participant]),
      );
      const submissionsById = new Map(
        submissions.map((submission) => [submission._id, submission]),
      );
      const promptKey =
        artifact.kind === "category_summary"
          ? "synthesis.category.v1"
          : artifact.kind === "opposing_views"
            ? "synthesis.opposing_views.v1"
            : "synthesis.class.v1";
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        feature: "synthesis",
        promptKey,
        variables: {
          sessionTitle: session.title,
          openingPrompt: session.openingPrompt,
          categoryJson: category
            ? JSON.stringify({
                id: category._id,
                slug: category.slug,
                name: category.name,
                description: category.description,
              })
            : "{}",
          categoriesJson: JSON.stringify(
            categories.map((row) => ({
              id: row._id,
              slug: row.slug,
              name: row.name,
              description: row.description,
            })),
          ),
          submissionsJson: JSON.stringify(
            submissions.map((submission) => ({
              id: submission._id,
              participantId: submission.participantId,
              body: submission.body,
              kind: submission.kind,
              followUpPromptId: submission.followUpPromptId,
              wordCount: submission.wordCount,
            })),
          ),
          categorySummariesJson: JSON.stringify(
            categorySummaries.map((row) => ({
              id: row._id,
              categoryId: row.categoryId,
              title: row.title,
              summary: row.summary,
              keyPoints: row.keyPoints,
            })),
          ),
        },
      });
      const data = asRecord(result.data);
      const rawQuotes = Array.isArray(data.quotes) ? data.quotes : [];
      const quotes = rawQuotes
        .map((raw, index) => {
          const row = asRecord(raw);
          const submissionId = row.submissionId;

          if (typeof submissionId !== "string") {
            return null;
          }

          const submission = submissionsById.get(submissionId as Id<"submissions">);

          if (!submission) {
            return null;
          }

          const participant = participantsById.get(submission.participantId);

          return {
            submissionId: submission._id,
            participantId: submission.participantId,
            quote: stringOrFallback(row.quote, submission.body.slice(0, 220)),
            quoteRole: quoteRoleOrDefault(row.quoteRole),
            displayName: participant?.nickname ?? "Unknown",
            anonymizedLabel: `Participant ${index + 1}`,
            isVisibleToParticipants: true,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .slice(0, QUOTE_LIMIT);

      await ctx.runMutation(internal.synthesis.markArtifactSuccess, {
        artifactId: args.artifactId,
        jobId: args.jobId,
        title: stringOrFallback(data.title, artifact.title),
        summary: stringOrFallback(data.summary, "Synthesis generated."),
        keyPoints: stringArray(data.keyPoints, 10),
        uniqueInsights: stringArray(data.uniqueInsights, 8),
        opposingViews: stringArray(data.opposingViews, 8),
        sourceCounts: {
          submissions: submissions.length,
          categories: categories.length,
          generatedFrom: artifact.kind,
        },
        promptTemplateKey: promptKey,
        llmCallId: result.llmCallId,
        quotes,
      });
    } catch (error) {
      await ctx.runMutation(internal.synthesis.markArtifactError, {
        artifactId: args.artifactId,
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Synthesis generation failed.",
      });
      throw error;
    }
  },
});
