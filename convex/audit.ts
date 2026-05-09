import { v } from "convex/values";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const DEFAULT_AUDIT_LIMIT = 80;
const MAX_AUDIT_LIMIT = 200;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getSessionBySlug(ctx: QueryCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toPublicAuditEvent(event: Doc<"auditEvents">) {
  return {
    id: event._id,
    sessionId: event.sessionId,
    actorType: event.actorType,
    actorParticipantId: event.actorParticipantId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadataJson: event.metadataJson,
    createdAt: event.createdAt,
  };
}

export const record = internalMutation({
  args: {
    sessionId: v.optional(v.id("sessions")),
    actorType: v.union(v.literal("system"), v.literal("participant"), v.literal("instructor")),
    actorParticipantId: v.optional(v.id("participants")),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadataJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditEvents", {
      ...args,
      createdAt: Date.now(),
    });
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

    const limit = Math.min(MAX_AUDIT_LIMIT, Math.max(1, args.limit ?? DEFAULT_AUDIT_LIMIT));
    const events = await ctx.db
      .query("auditEvents")
      .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(limit);

    return events.map(toPublicAuditEvent);
  },
});
