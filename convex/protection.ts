import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const DEFAULT_PROTECTION_SETTINGS = [
  {
    key: "rateLimits",
    valueJson: {
      submissionsPerWindow: 5,
      submissionWindowMs: 30_000,
      repliesPerWindow: 8,
      reactionsPerWindow: 30,
      recategorizationRequestsPerWindow: 3,
      fightMeTurnsPerWindow: 10,
      windowMs: 60_000,
    },
  },
  {
    key: "contentLimits",
    valueJson: {
      minSubmissionCharacters: 5,
      maxSubmissionCharacters: 8000,
      maxRecategorizationReasonCharacters: 1000,
      maxCategoryNameCharacters: 80,
    },
  },
  {
    key: "aiBudget",
    valueJson: {
      dailyEstimatedCostUsd: 10,
      perSessionEstimatedCostUsd: 3,
      warnAtPercent: 80,
      hardStopEnabled: false,
    },
  },
  {
    key: "telemetryDisclosure",
    valueJson: {
      enabled: true,
      text: "Typing telemetry is used as a rough participation signal. It is not proof of misconduct.",
    },
  },
] as const;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

async function getSetting(ctx: QueryCtx | MutationCtx, key: string, sessionId?: Id<"sessions">) {
  if (sessionId) {
    const sessionSetting = await ctx.db
      .query("protectionSettings")
      .withIndex("by_session_and_key", (q) => q.eq("sessionId", sessionId).eq("key", key))
      .unique();

    if (sessionSetting) {
      return sessionSetting;
    }
  }

  return await ctx.db
    .query("protectionSettings")
    .withIndex("by_session_and_key", (q) => q.eq("sessionId", null).eq("key", key))
    .unique();
}

function toPublicSetting(setting: Doc<"protectionSettings">) {
  return {
    _id: setting._id,
    id: setting._id,
    sessionId: setting.sessionId,
    key: setting.key,
    valueJson: setting.valueJson,
    updatedAt: setting.updatedAt,
  };
}

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();

    for (const setting of DEFAULT_PROTECTION_SETTINGS) {
      const existing = await getSetting(ctx, setting.key);

      if (existing) {
        continue;
      }

      await ctx.db.insert("protectionSettings", {
        sessionId: null,
        key: setting.key,
        valueJson: setting.valueJson,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted, totalDefaults: DEFAULT_PROTECTION_SETTINGS.length };
  },
});

export const list = query({
  args: {
    sessionSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = args.sessionSlug ? await getSessionBySlug(ctx, args.sessionSlug) : null;
    const globalSettings = await ctx.db
      .query("protectionSettings")
      .withIndex("by_session_and_key", (q) => q.eq("sessionId", null))
      .take(50);

    if (!session) {
      return globalSettings.map(toPublicSetting);
    }

    const sessionSettings = await ctx.db
      .query("protectionSettings")
      .withIndex("by_session_and_key", (q) => q.eq("sessionId", session._id))
      .take(50);
    const sessionKeys = new Set(sessionSettings.map((setting) => setting.key));

    return [
      ...sessionSettings.map(toPublicSetting),
      ...globalSettings
        .filter((setting) => !sessionKeys.has(setting.key))
        .map((setting) => ({ ...toPublicSetting(setting), inherited: true })),
    ];
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    valueJson: v.any(),
    sessionSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = args.sessionSlug ? await getSessionBySlug(ctx, args.sessionSlug) : null;
    const sessionId = session?._id;
    const existing = await getSetting(ctx, args.key, sessionId);
    const now = Date.now();

    if (existing && existing.sessionId === (sessionId ?? null)) {
      await ctx.db.patch(existing._id, { valueJson: args.valueJson, updatedAt: now });
      await ctx.runMutation(internal.audit.record, {
        sessionId,
        actorType: "instructor",
        action: "protection.setting.updated",
        targetType: "protectionSetting",
        targetId: existing._id,
        metadataJson: { key: args.key },
      });
      return await ctx.db.get(existing._id);
    }

    const settingId = await ctx.db.insert("protectionSettings", {
      sessionId: sessionId ?? null,
      key: args.key.trim(),
      valueJson: args.valueJson,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId,
      actorType: "instructor",
      action: "protection.setting.created",
      targetType: "protectionSetting",
      targetId: settingId,
      metadataJson: { key: args.key },
    });

    return await ctx.db.get(settingId);
  },
});

export const loadSetting = internalQuery({
  args: {
    key: v.string(),
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args) => {
    const setting = await getSetting(ctx, args.key, args.sessionId);
    return setting?.valueJson ?? null;
  },
});
