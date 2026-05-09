import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DEMO_SLUG = "ethics-ai-healthcare-demo";
const DEMO_JOIN_CODE = "SPARK";
const RESET_CONFIRMATION = "RESET DEMO SESSION";
const MAX_RESET_BATCH = 500;

type SessionScopedTable =
  | "participants"
  | "submissions"
  | "reactions"
  | "positionShiftEvents"
  | "categories"
  | "submissionCategories"
  | "recategorizationRequests"
  | "followUpPrompts"
  | "followUpTargets"
  | "fightThreads"
  | "fightTurns"
  | "fightDrafts"
  | "fightDebriefs"
  | "synthesisArtifacts"
  | "synthesisQuotes"
  | "personalReports"
  | "submissionFeedback"
  | "aiJobs"
  | "llmCalls"
  | "auditEvents"
  | "semanticEmbeddingJobs"
  | "semanticEmbeddings"
  | "semanticSignals"
  | "argumentLinks";

const DEMO_CATEGORIES = [
  {
    slug: "liability-law",
    name: "Liability & Law",
    description: "Responsibility gaps, insurance, and regulatory accountability.",
    color: "sky",
  },
  {
    slug: "patient-autonomy",
    name: "Patient Autonomy",
    description: "Consent, power dynamics, and patient understanding.",
    color: "rose",
  },
  {
    slug: "cost-access",
    name: "Cost & Access",
    description: "Affordability, unequal deployment, and access tradeoffs.",
    color: "green",
  },
  {
    slug: "trust-accuracy",
    name: "Trust & Accuracy",
    description: "Bias, error rates, explainability, and clinical reliability.",
    color: "amber",
  },
] as const;

const DEMO_RESPONSES = [
  {
    nickname: "Maya",
    categorySlug: "patient-autonomy",
    body: "AI should assist doctors, but patients deserve to know when an AI system shaped the diagnosis. Informed consent is not meaningful if the patient never knows a model was involved.",
    inputPattern: "composed_gradually",
    compositionMs: 142000,
    pasteEventCount: 0,
    keystrokeCount: 194,
  },
  {
    nickname: "Sam",
    categorySlug: "liability-law",
    body: "The liability gap is the real problem. If an AI misdiagnoses someone, responsibility could sit with the hospital, software vendor, clinician, or regulator, and that ambiguity weakens accountability.",
    inputPattern: "composed_gradually",
    compositionMs: 154000,
    pasteEventCount: 0,
    keystrokeCount: 216,
  },
  {
    nickname: "Priya",
    categorySlug: "trust-accuracy",
    body: "Accuracy alone is not enough. A black-box AI can be correct often but still unsafe if doctors cannot explain why it made a recommendation in edge cases.",
    inputPattern: "mixed",
    compositionMs: 38000,
    pasteEventCount: 1,
    keystrokeCount: 74,
  },
  {
    nickname: "Jake",
    categorySlug: "cost-access",
    body: "AI diagnosis could improve access in under-served clinics, but only if the technology is affordable and maintained properly. Otherwise it may widen healthcare inequality.",
    inputPattern: "composed_gradually",
    compositionMs: 121000,
    pasteEventCount: 0,
    keystrokeCount: 173,
  },
  {
    nickname: "Rina",
    categorySlug: "trust-accuracy",
    body: "I worry about dataset bias. If training data underrepresents certain communities, AI diagnostic confidence may look scientific while being systematically worse for those groups.",
    inputPattern: "composed_gradually",
    compositionMs: 168000,
    pasteEventCount: 0,
    keystrokeCount: 191,
  },
  {
    nickname: "Alex",
    categorySlug: "liability-law",
    body: "Doctors already work with probabilistic evidence. The difference with AI is not probability itself but who can audit the model and challenge the decision trail.",
    inputPattern: "likely_pasted",
    compositionMs: 7200,
    pasteEventCount: 1,
    keystrokeCount: 18,
  },
] as const;

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findDemoSession(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", DEMO_SLUG))
    .unique();
}

async function deleteBatchBySession(
  ctx: MutationCtx,
  table: SessionScopedTable,
  sessionId: Id<"sessions">,
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .take(MAX_RESET_BATCH);

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

async function countBySession(ctx: QueryCtx, table: SessionScopedTable, sessionId: Id<"sessions">) {
  return (
    await ctx.db
      .query(table)
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .take(MAX_RESET_BATCH)
  ).length;
}

export const seed = mutation({
  args: {
    resetExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await findDemoSession(ctx);

    if (existing && !args.resetExisting) {
      return {
        sessionSlug: existing.slug,
        joinCode: existing.joinCode,
        reused: true,
      };
    }

    if (existing && args.resetExisting) {
      await resetDemoSessionData(ctx, existing._id);
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      slug: DEMO_SLUG,
      joinCode: DEMO_JOIN_CODE,
      title: "[Demo] Ethics of AI in Healthcare",
      openingPrompt:
        "Should AI be allowed to make medical diagnoses without human oversight? Consider legal, ethical, and practical dimensions.",
      modePreset: "class_discussion",
      phase: "discover",
      currentAct: "discover",
      visibilityMode: "category_summary_only",
      anonymityMode: "nicknames_visible",
      responseSoftLimitWords: 200,
      categorySoftCap: 8,
      critiqueToneDefault: "spicy",
      telemetryEnabled: true,
      fightMeEnabled: true,
      summaryGateEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
    const categoryIdsBySlug = new Map<string, Id<"categories">>();

    for (const category of DEMO_CATEGORIES) {
      const categoryId = await ctx.db.insert("categories", {
        sessionId,
        slug: category.slug,
        name: category.name,
        description: category.description,
        color: category.color,
        source: "hybrid",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      categoryIdsBySlug.set(category.slug, categoryId);
    }

    const participantIdsByNickname = new Map<string, Id<"participants">>();
    const submissionIds: Id<"submissions">[] = [];

    for (const [responseIndex, response] of DEMO_RESPONSES.entries()) {
      const participantId = await ctx.db.insert("participants", {
        sessionId,
        participantSlug: response.nickname.toLowerCase(),
        nickname: response.nickname,
        role: "participant",
        clientKeyHash: await hashClientKey(`demo-${response.nickname.toLowerCase()}`),
        joinedAt: now - 12 * 60_000,
        lastSeenAt: now - responseIndex * 7_000,
        presenceState: "submitted",
      });
      const typingStartedAt = now - response.compositionMs - (responseIndex + 1) * 18_000;
      const submissionId = await ctx.db.insert("submissions", {
        sessionId,
        participantId,
        body: response.body,
        kind: "initial",
        wordCount: countWords(response.body),
        typingStartedAt,
        typingFinishedAt: typingStartedAt + response.compositionMs,
        compositionMs: response.compositionMs,
        pasteEventCount: response.pasteEventCount,
        keystrokeCount: response.keystrokeCount,
        inputPattern: response.inputPattern,
        createdAt: now - (DEMO_RESPONSES.length - responseIndex) * 55_000,
      });
      const categoryId = categoryIdsBySlug.get(response.categorySlug);

      if (categoryId) {
        await ctx.db.insert("submissionCategories", {
          sessionId,
          submissionId,
          categoryId,
          confidence: 0.86,
          rationale: "Seeded demo assignment.",
          status: "confirmed",
          createdAt: now,
        });
      }

      await ctx.db.insert("submissionFeedback", {
        sessionId,
        submissionId,
        participantId,
        status: "success",
        tone: "spicy",
        reasoningBand: response.inputPattern === "likely_pasted" ? "solid" : "strong",
        originalityBand: response.nickname === "Alex" ? "distinctive" : "above_average",
        specificityBand: "clear",
        summary: "Your response identifies a concrete issue that can be developed further.",
        strengths: "Clear claim with a relevant discussion angle.",
        improvement: "Add one example or implication to make the point harder to dismiss.",
        nextQuestion: "What would change your position?",
        createdAt: now,
        updatedAt: now,
      });

      participantIdsByNickname.set(response.nickname, participantId);
      submissionIds.push(submissionId);
    }

    await ctx.db.insert("synthesisArtifacts", {
      sessionId,
      kind: "class_synthesis",
      status: "published",
      title: "Class Synthesis",
      summary:
        "The discussion clusters around liability, patient autonomy, cost and access, and trust in model accuracy.",
      keyPoints: [
        "Liability remains unclear when model, hospital, and clinician responsibilities overlap.",
        "Consent matters because patients may not know when AI shaped a diagnosis.",
        "Access gains could be real, but uneven deployment may widen inequality.",
      ],
      uniqueInsights: [
        "Several students distinguished probabilistic medical judgment from auditable AI decision trails.",
      ],
      opposingViews: [
        "Some responses emphasized access benefits, while others prioritized accountability risks.",
      ],
      sourceCounts: { submissions: submissionIds.length, categories: DEMO_CATEGORIES.length },
      createdAt: now,
      updatedAt: now,
      generatedAt: now,
      publishedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      sessionId,
      actorType: "system",
      action: "demo.seeded",
      targetType: "session",
      targetId: sessionId,
      metadataJson: { participants: DEMO_RESPONSES.length },
      createdAt: now,
    });

    return {
      sessionSlug: DEMO_SLUG,
      joinCode: DEMO_JOIN_CODE,
      reused: false,
      participants: participantIdsByNickname.size,
      submissions: submissionIds.length,
    };
  },
});

async function resetDemoSessionData(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const tables: SessionScopedTable[] = [
    "argumentLinks",
    "semanticSignals",
    "semanticEmbeddings",
    "semanticEmbeddingJobs",
    "synthesisQuotes",
    "synthesisArtifacts",
    "personalReports",
    "fightDebriefs",
    "fightDrafts",
    "fightTurns",
    "fightThreads",
    "followUpTargets",
    "followUpPrompts",
    "recategorizationRequests",
    "submissionCategories",
    "submissionFeedback",
    "reactions",
    "positionShiftEvents",
    "aiJobs",
    "llmCalls",
    "auditEvents",
    "submissions",
    "categories",
    "participants",
  ];
  let deleted = 0;
  const perTable: Record<string, number> = {};

  for (const table of tables) {
    const count = await deleteBatchBySession(ctx, table, sessionId);
    perTable[table] = count;
    deleted += count;
  }

  return { deleted, perTable, capped: Object.values(perTable).some((count) => count === MAX_RESET_BATCH) };
}

export const resetSession = mutation({
  args: {
    sessionSlug: v.optional(v.string()),
    confirmation: v.string(),
    deleteSession: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.confirmation !== RESET_CONFIRMATION) {
      throw new Error(`Confirmation must be exactly: ${RESET_CONFIRMATION}`);
    }

    const session = args.sessionSlug
      ? await ctx.db
          .query("sessions")
          .withIndex("by_slug", (q) => q.eq("slug", args.sessionSlug!))
          .unique()
      : await findDemoSession(ctx);

    if (!session) {
      throw new Error("Demo session not found.");
    }

    if (!session.slug.includes("demo") && !session.title.toLowerCase().includes("[demo]")) {
      throw new Error("Reset is restricted to demo sessions.");
    }

    const result = await resetDemoSessionData(ctx, session._id);

    if (args.deleteSession) {
      await ctx.db.delete(session._id);
    } else {
      await ctx.db.patch(session._id, {
        phase: "lobby",
        currentAct: "submit",
        updatedAt: Date.now(),
      });
    }

    return {
      sessionSlug: session.slug,
      deletedSession: Boolean(args.deleteSession),
      ...result,
    };
  },
});

export const getDemoSession = query({
  args: {},
  handler: async (ctx) => {
    const session = await findDemoSession(ctx);

    if (!session) {
      return null;
    }

    return {
      id: session._id,
      slug: session.slug,
      joinCode: session.joinCode,
      title: session.title,
      phase: session.phase,
      currentAct: session.currentAct,
    };
  },
});

export const health = query({
  args: {
    sessionSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = args.sessionSlug
      ? await ctx.db
          .query("sessions")
          .withIndex("by_slug", (q) => q.eq("slug", args.sessionSlug!))
          .unique()
      : await findDemoSession(ctx);
    const [models, prompts, protection, toggles] = await Promise.all([
      ctx.db.query("modelSettings").take(100),
      ctx.db.query("promptTemplates").take(100),
      ctx.db
        .query("protectionSettings")
        .withIndex("by_session_and_key", (q) => q.eq("sessionId", null))
        .take(50),
      ctx.db.query("demoToggles").take(50),
    ]);
    const sessionCounts = session
      ? {
          participants: await countBySession(ctx, "participants", session._id),
          submissions: await countBySession(ctx, "submissions", session._id),
          categories: await countBySession(ctx, "categories", session._id),
          aiJobs: await countBySession(ctx, "aiJobs", session._id),
          llmCalls: await countBySession(ctx, "llmCalls", session._id),
          semanticEmbeddings: await countBySession(ctx, "semanticEmbeddings", session._id),
          argumentLinks: await countBySession(ctx, "argumentLinks", session._id),
        }
      : null;

    return {
      ok: models.length > 0 && prompts.length > 0 && protection.length > 0,
      serverTime: Date.now(),
      configured: {
        modelSettings: models.length,
        promptTemplates: prompts.length,
        protectionSettings: protection.length,
        demoToggles: toggles.length,
        components: {
          rateLimiter: true,
          aiWorkpool: true,
          actionCache: true,
          smartTags: false,
        },
      },
      session: session
        ? {
            id: session._id,
            slug: session.slug,
            title: session.title,
            phase: session.phase,
            currentAct: session.currentAct,
            counts: sessionCounts,
          }
        : null,
    };
  },
});

export const setToggle = mutation({
  args: {
    key: v.union(
      v.literal("simulateAiFailure"),
      v.literal("simulateBudgetExceeded"),
      v.literal("simulateSlowAi"),
    ),
    enabled: v.boolean(),
    valueJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("demoToggles")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        valueJson: args.valueJson ?? existing.valueJson,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const toggleId = await ctx.db.insert("demoToggles", {
      key: args.key,
      enabled: args.enabled,
      valueJson: args.valueJson ?? {},
      updatedAt: now,
    });

    return await ctx.db.get(toggleId);
  },
});

export const listToggles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("demoToggles").take(50);
  },
});

export const isToggleEnabled = internalQuery({
  args: {
    key: v.union(
      v.literal("simulateAiFailure"),
      v.literal("simulateBudgetExceeded"),
      v.literal("simulateSlowAi"),
    ),
  },
  handler: async (ctx, args) => {
    const toggle = await ctx.db
      .query("demoToggles")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return {
      enabled: Boolean(toggle?.enabled),
      valueJson: toggle?.valueJson ?? {},
    };
  },
});
