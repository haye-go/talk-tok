import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { createDefaultQuestionForSession } from "./sessionQuestions";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_SLUG_ATTEMPTS = 50;
const MAX_CODE_ATTEMPTS = 50;

function normalizeTitle(value: string) {
  const title = value.trim().replace(/\s+/g, " ");

  if (title.length < 3) {
    throw new Error("Session title must be at least 3 characters.");
  }

  if (title.length > 120) {
    throw new Error("Session title must be 120 characters or fewer.");
  }

  return title;
}

function normalizeOpeningPrompt(value: string) {
  const prompt = value.trim().replace(/\s+/g, " ");

  if (prompt.length < 10) {
    throw new Error("Opening topic must be at least 10 characters.");
  }

  if (prompt.length > 2000) {
    throw new Error("Opening topic must be 2000 characters or fewer.");
  }

  return prompt;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "discussion-session";
}

function normalizeJoinCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function generateJoinCode(length = 5) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (value) => SESSION_CODE_ALPHABET[value % SESSION_CODE_ALPHABET.length])
    .join("")
    .toUpperCase();
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

async function getSessionByJoinCode(ctx: QueryCtx | MutationCtx, joinCode: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
    .unique();
}

async function createUniqueSlug(ctx: MutationCtx, title: string) {
  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await getSessionBySlug(ctx, candidate);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique session slug.");
}

async function createUniqueJoinCode(ctx: MutationCtx, requestedCode?: string) {
  if (requestedCode) {
    const normalized = normalizeJoinCode(requestedCode);

    if (normalized.length < 4) {
      throw new Error("Session code must be at least 4 letters or numbers.");
    }

    const existing = await getSessionByJoinCode(ctx, normalized);

    if (existing) {
      throw new Error("That session code is already in use.");
    }

    return normalized;
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateJoinCode();
    const existing = await getSessionByJoinCode(ctx, candidate);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique session code.");
}

async function countParticipants(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();

  return participants.length;
}

function toPublicSession(session: Doc<"sessions">, participantCount?: number) {
  return {
    id: session._id,
    slug: session.slug,
    joinCode: session.joinCode,
    title: session.title,
    openingPrompt: session.openingPrompt,
    currentQuestionId: session.currentQuestionId,
    modePreset: session.modePreset,
    phase: session.phase,
    currentAct: session.currentAct,
    visibilityMode: session.visibilityMode,
    anonymityMode: session.anonymityMode,
    responseSoftLimitWords: session.responseSoftLimitWords,
    categorySoftCap: session.categorySoftCap,
    critiqueToneDefault: session.critiqueToneDefault,
    telemetryEnabled: session.telemetryEnabled,
    fightMeEnabled: session.fightMeEnabled,
    summaryGateEnabled: session.summaryGateEnabled,
    participantCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export const create = mutation({
  args: {
    previewPassword: v.string(),
    title: v.string(),
    openingPrompt: v.string(),
    modePreset: v.optional(
      v.union(
        v.literal("class_discussion"),
        v.literal("conference_qna"),
        v.literal("debate_lab"),
        v.literal("custom"),
      ),
    ),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const now = Date.now();
    const title = normalizeTitle(args.title);
    const openingPrompt = normalizeOpeningPrompt(args.openingPrompt);
    const slug = await createUniqueSlug(ctx, title);
    const joinCode = await createUniqueJoinCode(ctx, args.joinCode);

    const sessionId = await ctx.db.insert("sessions", {
      slug,
      joinCode,
      title,
      openingPrompt,
      modePreset: args.modePreset ?? "class_discussion",
      phase: "lobby",
      currentAct: "submit",
      visibilityMode: "private_until_released",
      anonymityMode: "nicknames_visible",
      responseSoftLimitWords: 200,
      categorySoftCap: 8,
      critiqueToneDefault: "spicy",
      telemetryEnabled: true,
      fightMeEnabled: true,
      summaryGateEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new Error("Session was not created.");
    }

    await createDefaultQuestionForSession(ctx, session, now);

    const updatedSession = await ctx.db.get(sessionId);

    if (!updatedSession) {
      throw new Error("Session was not created.");
    }

    return toPublicSession(updatedSession, 0);
  },
});

export const listForInstructor = query({
  args: {
    previewPassword: v.string(),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const sessions = await ctx.db.query("sessions").order("desc").collect();

    return await Promise.all(
      sessions.map(async (session) =>
        toPublicSession(session, await countParticipants(ctx, session._id)),
      ),
    );
  },
});

export const getBySlug = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, slugify(args.sessionSlug));

    if (!session) {
      return null;
    }

    return toPublicSession(session, await countParticipants(ctx, session._id));
  },
});

export const getBySlugSnapshot = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, slugify(args.sessionSlug));

    if (!session) {
      return null;
    }

    return toPublicSession(session);
  },
});

export const getByJoinCode = query({
  args: {
    sessionCode: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByJoinCode(ctx, normalizeJoinCode(args.sessionCode));

    if (!session) {
      return null;
    }

    return toPublicSession(session, await countParticipants(ctx, session._id));
  },
});
