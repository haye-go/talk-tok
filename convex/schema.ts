import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamp = v.number();

export default defineSchema({
  sessions: defineTable({
    slug: v.string(),
    joinCode: v.string(),
    title: v.string(),
    openingPrompt: v.string(),
    modePreset: v.union(
      v.literal("class_discussion"),
      v.literal("conference_qna"),
      v.literal("debate_lab"),
      v.literal("custom"),
    ),
    phase: v.union(
      v.literal("lobby"),
      v.literal("submit"),
      v.literal("discover"),
      v.literal("challenge"),
      v.literal("synthesize"),
      v.literal("closed"),
    ),
    currentAct: v.union(
      v.literal("submit"),
      v.literal("discover"),
      v.literal("challenge"),
      v.literal("synthesize"),
    ),
    visibilityMode: v.union(
      v.literal("private_until_released"),
      v.literal("category_summary_only"),
      v.literal("raw_responses_visible"),
    ),
    anonymityMode: v.union(v.literal("nicknames_visible"), v.literal("anonymous_to_peers")),
    responseSoftLimitWords: v.number(),
    categorySoftCap: v.number(),
    critiqueToneDefault: v.union(
      v.literal("gentle"),
      v.literal("direct"),
      v.literal("spicy"),
      v.literal("roast"),
    ),
    telemetryEnabled: v.boolean(),
    fightMeEnabled: v.boolean(),
    summaryGateEnabled: v.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_slug", ["slug"])
    .index("by_join_code", ["joinCode"]),

  participants: defineTable({
    sessionId: v.id("sessions"),
    participantSlug: v.string(),
    nickname: v.string(),
    role: v.union(v.literal("participant"), v.literal("instructor"), v.literal("admin")),
    clientKeyHash: v.optional(v.string()),
    joinedAt: timestamp,
    lastSeenAt: timestamp,
    presenceState: v.union(
      v.literal("typing"),
      v.literal("submitted"),
      v.literal("idle"),
      v.literal("offline"),
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_slug", ["sessionId", "participantSlug"])
    .index("by_session_and_client_key_hash", ["sessionId", "clientKeyHash"]),

  submissions: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    body: v.string(),
    parentSubmissionId: v.optional(v.id("submissions")),
    followUpPromptId: v.optional(v.id("followUpPrompts")),
    kind: v.union(
      v.literal("initial"),
      v.literal("additional_point"),
      v.literal("reply"),
      v.literal("fight_me_turn"),
    ),
    wordCount: v.number(),
    typingStartedAt: v.optional(timestamp),
    typingFinishedAt: v.optional(timestamp),
    compositionMs: v.optional(v.number()),
    pasteEventCount: v.number(),
    keystrokeCount: v.number(),
    inputPattern: v.union(
      v.literal("composed_gradually"),
      v.literal("likely_pasted"),
      v.literal("mixed"),
      v.literal("unknown"),
    ),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_participant", ["participantId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_participant_and_created_at", ["participantId", "createdAt"])
    .index("by_parent_submission", ["parentSubmissionId"])
    .index("by_follow_up_prompt", ["followUpPromptId"]),

  reactions: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.id("submissions"),
    participantId: v.id("participants"),
    kind: v.union(
      v.literal("agree"),
      v.literal("sharp"),
      v.literal("question"),
      v.literal("spark"),
      v.literal("changed_mind"),
    ),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_submission", ["submissionId"])
    .index("by_participant", ["participantId"])
    .index("by_submission_and_participant_and_kind", [
      "submissionId",
      "participantId",
      "kind",
    ]),

  positionShiftEvents: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    submissionId: v.optional(v.id("submissions")),
    categoryId: v.optional(v.id("categories")),
    reason: v.string(),
    influencedBy: v.optional(v.string()),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_participant", ["participantId"])
    .index("by_submission", ["submissionId"])
    .index("by_category", ["categoryId"]),

  categories: defineTable({
    sessionId: v.id("sessions"),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentCategoryId: v.optional(v.id("categories")),
    smartTagId: v.optional(v.string()),
    source: v.union(v.literal("instructor"), v.literal("llm"), v.literal("hybrid")),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_slug", ["sessionId", "slug"]),

  sessionTemplates: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    title: v.string(),
    openingPrompt: v.string(),
    modePreset: v.union(
      v.literal("class_discussion"),
      v.literal("conference_qna"),
      v.literal("debate_lab"),
      v.literal("custom"),
    ),
    visibilityMode: v.union(
      v.literal("private_until_released"),
      v.literal("category_summary_only"),
      v.literal("raw_responses_visible"),
    ),
    anonymityMode: v.union(v.literal("nicknames_visible"), v.literal("anonymous_to_peers")),
    responseSoftLimitWords: v.number(),
    categorySoftCap: v.number(),
    critiqueToneDefault: v.union(
      v.literal("gentle"),
      v.literal("direct"),
      v.literal("spicy"),
      v.literal("roast"),
    ),
    telemetryEnabled: v.boolean(),
    fightMeEnabled: v.boolean(),
    summaryGateEnabled: v.boolean(),
    presetCategories: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
    ),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  semanticEmbeddingJobs: defineTable({
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("error"),
    ),
    requestedBy: v.union(v.literal("system"), v.literal("instructor")),
    entityTypes: v.array(
      v.union(
        v.literal("submission"),
        v.literal("synthesisArtifact"),
        v.literal("category"),
        v.literal("fightThread"),
        v.literal("followUpPrompt"),
      ),
    ),
    progressTotal: v.optional(v.number()),
    progressDone: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_status", ["sessionId", "status"]),

  semanticEmbeddings: defineTable({
    sessionId: v.id("sessions"),
    entityType: v.union(
      v.literal("submission"),
      v.literal("synthesisArtifact"),
      v.literal("category"),
      v.literal("fightThread"),
      v.literal("followUpPrompt"),
    ),
    entityId: v.string(),
    contentHash: v.string(),
    textPreview: v.string(),
    embeddingModel: v.string(),
    dimensions: v.number(),
    embedding: v.array(v.number()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_entity_type", ["sessionId", "entityType"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_entity_and_hash", ["entityType", "entityId", "contentHash"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["sessionId", "entityType"],
    }),

  semanticSignals: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.optional(v.id("submissions")),
    participantId: v.optional(v.id("participants")),
    categoryId: v.optional(v.id("categories")),
    signalType: v.union(
      v.literal("novelty"),
      v.literal("duplicate"),
      v.literal("opposition"),
      v.literal("support"),
      v.literal("bridge"),
      v.literal("isolated"),
    ),
    band: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    score: v.number(),
    rationale: v.optional(v.string()),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    sourceEmbeddingId: v.optional(v.id("semanticEmbeddings")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_signal_type", ["sessionId", "signalType"])
    .index("by_submission", ["submissionId"])
    .index("by_category", ["categoryId"]),

  argumentLinks: defineTable({
    sessionId: v.id("sessions"),
    sourceEntityType: v.union(
      v.literal("submission"),
      v.literal("category"),
      v.literal("synthesisArtifact"),
      v.literal("fightThread"),
    ),
    sourceEntityId: v.string(),
    targetEntityType: v.union(
      v.literal("submission"),
      v.literal("category"),
      v.literal("synthesisArtifact"),
      v.literal("fightThread"),
    ),
    targetEntityId: v.string(),
    linkType: v.union(
      v.literal("supports"),
      v.literal("contradicts"),
      v.literal("extends"),
      v.literal("questions"),
      v.literal("bridges"),
    ),
    strength: v.number(),
    confidence: v.number(),
    rationale: v.optional(v.string()),
    source: v.union(v.literal("llm"), v.literal("embedding"), v.literal("instructor")),
    aiJobId: v.optional(v.id("aiJobs")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_link_type", ["sessionId", "linkType"])
    .index("by_source_entity", ["sourceEntityType", "sourceEntityId"])
    .index("by_target_entity", ["targetEntityType", "targetEntityId"]),

  submissionCategories: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    confidence: v.number(),
    rationale: v.optional(v.string()),
    status: v.union(
      v.literal("suggested"),
      v.literal("confirmed"),
      v.literal("recategorization_requested"),
    ),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_submission", ["submissionId"])
    .index("by_category", ["categoryId"]),

  recategorizationRequests: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.id("submissions"),
    participantId: v.id("participants"),
    currentCategoryId: v.optional(v.id("categories")),
    requestedCategoryId: v.optional(v.id("categories")),
    suggestedCategoryName: v.optional(v.string()),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    instructorNote: v.optional(v.string()),
    llmRecommendation: v.optional(v.string()),
    decidedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_submission", ["submissionId"])
    .index("by_participant", ["participantId"])
    .index("by_session_and_status", ["sessionId", "status"]),

  followUpPrompts: defineTable({
    sessionId: v.id("sessions"),
    slug: v.string(),
    title: v.string(),
    prompt: v.string(),
    instructions: v.optional(v.string()),
    targetMode: v.union(v.literal("all"), v.literal("categories")),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed"),
      v.literal("archived"),
    ),
    roundNumber: v.number(),
    activatedAt: v.optional(timestamp),
    closedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_slug", ["sessionId", "slug"])
    .index("by_session_and_status", ["sessionId", "status"]),

  followUpTargets: defineTable({
    sessionId: v.id("sessions"),
    followUpPromptId: v.id("followUpPrompts"),
    targetKind: v.union(v.literal("all"), v.literal("category")),
    categoryId: v.optional(v.id("categories")),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_prompt", ["followUpPromptId"])
    .index("by_category", ["categoryId"]),

  fightThreads: defineTable({
    sessionId: v.id("sessions"),
    slug: v.string(),
    mode: v.union(v.literal("vs_ai"), v.literal("real_1v1")),
    status: v.union(
      v.literal("pending_acceptance"),
      v.literal("active"),
      v.literal("declined"),
      v.literal("expired"),
      v.literal("completed"),
      v.literal("timed_out"),
      v.literal("cancelled"),
      v.literal("forfeited"),
    ),
    attackerParticipantId: v.id("participants"),
    defenderParticipantId: v.optional(v.id("participants")),
    attackerSubmissionId: v.optional(v.id("submissions")),
    defenderSubmissionId: v.optional(v.id("submissions")),
    currentTurnParticipantId: v.optional(v.id("participants")),
    currentTurnRole: v.optional(
      v.union(v.literal("attacker"), v.literal("defender"), v.literal("ai")),
    ),
    nextTurnNumber: v.number(),
    maxTurns: v.number(),
    acceptanceDeadlineAt: v.optional(timestamp),
    turnDeadlineAt: v.optional(timestamp),
    acceptedAt: v.optional(timestamp),
    completedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_slug", ["sessionId", "slug"])
    .index("by_session_and_status", ["sessionId", "status"])
    .index("by_attacker", ["attackerParticipantId"])
    .index("by_defender", ["defenderParticipantId"])
    .index("by_attacker_and_status", ["attackerParticipantId", "status"])
    .index("by_defender_and_status", ["defenderParticipantId", "status"]),

  fightTurns: defineTable({
    sessionId: v.id("sessions"),
    fightThreadId: v.id("fightThreads"),
    participantId: v.optional(v.id("participants")),
    role: v.union(v.literal("attacker"), v.literal("defender"), v.literal("ai")),
    turnNumber: v.number(),
    body: v.string(),
    status: v.union(v.literal("submitted"), v.literal("missed")),
    source: v.union(v.literal("manual"), v.literal("draft_timeout"), v.literal("ai")),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_thread", ["fightThreadId"])
    .index("by_thread_and_turn", ["fightThreadId", "turnNumber"])
    .index("by_participant", ["participantId"]),

  fightDrafts: defineTable({
    sessionId: v.id("sessions"),
    fightThreadId: v.id("fightThreads"),
    participantId: v.id("participants"),
    body: v.string(),
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_thread", ["fightThreadId"])
    .index("by_thread_and_participant", ["fightThreadId", "participantId"]),

  fightDebriefs: defineTable({
    sessionId: v.id("sessions"),
    fightThreadId: v.id("fightThreads"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("error"),
    ),
    summary: v.optional(v.string()),
    attackerStrength: v.optional(v.string()),
    defenderStrength: v.optional(v.string()),
    strongerRebuttal: v.optional(v.string()),
    nextPractice: v.optional(v.string()),
    llmCallId: v.optional(v.id("llmCalls")),
    error: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_thread", ["fightThreadId"])
    .index("by_session", ["sessionId"]),

  synthesisArtifacts: defineTable({
    sessionId: v.id("sessions"),
    categoryId: v.optional(v.id("categories")),
    kind: v.union(
      v.literal("category_summary"),
      v.literal("class_synthesis"),
      v.literal("opposing_views"),
      v.literal("contribution_trace"),
      v.literal("final_summary"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("draft"),
      v.literal("published"),
      v.literal("final"),
      v.literal("error"),
      v.literal("archived"),
    ),
    title: v.string(),
    summary: v.optional(v.string()),
    keyPoints: v.array(v.string()),
    uniqueInsights: v.array(v.string()),
    opposingViews: v.array(v.string()),
    sourceCounts: v.any(),
    promptTemplateKey: v.optional(v.string()),
    llmCallId: v.optional(v.id("llmCalls")),
    aiJobId: v.optional(v.id("aiJobs")),
    error: v.optional(v.string()),
    generatedAt: v.optional(timestamp),
    publishedAt: v.optional(timestamp),
    finalizedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_status", ["sessionId", "status"])
    .index("by_session_and_kind", ["sessionId", "kind"])
    .index("by_category", ["categoryId"]),

  synthesisQuotes: defineTable({
    artifactId: v.id("synthesisArtifacts"),
    sessionId: v.id("sessions"),
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
    createdAt: timestamp,
  })
    .index("by_artifact", ["artifactId"])
    .index("by_session", ["sessionId"])
    .index("by_submission", ["submissionId"]),

  personalReports: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("error"),
    ),
    participationBand: v.optional(
      v.union(v.literal("quiet"), v.literal("active"), v.literal("highly_active")),
    ),
    reasoningBand: v.optional(
      v.union(
        v.literal("emerging"),
        v.literal("solid"),
        v.literal("strong"),
        v.literal("exceptional"),
      ),
    ),
    originalityBand: v.optional(
      v.union(
        v.literal("common"),
        v.literal("above_average"),
        v.literal("distinctive"),
        v.literal("novel"),
      ),
    ),
    responsivenessBand: v.optional(
      v.union(v.literal("limited"), v.literal("responsive"), v.literal("highly_responsive")),
    ),
    summary: v.optional(v.string()),
    contributionTrace: v.optional(v.string()),
    argumentEvolution: v.optional(v.string()),
    growthOpportunity: v.optional(v.string()),
    citedArtifactIds: v.array(v.id("synthesisArtifacts")),
    promptTemplateKey: v.optional(v.string()),
    llmCallId: v.optional(v.id("llmCalls")),
    aiJobId: v.optional(v.id("aiJobs")),
    error: v.optional(v.string()),
    generatedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_participant", ["participantId"])
    .index("by_session_and_status", ["sessionId", "status"])
    .index("by_session_and_participant", ["sessionId", "participantId"]),

  promptTemplates: defineTable({
    key: v.string(),
    name: v.string(),
    surface: v.string(),
    systemPrompt: v.string(),
    userTemplate: v.string(),
    modelOverride: v.optional(v.string()),
    variablesJson: v.any(),
    version: v.number(),
    updatedAt: timestamp,
  }).index("by_key", ["key"]),

  submissionFeedback: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.id("submissions"),
    participantId: v.id("participants"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("error"),
    ),
    tone: v.union(v.literal("gentle"), v.literal("direct"), v.literal("spicy"), v.literal("roast")),
    reasoningBand: v.optional(
      v.union(
        v.literal("emerging"),
        v.literal("solid"),
        v.literal("strong"),
        v.literal("exceptional"),
      ),
    ),
    originalityBand: v.optional(
      v.union(
        v.literal("common"),
        v.literal("above_average"),
        v.literal("distinctive"),
        v.literal("novel"),
      ),
    ),
    specificityBand: v.optional(
      v.union(v.literal("basic"), v.literal("clear"), v.literal("detailed"), v.literal("nuanced")),
    ),
    summary: v.optional(v.string()),
    strengths: v.optional(v.string()),
    improvement: v.optional(v.string()),
    nextQuestion: v.optional(v.string()),
    llmCallId: v.optional(v.id("llmCalls")),
    error: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_submission", ["submissionId"])
    .index("by_participant", ["participantId"])
    .index("by_session", ["sessionId"]),

  aiJobs: defineTable({
    sessionId: v.id("sessions"),
    submissionId: v.optional(v.id("submissions")),
    type: v.union(
      v.literal("feedback"),
      v.literal("categorisation"),
      v.literal("moderation"),
      v.literal("synthesis"),
      v.literal("fight_challenge"),
      v.literal("fight_debrief"),
      v.literal("personal_report"),
      v.literal("argument_map"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("error"),
    ),
    requestedBy: v.union(v.literal("system"), v.literal("instructor"), v.literal("participant")),
    progressTotal: v.optional(v.number()),
    progressDone: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_status", ["sessionId", "status"])
    .index("by_session_and_type", ["sessionId", "type"])
    .index("by_type_and_status", ["type", "status"])
    .index("by_submission", ["submissionId"]),

  modelSettings: defineTable({
    key: v.string(),
    provider: v.string(),
    model: v.string(),
    enabled: v.boolean(),
    features: v.array(v.string()),
    inputCostPerMillion: v.number(),
    cachedInputCostPerMillion: v.optional(v.number()),
    outputCostPerMillion: v.number(),
    reasoningCostPerMillion: v.optional(v.number()),
    variablesJson: v.any(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_key", ["key"])
    .index("by_provider", ["provider"]),

  llmCalls: defineTable({
    sessionId: v.optional(v.id("sessions")),
    feature: v.string(),
    provider: v.string(),
    model: v.string(),
    status: v.union(v.literal("queued"), v.literal("success"), v.literal("error")),
    promptTemplateKey: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    requestJson: v.optional(v.any()),
    responseJson: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_feature", ["feature"]),

  protectionSettings: defineTable({
    sessionId: v.union(v.id("sessions"), v.null()),
    key: v.string(),
    valueJson: v.any(),
    updatedAt: timestamp,
  })
    .index("by_key", ["key"])
    .index("by_session_and_key", ["sessionId", "key"]),

  demoToggles: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    valueJson: v.any(),
    updatedAt: timestamp,
  }).index("by_key", ["key"]),

  auditEvents: defineTable({
    sessionId: v.optional(v.id("sessions")),
    actorType: v.union(v.literal("system"), v.literal("participant"), v.literal("instructor")),
    actorParticipantId: v.optional(v.id("participants")),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadataJson: v.optional(v.any()),
    createdAt: timestamp,
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_action_and_created_at", ["action", "createdAt"]),
});
