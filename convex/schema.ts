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
    .index("by_parent_submission", ["parentSubmissionId"]),

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
    .index("by_submission", ["submissionId"])
    .index("by_category", ["categoryId"]),

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
    .index("by_feature", ["feature"]),
});
