import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const now = () => Date.now();

const DEFAULT_PROMPTS = [
  {
    key: "feedback.private.v1",
    name: "Private submission feedback",
    surface: "participant_feedback",
    systemPrompt: [
      "You are an instructor assistant for a live discussion platform.",
      "Give private feedback on the submitted response.",
      "Critique the response, not the student's identity.",
      "For spicy or roast tones, stay playful and specific without personal insults.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Tone: {{tone}}",
      "Word count: {{wordCount}}",
      "Input telemetry: {{inputTelemetry}}",
      "Submission:",
      "{{submissionBody}}",
      "",
      "Return JSON with reasoningBand, originalityBand, specificityBand, summary, strengths, improvement, nextQuestion.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.3,
      maxOutputTokens: 700,
      responseFormat: "json_object",
    },
  },
  {
    key: "categorisation.session.v1",
    name: "Session categorisation",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You categorise live discussion responses into useful instructor-facing categories.",
      "Prefer merging into existing categories over creating too many new categories.",
      "Respect the configured category soft cap.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Category soft cap: {{categorySoftCap}}",
      "Existing categories: {{existingCategoriesJson}}",
      "Submissions: {{submissionsJson}}",
      "",
      "Return JSON with categories and assignments. Each assignment must reference a provided submission id.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 3000,
      responseFormat: "json_object",
    },
  },
  {
    key: "moderation.light.v1",
    name: "Light moderation boundary",
    surface: "moderation",
    systemPrompt: [
      "You flag obviously abusive, hateful, or unsafe content for a classroom discussion context.",
      "Return strict JSON and avoid over-flagging normal disagreement.",
    ].join("\n"),
    userTemplate: [
      "Text to inspect:",
      "{{text}}",
      "",
      "Return JSON with flagged, reason, severity.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0,
      maxOutputTokens: 300,
      responseFormat: "json_object",
    },
  },
  {
    key: "category.merge.v1",
    name: "Category overlap and merge suggestions",
    surface: "instructor_category_review",
    systemPrompt: [
      "You review discussion categories for overlap and suggest safe merge or rename options.",
      "Return strict JSON with recommendations only; do not modify categories directly.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Categories: {{categoriesJson}}",
      "",
      "Return JSON with overlaps and recommendations.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.1,
      maxOutputTokens: 1200,
      responseFormat: "json_object",
    },
  },
  {
    key: "fight.ai_challenge.v1",
    name: "Fight Me AI challenger turn",
    surface: "fight_me",
    systemPrompt: [
      "You are the challenger in a short structured classroom debate.",
      "Challenge the participant's position with a specific counterargument.",
      "Stay spirited but not personally abusive.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Source response: {{sourceResponse}}",
      "Existing fight turns: {{turnsJson}}",
      "",
      "Return JSON with body. Keep body under 120 words.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.5,
      maxOutputTokens: 500,
      responseFormat: "json_object",
    },
  },
  {
    key: "fight.debrief.v1",
    name: "Fight Me debrief",
    surface: "fight_me",
    systemPrompt: [
      "You debrief a short structured classroom debate.",
      "Evaluate arguments, not identities.",
      "Be concise, useful, and specific.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Fight mode: {{mode}}",
      "Status: {{status}}",
      "Turns: {{turnsJson}}",
      "",
      "Return JSON with summary, attackerStrength, defenderStrength, strongerRebuttal, nextPractice.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.3,
      maxOutputTokens: 900,
      responseFormat: "json_object",
    },
  },
  {
    key: "synthesis.category.v1",
    name: "Category synthesis",
    surface: "synthesis",
    systemPrompt: [
      "You synthesize one live discussion category for an instructor.",
      "Use only the supplied discussion data.",
      "Do not expose private feedback or make accusations about AI use.",
      "Select short representative quotes only when they directly support the synthesis.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Category: {{categoryJson}}",
      "Responses: {{submissionsJson}}",
      "",
      "Return JSON with title, summary, keyPoints, uniqueInsights, opposingViews, quotes.",
      "quotes must be an array of objects with submissionId, quote, quoteRole.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 1800,
      responseFormat: "json_object",
    },
  },
  {
    key: "synthesis.class.v1",
    name: "Class synthesis",
    surface: "synthesis",
    systemPrompt: [
      "You synthesize a full live discussion for an instructor and participants.",
      "Use only the supplied discussion data.",
      "Highlight key points, unique viewpoints, and genuine opposing views.",
      "Do not expose private feedback or frame telemetry as cheating evidence.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Categories: {{categoriesJson}}",
      "Responses: {{submissionsJson}}",
      "Existing category summaries: {{categorySummariesJson}}",
      "",
      "Return JSON with title, summary, keyPoints, uniqueInsights, opposingViews, quotes.",
      "quotes must be an array of objects with submissionId, quote, quoteRole.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 2600,
      responseFormat: "json_object",
    },
  },
  {
    key: "synthesis.opposing_views.v1",
    name: "Opposing views synthesis",
    surface: "synthesis",
    systemPrompt: [
      "You identify meaningful opposing views in a live discussion.",
      "Represent disagreements fairly and concisely.",
      "Do not invent conflict where responses are only different emphases.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Categories: {{categoriesJson}}",
      "Responses: {{submissionsJson}}",
      "",
      "Return JSON with title, summary, keyPoints, uniqueInsights, opposingViews, quotes.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 1800,
      responseFormat: "json_object",
    },
  },
  {
    key: "report.personal.v1",
    name: "Participant personal report",
    surface: "personal_report",
    systemPrompt: [
      "You write a private participant reflection report for a live discussion.",
      "Focus on reasoning, responsiveness, originality, and contribution trace.",
      "Use telemetry only as soft context, not as proof of misconduct.",
      "Keep the tone constructive, specific, and non-accusatory.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Participant: {{participantJson}}",
      "Submissions: {{submissionsJson}}",
      "Feedback summaries: {{feedbackJson}}",
      "Category assignments: {{assignmentsJson}}",
      "Fight Me summaries: {{fightDebriefsJson}}",
      "Published synthesis artifacts: {{artifactsJson}}",
      "",
      "Return JSON with participationBand, reasoningBand, originalityBand, responsivenessBand, summary, contributionTrace, argumentEvolution, growthOpportunity.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1-mini",
    variablesJson: {
      temperature: 0.25,
      maxOutputTokens: 1600,
      responseFormat: "json_object",
    },
  },
] as const;

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;

    for (const prompt of DEFAULT_PROMPTS) {
      const existing = await ctx.db
        .query("promptTemplates")
        .withIndex("by_key", (q) => q.eq("key", prompt.key))
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert("promptTemplates", {
        ...prompt,
        version: 1,
        updatedAt: now(),
      });
      inserted += 1;
    }

    return { inserted, totalDefaults: DEFAULT_PROMPTS.length };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("promptTemplates").collect();
  },
});

export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    surface: v.string(),
    systemPrompt: v.string(),
    userTemplate: v.string(),
    modelOverride: v.optional(v.string()),
    variablesJson: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("promptTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing) {
      throw new Error("Prompt template not found.");
    }

    await ctx.db.patch(existing._id, {
      name: args.name.trim(),
      surface: args.surface.trim(),
      systemPrompt: args.systemPrompt,
      userTemplate: args.userTemplate,
      modelOverride: args.modelOverride,
      variablesJson: args.variablesJson,
      version: existing.version + 1,
      updatedAt: now(),
    });

    return await ctx.db.get(existing._id);
  },
});
