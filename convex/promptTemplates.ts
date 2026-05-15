import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

const now = () => Date.now();
const CATEGORISATION_PROMPT_KEYS = new Set([
  "categorisation.session.v1",
  "category.generate.append.v1",
  "category.generate.full_regeneration.v1",
  "category.assign.batch.v1",
  "category.assign.single.v1",
  "submission.type.classify.v1",
]);
const SYNC_DEFAULT_PROMPT_KEYS = new Set(["report.personal.v1"]);

function jsonEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

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
      "Hidden instructor baseline for this question, if available: {{baselineJson}}",
      "Submission:",
      "{{submissionBody}}",
      "",
      "Return JSON with reasoningBand, originalityBand, specificityBand, summary, strengths, improvement, nextQuestion.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.3,
      maxOutputTokens: 700,
      responseFormat: "json_object",
    },
  },
  {
    key: "question.baseline.v1",
    name: "Hidden question baseline",
    surface: "question_baseline",
    systemPrompt: [
      "You create a hidden instructor-side baseline response for a live discussion question.",
      "The baseline is not a model answer shown to learners.",
      "Use it to expose likely reasoning moves, strong coverage, blind spots, and comparison anchors.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Question title: {{questionTitle}}",
      "Question prompt: {{questionPrompt}}",
      "",
      "Return JSON with baselineText and summary.",
      "baselineText should be a strong but not exhaustive response a thoughtful participant could give.",
      "summary should briefly identify the reasoning dimensions this baseline covers.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.35,
      maxOutputTokens: 1200,
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
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 3000,
      responseFormat: "json_object",
    },
  },
  {
    key: "category.generate.append.v1",
    name: "Append discussion categories",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You generate instructor-facing discussion categories from live classroom posts.",
      "Use existing categories as the current taxonomy.",
      "For append mode, return only genuinely missing categories or safe improvements to existing category names/descriptions.",
      "Do not assign posts to categories in this task.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Category soft cap: {{categorySoftCap}}",
      "Existing categories: {{existingCategoriesJson}}",
      "Submissions: {{submissionsJson}}",
      "",
      "Return JSON with categories.",
      "categories must be an array of objects with slug, name, description, and optional color.",
      "Use stable lowercase hyphen slugs.",
      "If no new category is needed, return an empty categories array.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.15,
      maxOutputTokens: 1800,
      responseFormat: "json_object",
    },
  },
  {
    key: "category.generate.full_regeneration.v1",
    name: "Regenerate discussion categories",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You regenerate a complete instructor-facing category taxonomy from live classroom posts.",
      "Use existing categories as context, but the output must represent the full active taxonomy after regeneration.",
      "Prefer a small, clear set of categories that help an instructor understand patterns in the room.",
      "Do not assign posts to categories in this task.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Category soft cap: {{categorySoftCap}}",
      "Existing categories: {{existingCategoriesJson}}",
      "Submissions: {{submissionsJson}}",
      "",
      "Return JSON with categories.",
      "categories must be an array of objects with slug, name, description, and optional color.",
      "Use stable lowercase hyphen slugs.",
      "The returned categories are the complete active category set.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.15,
      maxOutputTokens: 2200,
      responseFormat: "json_object",
    },
  },
  {
    key: "category.assign.batch.v1",
    name: "Assign discussion categories",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You assign live classroom posts to an existing instructor taxonomy.",
      "Use only the supplied categories; do not invent new categories.",
      "Use fixed decisions: auto, review, or none.",
      "Choose auto only when one category is clearly appropriate.",
      "Choose review when a human instructor should decide.",
      "Choose none when the post is not meaningfully categorizable.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Assignment scope: {{assignmentScope}}",
      "Categories: {{categoriesJson}}",
      "Submissions: {{submissionsJson}}",
      "",
      "Return JSON with assignments.",
      "Each assignment must include submissionId, decision, rationale, and categorySlug when decision is auto or review with a suggested category.",
      "decision must be exactly one of: auto, review, none.",
      "Do not include posts that are impossible to evaluate from the supplied text.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.1,
      maxOutputTokens: 3000,
      responseFormat: "json_object",
    },
  },
  {
    key: "category.assign.single.v1",
    name: "Assign one discussion category",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You assign one live classroom post to an existing instructor taxonomy.",
      "Use only the supplied categories; do not invent new categories.",
      "Use fixed decisions: auto, review, or none.",
      "Choose auto only when one category is clearly appropriate.",
      "Choose review when a human instructor should decide.",
      "Choose none when the post is not meaningfully categorizable.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Categories: {{categoriesJson}}",
      "Submission: {{submissionJson}}",
      "",
      "Return JSON with submissionId, decision, rationale, and categorySlug when decision is auto or review with a suggested category.",
      "decision must be exactly one of: auto, review, none.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.1,
      maxOutputTokens: 700,
      responseFormat: "json_object",
    },
  },
  {
    key: "submission.type.classify.v1",
    name: "Classify submission type",
    surface: "instructor_categorisation",
    systemPrompt: [
      "You classify a live classroom post as either a question or a comment.",
      "Use question only when the post asks for information, clarification, or a response.",
      "Use comment for claims, reflections, examples, answers, or observations.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Submission: {{submissionJson}}",
      "",
      "Return JSON with type and rationale.",
      "type must be exactly one of: question, comment.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0,
      maxOutputTokens: 350,
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
    modelOverride: "openai:gpt-4.1",
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
      "Focus on participation, reasoning, contribution trace, and argument evolution.",
      "Use telemetry only as soft context, not as proof of misconduct.",
      "Keep the tone constructive, specific, and non-accusatory.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Selected question: {{questionJson}}",
      "Hidden instructor baseline for this question, if available: {{baselineJson}}",
      "Participant: {{participantJson}}",
      "Submissions: {{submissionsJson}}",
      "Feedback summaries: {{feedbackJson}}",
      "Category assignments: {{assignmentsJson}}",
      "Fight Me summaries: {{fightDebriefsJson}}",
      "Published synthesis artifacts: {{artifactsJson}}",
      "",
      "Return JSON with participationBand, reasoningBand, summary, contributionTrace, argumentEvolution.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.25,
      maxOutputTokens: 1600,
      responseFormat: "json_object",
    },
  },
  {
    key: "argument_map.session.v1",
    name: "Session argument map",
    surface: "argument_map",
    systemPrompt: [
      "You map argument relationships in a live discussion.",
      "Use only the supplied categories, submissions, and synthesis artifacts.",
      "Create links only when the relationship is clear.",
      "Return strict JSON matching the requested schema.",
    ].join("\n"),
    userTemplate: [
      "Session title: {{sessionTitle}}",
      "Opening prompt: {{openingPrompt}}",
      "Categories: {{categoriesJson}}",
      "Submissions: {{submissionsJson}}",
      "Synthesis artifacts: {{artifactsJson}}",
      "",
      "Return JSON with links.",
      "Each link must include sourceEntityType, sourceEntityId, targetEntityType, targetEntityId, linkType, strength, confidence, rationale.",
      "Allowed entity types: submission, category, synthesisArtifact.",
      "Allowed link types: supports, contradicts, extends, questions, bridges.",
    ].join("\n"),
    modelOverride: "openai:gpt-4.1",
    variablesJson: {
      temperature: 0.1,
      maxOutputTokens: 3000,
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
        if (
          SYNC_DEFAULT_PROMPT_KEYS.has(prompt.key) &&
          (existing.name !== prompt.name ||
            existing.surface !== prompt.surface ||
            existing.systemPrompt !== prompt.systemPrompt ||
            existing.userTemplate !== prompt.userTemplate ||
            existing.modelOverride !== prompt.modelOverride ||
            !jsonEqual(existing.variablesJson, prompt.variablesJson))
        ) {
          await ctx.db.patch(existing._id, {
            name: prompt.name,
            surface: prompt.surface,
            systemPrompt: prompt.systemPrompt,
            userTemplate: prompt.userTemplate,
            modelOverride: prompt.modelOverride,
            variablesJson: prompt.variablesJson,
            version: existing.version + 1,
            updatedAt: now(),
          });
          inserted += 1;
        }
        if (
          CATEGORISATION_PROMPT_KEYS.has(prompt.key) &&
          existing.modelOverride !== prompt.modelOverride
        ) {
          await ctx.db.patch(existing._id, {
            modelOverride: prompt.modelOverride,
            updatedAt: now(),
          });
          inserted += 1;
        }
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
  args: { previewPassword: v.string() },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
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
    previewPassword: v.string(),
    key: v.string(),
    name: v.optional(v.string()),
    surface: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userTemplate: v.optional(v.string()),
    modelOverride: v.optional(v.string()),
    variablesJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const existing = await ctx.db
      .query("promptTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing) {
      throw new Error("Prompt template not found.");
    }

    await ctx.db.patch(existing._id, {
      name: args.name?.trim() ?? existing.name,
      surface: args.surface?.trim() ?? existing.surface,
      systemPrompt: args.systemPrompt ?? existing.systemPrompt,
      userTemplate: args.userTemplate ?? existing.userTemplate,
      modelOverride: args.modelOverride,
      variablesJson: args.variablesJson ?? existing.variablesJson,
      version: existing.version + 1,
      updatedAt: now(),
    });

    return await ctx.db.get(existing._id);
  },
});
