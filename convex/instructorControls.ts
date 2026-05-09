import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, type MutationCtx, type QueryCtx } from "./_generated/server";

const phaseValidator = v.union(
  v.literal("lobby"),
  v.literal("submit"),
  v.literal("discover"),
  v.literal("challenge"),
  v.literal("synthesize"),
  v.literal("closed"),
);

const actValidator = v.union(
  v.literal("submit"),
  v.literal("discover"),
  v.literal("challenge"),
  v.literal("synthesize"),
);

const visibilityModeValidator = v.union(
  v.literal("private_until_released"),
  v.literal("category_summary_only"),
  v.literal("raw_responses_visible"),
);

const anonymityModeValidator = v.union(
  v.literal("nicknames_visible"),
  v.literal("anonymous_to_peers"),
);

const critiqueToneValidator = v.union(
  v.literal("gentle"),
  v.literal("direct"),
  v.literal("spicy"),
  v.literal("roast"),
);

function normalizeTitle(value: string) {
  const title = value.trim();

  if (title.length < 3) {
    throw new Error("Session title must be at least 3 characters.");
  }

  if (title.length > 120) {
    throw new Error("Session title must be 120 characters or fewer.");
  }

  return title;
}

function normalizeOpeningPrompt(value: string) {
  const prompt = value.trim();

  if (prompt.length < 10) {
    throw new Error("Opening prompt must be at least 10 characters.");
  }

  if (prompt.length > 1000) {
    throw new Error("Opening prompt must be 1000 characters or fewer.");
  }

  return prompt;
}

function normalizeInteger(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a number.`);
  }

  const integer = Math.round(value);

  if (integer < min || integer > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return integer;
}

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

function defaultActForPhase(
  phase: "lobby" | "submit" | "discover" | "challenge" | "synthesize" | "closed",
) {
  if (phase === "discover") {
    return "discover";
  }

  if (phase === "challenge") {
    return "challenge";
  }

  if (phase === "synthesize" || phase === "closed") {
    return "synthesize";
  }

  return "submit";
}

function toPublicSessionControl(
  session: NonNullable<Awaited<ReturnType<typeof getSessionBySlug>>>,
) {
  return {
    id: session._id,
    slug: session.slug,
    phase: session.phase,
    currentAct: session.currentAct,
    visibilityMode: session.visibilityMode,
    title: session.title,
    openingPrompt: session.openingPrompt,
    anonymityMode: session.anonymityMode,
    responseSoftLimitWords: session.responseSoftLimitWords,
    categorySoftCap: session.categorySoftCap,
    critiqueToneDefault: session.critiqueToneDefault,
    telemetryEnabled: session.telemetryEnabled,
    fightMeEnabled: session.fightMeEnabled,
    summaryGateEnabled: session.summaryGateEnabled,
    updatedAt: session.updatedAt,
  };
}

export const updatePhase = mutation({
  args: {
    sessionSlug: v.string(),
    phase: phaseValidator,
    currentAct: v.optional(actValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const now = Date.now();
    const currentAct = args.currentAct ?? defaultActForPhase(args.phase);

    await ctx.db.patch(session._id, {
      phase: args.phase,
      currentAct,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "session.phase_updated",
      targetType: "session",
      targetId: session._id,
      metadataJson: { phase: args.phase, currentAct },
    });

    const updated = await ctx.db.get(session._id);

    if (!updated) {
      throw new Error("Session not found after update.");
    }

    return toPublicSessionControl(updated);
  },
});

export const updateVisibility = mutation({
  args: {
    sessionSlug: v.string(),
    visibilityMode: visibilityModeValidator,
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const now = Date.now();

    await ctx.db.patch(session._id, {
      visibilityMode: args.visibilityMode,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "session.visibility_updated",
      targetType: "session",
      targetId: session._id,
      metadataJson: { visibilityMode: args.visibilityMode },
    });

    const updated = await ctx.db.get(session._id);

    if (!updated) {
      throw new Error("Session not found after update.");
    }

    return toPublicSessionControl(updated);
  },
});

export const updateSettings = mutation({
  args: {
    sessionSlug: v.string(),
    title: v.optional(v.string()),
    openingPrompt: v.optional(v.string()),
    anonymityMode: v.optional(anonymityModeValidator),
    responseSoftLimitWords: v.optional(v.number()),
    categorySoftCap: v.optional(v.number()),
    critiqueToneDefault: v.optional(critiqueToneValidator),
    telemetryEnabled: v.optional(v.boolean()),
    fightMeEnabled: v.optional(v.boolean()),
    summaryGateEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const patch: {
      title?: string;
      openingPrompt?: string;
      anonymityMode?: "nicknames_visible" | "anonymous_to_peers";
      responseSoftLimitWords?: number;
      categorySoftCap?: number;
      critiqueToneDefault?: "gentle" | "direct" | "spicy" | "roast";
      telemetryEnabled?: boolean;
      fightMeEnabled?: boolean;
      summaryGateEnabled?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = normalizeTitle(args.title);
    }

    if (args.openingPrompt !== undefined) {
      patch.openingPrompt = normalizeOpeningPrompt(args.openingPrompt);
    }

    if (args.anonymityMode !== undefined) {
      patch.anonymityMode = args.anonymityMode;
    }

    if (args.responseSoftLimitWords !== undefined) {
      patch.responseSoftLimitWords = normalizeInteger(
        args.responseSoftLimitWords,
        "Response word limit",
        20,
        1000,
      );
    }

    if (args.categorySoftCap !== undefined) {
      patch.categorySoftCap = normalizeInteger(args.categorySoftCap, "Category soft cap", 2, 40);
    }

    if (args.critiqueToneDefault !== undefined) {
      patch.critiqueToneDefault = args.critiqueToneDefault;
    }

    if (args.telemetryEnabled !== undefined) {
      patch.telemetryEnabled = args.telemetryEnabled;
    }

    if (args.fightMeEnabled !== undefined) {
      patch.fightMeEnabled = args.fightMeEnabled;
    }

    if (args.summaryGateEnabled !== undefined) {
      patch.summaryGateEnabled = args.summaryGateEnabled;
    }

    await ctx.db.patch(session._id, patch);
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "session.settings_updated",
      targetType: "session",
      targetId: session._id,
      metadataJson: {
        fields: Object.keys(patch).filter((key) => key !== "updatedAt"),
      },
    });

    const updated = await ctx.db.get(session._id);

    if (!updated) {
      throw new Error("Session not found after update.");
    }

    return toPublicSessionControl(updated);
  },
});
