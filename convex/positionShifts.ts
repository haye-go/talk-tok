import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { rateLimiter } from "./components";

const MAX_REASON_LENGTH = 1000;
const MAX_INFLUENCED_BY_LENGTH = 1000;
const SHIFT_LIMIT = 120;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value: string, maxLength: number, label: string) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length < 5) {
    throw new Error(`${label} must be at least 5 characters.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

async function getParticipantByClientKey(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  clientKey: string,
) {
  const clientKeyHash = await hashClientKey(clientKey);

  return await ctx.db
    .query("participants")
    .withIndex("by_session_and_client_key_hash", (q) =>
      q.eq("sessionId", sessionId).eq("clientKeyHash", clientKeyHash),
    )
    .unique();
}

function toPublicShift(shift: {
  _id: Id<"positionShiftEvents">;
  sessionId: Id<"sessions">;
  participantId: Id<"participants">;
  submissionId?: Id<"submissions">;
  categoryId?: Id<"categories">;
  reason: string;
  influencedBy?: string;
  createdAt: number;
}) {
  return {
    id: shift._id,
    sessionId: shift.sessionId,
    participantId: shift.participantId,
    submissionId: shift.submissionId,
    categoryId: shift.categoryId,
    reason: shift.reason,
    influencedBy: shift.influencedBy,
    createdAt: shift.createdAt,
  };
}

export const record = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    submissionId: v.optional(v.id("submissions")),
    categoryId: v.optional(v.id("categories")),
    reason: v.string(),
    influencedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    if (args.submissionId) {
      const submission = await ctx.db.get(args.submissionId);

      if (!submission || submission.sessionId !== session._id) {
        throw new Error("Submission not found in this session.");
      }
    }

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);

      if (!category || category.sessionId !== session._id) {
        throw new Error("Category not found in this session.");
      }
    }

    await rateLimiter.limit(ctx, "positionShiftAction", { key: participant._id, throws: true });

    const shiftId = await ctx.db.insert("positionShiftEvents", {
      sessionId: session._id,
      participantId: participant._id,
      submissionId: args.submissionId,
      categoryId: args.categoryId,
      reason: normalizeText(args.reason, MAX_REASON_LENGTH, "Position shift reason"),
      influencedBy: args.influencedBy
        ? normalizeText(args.influencedBy, MAX_INFLUENCED_BY_LENGTH, "Influence note")
        : undefined,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: "position_shift.recorded",
      targetType: "positionShiftEvent",
      targetId: shiftId,
      metadataJson: {
        submissionId: args.submissionId,
        categoryId: args.categoryId,
      },
    });

    return toPublicShift((await ctx.db.get(shiftId))!);
  },
});

export const listMine = query({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      return null;
    }

    const shifts = await ctx.db
      .query("positionShiftEvents")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .order("desc")
      .take(SHIFT_LIMIT);

    return shifts.filter((shift) => shift.sessionId === session._id).map(toPublicShift);
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const shifts = await ctx.db
      .query("positionShiftEvents")
      .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(Math.min(SHIFT_LIMIT, Math.max(1, args.limit ?? SHIFT_LIMIT)));

    return shifts.map(toPublicShift);
  },
});
