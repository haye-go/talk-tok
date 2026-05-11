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
      openingPrompt:
        "If you had to teach a university course on any topic, what would it be, and why should people take it?",
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

    const participantIdsByNickname = new Map<string, Id<"participants">>();
    const submissionIdsByNickname = new Map<string, Id<"submissions">>();
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
        await ctx.db.insert("submissionCategories", {
          sessionId,
          questionId,
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

    const synthesisId = await ctx.db.insert("synthesisArtifacts", {
      sessionId,
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
    });

    const categorySummaryIds = new Map<string, Id<"synthesisArtifacts">>();

    for (const category of DEMO_CATEGORIES) {
      const categoryId = categoryIdsBySlug.get(category.slug);

      if (!categoryId) continue;

      const artifactId = await ctx.db.insert("synthesisArtifacts", {
        sessionId,
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
        submissionId,
        participantId,
        categoryId,
        signalType: "novelty",
        band: signal.band,
        score: signal.score,
        rationale: signal.rationale,
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
        sourceEntityType: "submission",
        sourceEntityId: sourceId,
        targetEntityType: "submission",
        targetEntityId: targetId,
        linkType: link.linkType,
        strength: 0.78,
        confidence: 0.86,
        rationale: link.rationale,
        source: "instructor",
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
      actorType: "system",
      action: "demo.seeded",
      targetType: "session",
      targetId: sessionId,
      metadataJson: {
        participants: DEMO_RESPONSES.length,
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
