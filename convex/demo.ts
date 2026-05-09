import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DEMO_SLUG = "useless-university-lessons-demo";
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
    slug: "memorized-forgotten",
    name: "Memorized and Forgotten",
    description: "Facts, formulas, definitions, or exam content retained only long enough to pass.",
    color: "rose",
  },
  {
    slug: "bureaucracy-admin",
    name: "Bureaucracy and Admin",
    description: "Registration systems, citation rules, formatting requirements, and paperwork rituals.",
    color: "amber",
  },
  {
    slug: "abstract-theory",
    name: "Theory With No Obvious Use",
    description: "Abstract frameworks that felt detached from practical work.",
    color: "sky",
  },
  {
    slug: "accidentally-useful",
    name: "Accidentally Useful",
    description: "Things that seemed useless at the time but later helped unexpectedly.",
    color: "green",
  },
  {
    slug: "social-survival",
    name: "Social Survival Skills",
    description: "Group projects, presentations, networking, conflict management, and office-hours etiquette.",
    color: "violet",
  },
] as const;

const DEMO_RESPONSES = [
  {
    nickname: "Maya",
    categorySlug: "memorized-forgotten",
    body: "The Krebs cycle. I memorized it like a sacred poem for one exam, then immediately forgot it. The only lasting skill was learning how to panic-study complex diagrams at 2 a.m.",
    inputPattern: "composed_gradually",
    compositionMs: 142000,
    pasteEventCount: 0,
    keystrokeCount: 213,
  },
  {
    nickname: "Sam",
    categorySlug: "bureaucracy-admin",
    body: "I learned APA citation rules more deeply than the actual course content. It felt useless, but now I can spot messy references and fake authority in reports embarrassingly fast.",
    inputPattern: "composed_gradually",
    compositionMs: 154000,
    pasteEventCount: 0,
    keystrokeCount: 205,
  },
  {
    nickname: "Priya",
    categorySlug: "abstract-theory",
    body: "A whole module on post-structuralism felt like academic fog. Weirdly, it later helped me notice when workplace documents use fancy language to hide weak arguments.",
    inputPattern: "mixed",
    compositionMs: 38000,
    pasteEventCount: 1,
    keystrokeCount: 83,
  },
  {
    nickname: "Jake",
    categorySlug: "social-survival",
    body: "Group projects taught me less about the subject and more about diplomatic chasing. The useless part was the project; the useful part was learning how to get five tired people to agree.",
    inputPattern: "composed_gradually",
    compositionMs: 121000,
    pasteEventCount: 0,
    keystrokeCount: 196,
  },
  {
    nickname: "Rina",
    categorySlug: "accidentally-useful",
    body: "Statistics formulas felt pointless because software did the calculations. Then I started reading workplace dashboards and realized the formula mattered because it told me what the chart was hiding.",
    inputPattern: "composed_gradually",
    compositionMs: 168000,
    pasteEventCount: 0,
    keystrokeCount: 226,
  },
  {
    nickname: "Alex",
    categorySlug: "bureaucracy-admin",
    body: "Lab report formatting. We lost marks for margins and captions while the actual experiment barely worked. It was absurd, but it did teach me that presentation changes whether people trust your work.",
    inputPattern: "likely_pasted",
    compositionMs: 7200,
    pasteEventCount: 1,
    keystrokeCount: 24,
  },
  {
    nickname: "Noah",
    categorySlug: "social-survival",
    body: "Presentation classes felt fake because everyone knew we were pretending to be confident. Later I realized that pretending calmly while still figuring things out is basically half of professional life.",
    inputPattern: "mixed",
    compositionMs: 46000,
    pasteEventCount: 1,
    keystrokeCount: 97,
  },
  {
    nickname: "Leah",
    categorySlug: "accidentally-useful",
    body: "A required elective on art history seemed unrelated to my major. It became useful when I had to explain technical ideas visually instead of burying people in bullet points.",
    inputPattern: "composed_gradually",
    compositionMs: 133000,
    pasteEventCount: 0,
    keystrokeCount: 182,
  },
  {
    nickname: "Dan",
    categorySlug: "abstract-theory",
    body: "I thought learning argument fallacies was just exam filler. It became useful when reading meeting notes where every bad decision was dressed up as 'strategic alignment.'",
    inputPattern: "composed_gradually",
    compositionMs: 99000,
    pasteEventCount: 0,
    keystrokeCount: 151,
  },
  {
    nickname: "Zara",
    categorySlug: "memorized-forgotten",
    body: "I memorized lists of theorists and dates that evaporated after finals. The useful lesson was not the facts; it was realizing memory without context has a very short shelf life.",
    inputPattern: "composed_gradually",
    compositionMs: 110000,
    pasteEventCount: 0,
    keystrokeCount: 176,
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

async function findLegacyDemoSessions(ctx: QueryCtx | MutationCtx) {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_join_code", (q) => q.eq("joinCode", DEMO_JOIN_CODE))
    .take(20);

  return sessions.filter(
    (session) =>
      session.slug !== DEMO_SLUG &&
      (session.slug.includes("demo") || session.title.toLowerCase().includes("[demo]")),
  );
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
    const legacySessions = await findLegacyDemoSessions(ctx);

    if (existing && !args.resetExisting) {
      return {
        sessionSlug: existing.slug,
        joinCode: existing.joinCode,
        reused: true,
      };
    }

    if (!existing && legacySessions.length > 0 && !args.resetExisting) {
      throw new Error(
        `A legacy demo session already uses ${DEMO_JOIN_CODE}. Rerun seed with resetExisting: true to replace it.`,
      );
    }

    if (existing && args.resetExisting) {
      await resetDemoSessionData(ctx, existing._id);
      await ctx.db.delete(existing._id);
    }

    if (args.resetExisting) {
      for (const legacySession of legacySessions) {
        await resetDemoSessionData(ctx, legacySession._id);
        await ctx.db.delete(legacySession._id);
      }
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      slug: DEMO_SLUG,
      joinCode: DEMO_JOIN_CODE,
      title: "[Demo] Useless Things We Learned in University",
      openingPrompt:
        "What's the most useless thing you learned in university, and did it become useful later in an unexpected way?",
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
        originalityBand:
          response.categorySlug === "accidentally-useful" || response.nickname === "Priya"
            ? "distinctive"
            : "above_average",
        specificityBand: "clear",
        summary:
          "This works because it starts as a joke but points to a real transfer question: what, if anything, moved from university into life after it?",
        strengths: "Specific example, readable tone, and a clear reason the lesson felt useless.",
        improvement:
          "Push one step further: explain whether the skill itself was useless, or whether it was taught in a way that hid its value.",
        nextQuestion: "Did the lesson become useful later, or was it truly dead weight?",
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
        "The discussion turns 'useless' university lessons into a sharper split between content that evaporated after exams and skills that transferred in disguised ways.",
      keyPoints: [
        "Many supposedly useless lessons were memorized for assessment rather than understood as lasting knowledge.",
        "Admin rituals such as citations, lab formatting, and paperwork felt pointless but taught institutional fluency.",
        "Group work and presentations were disliked, yet often became practical training for workplace coordination.",
        "Some abstract theory became useful later as a way to spot weak reasoning or frame messy problems.",
      ],
      uniqueInsights: [
        "Several responses argued that the problem was not always the topic itself, but the way university separated it from real context.",
      ],
      opposingViews: [
        "Some points describe content as genuinely useless, while others suggest the same content became useful only after a later setting gave it meaning.",
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
