import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { createDefaultQuestionForSession } from "./sessionQuestions";

const DEMO_SLUG = "teach-anything-university-demo";
const DEMO_JOIN_CODE = "SPARK";
const RESET_CONFIRMATION = "RESET DEMO SESSION";
const MAX_RESET_BATCH = 500;
const MAX_RESET_PASSES = 20;
const EMBEDDING_DIMENSIONS = 1536;

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

const MAIN_QUESTION = {
  slug: "teach-any-university-course",
  title: "Teach Any University Course",
  prompt:
    "If you had to teach a university course on any topic, what would it be, and why should people take it?",
} as const;

const USELESS_QUESTION = {
  slug: "useless-university-learning",
  title: "Useless University Learning",
  prompt: "What's the most useless thing you learned in university?",
} as const;

const DRAFT_QUESTION = {
  slug: "next-round-question",
  title: "Next Round Question",
  prompt: "What question should this class investigate next?",
} as const;

const DEMO_CATEGORIES = [
  {
    slug: "life-skills",
    name: "Life Skills",
    description:
      "Practical courses for adulthood, survival, household systems, documents, food, and everyday decisions.",
    color: "green",
  },
  {
    slug: "technology-ai",
    name: "Technology and AI",
    description: "Courses about AI literacy, algorithms, tools, data, and digital judgment.",
    color: "sky",
  },
  {
    slug: "human-behaviour",
    name: "Human Behaviour",
    description:
      "Courses about persuasion, psychology, disagreement, relationships, and communication.",
    color: "violet",
  },
  {
    slug: "creativity-culture",
    name: "Creativity and Culture",
    description: "Courses about storytelling, media, taste, design, memes, and cultural analysis.",
    color: "rose",
  },
  {
    slug: "work-money",
    name: "Work and Money",
    description:
      "Courses about careers, negotiation, workplace dynamics, productivity, and finances.",
    color: "amber",
  },
  {
    slug: "playful-serious",
    name: "Playful but Serious",
    description: "Courses that sound funny or strange but reveal deeper intellectual value.",
    color: "slate",
  },
] as const;

const DEMO_RESPONSES = [
  {
    nickname: "Maya",
    categorySlug: "life-skills",
    body: "I would teach 'How to Read Contracts Without Crying.' Ten weeks on rental agreements, gym memberships, job offers, and the small print people pretend they understand.",
    inputPattern: "composed_gradually",
    compositionMs: 142000,
    pasteEventCount: 0,
    keystrokeCount: 213,
  },
  {
    nickname: "Sam",
    categorySlug: "technology-ai",
    body: "My course would be 'Arguing With Algorithms.' Students would test recommendation systems, write bad prompts on purpose, and learn when AI is helping versus just sounding confident.",
    inputPattern: "composed_gradually",
    compositionMs: 154000,
    pasteEventCount: 0,
    keystrokeCount: 205,
  },
  {
    nickname: "Priya",
    categorySlug: "human-behaviour",
    body: "I would teach 'Why People Don't Change Their Minds.' It would mix psychology, online arguments, family WhatsApp drama, and how to disagree without turning into a villain.",
    inputPattern: "mixed",
    compositionMs: 38000,
    pasteEventCount: 1,
    keystrokeCount: 83,
  },
  {
    nickname: "Jake",
    categorySlug: "work-money",
    body: "I would teach 'Office Politics for Basically Decent People.' Not manipulation, but how decisions actually happen, why meetings have hidden rules, and how not to get quietly steamrolled.",
    inputPattern: "composed_gradually",
    compositionMs: 121000,
    pasteEventCount: 0,
    keystrokeCount: 196,
  },
  {
    nickname: "Rina",
    categorySlug: "creativity-culture",
    body: "I want a course called 'Memes as Modern Literature.' It sounds unserious, but memes compress context, emotion, politics, and timing better than many essays.",
    inputPattern: "composed_gradually",
    compositionMs: 168000,
    pasteEventCount: 0,
    keystrokeCount: 226,
  },
  {
    nickname: "Alex",
    categorySlug: "playful-serious",
    body: "I would run 'The History of Bad Ideas.' Every week covers something humans were extremely confident about and completely wrong. The final exam is admitting your own bad idea.",
    inputPattern: "likely_pasted",
    compositionMs: 7200,
    pasteEventCount: 1,
    keystrokeCount: 24,
  },
  {
    nickname: "Noah",
    categorySlug: "life-skills",
    body: "My course is 'Cooking When You're Tired and Broke.' Assessment is making three meals from whatever is in the fridge without ordering delivery.",
    inputPattern: "mixed",
    compositionMs: 46000,
    pasteEventCount: 1,
    keystrokeCount: 97,
  },
  {
    nickname: "Leah",
    categorySlug: "creativity-culture",
    body: "I would teach 'How to Explain Boring Things Beautifully.' Students would turn tax rules, safety notices, and software documentation into things normal people can actually understand.",
    inputPattern: "composed_gradually",
    compositionMs: 133000,
    pasteEventCount: 0,
    keystrokeCount: 182,
  },
] as const;

const USELESS_CATEGORIES = [
  {
    slug: "obsolete-facts",
    name: "Obsolete Facts",
    description: "Facts, formulas, or trivia that became irrelevant almost immediately.",
    color: "slate",
  },
  {
    slug: "academic-rituals",
    name: "Academic Rituals",
    description:
      "Formatting rules, citation rituals, and process knowledge that felt detached from use.",
    color: "amber",
  },
  {
    slug: "tool-quirks",
    name: "Tool Quirks",
    description: "Specific software or lab-tool procedures that aged poorly.",
    color: "sky",
  },
  {
    slug: "accidentally-useful",
    name: "Accidentally Useful",
    description: "Apparently useless lessons that later became useful in unexpected ways.",
    color: "green",
  },
] as const;

const USELESS_RESPONSES = [
  {
    nickname: "Maya",
    categorySlug: "academic-rituals",
    body: "I learned the exact title-page spacing for one professor's essay format. It has never mattered again, except that I now distrust any rule that survives only as tradition.",
    inputPattern: "composed_gradually",
    compositionMs: 81000,
    pasteEventCount: 0,
    keystrokeCount: 136,
  },
  {
    nickname: "Sam",
    categorySlug: "tool-quirks",
    body: "I memorised menu paths in a statistics package that changed its interface the next year. The useful part was realising tools are temporary but statistical judgment is not.",
    inputPattern: "mixed",
    compositionMs: 44000,
    pasteEventCount: 1,
    keystrokeCount: 91,
  },
  {
    nickname: "Priya",
    categorySlug: "accidentally-useful",
    body: "A medieval poetry lecture felt useless at the time. Later it helped me notice how arguments change when people hide a serious complaint inside a joke.",
    inputPattern: "composed_gradually",
    compositionMs: 97000,
    pasteEventCount: 0,
    keystrokeCount: 151,
  },
  {
    nickname: "Jake",
    categorySlug: "obsolete-facts",
    body: "I had to memorise telecom acronyms from a textbook already older than the smartphones in our pockets. It taught me that curricula can expire quietly.",
    inputPattern: "likely_pasted",
    compositionMs: 7900,
    pasteEventCount: 1,
    keystrokeCount: 27,
  },
] as const;

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function responseByNickname(nickname: string) {
  const response = DEMO_RESPONSES.find((item) => item.nickname === nickname);

  if (!response) {
    throw new Error(`Missing demo response for ${nickname}.`);
  }

  return response;
}

function demoEmbeddingVector(seed: number) {
  return Array.from(
    { length: EMBEDDING_DIMENSIONS },
    (_, index) => (((seed + index * 17) % 101) - 50) / 100,
  );
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

async function deleteBatchQuestionBaselinesBySession(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const rows = await ctx.db
    .query("questionBaselines")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .take(MAX_RESET_BATCH);

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

async function deleteAllBySession(
  ctx: MutationCtx,
  table: SessionScopedTable,
  sessionId: Id<"sessions">,
) {
  let deleted = 0;
  let capped = false;

  for (let pass = 0; pass < MAX_RESET_PASSES; pass += 1) {
    const count = await deleteBatchBySession(ctx, table, sessionId);
    deleted += count;

    if (count < MAX_RESET_BATCH) {
      return { deleted, capped, leftover: 0 };
    }
  }

  capped = true;

  return {
    deleted,
    capped,
    leftover: await countBySession(ctx, table, sessionId),
  };
}

async function deleteAllQuestionBaselinesBySession(ctx: MutationCtx, sessionId: Id<"sessions">) {
  let deleted = 0;
  let capped = false;

  for (let pass = 0; pass < MAX_RESET_PASSES; pass += 1) {
    const count = await deleteBatchQuestionBaselinesBySession(ctx, sessionId);
    deleted += count;

    if (count < MAX_RESET_BATCH) {
      return { deleted, capped, leftover: 0 };
    }
  }

  capped = true;

  return {
    deleted,
    capped,
    leftover: await countQuestionBaselinesBySession(ctx, sessionId),
  };
}

async function countBySession(
  ctx: QueryCtx | MutationCtx,
  table: SessionScopedTable,
  sessionId: Id<"sessions">,
) {
  return (
    await ctx.db
      .query(table)
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .take(MAX_RESET_BATCH)
  ).length;
}

async function countQuestionBaselinesBySession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
) {
  return (
    await ctx.db
      .query("questionBaselines")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
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

async function deleteAllSessionQuestionsBySession(ctx: MutationCtx, sessionId: Id<"sessions">) {
  let deleted = 0;
  let capped = false;

  for (let pass = 0; pass < MAX_RESET_PASSES; pass += 1) {
    const count = await deleteSessionQuestionsBySession(ctx, sessionId);
    deleted += count;

    if (count < MAX_RESET_BATCH) {
      return { deleted, capped, leftover: 0 };
    }
  }

  capped = true;

  return {
    deleted,
    capped,
    leftover: await countSessionQuestionsBySession(ctx, sessionId),
  };
}

async function countSessionQuestionsBySession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
) {
  return (
    await ctx.db
      .query("sessionQuestions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
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
      title: "[Demo] Teach Any University Course",
      openingPrompt: MAIN_QUESTION.prompt,
      modePreset: "class_discussion",
      phase: "discover",
      currentAct: "discover",
      visibilityMode: "raw_responses_visible",
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
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new Error("Demo session was not created.");
    }

    const questionId = await createDefaultQuestionForSession(ctx, session, now);
    await ctx.db.patch(questionId, {
      slug: MAIN_QUESTION.slug,
      title: MAIN_QUESTION.title,
      prompt: MAIN_QUESTION.prompt,
      status: "released",
      isCurrent: true,
      contributionsOpen: true,
      peerResponsesVisible: true,
      categoryBoardVisible: true,
      categorySummariesVisible: true,
      synthesisVisible: true,
      personalReportsVisible: true,
      fightEnabled: true,
      repliesEnabled: true,
      upvotesEnabled: true,
      releasedAt: now,
      updatedAt: now,
    });

    const uselessQuestionId = await ctx.db.insert("sessionQuestions", {
      sessionId,
      slug: USELESS_QUESTION.slug,
      title: USELESS_QUESTION.title,
      prompt: USELESS_QUESTION.prompt,
      status: "released",
      isCurrent: false,
      contributionsOpen: true,
      peerResponsesVisible: true,
      categoryBoardVisible: true,
      categorySummariesVisible: true,
      synthesisVisible: false,
      personalReportsVisible: false,
      fightEnabled: true,
      repliesEnabled: true,
      upvotesEnabled: true,
      createdAt: now + 1,
      updatedAt: now + 1,
      releasedAt: now + 1,
    });

    await ctx.db.insert("sessionQuestions", {
      sessionId,
      slug: DRAFT_QUESTION.slug,
      title: DRAFT_QUESTION.title,
      prompt: DRAFT_QUESTION.prompt,
      status: "draft",
      isCurrent: false,
      contributionsOpen: false,
      peerResponsesVisible: false,
      categoryBoardVisible: false,
      categorySummariesVisible: false,
      synthesisVisible: false,
      personalReportsVisible: false,
      fightEnabled: false,
      repliesEnabled: false,
      upvotesEnabled: false,
      createdAt: now + 2,
      updatedAt: now + 2,
    });

    const categoryIdsBySlug = new Map<string, Id<"categories">>();
    const categoryNamesBySlug = new Map<string, string>();

    for (const category of DEMO_CATEGORIES) {
      const categoryId = await ctx.db.insert("categories", {
        sessionId,
        questionId,
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
      categoryNamesBySlug.set(category.slug, category.name);
    }

    const uselessCategoryIdsBySlug = new Map<string, Id<"categories">>();

    for (const category of USELESS_CATEGORIES) {
      const categoryId = await ctx.db.insert("categories", {
        sessionId,
        questionId: uselessQuestionId,
        slug: category.slug,
        name: category.name,
        description: category.description,
        color: category.color,
        source: "hybrid",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      uselessCategoryIdsBySlug.set(category.slug, categoryId);
    }

    const participantIdsByNickname = new Map<string, Id<"participants">>();
    const submissionIdsByNickname = new Map<string, Id<"submissions">>();
    const assignmentIdsByNickname = new Map<string, Id<"submissionCategories">>();
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
        questionId,
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
        const assignmentId = await ctx.db.insert("submissionCategories", {
          sessionId,
          questionId,
          submissionId,
          categoryId,
          confidence: 0.86,
          rationale: "Seeded demo assignment.",
          status: "confirmed",
          createdAt: now,
        });
        assignmentIdsByNickname.set(response.nickname, assignmentId);
      }

      await ctx.db.insert("submissionFeedback", {
        sessionId,
        submissionId,
        participantId,
        status: "success",
        tone: "spicy",
        reasoningBand: response.inputPattern === "likely_pasted" ? "solid" : "strong",
        originalityBand:
          response.categorySlug === "playful-serious" || response.nickname === "Priya"
            ? "distinctive"
            : "above_average",
        specificityBand: "clear",
        summary: `This works because the course idea has a recognizable hook and a clear category: ${categoryNamesBySlug.get(response.categorySlug) ?? "the class theme"}.`,
        strengths:
          "Specific title, concrete audience value, and enough personality to stand apart from generic course ideas.",
        improvement:
          "Push one step further: name one assessment or class activity that would prove students actually learned the skill.",
        nextQuestion: "What would the final project look like for this course?",
        createdAt: now,
        updatedAt: now,
      });

      participantIdsByNickname.set(response.nickname, participantId);
      submissionIdsByNickname.set(response.nickname, submissionId);
      submissionIds.push(submissionId);
    }

    const uselessSubmissionIds: Id<"submissions">[] = [];

    for (const [responseIndex, response] of USELESS_RESPONSES.entries()) {
      const participantId = participantIdsByNickname.get(response.nickname);
      const categoryId = uselessCategoryIdsBySlug.get(response.categorySlug);

      if (!participantId || !categoryId) continue;

      const typingStartedAt = now - response.compositionMs - (responseIndex + 1) * 14_000;
      const submissionId = await ctx.db.insert("submissions", {
        sessionId,
        questionId: uselessQuestionId,
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
        createdAt: now - (USELESS_RESPONSES.length - responseIndex) * 42_000,
      });

      await ctx.db.insert("submissionCategories", {
        sessionId,
        questionId: uselessQuestionId,
        submissionId,
        categoryId,
        confidence: 0.82,
        rationale: "Seeded demo assignment for the released non-current question.",
        status: "confirmed",
        createdAt: now,
      });

      uselessSubmissionIds.push(submissionId);
    }

    const leahId = participantIdsByNickname.get("Leah");
    const mainMayaSubmissionId = submissionIdsByNickname.get("Maya");
    let replySubmissionId: Id<"submissions"> | undefined;

    if (leahId && mainMayaSubmissionId) {
      const body =
        "This connects to my communication course too: contracts are only scary because institutions write them for insiders first.";
      replySubmissionId = await ctx.db.insert("submissions", {
        sessionId,
        questionId,
        participantId: leahId,
        parentSubmissionId: mainMayaSubmissionId,
        body,
        kind: "reply",
        wordCount: countWords(body),
        compositionMs: 39000,
        pasteEventCount: 0,
        keystrokeCount: 83,
        inputPattern: "composed_gradually",
        createdAt: now - 22_000,
      });
    }

    const reactionSpecs = [
      { from: "Sam", on: "Maya", kind: "agree" as const },
      { from: "Rina", on: "Sam", kind: "sharp" as const },
      { from: "Priya", on: "Jake", kind: "question" as const },
      { from: "Maya", on: "Leah", kind: "spark" as const },
    ];

    for (const reaction of reactionSpecs) {
      const participantId = participantIdsByNickname.get(reaction.from);
      const submissionId = submissionIdsByNickname.get(reaction.on);

      if (!participantId || !submissionId) continue;

      await ctx.db.insert("reactions", {
        sessionId,
        submissionId,
        participantId,
        kind: reaction.kind,
        createdAt: now - 12_000,
      });
    }

    const noahId = participantIdsByNickname.get("Noah");

    if (noahId && replySubmissionId) {
      await ctx.db.insert("reactions", {
        sessionId,
        submissionId: replySubmissionId,
        participantId: noahId,
        kind: "agree",
        createdAt: now - 8_000,
      });
    }

    const alexSubmissionId = submissionIdsByNickname.get("Alex");
    const alexParticipantId = participantIdsByNickname.get("Alex");
    const alexAssignmentId = assignmentIdsByNickname.get("Alex");
    const playfulCategoryId = categoryIdsBySlug.get("playful-serious");
    const humanCategoryId = categoryIdsBySlug.get("human-behaviour");

    if (
      alexSubmissionId &&
      alexParticipantId &&
      alexAssignmentId &&
      playfulCategoryId &&
      humanCategoryId
    ) {
      await ctx.db.patch(alexAssignmentId, { status: "recategorization_requested" });
      await ctx.db.insert("recategorizationRequests", {
        sessionId,
        questionId,
        submissionId: alexSubmissionId,
        participantId: alexParticipantId,
        currentCategoryId: playfulCategoryId,
        requestedCategoryId: humanCategoryId,
        reason:
          "This answer is playful, but the core claim is about intellectual humility and why people believe bad ideas.",
        status: "pending",
        llmRecommendation:
          "Keep Playful but Serious as the primary category, but consider Human Behaviour as a useful secondary lens.",
        createdAt: now - 6_000,
        updatedAt: now - 6_000,
      });
    }

    const baselineJobId = await ctx.db.insert("aiJobs", {
      sessionId,
      questionId,
      type: "question_baseline",
      status: "success",
      requestedBy: "system",
      progressTotal: 1,
      progressDone: 1,
      createdAt: now - 5 * 60_000,
      updatedAt: now - 5 * 60_000,
    });

    const synthesisJobId = await ctx.db.insert("aiJobs", {
      sessionId,
      questionId,
      type: "synthesis",
      status: "success",
      requestedBy: "instructor",
      progressTotal: DEMO_CATEGORIES.length,
      progressDone: DEMO_CATEGORIES.length,
      createdAt: now - 4 * 60_000,
      updatedAt: now - 4 * 60_000,
    });

    const argumentMapJobId = await ctx.db.insert("aiJobs", {
      sessionId,
      questionId,
      type: "argument_map",
      status: "success",
      requestedBy: "instructor",
      progressTotal: submissionIds.length,
      progressDone: submissionIds.length,
      createdAt: now - 3 * 60_000,
      updatedAt: now - 3 * 60_000,
    });

    await ctx.db.insert("questionBaselines", {
      sessionId,
      questionId,
      status: "ready",
      promptTemplateKey: "question.baseline.demo.v1",
      provider: "seed",
      model: "demo-baseline",
      baselineText:
        "A strong answer names a course with a clear learner, explains why it matters, and gives at least one concrete activity or assessment that proves students would learn the skill.",
      summary: "Baseline: course title, audience value, reason to care, and a teachable activity.",
      generatedAt: now - 5 * 60_000,
      createdAt: now - 5 * 60_000,
      updatedAt: now - 5 * 60_000,
    });

    await ctx.db.insert("semanticEmbeddingJobs", {
      sessionId,
      questionId,
      status: "success",
      requestedBy: "system",
      entityTypes: ["submission", "category", "synthesisArtifact"],
      progressTotal: submissionIds.length + DEMO_CATEGORIES.length,
      progressDone: submissionIds.length + DEMO_CATEGORIES.length,
      createdAt: now - 2 * 60_000,
      updatedAt: now - 2 * 60_000,
    });

    const synthesisId = await ctx.db.insert("synthesisArtifacts", {
      sessionId,
      questionId,
      kind: "class_synthesis",
      status: "published",
      title: "Class Synthesis",
      summary:
        "The class converged on courses that teach survival skills, digital judgment, cultural literacy, and ways to navigate people or institutions more intelligently.",
      keyPoints: [
        "Many proposals focus on practical adulthood: contracts, cooking, workplace dynamics, and communication.",
        "Technology responses argue that AI and algorithmic literacy should be treated as basic civic knowledge.",
        "Playful course ideas such as memes or bad ideas become rigorous when they reveal systems, incentives, and cultural patterns.",
        "The strongest ideas pair an appealing title with a concrete skill students can practice.",
      ],
      uniqueInsights: [
        "Several students used unserious-sounding course titles to smuggle in serious learning outcomes.",
        "The discussion suggests a gap between formal university subjects and skills people need immediately after graduation.",
      ],
      opposingViews: [
        "One tension is urgency versus engagement: AI literacy may be more urgent, while meme studies or bad ideas may be more memorable entry points.",
      ],
      sourceCounts: { submissions: submissionIds.length, categories: DEMO_CATEGORIES.length },
      createdAt: now,
      updatedAt: now,
      generatedAt: now,
      publishedAt: now,
      aiJobId: synthesisJobId,
    });

    const categorySummaryIds = new Map<string, Id<"synthesisArtifacts">>();

    for (const category of DEMO_CATEGORIES) {
      const categoryId = categoryIdsBySlug.get(category.slug);

      if (!categoryId) continue;

      const artifactId = await ctx.db.insert("synthesisArtifacts", {
        sessionId,
        questionId,
        categoryId,
        kind: "category_summary",
        status: "published",
        title: `${category.name} Summary`,
        summary: category.description,
        keyPoints: [
          `The ${category.name} cluster is anchored by course ideas with a clear hook and practical transfer.`,
          "The strongest submissions explain both why the course is needed and how students would practice the skill.",
        ],
        uniqueInsights: [
          "The category becomes stronger when playful titles are tied to concrete learning outcomes.",
        ],
        opposingViews: [],
        sourceCounts: {
          submissions: DEMO_RESPONSES.filter((response) => response.categorySlug === category.slug)
            .length,
        },
        createdAt: now,
        updatedAt: now,
        generatedAt: now,
        publishedAt: now,
        aiJobId: synthesisJobId,
      });
      categorySummaryIds.set(category.slug, artifactId);
    }

    const quoteSpecs = [
      { nickname: "Maya", role: "representative" as const },
      { nickname: "Sam", role: "opposing" as const },
      { nickname: "Rina", role: "unique" as const },
      { nickname: "Alex", role: "unique" as const },
    ];

    for (const quote of quoteSpecs) {
      const response = responseByNickname(quote.nickname);
      const submissionId = submissionIdsByNickname.get(quote.nickname);
      const participantId = participantIdsByNickname.get(quote.nickname);

      if (!submissionId || !participantId) continue;

      await ctx.db.insert("synthesisQuotes", {
        artifactId: synthesisId,
        sessionId,
        questionId,
        submissionId,
        participantId,
        quote: response.body,
        quoteRole: quote.role,
        displayName: quote.nickname,
        anonymizedLabel: "Participant",
        isVisibleToParticipants: true,
        createdAt: now,
      });
    }

    const embeddingIdsByNickname = new Map<string, Id<"semanticEmbeddings">>();

    for (const [embeddingIndex, nickname] of ["Maya", "Sam", "Priya", "Rina", "Alex"].entries()) {
      const response = responseByNickname(nickname);
      const submissionId = submissionIdsByNickname.get(nickname);

      if (!submissionId) continue;

      const embeddingId = await ctx.db.insert("semanticEmbeddings", {
        sessionId,
        questionId,
        entityType: "submission",
        entityId: submissionId,
        contentHash: `demo-${MAIN_QUESTION.slug}-${nickname.toLowerCase()}`,
        textPreview: response.body.slice(0, 240),
        embeddingModel: "demo-seed-embedding-1536",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: demoEmbeddingVector(embeddingIndex + 1),
        createdAt: now - 90_000 + embeddingIndex * 1000,
        updatedAt: now - 90_000 + embeddingIndex * 1000,
      });
      embeddingIdsByNickname.set(nickname, embeddingId);
    }

    for (const [categoryIndex, category] of DEMO_CATEGORIES.entries()) {
      const categoryId = categoryIdsBySlug.get(category.slug);

      if (!categoryId) continue;

      await ctx.db.insert("semanticEmbeddings", {
        sessionId,
        questionId,
        entityType: "category",
        entityId: categoryId,
        contentHash: `demo-${MAIN_QUESTION.slug}-${category.slug}`,
        textPreview: category.description.slice(0, 240),
        embeddingModel: "demo-seed-embedding-1536",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: demoEmbeddingVector(20 + categoryIndex),
        createdAt: now - 84_000 + categoryIndex * 1000,
        updatedAt: now - 84_000 + categoryIndex * 1000,
      });
    }

    await ctx.db.insert("semanticEmbeddings", {
      sessionId,
      questionId,
      entityType: "synthesisArtifact",
      entityId: synthesisId,
      contentHash: `demo-${MAIN_QUESTION.slug}-class-synthesis`,
      textPreview:
        "The class converged on practical adulthood, digital judgment, cultural literacy, and institutional navigation.",
      embeddingModel: "demo-seed-embedding-1536",
      dimensions: EMBEDDING_DIMENSIONS,
      embedding: demoEmbeddingVector(40),
      createdAt: now - 72_000,
      updatedAt: now - 72_000,
    });

    const noveltySpecs = [
      {
        nickname: "Maya",
        band: "medium" as const,
        score: 0.68,
        rationale: "Practical course with high audience relevance.",
      },
      {
        nickname: "Sam",
        band: "high" as const,
        score: 0.84,
        rationale: "Strong contemporary relevance and clear critical stance on AI.",
      },
      {
        nickname: "Rina",
        band: "high" as const,
        score: 0.88,
        rationale: "Playful surface but unusually strong cultural-analysis angle.",
      },
      {
        nickname: "Alex",
        band: "high" as const,
        score: 0.9,
        rationale: "Distinctive course frame that turns failure into a method.",
      },
    ];

    for (const signal of noveltySpecs) {
      const response = responseByNickname(signal.nickname);
      const submissionId = submissionIdsByNickname.get(signal.nickname);
      const participantId = participantIdsByNickname.get(signal.nickname);
      const categoryId = categoryIdsBySlug.get(response.categorySlug);

      await ctx.db.insert("semanticSignals", {
        sessionId,
        questionId,
        submissionId,
        participantId,
        categoryId,
        signalType: "novelty",
        band: signal.band,
        score: signal.score,
        rationale: signal.rationale,
        sourceEmbeddingId: embeddingIdsByNickname.get(signal.nickname),
        createdAt: now,
        updatedAt: now,
      });
    }

    const linkSpecs = [
      {
        source: "Sam",
        target: "Rina",
        linkType: "contradicts" as const,
        rationale: "Sam prioritizes platform systems while Rina starts from cultural artifacts.",
      },
      {
        source: "Rina",
        target: "Sam",
        linkType: "bridges" as const,
        rationale:
          "Rina's meme course can bridge content analysis back to algorithmic distribution.",
      },
      {
        source: "Priya",
        target: "Jake",
        linkType: "questions" as const,
        rationale:
          "Priya's disagreement course challenges whether office politics can be taught ethically.",
      },
      {
        source: "Leah",
        target: "Maya",
        linkType: "supports" as const,
        rationale:
          "Both responses turn intimidating adult systems into teachable communication tasks.",
      },
    ];

    for (const link of linkSpecs) {
      const sourceId = submissionIdsByNickname.get(link.source);
      const targetId = submissionIdsByNickname.get(link.target);

      if (!sourceId || !targetId) continue;

      await ctx.db.insert("argumentLinks", {
        sessionId,
        questionId,
        sourceEntityType: "submission",
        sourceEntityId: sourceId,
        targetEntityType: "submission",
        targetEntityId: targetId,
        linkType: link.linkType,
        strength: 0.78,
        confidence: 0.86,
        rationale: link.rationale,
        source: "instructor",
        aiJobId: argumentMapJobId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const followUpId = await ctx.db.insert("followUpPrompts", {
      sessionId,
      questionId,
      slug: "make-it-teachable",
      title: "Make the course teachable",
      prompt:
        "Choose one activity, assignment, or debate that would make your course genuinely teachable rather than just a fun title.",
      instructions: "Keep it short and concrete.",
      targetMode: "all",
      status: "active",
      roundNumber: 1,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("followUpTargets", {
      sessionId,
      questionId,
      followUpPromptId: followUpId,
      targetKind: "all",
      createdAt: now,
    });

    const mayaId = participantIdsByNickname.get("Maya");
    const mayaSubmissionId = submissionIdsByNickname.get("Maya");

    if (mayaId && mayaSubmissionId) {
      await ctx.db.insert("submissions", {
        sessionId,
        questionId,
        participantId: mayaId,
        parentSubmissionId: mayaSubmissionId,
        followUpPromptId: followUpId,
        body: "Final project: bring one real contract from daily life, annotate the confusing parts, and rewrite the risky clauses in plain English.",
        kind: "additional_point",
        wordCount: 21,
        compositionMs: 64000,
        pasteEventCount: 0,
        keystrokeCount: 122,
        inputPattern: "composed_gradually",
        createdAt: now - 35_000,
      });
    }

    await seedFightData(ctx, {
      sessionId,
      questionId,
      now,
      participantIdsByNickname,
      submissionIdsByNickname,
    });

    for (const response of DEMO_RESPONSES) {
      const participantId = participantIdsByNickname.get(response.nickname);

      if (!participantId) continue;

      await ctx.db.insert("personalReports", {
        sessionId,
        participantId,
        status: "success",
        participationBand: "active",
        reasoningBand: response.inputPattern === "likely_pasted" ? "solid" : "strong",
        originalityBand:
          response.categorySlug === "playful-serious" ? "distinctive" : "above_average",
        responsivenessBand: response.nickname === "Maya" ? "responsive" : "limited",
        summary: `${response.nickname}'s course idea contributes to the ${categoryNamesBySlug.get(response.categorySlug) ?? "demo"} cluster with a clear teaching angle.`,
        contributionTrace:
          "This response is represented in the seeded category summary and can be used as a starting point for follow-up or Fight Me activity.",
        argumentEvolution:
          response.nickname === "Maya"
            ? "The follow-up sharpened the idea from a clever title into a concrete final project."
            : "The initial response is clear, but would become stronger with one explicit classroom activity.",
        growthOpportunity:
          "Connect the course title to a specific assessment so the learning outcome is visible.",
        citedArtifactIds: [...categorySummaryIds.values()],
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditEvents", {
      sessionId,
      questionId,
      actorType: "system",
      action: "demo.seeded",
      targetType: "session",
      targetId: sessionId,
      metadataJson: {
        participants: DEMO_RESPONSES.length,
        mainSubmissions: submissionIds.length,
        releasedQuestionSubmissions: uselessSubmissionIds.length,
        baselineJobId,
        topic: "teach-anything-university-demo",
      },
      createdAt: now,
    });

    return {
      sessionSlug: DEMO_SLUG,
      joinCode: DEMO_JOIN_CODE,
      reused: false,
      participants: participantIdsByNickname.size,
      submissions: submissionIds.length,
      releasedQuestions: 2,
      personas: DEMO_RESPONSES.map((response) => ({
        nickname: response.nickname,
        clientKey: `demo-${response.nickname.toLowerCase()}`,
      })),
    };
  },
});

async function seedFightData(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"sessions">;
    questionId: Id<"sessionQuestions">;
    now: number;
    participantIdsByNickname: Map<string, Id<"participants">>;
    submissionIdsByNickname: Map<string, Id<"submissions">>;
  },
) {
  const getParticipantId = (nickname: string) => {
    const id = args.participantIdsByNickname.get(nickname);

    if (!id) {
      throw new Error(`Missing demo participant ${nickname}.`);
    }

    return id;
  };
  const getSubmissionId = (nickname: string) => {
    const id = args.submissionIdsByNickname.get(nickname);

    if (!id) {
      throw new Error(`Missing demo submission ${nickname}.`);
    }

    return id;
  };
  const fights = [
    {
      slug: "sam-vs-rina-algorithms-vs-memes",
      mode: "real_1v1" as const,
      attacker: "Sam",
      defender: "Rina",
      turns: [
        {
          role: "attacker" as const,
          nickname: "Sam",
          body: "Memes are interesting, but a whole university course risks rewarding vibes over rigor. Algorithms shape what millions of people see every day. Isn't that more urgent?",
        },
        {
          role: "defender" as const,
          nickname: "Rina",
          body: "Urgency is not the only criterion for a course. Memes are one way those algorithms become visible because they show what spreads, mutates, and gets misunderstood.",
        },
        {
          role: "attacker" as const,
          nickname: "Sam",
          body: "Fair, but if students only analyze memes, they may miss the systems deciding which memes surface. The pipe matters as much as the content.",
        },
        {
          role: "defender" as const,
          nickname: "Rina",
          body: "That is exactly why the course works. Start with the content students recognize, then trace it back to the platforms, incentives, and communities that made it travel.",
        },
      ],
      debrief: {
        summary:
          "Strong clash between infrastructure and culture. The debate ends with a useful synthesis: students should study both what spreads and the systems that make it spread.",
        attackerStrength:
          "Sam kept pressing the higher-stakes question of algorithmic power instead of treating the meme course as harmless fun.",
        defenderStrength:
          "Rina reframed memes as evidence trails that can lead students back to platforms, incentives, and communities.",
        strongerRebuttal:
          "Sam could have asked how the meme course would avoid becoming case-study tourism without technical platform analysis.",
        nextPractice:
          "Both sides should define what students can do after the course that they could not do before.",
      },
    },
    {
      slug: "priya-vs-jake-minds-vs-office-politics",
      mode: "real_1v1" as const,
      attacker: "Priya",
      defender: "Jake",
      turns: [
        {
          role: "attacker" as const,
          nickname: "Priya",
          body: "A course on office politics sounds like teaching people to manipulate each other. Wouldn't a better course teach disagreement and trust directly?",
        },
        {
          role: "defender" as const,
          nickname: "Jake",
          body: "Ignoring politics does not make it disappear. Decent people need to understand hidden rules so they are not punished for being naive.",
        },
        {
          role: "attacker" as const,
          nickname: "Priya",
          body: "Then the course needs a moral boundary. Otherwise students may learn how to win rooms without learning when they should not.",
        },
        {
          role: "defender" as const,
          nickname: "Jake",
          body: "Agreed. The course should teach power literacy, not power worship: how decisions happen, how to document fairly, and how to push back without theatrics.",
        },
      ],
      debrief: {
        summary:
          "The fight usefully separates manipulation from power literacy. Both sides converge on the need for ethical constraints.",
        attackerStrength:
          "Priya identified the ethical risk in teaching workplace tactics without naming values.",
        defenderStrength: "Jake defended the practical need without celebrating manipulation.",
        strongerRebuttal:
          "Priya could have proposed a direct alternative module so the critique becomes constructive.",
        nextPractice:
          "When challenging a practical course, distinguish the skill from its possible misuse.",
      },
    },
    {
      slug: "alex-vs-ai-history-of-bad-ideas",
      mode: "vs_ai" as const,
      attacker: "Alex",
      turns: [
        {
          role: "ai" as const,
          body: "A course on bad ideas could become trivia unless students learn how those mistakes happened structurally.",
        },
        {
          role: "attacker" as const,
          nickname: "Alex",
          body: "That is the point. Each bad idea is a case study in incentives, evidence, overconfidence, and why smart people still get trapped by weak assumptions.",
        },
        {
          role: "ai" as const,
          body: "Then the course needs methods, not just funny failures. How would students apply the pattern to current beliefs?",
        },
        {
          role: "attacker" as const,
          nickname: "Alex",
          body: "Final project: choose a belief they currently hold, map the evidence, identify incentives around it, and name what would make them revise it.",
        },
      ],
      debrief: {
        summary:
          "Alex successfully defended the playful title by turning it into a method for studying confidence, evidence, and revision.",
        attackerStrength: "Alex moved from a witty course idea to a clear assessment design.",
        defenderStrength: "The AI challenger forced the course to justify its intellectual method.",
        strongerRebuttal:
          "Alex could add safeguards against cherry-picking only obviously foolish historical examples.",
        nextPractice: "For playful course ideas, always show the serious method behind the joke.",
      },
    },
  ];

  for (const [fightIndex, fight] of fights.entries()) {
    const attackerId = getParticipantId(fight.attacker);
    const defenderNickname =
      fight.mode === "real_1v1" && "defender" in fight ? fight.defender : undefined;
    const defenderId = defenderNickname ? getParticipantId(defenderNickname) : undefined;
    const fightThreadId = await ctx.db.insert("fightThreads", {
      sessionId: args.sessionId,
      slug: fight.slug,
      mode: fight.mode,
      status: "completed",
      attackerParticipantId: attackerId,
      defenderParticipantId: defenderId,
      attackerSubmissionId: getSubmissionId(fight.attacker),
      defenderSubmissionId: defenderNickname ? getSubmissionId(defenderNickname) : undefined,
      nextTurnNumber: fight.turns.length + 1,
      maxTurns: 4,
      acceptedAt: args.now - (fightIndex + 1) * 8 * 60_000,
      completedAt: args.now - (fightIndex + 1) * 7 * 60_000,
      createdAt: args.now - (fightIndex + 1) * 10 * 60_000,
      updatedAt: args.now - (fightIndex + 1) * 7 * 60_000,
    });

    for (const [turnIndex, turn] of fight.turns.entries()) {
      const turnNickname = "nickname" in turn ? turn.nickname : undefined;

      await ctx.db.insert("fightTurns", {
        sessionId: args.sessionId,
        fightThreadId,
        participantId: turnNickname ? getParticipantId(turnNickname) : undefined,
        role: turn.role,
        turnNumber: turnIndex + 1,
        body: turn.body,
        status: "submitted",
        source: turn.role === "ai" ? "ai" : "manual",
        createdAt: args.now - (fightIndex + 1) * 7 * 60_000 + turnIndex * 45_000,
      });
    }

    await ctx.db.insert("fightDebriefs", {
      sessionId: args.sessionId,
      fightThreadId,
      status: "success",
      summary: fight.debrief.summary,
      attackerStrength: fight.debrief.attackerStrength,
      defenderStrength: fight.debrief.defenderStrength,
      strongerRebuttal: fight.debrief.strongerRebuttal,
      nextPractice: fight.debrief.nextPractice,
      createdAt: args.now - (fightIndex + 1) * 6 * 60_000,
      updatedAt: args.now - (fightIndex + 1) * 6 * 60_000,
    });

    await ctx.db.insert("argumentLinks", {
      sessionId: args.sessionId,
      questionId: args.questionId,
      sourceEntityType: "fightThread",
      sourceEntityId: fightThreadId,
      targetEntityType: "submission",
      targetEntityId: getSubmissionId(fight.attacker),
      linkType: "extends",
      strength: 0.82,
      confidence: 0.88,
      rationale: "Seeded Fight Me thread extends the participant's original course proposal.",
      source: "instructor",
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
}

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
  const leftovers: Record<string, number> = {};
  let capped = false;

  for (const table of tables) {
    const result = await deleteAllBySession(ctx, table, sessionId);
    perTable[table] = result.deleted;
    deleted += result.deleted;

    if (result.capped) {
      capped = true;
    }

    if (result.leftover > 0) {
      leftovers[table] = result.leftover;
    }
  }
  const baselineResult = await deleteAllQuestionBaselinesBySession(ctx, sessionId);
  perTable.questionBaselines = baselineResult.deleted;
  deleted += baselineResult.deleted;

  if (baselineResult.capped) {
    capped = true;
  }

  if (baselineResult.leftover > 0) {
    leftovers.questionBaselines = baselineResult.leftover;
  }

  const questionResult = await deleteAllSessionQuestionsBySession(ctx, sessionId);
  perTable.sessionQuestions = questionResult.deleted;
  deleted += questionResult.deleted;

  if (questionResult.capped) {
    capped = true;
  }

  if (questionResult.leftover > 0) {
    leftovers.sessionQuestions = questionResult.leftover;
  }

  return {
    deleted,
    perTable,
    leftovers,
    capped,
  };
}

function pushIssue(target: string[], issue: string) {
  if (target.length < 100) {
    target.push(issue);
  }
}

async function verifySubmissionQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  submissionId: Id<"submissions">,
) {
  const submission = await ctx.db.get(submissionId);

  if (!submission || submission.sessionId !== sessionId) {
    return { missing: true, questionId: undefined };
  }

  return { missing: false, questionId: submission.questionId };
}

async function verifyCategoryQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get(categoryId);

  if (!category || category.sessionId !== sessionId) {
    return { missing: true, questionId: undefined };
  }

  return { missing: false, questionId: category.questionId };
}

async function verifyArtifactQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  artifactId: Id<"synthesisArtifacts">,
) {
  const artifact = await ctx.db.get(artifactId);

  if (!artifact || artifact.sessionId !== sessionId) {
    return { missing: true, questionId: undefined };
  }

  return { missing: false, questionId: artifact.questionId };
}

async function verifyFollowUpQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  promptId: Id<"followUpPrompts">,
) {
  const prompt = await ctx.db.get(promptId);

  if (!prompt || prompt.sessionId !== sessionId) {
    return { missing: true, questionId: undefined };
  }

  return { missing: false, questionId: prompt.questionId };
}

async function verifyEmbeddingQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  embeddingId: Id<"semanticEmbeddings">,
) {
  const embedding = await ctx.db.get(embeddingId);

  if (!embedding || embedding.sessionId !== sessionId) {
    return { missing: true, questionId: undefined };
  }

  return { missing: false, questionId: embedding.questionId };
}

async function verifySemanticEntityQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  entityType: "submission" | "synthesisArtifact" | "category" | "fightThread" | "followUpPrompt",
  entityId: string,
) {
  if (entityType === "submission") {
    return await verifySubmissionQuestion(ctx, sessionId, entityId as Id<"submissions">);
  }

  if (entityType === "category") {
    return await verifyCategoryQuestion(ctx, sessionId, entityId as Id<"categories">);
  }

  if (entityType === "synthesisArtifact") {
    return await verifyArtifactQuestion(ctx, sessionId, entityId as Id<"synthesisArtifacts">);
  }

  if (entityType === "followUpPrompt") {
    return await verifyFollowUpQuestion(ctx, sessionId, entityId as Id<"followUpPrompts">);
  }

  return { missing: false, questionId: undefined };
}

async function verifyArgumentEntityQuestion(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  entityType: "submission" | "category" | "synthesisArtifact" | "fightThread",
  entityId: string,
) {
  if (entityType === "submission") {
    return await verifySubmissionQuestion(ctx, sessionId, entityId as Id<"submissions">);
  }

  if (entityType === "category") {
    return await verifyCategoryQuestion(ctx, sessionId, entityId as Id<"categories">);
  }

  if (entityType === "synthesisArtifact") {
    return await verifyArtifactQuestion(ctx, sessionId, entityId as Id<"synthesisArtifacts">);
  }

  return { missing: false, questionId: undefined };
}

export const verifyQuestionMigration = query({
  args: {
    sessionSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = args.sessionSlug
      ? (
          await ctx.db
            .query("sessions")
            .withIndex("by_slug", (q) => q.eq("slug", args.sessionSlug!))
            .take(1)
        ).filter(Boolean)
      : await ctx.db.query("sessions").take(200);

    const issues = {
      sessionsWithoutQuestions: [] as string[],
      currentQuestionProblems: [] as string[],
      submissionsWithoutResolvableQuestion: [] as string[],
      categoriesWithoutResolvableQuestion: [] as string[],
      derivedRowsWithQuestionProblems: [] as string[],
    };
    let capped = sessions.length === 200 && !args.sessionSlug;

    for (const session of sessions) {
      const questions = await ctx.db
        .query("sessionQuestions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .take(101);
      capped ||= questions.length > 100;

      const questionIds = new Set(questions.map((question) => question._id));
      const currentQuestions = questions.filter((question) => question.isCurrent);

      if (questions.length === 0) {
        pushIssue(issues.sessionsWithoutQuestions, `${session.slug}:${session._id}`);
      }

      if (currentQuestions.length !== 1) {
        pushIssue(
          issues.currentQuestionProblems,
          `${session.slug}:${session._id} has ${currentQuestions.length} current questions`,
        );
      }

      if (session.currentQuestionId && !questionIds.has(session.currentQuestionId)) {
        pushIssue(
          issues.currentQuestionProblems,
          `${session.slug}:${session._id} points to missing currentQuestionId ${session.currentQuestionId}`,
        );
      }

      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= submissions.length > 500;

      for (const submission of submissions) {
        if (!submission.questionId || !questionIds.has(submission.questionId)) {
          pushIssue(
            issues.submissionsWithoutResolvableQuestion,
            `${session.slug}:submission:${submission._id}`,
          );
        }

        if (submission.parentSubmissionId) {
          const parent = await verifySubmissionQuestion(
            ctx,
            session._id,
            submission.parentSubmissionId,
          );

          if (
            parent.questionId &&
            submission.questionId &&
            parent.questionId !== submission.questionId
          ) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:reply:${submission._id} parent is on ${parent.questionId}`,
            );
          }
        }
      }

      const categories = await ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= categories.length > 500;

      for (const category of categories) {
        if (!category.questionId || !questionIds.has(category.questionId)) {
          pushIssue(
            issues.categoriesWithoutResolvableQuestion,
            `${session.slug}:category:${category._id}`,
          );
        }
      }

      const baselines = await ctx.db
        .query("questionBaselines")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= baselines.length > 500;

      for (const baseline of baselines) {
        if (!questionIds.has(baseline.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:questionBaseline:${baseline._id} points to ${baseline.questionId}`,
          );
        }
      }

      const assignments = await ctx.db
        .query("submissionCategories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= assignments.length > 500;

      for (const assignment of assignments) {
        const submission = await verifySubmissionQuestion(
          ctx,
          session._id,
          assignment.submissionId,
        );
        const category = await verifyCategoryQuestion(ctx, session._id, assignment.categoryId);

        if (!assignment.questionId || !questionIds.has(assignment.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:submissionCategory:${assignment._id} missing question`,
          );
        }

        if (
          submission.questionId &&
          assignment.questionId &&
          submission.questionId !== assignment.questionId
        ) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:submissionCategory:${assignment._id} submission is on ${submission.questionId}`,
          );
        }

        if (
          category.questionId &&
          assignment.questionId &&
          category.questionId !== assignment.questionId
        ) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:submissionCategory:${assignment._id} category is on ${category.questionId}`,
          );
        }
      }

      const recategorisations = await ctx.db
        .query("recategorizationRequests")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= recategorisations.length > 500;

      for (const request of recategorisations) {
        const submission = await verifySubmissionQuestion(ctx, session._id, request.submissionId);
        const currentCategory = request.currentCategoryId
          ? await verifyCategoryQuestion(ctx, session._id, request.currentCategoryId)
          : undefined;
        const requestedCategory = request.requestedCategoryId
          ? await verifyCategoryQuestion(ctx, session._id, request.requestedCategoryId)
          : undefined;

        if (!request.questionId || !questionIds.has(request.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:recategorizationRequest:${request._id} missing question`,
          );
        }

        for (const related of [submission, currentCategory, requestedCategory]) {
          if (
            related?.questionId &&
            request.questionId &&
            related.questionId !== request.questionId
          ) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:recategorizationRequest:${request._id} related entity is on ${related.questionId}`,
            );
          }
        }
      }

      const artifacts = await ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= artifacts.length > 500;

      for (const artifact of artifacts) {
        if (!artifact.questionId || !questionIds.has(artifact.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:synthesisArtifact:${artifact._id} missing question`,
          );
        }

        if (artifact.categoryId) {
          const category = await verifyCategoryQuestion(ctx, session._id, artifact.categoryId);

          if (
            category.questionId &&
            artifact.questionId &&
            category.questionId !== artifact.questionId
          ) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:synthesisArtifact:${artifact._id} category is on ${category.questionId}`,
            );
          }
        }
      }

      const quotes = await ctx.db
        .query("synthesisQuotes")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= quotes.length > 500;

      for (const quote of quotes) {
        const artifact = await verifyArtifactQuestion(ctx, session._id, quote.artifactId);
        const submission = await verifySubmissionQuestion(ctx, session._id, quote.submissionId);

        if (!quote.questionId || !questionIds.has(quote.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:synthesisQuote:${quote._id} missing question`,
          );
        }

        for (const related of [artifact, submission]) {
          if (related.questionId && quote.questionId && related.questionId !== quote.questionId) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:synthesisQuote:${quote._id} related entity is on ${related.questionId}`,
            );
          }
        }
      }

      const embeddings = await ctx.db
        .query("semanticEmbeddings")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= embeddings.length > 500;

      for (const embedding of embeddings) {
        const entity = await verifySemanticEntityQuestion(
          ctx,
          session._id,
          embedding.entityType,
          embedding.entityId,
        );

        if (!embedding.questionId || !questionIds.has(embedding.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:semanticEmbedding:${embedding._id} missing question`,
          );
        }

        if (
          entity.questionId &&
          embedding.questionId &&
          entity.questionId !== embedding.questionId
        ) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:semanticEmbedding:${embedding._id} entity is on ${entity.questionId}`,
          );
        }
      }

      const signals = await ctx.db
        .query("semanticSignals")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= signals.length > 500;

      for (const signal of signals) {
        const related = [
          signal.submissionId
            ? await verifySubmissionQuestion(ctx, session._id, signal.submissionId)
            : undefined,
          signal.categoryId
            ? await verifyCategoryQuestion(ctx, session._id, signal.categoryId)
            : undefined,
          signal.sourceEmbeddingId
            ? await verifyEmbeddingQuestion(ctx, session._id, signal.sourceEmbeddingId)
            : undefined,
        ];

        if (!signal.questionId || !questionIds.has(signal.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:semanticSignal:${signal._id} missing question`,
          );
        }

        for (const entity of related) {
          if (entity?.questionId && signal.questionId && entity.questionId !== signal.questionId) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:semanticSignal:${signal._id} related entity is on ${entity.questionId}`,
            );
          }
        }
      }

      const argumentLinks = await ctx.db
        .query("argumentLinks")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(501);
      capped ||= argumentLinks.length > 500;

      for (const link of argumentLinks) {
        const source = await verifyArgumentEntityQuestion(
          ctx,
          session._id,
          link.sourceEntityType,
          link.sourceEntityId,
        );
        const target = await verifyArgumentEntityQuestion(
          ctx,
          session._id,
          link.targetEntityType,
          link.targetEntityId,
        );

        if (!link.questionId || !questionIds.has(link.questionId)) {
          pushIssue(
            issues.derivedRowsWithQuestionProblems,
            `${session.slug}:argumentLink:${link._id} missing question`,
          );
        }

        for (const entity of [source, target]) {
          if (entity.questionId && link.questionId && entity.questionId !== link.questionId) {
            pushIssue(
              issues.derivedRowsWithQuestionProblems,
              `${session.slug}:argumentLink:${link._id} related entity is on ${entity.questionId}`,
            );
          }
        }
      }
    }

    const issueCount = Object.values(issues).reduce((total, list) => total + list.length, 0);

    return {
      ok: issueCount === 0,
      checkedSessions: sessions.length,
      issueCount,
      capped,
      issues,
    };
  },
});

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

export const listDemoPersonas = query({
  args: {},
  handler: async (ctx) => {
    const session = await findDemoSession(ctx);

    if (!session) {
      return {
        session: null,
        personas: [],
      };
    }

    return {
      session: {
        id: session._id,
        slug: session.slug,
        joinCode: session.joinCode,
        title: session.title,
      },
      personas: DEMO_RESPONSES.map((response) => ({
        nickname: response.nickname,
        participantSlug: response.nickname.toLowerCase(),
        demoClientKey: `demo-${response.nickname.toLowerCase()}`,
        categorySlug: response.categorySlug,
        courseIdea: response.body,
        inputPattern: response.inputPattern,
      })),
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
          questions: await countSessionQuestionsBySession(ctx, session._id),
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
