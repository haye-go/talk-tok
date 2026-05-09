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
    visibilityMode: v.union(
      v.literal("private_until_released"),
      v.literal("category_summary_only"),
      v.literal("raw_responses_visible"),
    ),
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
