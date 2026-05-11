import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { rateLimiter } from "./components";
import { canJoinSession } from "./questionCapabilities";

const OFFLINE_AFTER_MS = 60_000;
const MAX_NICKNAME_LENGTH = 40;
const RECENT_PARTICIPANT_LIMIT = 8;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeJoinCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function normalizeNickname(value: string) {
  const nickname = value.trim().replace(/\s+/g, " ");

  if (nickname.length < 2) {
    throw new Error("Nickname must be at least 2 characters.");
  }

  if (nickname.length > MAX_NICKNAME_LENGTH) {
    throw new Error(`Nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer.`);
  }

  return nickname;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "participant";
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

async function getSessionByCode(ctx: QueryCtx | MutationCtx, sessionCode: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_join_code", (q) => q.eq("joinCode", normalizeJoinCode(sessionCode)))
    .unique();
}

async function getSession(
  ctx: QueryCtx | MutationCtx,
  args: { sessionSlug?: string; sessionCode?: string },
) {
  if (args.sessionSlug) {
    return await getSessionBySlug(ctx, args.sessionSlug);
  }

  if (args.sessionCode) {
    return await getSessionByCode(ctx, args.sessionCode);
  }

  return null;
}

async function findParticipantByClientKey(
  ctx: QueryCtx | MutationCtx,
  session: Doc<"sessions">,
  clientKey: string,
) {
  const clientKeyHash = await hashClientKey(clientKey);

  return await ctx.db
    .query("participants")
    .withIndex("by_session_and_client_key_hash", (q) =>
      q.eq("sessionId", session._id).eq("clientKeyHash", clientKeyHash),
    )
    .unique();
}

async function createParticipantSlug(ctx: MutationCtx, session: Doc<"sessions">, nickname: string) {
  const baseSlug = slugify(nickname);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_session_slug", (q) =>
        q.eq("sessionId", session._id).eq("participantSlug", candidate),
      )
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique participant slug.");
}

function toPublicParticipant(participant: Doc<"participants">) {
  return {
    id: participant._id,
    sessionId: participant.sessionId,
    participantSlug: participant.participantSlug,
    nickname: participant.nickname,
    role: participant.role,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
    presenceState: participant.presenceState,
  };
}

function toPublicSession(session: Doc<"sessions">) {
  return {
    slug: session.slug,
    joinCode: session.joinCode,
    title: session.title,
    openingPrompt: session.openingPrompt,
    phase: session.phase,
    currentAct: session.currentAct,
  };
}

export const join = mutation({
  args: {
    sessionCode: v.optional(v.string()),
    sessionSlug: v.optional(v.string()),
    nickname: v.string(),
    clientKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args);

    if (!session) {
      throw new Error("Session not found.");
    }

    const now = Date.now();
    const nickname = normalizeNickname(args.nickname);
    const clientKeyHash = await hashClientKey(args.clientKey);
    const existing = await findParticipantByClientKey(ctx, session, args.clientKey);

    await rateLimiter.limit(ctx, "sessionJoin", {
      key: `${session._id}:${clientKeyHash}`,
      throws: true,
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        nickname,
        lastSeenAt: now,
        presenceState: existing.presenceState === "offline" ? "idle" : existing.presenceState,
      });

      const updated = await ctx.db.get(existing._id);

      if (!updated) {
        throw new Error("Participant not found after update.");
      }

      return {
        participant: toPublicParticipant(updated),
        session: toPublicSession(session),
      };
    }

    if (!canJoinSession(session)) {
      throw new Error("This session is closed.");
    }

    const participantId = await ctx.db.insert("participants", {
      sessionId: session._id,
      participantSlug: await createParticipantSlug(ctx, session, nickname),
      nickname,
      role: "participant",
      clientKeyHash,
      joinedAt: now,
      lastSeenAt: now,
      presenceState: "idle",
    });

    const participant = await ctx.db.get(participantId);

    if (!participant) {
      throw new Error("Participant was not created.");
    }

    return {
      participant: toPublicParticipant(participant),
      session: toPublicSession(session),
    };
  },
});

export const restore = query({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const participant = await findParticipantByClientKey(ctx, session, args.clientKey);

    if (!participant) {
      return null;
    }

    return toPublicParticipant(participant);
  },
});

export const updateNickname = mutation({
  args: {
    sessionSlug: v.string(),
    participantSlug: v.string(),
    nickname: v.string(),
    clientKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_session_slug", (q) =>
        q.eq("sessionId", session._id).eq("participantSlug", args.participantSlug),
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found.");
    }

    if (participant.clientKeyHash !== (await hashClientKey(args.clientKey))) {
      throw new Error("Participant token does not match.");
    }

    await ctx.db.patch(participant._id, {
      nickname: normalizeNickname(args.nickname),
      lastSeenAt: Date.now(),
    });

    const updated = await ctx.db.get(participant._id);

    if (!updated) {
      throw new Error("Participant not found after update.");
    }

    return toPublicParticipant(updated);
  },
});

export const touchPresence = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    presenceState: v.union(
      v.literal("typing"),
      v.literal("submitted"),
      v.literal("idle"),
      v.literal("offline"),
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await findParticipantByClientKey(ctx, session, args.clientKey);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    await ctx.db.patch(participant._id, {
      presenceState: args.presenceState,
      lastSeenAt: Date.now(),
    });

    return true;
  },
});

export const listLobby = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const now = Date.now();
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    const aggregate = {
      total: participants.length,
      typing: 0,
      submitted: 0,
      idle: 0,
      offline: 0,
    };

    for (const participant of participants) {
      const derivedState =
        now - participant.lastSeenAt > OFFLINE_AFTER_MS ? "offline" : participant.presenceState;
      aggregate[derivedState] += 1;
    }

    const recentParticipants = [...participants]
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, RECENT_PARTICIPANT_LIMIT)
      .map((participant) => ({
        participantSlug: participant.participantSlug,
        nickname:
          session.anonymityMode === "anonymous_to_peers" ? "Anonymous" : participant.nickname,
        presenceState:
          now - participant.lastSeenAt > OFFLINE_AFTER_MS ? "offline" : participant.presenceState,
        lastSeenAt: participant.lastSeenAt,
      }));

    return {
      aggregate,
      recentParticipants,
    };
  },
});
