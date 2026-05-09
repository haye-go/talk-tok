import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_MODELS = [
  {
    key: "openai:gpt-4.1-mini",
    provider: "openai",
    model: "gpt-4.1-mini",
    enabled: true,
    features: ["feedback", "categorisation", "moderation"],
    inputCostPerMillion: 0.4,
    cachedInputCostPerMillion: 0.1,
    outputCostPerMillion: 1.6,
    reasoningCostPerMillion: 0,
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 1200,
      responseFormat: "json_object",
    },
  },
  {
    key: "openai:gpt-4.1",
    provider: "openai",
    model: "gpt-4.1",
    enabled: false,
    features: ["feedback", "categorisation", "synthesis"],
    inputCostPerMillion: 2,
    cachedInputCostPerMillion: 0.5,
    outputCostPerMillion: 8,
    reasoningCostPerMillion: 0,
    variablesJson: {
      temperature: 0.2,
      maxOutputTokens: 2500,
      responseFormat: "json_object",
    },
  },
] as const;

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const timestamp = Date.now();

    for (const model of DEFAULT_MODELS) {
      const existing = await ctx.db
        .query("modelSettings")
        .withIndex("by_key", (q) => q.eq("key", model.key))
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert("modelSettings", {
        ...model,
        features: [...model.features],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      inserted += 1;
    }

    return { inserted, totalDefaults: DEFAULT_MODELS.length };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("modelSettings").collect();
  },
});

export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  },
});

export const update = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("modelSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing) {
      throw new Error("Model setting not found.");
    }

    await ctx.db.patch(existing._id, {
      provider: args.provider.trim(),
      model: args.model.trim(),
      enabled: args.enabled,
      features: args.features.map((feature) => feature.trim()).filter(Boolean),
      inputCostPerMillion: args.inputCostPerMillion,
      cachedInputCostPerMillion: args.cachedInputCostPerMillion,
      outputCostPerMillion: args.outputCostPerMillion,
      reasoningCostPerMillion: args.reasoningCostPerMillion,
      variablesJson: args.variablesJson,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(existing._id);
  },
});
