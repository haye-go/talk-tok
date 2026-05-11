import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { createDefaultQuestionForSession } from "./sessionQuestions";

const FOOD_DEMO_SLUG = "best-food-for-a-hackathon-live";
const RESET_CONFIRMATION = "RESET FOOD HACKATHON SESSION";
const MAX_RESET_BATCH = 500;
const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

const FOOD_CATEGORIES = [
  {
    slug: "sustained-energy",
    name: "Sustained Energy",
    description: "Foods that keep people alert without a crash.",
    color: "green",
  },
  {
    slug: "clean-keyboard-safe",
    name: "Clean and Keyboard-Safe",
    description: "Low-mess foods that will not destroy laptops, mice, or shared tables.",
    color: "sky",
  },
  {
    slug: "shareable-crowd-food",
    name: "Shareable Crowd Food",
    description:
      "Pizza, sushi platters, sandwiches, wraps, snacks, and other group-friendly options.",
    color: "amber",
  },
  {
    slug: "comfort-morale",
    name: "Comfort and Morale",
    description: "Foods that lift mood, reduce stress, or become part of the event memory.",
    color: "rose",
  },
  {
    slug: "caffeine-sugar",
    name: "Caffeine and Sugar",
    description: "Drinks, desserts, candy, and high-speed fuel.",
    color: "violet",
  },
  {
    slug: "dietary-inclusive",
    name: "Dietary Inclusive",
    description: "Vegetarian, halal, allergy-aware, gluten-free, and other inclusive options.",
    color: "slate",
  },
] as const;

const WARM_START_RESPONSES = [
  {
    nickname: "Mira",
    categorySlug: "sustained-energy",
    body: "Bananas and peanut butter. Not glamorous, but it is cheap, quick, and does not make your keyboard look like a crime scene.",
    inputPattern: "composed_gradually",
    compositionMs: 74000,
    pasteEventCount: 0,
    keystrokeCount: 132,
  },
  {
    nickname: "Dev",
    categorySlug: "shareable-crowd-food",
    body: "Pizza wins because nobody needs instructions. The downside is grease, but the upside is that it turns tired strangers into a team.",
    inputPattern: "mixed",
    compositionMs: 38000,
    pasteEventCount: 1,
    keystrokeCount: 78,
  },
  {
    nickname: "Kai",
    categorySlug: "clean-keyboard-safe",
    body: "Sushi rolls are underrated. Clean, bite-sized, shareable, and you can eat without falling into a carb coma before judging.",
    inputPattern: "composed_gradually",
    compositionMs: 68000,
    pasteEventCount: 0,
    keystrokeCount: 119,
  },
  {
    nickname: "Nora",
    categorySlug: "caffeine-sugar",
    body: "Good coffee plus fruit is the best combo. Coffee keeps people moving, fruit stops the room from becoming pure sugar panic.",
    inputPattern: "likely_pasted",
    compositionMs: 6400,
    pasteEventCount: 1,
    keystrokeCount: 22,
  },
] as const;

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeJoinCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function generateJoinCode(length = 5) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (value) => SESSION_CODE_ALPHABET[value % SESSION_CODE_ALPHABET.length])
    .join("")
    .toUpperCase();
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findFoodSession(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", FOOD_DEMO_SLUG))
    .unique();
}

async function findSessionByJoinCode(ctx: QueryCtx | MutationCtx, joinCode: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
    .unique();
}

async function createUniqueJoinCode(ctx: MutationCtx, requestedCode?: string) {
  if (requestedCode) {
    const joinCode = normalizeJoinCode(requestedCode);

    if (joinCode.length < 4) {
      throw new Error("Session code must be at least 4 letters or numbers.");
    }

    const existing = await findSessionByJoinCode(ctx, joinCode);

    if (existing && existing.slug !== FOOD_DEMO_SLUG) {
      throw new Error("That session code is already in use.");
    }

    return joinCode;
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = generateJoinCode();
    const existing = await findSessionByJoinCode(ctx, candidate);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique session code.");
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

async function resetFoodSessionData(ctx: MutationCtx, sessionId: Id<"sessions">) {
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
  const questionCount = await deleteSessionQuestionsBySession(ctx, sessionId);
  perTable.sessionQuestions = questionCount;
  deleted += questionCount;

  return {
    deleted,
    perTable,
    capped: Object.values(perTable).some((count) => count === MAX_RESET_BATCH),
  };
}

async function countBySession(ctx: QueryCtx, table: SessionScopedTable, sessionId: Id<"sessions">) {
  return (
    await ctx.db
      .query(table)
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .take(MAX_RESET_BATCH)
  ).length;
}

async function deleteSessionQuestionsBySession(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const rows = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .take(MAX_RESET_BATCH);

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

async function countSessionQuestionsBySession(ctx: QueryCtx, sessionId: Id<"sessions">) {
  return (
    await ctx.db
      .query("sessionQuestions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .take(MAX_RESET_BATCH)
  ).length;
}

async function seedCategories(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  questionId: Id<"sessionQuestions">,
  now: number,
) {
  const categoryIdsBySlug = new Map<string, Id<"categories">>();

  for (const category of FOOD_CATEGORIES) {
    const categoryId = await ctx.db.insert("categories", {
      sessionId,
      questionId,
      slug: category.slug,
      name: category.name,
      description: category.description,
      color: category.color,
      source: "instructor",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    categoryIdsBySlug.set(category.slug, categoryId);
  }

  return categoryIdsBySlug;
}

async function seedWarmStart(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"sessions">;
    questionId: Id<"sessionQuestions">;
    now: number;
    categoryIdsBySlug: Map<string, Id<"categories">>;
  },
) {
  for (const [index, response] of WARM_START_RESPONSES.entries()) {
    const participantId = await ctx.db.insert("participants", {
      sessionId: args.sessionId,
      participantSlug: response.nickname.toLowerCase(),
      nickname: response.nickname,
      role: "participant",
      clientKeyHash: await hashClientKey(`stage-demo-${response.nickname.toLowerCase()}`),
      joinedAt: args.now - 8 * 60_000,
      lastSeenAt: args.now - index * 9_000,
      presenceState: "submitted",
    });
    const typingStartedAt = args.now - response.compositionMs - (index + 1) * 20_000;
    const submissionId = await ctx.db.insert("submissions", {
      sessionId: args.sessionId,
      questionId: args.questionId,
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
      createdAt: args.now - (WARM_START_RESPONSES.length - index) * 45_000,
    });
    const categoryId = args.categoryIdsBySlug.get(response.categorySlug);

    if (categoryId) {
      await ctx.db.insert("submissionCategories", {
        sessionId: args.sessionId,
        questionId: args.questionId,
        submissionId,
        categoryId,
        confidence: 0.88,
        rationale: "Warm-start stage demo assignment.",
        status: "confirmed",
        createdAt: args.now,
      });
    }

    await ctx.db.insert("submissionFeedback", {
      sessionId: args.sessionId,
      submissionId,
      participantId,
      status: "success",
      tone: "spicy",
      reasoningBand: "solid",
      originalityBand: response.inputPattern === "likely_pasted" ? "common" : "above_average",
      specificityBand: "clear",
      summary:
        "Good hackathon-food answer: practical, easy to argue with, and specific enough for categorisation.",
      strengths: "It gives a concrete food choice and at least one practical reason.",
      improvement:
        "Add one morale reason or one inclusion concern to make the answer harder to dismiss.",
      nextQuestion: "Would this still work for a 24-hour hackathon with mixed dietary needs?",
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
}

export const seedFoodHackathon = mutation({
  args: {
    resetExisting: v.optional(v.boolean()),
    includeWarmStart: v.optional(v.boolean()),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await findFoodSession(ctx);

    if (existing && !args.resetExisting) {
      return {
        sessionId: existing._id,
        slug: existing.slug,
        joinCode: existing.joinCode,
        joinPath: `/join/${existing.joinCode}`,
        instructorPath: `/instructor/session/${existing.slug}`,
        participantCount: await countBySession(ctx, "participants", existing._id),
        categoryCount: await countBySession(ctx, "categories", existing._id),
        questionCount: await countSessionQuestionsBySession(ctx, existing._id),
        warmStartIncluded: false,
        reused: true,
      };
    }

    if (existing && args.resetExisting) {
      await resetFoodSessionData(ctx, existing._id);
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    const joinCode = await createUniqueJoinCode(ctx, args.joinCode);
    const sessionId = await ctx.db.insert("sessions", {
      slug: FOOD_DEMO_SLUG,
      joinCode,
      title: "Best Food for a Hackathon",
      openingPrompt:
        "What's the best food for a hackathon? Defend your answer with one practical reason and one morale reason.",
      modePreset: "class_discussion",
      phase: "submit",
      currentAct: "submit",
      visibilityMode: "private_until_released",
      anonymityMode: "nicknames_visible",
      responseSoftLimitWords: 200,
      categorySoftCap: 6,
      critiqueToneDefault: "spicy",
      telemetryEnabled: true,
      fightMeEnabled: true,
      summaryGateEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new Error("Stage demo session was not created.");
    }

    const questionId = await createDefaultQuestionForSession(ctx, session, now);

    const categoryIdsBySlug = await seedCategories(ctx, sessionId, questionId, now);

    if (args.includeWarmStart) {
      await seedWarmStart(ctx, {
        sessionId,
        questionId,
        now,
        categoryIdsBySlug,
      });
    }

    await ctx.db.insert("auditEvents", {
      sessionId,
      actorType: "system",
      action: "stageDemo.food.seeded",
      targetType: "session",
      targetId: sessionId,
      metadataJson: {
        includeWarmStart: Boolean(args.includeWarmStart),
        categoryCount: FOOD_CATEGORIES.length,
      },
      createdAt: now,
    });

    return {
      sessionId,
      slug: FOOD_DEMO_SLUG,
      joinCode,
      joinPath: `/join/${joinCode}`,
      instructorPath: `/instructor/session/${FOOD_DEMO_SLUG}`,
      participantCount: args.includeWarmStart ? WARM_START_RESPONSES.length : 0,
      categoryCount: FOOD_CATEGORIES.length,
      questionCount: 1,
      warmStartIncluded: Boolean(args.includeWarmStart),
      reused: false,
    };
  },
});

export const getFoodHackathonSession = query({
  args: {},
  handler: async (ctx) => {
    const session = await findFoodSession(ctx);

    if (!session) {
      return null;
    }

    return {
      id: session._id,
      slug: session.slug,
      joinCode: session.joinCode,
      title: session.title,
      openingPrompt: session.openingPrompt,
      phase: session.phase,
      currentAct: session.currentAct,
      visibilityMode: session.visibilityMode,
      participantCount: await countBySession(ctx, "participants", session._id),
      submissionCount: await countBySession(ctx, "submissions", session._id),
      categoryCount: await countBySession(ctx, "categories", session._id),
      questionCount: await countSessionQuestionsBySession(ctx, session._id),
      joinPath: `/join/${session.joinCode}`,
      instructorPath: `/instructor/session/${session.slug}`,
    };
  },
});

export const resetFoodHackathonSession = mutation({
  args: {
    confirmation: v.string(),
    deleteSession: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.confirmation !== RESET_CONFIRMATION) {
      throw new Error(`Confirmation must be exactly: ${RESET_CONFIRMATION}`);
    }

    const session = await findFoodSession(ctx);

    if (!session) {
      throw new Error("Food hackathon session not found.");
    }

    const result = await resetFoodSessionData(ctx, session._id);

    if (args.deleteSession) {
      await ctx.db.delete(session._id);
    } else {
      await ctx.db.patch(session._id, {
        phase: "submit",
        currentAct: "submit",
        visibilityMode: "private_until_released",
        updatedAt: Date.now(),
      });
      const updatedSession = await ctx.db.get(session._id);

      if (updatedSession) {
        await createDefaultQuestionForSession(ctx, updatedSession);
      }
    }

    return {
      sessionSlug: session.slug,
      deletedSession: Boolean(args.deleteSession),
      ...result,
    };
  },
});
