import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation } from "./_generated/server";

export const seedCoreDefaults = mutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    prompts: { inserted: number; totalDefaults: number };
    models: { inserted: number; totalDefaults: number };
    protection: { inserted: number; totalDefaults: number };
  }> => {
    const prompts = await ctx.runMutation(api.promptTemplates.seedDefaults, {});
    const models = await ctx.runMutation(api.modelSettings.seedDefaults, {});
    const protection = await ctx.runMutation(api.protection.seedDefaults, {});

    return { prompts, models, protection };
  },
});

export const health = mutation({
  args: {
    includeTimestamp: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => ({
    ok: true,
    service: "talktok-convex",
    ...(args.includeTimestamp ? { timestamp: Date.now() } : {}),
  }),
});
