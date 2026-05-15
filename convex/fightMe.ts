import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { aiWorkpool, rateLimiter } from "./components";
import {
  sourcePostJsonForDebrief,
  sourceSubmissionIdForDebrief,
} from "../src/lib/fight-debrief-context";
import { assertCanUseFightMe, canUseFightMe } from "./questionCapabilities";
import { createDefaultQuestionForSession, listQuestionsForSession } from "./sessionQuestions";

const ACCEPTANCE_TIMEOUT_MS = 20_000;
const TURN_TIMEOUT_MS = 60_000;
const MAX_FIGHT_TURNS = 4;
const MAX_DRAFT_LENGTH = 4_000;
const MAX_TURN_LENGTH = 4_000;
const THREAD_LIMIT = 80;
const TARGET_LIMIT = 40;
const ACTIVE_REAL_STATUSES = ["pending_acceptance", "active"] as const;

type FightStatus = Doc<"fightThreads">["status"];
type FightRole = "attacker" | "defender" | "ai";
type JsonRecord = Record<string, unknown>;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "fight";
}

function normalizeText(value: string, maxLength: number, label: string) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createFightSlugSeed() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");

  return `fight-${token}`;
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

async function createUniqueFightSlug(ctx: MutationCtx, sessionId: Id<"sessions">, seed: string) {
  const baseSlug = slugify(seed);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("fightThreads")
      .withIndex("by_session_slug", (q) => q.eq("sessionId", sessionId).eq("slug", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique fight slug.");
}

async function hasActiveRealFight(ctx: QueryCtx | MutationCtx, participantId: Id<"participants">) {
  for (const status of ACTIVE_REAL_STATUSES) {
    const attacking = await ctx.db
      .query("fightThreads")
      .withIndex("by_attacker_and_status", (q) =>
        q.eq("attackerParticipantId", participantId).eq("status", status),
      )
      .take(10);

    if (attacking.some((thread) => thread.mode === "real_1v1")) {
      return true;
    }

    const defending = await ctx.db
      .query("fightThreads")
      .withIndex("by_defender_and_status", (q) =>
        q.eq("defenderParticipantId", participantId).eq("status", status),
      )
      .take(10);

    if (defending.some((thread) => thread.mode === "real_1v1")) {
      return true;
    }
  }

  return false;
}

function roleForTurn(thread: Doc<"fightThreads">, turnNumber: number): FightRole {
  if (thread.mode === "vs_ai") {
    return turnNumber % 2 === 1 ? "ai" : "attacker";
  }

  return turnNumber % 2 === 1 ? "attacker" : "defender";
}

function participantForRole(thread: Doc<"fightThreads">, role: FightRole) {
  if (role === "attacker") {
    return thread.attackerParticipantId;
  }

  if (role === "defender") {
    return thread.defenderParticipantId;
  }

  return undefined;
}

async function getDraft(
  ctx: QueryCtx | MutationCtx,
  fightThreadId: Id<"fightThreads">,
  participantId: Id<"participants">,
) {
  return await ctx.db
    .query("fightDrafts")
    .withIndex("by_thread_and_participant", (q) =>
      q.eq("fightThreadId", fightThreadId).eq("participantId", participantId),
    )
    .unique();
}

async function getFightThreadByIdOrSlug(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  fightThreadId?: Id<"fightThreads">,
  fightSlug?: string,
) {
  if (fightThreadId) {
    return await ctx.db.get(fightThreadId);
  }

  if (fightSlug) {
    return await ctx.db
      .query("fightThreads")
      .withIndex("by_session_slug", (q) =>
        q.eq("sessionId", sessionId).eq("slug", slugify(fightSlug)),
      )
      .unique();
  }

  return null;
}

async function questionForSubmission(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  submission: Doc<"submissions">,
) {
  const questionId = submission.questionId ?? (await createDefaultQuestionForSession(ctx, session));
  const question = await ctx.db.get(questionId);

  if (!question || question.sessionId !== session._id) {
    throw new Error("Question not found for this submission.");
  }

  return question;
}

async function questionIdForThread(ctx: QueryCtx | MutationCtx, thread: Doc<"fightThreads">) {
  const sourceSubmission = thread.attackerSubmissionId
    ? await ctx.db.get(thread.attackerSubmissionId)
    : thread.defenderSubmissionId
      ? await ctx.db.get(thread.defenderSubmissionId)
      : null;

  return sourceSubmission?.questionId;
}

async function questionForThread(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  thread: Doc<"fightThreads">,
) {
  const sourceSubmission = thread.attackerSubmissionId
    ? await ctx.db.get(thread.attackerSubmissionId)
    : thread.defenderSubmissionId
      ? await ctx.db.get(thread.defenderSubmissionId)
      : null;

  if (sourceSubmission?.questionId) {
    const question = await ctx.db.get(sourceSubmission.questionId);

    if (question && question.sessionId === session._id) {
      return question;
    }
  }

  const questionId = await createDefaultQuestionForSession(ctx, session);
  const question = await ctx.db.get(questionId);

  if (!question) {
    throw new Error("Question not found for this fight.");
  }

  return question;
}

function toPublicTurn(turn: Doc<"fightTurns">) {
  return {
    id: turn._id,
    participantId: turn.participantId,
    role: turn.role,
    turnNumber: turn.turnNumber,
    body: turn.body,
    status: turn.status,
    source: turn.source,
    createdAt: turn.createdAt,
  };
}

function toPublicDebrief(debrief: Doc<"fightDebriefs"> | null) {
  if (!debrief) {
    return null;
  }

  return {
    id: debrief._id,
    status: debrief.status,
    summary: debrief.summary,
    attackerStrength: debrief.attackerStrength,
    defenderStrength: debrief.defenderStrength,
    strongerRebuttal: debrief.strongerRebuttal,
    nextPractice: debrief.nextPractice,
    error: debrief.error,
    createdAt: debrief.createdAt,
    updatedAt: debrief.updatedAt,
  };
}

function fightDisplayName(
  session: Doc<"sessions"> | null,
  participant: Doc<"participants"> | null,
  role: "attacker" | "defender",
  viewerParticipantId?: Id<"participants">,
) {
  if (!participant) {
    return role === "attacker" ? "Challenger" : "Defender";
  }

  if (session?.anonymityMode !== "anonymous_to_peers") {
    return participant.nickname;
  }

  if (viewerParticipantId && participant._id === viewerParticipantId) {
    return "You";
  }

  return role === "attacker" ? "Challenger" : "Opponent";
}

async function toPublicThread(
  ctx: QueryCtx | MutationCtx,
  thread: Doc<"fightThreads">,
  options?: {
    session?: Doc<"sessions">;
    viewerParticipantId?: Id<"participants">;
  },
) {
  const [attacker, defender, attackerSubmission, defenderSubmission, turns, debrief] =
    await Promise.all([
      ctx.db.get(thread.attackerParticipantId),
      thread.defenderParticipantId ? ctx.db.get(thread.defenderParticipantId) : null,
      thread.attackerSubmissionId ? ctx.db.get(thread.attackerSubmissionId) : null,
      thread.defenderSubmissionId ? ctx.db.get(thread.defenderSubmissionId) : null,
      ctx.db
        .query("fightTurns")
        .withIndex("by_thread", (q) => q.eq("fightThreadId", thread._id))
        .take(20),
      ctx.db
        .query("fightDebriefs")
        .withIndex("by_thread", (q) => q.eq("fightThreadId", thread._id))
        .order("desc")
        .take(1)
        .then((rows) => rows[0] ?? null),
    ]);
  const session = options?.session ?? (await ctx.db.get(thread.sessionId));

  return {
    id: thread._id,
    slug: thread.slug,
    sessionId: thread.sessionId,
    mode: thread.mode,
    status: thread.status,
    attacker: attacker
      ? {
          id: attacker._id,
          participantSlug:
            session?.anonymityMode === "anonymous_to_peers" ? null : attacker.participantSlug,
          nickname: fightDisplayName(session, attacker, "attacker", options?.viewerParticipantId),
        }
      : null,
    defender: defender
      ? {
          id: defender._id,
          participantSlug:
            session?.anonymityMode === "anonymous_to_peers" ? null : defender.participantSlug,
          nickname: fightDisplayName(session, defender, "defender", options?.viewerParticipantId),
        }
      : null,
    attackerSubmission: attackerSubmission
      ? { id: attackerSubmission._id, body: attackerSubmission.body }
      : null,
    defenderSubmission: defenderSubmission
      ? { id: defenderSubmission._id, body: defenderSubmission.body }
      : null,
    currentTurnParticipantId: thread.currentTurnParticipantId,
    currentTurnRole: thread.currentTurnRole,
    nextTurnNumber: thread.nextTurnNumber,
    maxTurns: thread.maxTurns,
    acceptanceDeadlineAt: thread.acceptanceDeadlineAt,
    turnDeadlineAt: thread.turnDeadlineAt,
    acceptedAt: thread.acceptedAt,
    completedAt: thread.completedAt,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    turns: turns.sort((a, b) => a.turnNumber - b.turnNumber).map(toPublicTurn),
    debrief: toPublicDebrief(debrief),
  };
}

async function queueDebrief(ctx: MutationCtx, thread: Doc<"fightThreads">) {
  const existing = await ctx.db
    .query("fightDebriefs")
    .withIndex("by_thread", (q) => q.eq("fightThreadId", thread._id))
    .take(1);

  if (existing.length > 0) {
    return existing[0]._id;
  }

  const now = Date.now();
  const questionId = await questionIdForThread(ctx, thread);
  const debriefId = await ctx.db.insert("fightDebriefs", {
    sessionId: thread.sessionId,
    fightThreadId: thread._id,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  });
  const jobId = await ctx.db.insert("aiJobs", {
    sessionId: thread.sessionId,
    questionId,
    type: "fight_debrief",
    status: "queued",
    requestedBy: "system",
    createdAt: now,
    updatedAt: now,
  });

  await aiWorkpool.enqueueAction(
    ctx,
    internal.fightMe.generateDebrief,
    { debriefId, jobId },
    { name: "fightMe.generateDebrief", retry: true },
  );
  return debriefId;
}

async function completeThread(ctx: MutationCtx, thread: Doc<"fightThreads">, status: FightStatus) {
  const now = Date.now();

  await ctx.db.patch(thread._id, {
    status,
    currentTurnParticipantId: undefined,
    currentTurnRole: undefined,
    turnDeadlineAt: undefined,
    completedAt: now,
    updatedAt: now,
  });
  const updated = await ctx.db.get(thread._id);

  if (updated) {
    await queueDebrief(ctx, updated);
  }
}

async function scheduleTurnTimeout(
  ctx: MutationCtx,
  threadId: Id<"fightThreads">,
  turnNumber: number,
) {
  await ctx.scheduler.runAfter(TURN_TIMEOUT_MS + 250, internal.fightMe.checkTurnTimeout, {
    fightThreadId: threadId,
    expectedTurnNumber: turnNumber,
  });
}

async function advanceAfterTurn(
  ctx: MutationCtx,
  thread: Doc<"fightThreads">,
  submittedTurn: number,
) {
  if (submittedTurn >= thread.maxTurns) {
    await completeThread(ctx, thread, "completed");
    return;
  }

  const nextTurnNumber = submittedTurn + 1;
  const nextRole = roleForTurn(thread, nextTurnNumber);
  const nextParticipantId = participantForRole(thread, nextRole);
  const now = Date.now();

  await ctx.db.patch(thread._id, {
    nextTurnNumber,
    currentTurnRole: nextRole,
    currentTurnParticipantId: nextParticipantId,
    turnDeadlineAt: nextParticipantId ? now + TURN_TIMEOUT_MS : undefined,
    updatedAt: now,
  });

  if (nextRole === "ai") {
    const questionId = await questionIdForThread(ctx, thread);
    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: thread.sessionId,
      questionId,
      type: "fight_challenge",
      status: "queued",
      requestedBy: "system",
      createdAt: now,
      updatedAt: now,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.fightMe.generateAiTurn,
      {
        fightThreadId: thread._id,
        jobId,
        expectedTurnNumber: nextTurnNumber,
      },
      { name: "fightMe.generateAiTurn", retry: true },
    );
    return;
  }

  await scheduleTurnTimeout(ctx, thread._id, nextTurnNumber);
}

export const createChallenge = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    defenderSubmissionId: v.id("submissions"),
    attackerSubmissionId: v.optional(v.id("submissions")),
    openingDraft: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const attacker = await getParticipantByClientKey(ctx, session._id, args.clientKey);
    const defenderSubmission = await ctx.db.get(args.defenderSubmissionId);

    if (!attacker) {
      throw new Error("Participant not found.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: attacker._id, throws: true });

    if (!defenderSubmission || defenderSubmission.sessionId !== session._id) {
      throw new Error("Defender submission not found in this session.");
    }

    const question = await questionForSubmission(ctx, session, defenderSubmission);
    assertCanUseFightMe(session, question);

    if (defenderSubmission.participantId === attacker._id) {
      throw new Error("You cannot challenge your own response.");
    }

    if (args.attackerSubmissionId) {
      const attackerSubmission = await ctx.db.get(args.attackerSubmissionId);

      if (
        !attackerSubmission ||
        attackerSubmission.sessionId !== session._id ||
        attackerSubmission.participantId !== attacker._id ||
        (attackerSubmission.questionId && attackerSubmission.questionId !== question._id)
      ) {
        throw new Error("Attacker source submission not found for this participant.");
      }
    }

    if (
      (await hasActiveRealFight(ctx, attacker._id)) ||
      (await hasActiveRealFight(ctx, defenderSubmission.participantId))
    ) {
      throw new Error("One participant is already in a pending or active real 1v1.");
    }

    const now = Date.now();
    const fightThreadId = await ctx.db.insert("fightThreads", {
      sessionId: session._id,
      slug: await createUniqueFightSlug(ctx, session._id, createFightSlugSeed()),
      mode: "real_1v1",
      status: "pending_acceptance",
      attackerParticipantId: attacker._id,
      defenderParticipantId: defenderSubmission.participantId,
      attackerSubmissionId: args.attackerSubmissionId,
      defenderSubmissionId: defenderSubmission._id,
      nextTurnNumber: 1,
      maxTurns: MAX_FIGHT_TURNS,
      acceptanceDeadlineAt: now + ACCEPTANCE_TIMEOUT_MS,
      createdAt: now,
      updatedAt: now,
    });

    if (args.openingDraft !== undefined) {
      await ctx.db.insert("fightDrafts", {
        sessionId: session._id,
        fightThreadId,
        participantId: attacker._id,
        body: normalizeText(args.openingDraft, MAX_DRAFT_LENGTH, "Draft"),
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId: question._id,
      actorType: "participant",
      actorParticipantId: attacker._id,
      action: "fight.challenge_created",
      targetType: "fightThread",
      targetId: fightThreadId,
      metadataJson: { defenderSubmissionId: defenderSubmission._id },
    });
    await ctx.scheduler.runAfter(ACCEPTANCE_TIMEOUT_MS + 250, internal.fightMe.expirePending, {
      fightThreadId,
    });

    return await toPublicThread(ctx, (await ctx.db.get(fightThreadId))!, {
      session,
      viewerParticipantId: attacker._id,
    });
  },
});

export const createVsAi = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    sourceSubmissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);
    const sourceSubmission = await ctx.db.get(args.sourceSubmissionId);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: participant._id, throws: true });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "fight_challenge",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    if (
      !sourceSubmission ||
      sourceSubmission.sessionId !== session._id ||
      sourceSubmission.participantId !== participant._id
    ) {
      throw new Error("Source submission not found for this participant.");
    }

    const question = await questionForSubmission(ctx, session, sourceSubmission);
    assertCanUseFightMe(session, question);

    const now = Date.now();
    const fightThreadId = await ctx.db.insert("fightThreads", {
      sessionId: session._id,
      slug: await createUniqueFightSlug(ctx, session._id, createFightSlugSeed()),
      mode: "vs_ai",
      status: "active",
      attackerParticipantId: participant._id,
      attackerSubmissionId: sourceSubmission._id,
      currentTurnRole: "ai",
      nextTurnNumber: 1,
      maxTurns: MAX_FIGHT_TURNS,
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId: question._id,
      type: "fight_challenge",
      status: "queued",
      requestedBy: "system",
      createdAt: now,
      updatedAt: now,
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.fightMe.generateAiTurn,
      {
        fightThreadId,
        jobId,
        expectedTurnNumber: 1,
      },
      { name: "fightMe.generateAiTurn", retry: true },
    );

    return await toPublicThread(ctx, (await ctx.db.get(fightThreadId))!, {
      session,
      viewerParticipantId: participant._id,
    });
  },
});

export const saveDraft = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const question = await questionForThread(ctx, session, thread);
    assertCanUseFightMe(session, question);

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    await rateLimiter.limit(ctx, "fightDraftSave", { key: participant._id, throws: true });

    const canDraftPending =
      thread.status === "pending_acceptance" && thread.attackerParticipantId === participant._id;
    const canDraftActive =
      thread.status === "active" && thread.currentTurnParticipantId === participant._id;

    if (!canDraftPending && !canDraftActive) {
      throw new Error("It is not your turn to draft in this fight.");
    }

    const body = normalizeText(args.body, MAX_DRAFT_LENGTH, "Draft");
    const existing = await getDraft(ctx, thread._id, participant._id);
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { body, updatedAt: now });
      return await ctx.db.get(existing._id);
    }

    const draftId = await ctx.db.insert("fightDrafts", {
      sessionId: session._id,
      fightThreadId: thread._id,
      participantId: participant._id,
      body,
      updatedAt: now,
    });

    return await ctx.db.get(draftId);
  },
});

export const acceptChallenge = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const question = await questionForThread(ctx, session, thread);
    assertCanUseFightMe(session, question);

    const defender = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!defender || thread.defenderParticipantId !== defender._id) {
      throw new Error("Only the defender can accept this challenge.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: defender._id, throws: true });

    if (thread.status !== "pending_acceptance") {
      throw new Error("This challenge is not pending acceptance.");
    }

    const now = Date.now();

    if (!thread.acceptanceDeadlineAt || now > thread.acceptanceDeadlineAt) {
      await ctx.db.patch(thread._id, { status: "expired", updatedAt: now });
      throw new Error("This challenge has expired.");
    }

    const attackerDraft = await getDraft(ctx, thread._id, thread.attackerParticipantId);
    const draftBody = attackerDraft?.body.trim() ?? "";

    await ctx.db.patch(thread._id, {
      status: "active",
      acceptedAt: now,
      acceptanceDeadlineAt: undefined,
      updatedAt: now,
    });
    let updated = (await ctx.db.get(thread._id))!;

    if (draftBody) {
      await ctx.db.insert("fightTurns", {
        sessionId: session._id,
        fightThreadId: thread._id,
        participantId: thread.attackerParticipantId,
        role: "attacker",
        turnNumber: 1,
        body: draftBody,
        status: "submitted",
        source: "manual",
        createdAt: now,
      });
      await advanceAfterTurn(ctx, updated, 1);
    } else {
      await ctx.db.patch(thread._id, {
        currentTurnParticipantId: thread.attackerParticipantId,
        currentTurnRole: "attacker",
        turnDeadlineAt: now + TURN_TIMEOUT_MS,
        updatedAt: now,
      });
      await scheduleTurnTimeout(ctx, thread._id, 1);
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId: question._id,
      actorType: "participant",
      actorParticipantId: defender._id,
      action: "fight.challenge_accepted",
      targetType: "fightThread",
      targetId: thread._id,
    });

    updated = (await ctx.db.get(thread._id))!;
    return await toPublicThread(ctx, updated, { session, viewerParticipantId: defender._id });
  },
});

export const declineChallenge = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const defender = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!defender || thread.defenderParticipantId !== defender._id) {
      throw new Error("Only the defender can decline this challenge.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: defender._id, throws: true });

    if (thread.status !== "pending_acceptance") {
      throw new Error("Only pending challenges can be declined.");
    }

    await ctx.db.patch(thread._id, {
      status: "declined",
      acceptanceDeadlineAt: undefined,
      updatedAt: Date.now(),
    });

    return await toPublicThread(ctx, (await ctx.db.get(thread._id))!, {
      session,
      viewerParticipantId: defender._id,
    });
  },
});

export const cancelChallenge = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const attacker = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!attacker || thread.attackerParticipantId !== attacker._id) {
      throw new Error("Only the attacker can cancel this challenge.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: attacker._id, throws: true });

    if (thread.status !== "pending_acceptance") {
      throw new Error("Only pending challenges can be cancelled.");
    }

    await ctx.db.patch(thread._id, {
      status: "cancelled",
      acceptanceDeadlineAt: undefined,
      updatedAt: Date.now(),
    });

    return await toPublicThread(ctx, (await ctx.db.get(thread._id))!, {
      session,
      viewerParticipantId: attacker._id,
    });
  },
});

export const submitTurn = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const question = await questionForThread(ctx, session, thread);
    assertCanUseFightMe(session, question);

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: participant._id, throws: true });

    if (thread.status !== "active" || thread.currentTurnParticipantId !== participant._id) {
      throw new Error("It is not your turn in this fight.");
    }

    const body = normalizeText(args.body, MAX_TURN_LENGTH, "Turn");

    if (!body) {
      throw new Error("Turn cannot be empty.");
    }

    const now = Date.now();
    await ctx.db.insert("fightTurns", {
      sessionId: session._id,
      fightThreadId: thread._id,
      participantId: participant._id,
      role: thread.currentTurnRole === "defender" ? "defender" : "attacker",
      turnNumber: thread.nextTurnNumber,
      body,
      status: "submitted",
      source: "manual",
      createdAt: now,
    });

    const draft = await getDraft(ctx, thread._id, participant._id);

    if (draft) {
      await ctx.db.patch(draft._id, { body: "", updatedAt: now });
    }

    await advanceAfterTurn(ctx, thread, thread.nextTurnNumber);
    return await toPublicThread(ctx, (await ctx.db.get(thread._id))!, {
      session,
      viewerParticipantId: participant._id,
    });
  },
});

export const forfeit = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    fightThreadId: v.optional(v.id("fightThreads")),
    fightSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const thread = session
      ? await getFightThreadByIdOrSlug(ctx, session._id, args.fightThreadId, args.fightSlug)
      : null;

    if (!session || !thread || thread.sessionId !== session._id) {
      throw new Error("Fight thread not found in this session.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (
      !participant ||
      (thread.attackerParticipantId !== participant._id &&
        thread.defenderParticipantId !== participant._id)
    ) {
      throw new Error("Only a fight participant can forfeit.");
    }

    await rateLimiter.limit(ctx, "fightMeAction", { key: participant._id, throws: true });

    if (thread.status !== "active") {
      throw new Error("Only active fights can be forfeited.");
    }

    await completeThread(ctx, thread, "forfeited");
    return await toPublicThread(ctx, (await ctx.db.get(thread._id))!, {
      session,
      viewerParticipantId: participant._id,
    });
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

    const [attacking, defending] = await Promise.all([
      ctx.db
        .query("fightThreads")
        .withIndex("by_attacker", (q) => q.eq("attackerParticipantId", participant._id))
        .order("desc")
        .take(THREAD_LIMIT),
      ctx.db
        .query("fightThreads")
        .withIndex("by_defender", (q) => q.eq("defenderParticipantId", participant._id))
        .order("desc")
        .take(THREAD_LIMIT),
    ]);
    const byId = new Map([...attacking, ...defending].map((thread) => [thread._id, thread]));

    return await Promise.all(
      [...byId.values()]
        .filter((thread) => thread.sessionId === session._id)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, THREAD_LIMIT)
        .map((thread) =>
          toPublicThread(ctx, thread, { session, viewerParticipantId: participant._id }),
        ),
    );
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending_acceptance"),
        v.literal("active"),
        v.literal("declined"),
        v.literal("expired"),
        v.literal("completed"),
        v.literal("timed_out"),
        v.literal("cancelled"),
        v.literal("forfeited"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const threads = args.status
      ? await ctx.db
          .query("fightThreads")
          .withIndex("by_session_and_status", (q) =>
            q.eq("sessionId", session._id).eq("status", args.status!),
          )
          .order("desc")
          .take(THREAD_LIMIT)
      : await ctx.db
          .query("fightThreads")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(THREAD_LIMIT);

    return await Promise.all(threads.map((thread) => toPublicThread(ctx, thread)));
  },
});

export const getThread = query({
  args: {
    sessionSlug: v.string(),
    fightSlug: v.string(),
    clientKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const thread = await ctx.db
      .query("fightThreads")
      .withIndex("by_session_slug", (q) =>
        q.eq("sessionId", session._id).eq("slug", slugify(args.fightSlug)),
      )
      .unique();

    if (!thread) {
      return null;
    }

    if (!args.clientKey) {
      const publicThread = await toPublicThread(ctx, thread, { session });
      return { ...publicThread, myDraft: null };
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      const publicThread = await toPublicThread(ctx, thread, { session });
      return { ...publicThread, myDraft: null };
    }

    const draft = await getDraft(ctx, thread._id, participant._id);
    const publicThread = await toPublicThread(ctx, thread, {
      session,
      viewerParticipantId: participant._id,
    });

    return {
      ...publicThread,
      myDraft: draft ? { id: draft._id, body: draft.body, updatedAt: draft.updatedAt } : null,
    };
  },
});

export const findAvailableTargets = query({
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

    if (session.phase === "closed" || !session.fightMeEnabled) {
      return [];
    }

    const activeThreads = (
      await Promise.all(
        ACTIVE_REAL_STATUSES.map((status) =>
          ctx.db
            .query("fightThreads")
            .withIndex("by_session_and_status", (q) =>
              q.eq("sessionId", session._id).eq("status", status),
            )
            .take(THREAD_LIMIT),
        ),
      )
    ).flat();
    const activeRealFightParticipantIds = new Set<Id<"participants">>();

    for (const thread of activeThreads) {
      if (thread.mode !== "real_1v1") {
        continue;
      }

      activeRealFightParticipantIds.add(thread.attackerParticipantId);
      if (thread.defenderParticipantId) {
        activeRealFightParticipantIds.add(thread.defenderParticipantId);
      }
    }

    if (activeRealFightParticipantIds.has(participant._id)) {
      return [];
    }

    const [submissions, questions] = await Promise.all([
      ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(120),
      listQuestionsForSession(ctx, session._id),
    ]);
    const questionsById = new Map(questions.map((question) => [question._id, question]));
    const targets = [];

    for (const submission of submissions) {
      if (submission.participantId === participant._id || submission.kind === "fight_me_turn") {
        continue;
      }

      if (submission.questionId) {
        const question = questionsById.get(submission.questionId);

        if (!question || !canUseFightMe(session, question)) {
          continue;
        }
      }

      const defender = await ctx.db.get(submission.participantId);

      if (!defender || activeRealFightParticipantIds.has(defender._id)) {
        continue;
      }

      targets.push({
        submissionId: submission._id,
        participantId: defender._id,
        participantSlug: defender.participantSlug,
        nickname: session.anonymityMode === "anonymous_to_peers" ? "Anonymous" : defender.nickname,
        body: submission.body,
        kind: submission.kind,
        wordCount: submission.wordCount,
        createdAt: submission.createdAt,
      });

      if (targets.length >= TARGET_LIMIT) {
        break;
      }
    }

    return targets;
  },
});

export const expirePending = internalMutation({
  args: {
    fightThreadId: v.id("fightThreads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.fightThreadId);

    if (!thread || thread.status !== "pending_acceptance") {
      return null;
    }

    if (thread.acceptanceDeadlineAt && Date.now() < thread.acceptanceDeadlineAt) {
      return null;
    }

    await ctx.db.patch(thread._id, {
      status: "expired",
      acceptanceDeadlineAt: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(thread._id);
  },
});

export const checkTurnTimeout = internalMutation({
  args: {
    fightThreadId: v.id("fightThreads"),
    expectedTurnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.fightThreadId);

    if (
      !thread ||
      thread.status !== "active" ||
      thread.nextTurnNumber !== args.expectedTurnNumber ||
      !thread.turnDeadlineAt ||
      Date.now() < thread.turnDeadlineAt
    ) {
      return null;
    }

    const participantId = thread.currentTurnParticipantId;

    if (!participantId) {
      return null;
    }

    const draft = await getDraft(ctx, thread._id, participantId);
    const draftBody = draft?.body.trim() ?? "";
    const now = Date.now();

    if (draftBody) {
      await ctx.db.insert("fightTurns", {
        sessionId: thread.sessionId,
        fightThreadId: thread._id,
        participantId,
        role: thread.currentTurnRole === "defender" ? "defender" : "attacker",
        turnNumber: args.expectedTurnNumber,
        body: draftBody,
        status: "submitted",
        source: "draft_timeout",
        createdAt: now,
      });
      await ctx.db.patch(draft!._id, { body: "", updatedAt: now });
      await advanceAfterTurn(ctx, thread, args.expectedTurnNumber);
      return await ctx.db.get(thread._id);
    }

    await ctx.db.insert("fightTurns", {
      sessionId: thread.sessionId,
      fightThreadId: thread._id,
      participantId,
      role: thread.currentTurnRole === "defender" ? "defender" : "attacker",
      turnNumber: args.expectedTurnNumber,
      body: "",
      status: "missed",
      source: "manual",
      createdAt: now,
    });
    await completeThread(ctx, thread, "timed_out");

    return await ctx.db.get(thread._id);
  },
});

export const loadAiTurnContext = internalQuery({
  args: {
    fightThreadId: v.id("fightThreads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.fightThreadId);

    if (!thread) {
      throw new Error("Fight thread not found.");
    }

    const session = await ctx.db.get(thread.sessionId);
    const sourceSubmission = thread.attackerSubmissionId
      ? await ctx.db.get(thread.attackerSubmissionId)
      : null;
    const turns = await ctx.db
      .query("fightTurns")
      .withIndex("by_thread", (q) => q.eq("fightThreadId", thread._id))
      .take(20);

    if (!session) {
      throw new Error("Fight session not found.");
    }

    return { thread, session, sourceSubmission, turns, questionId: sourceSubmission?.questionId };
  },
});

export const applyAiTurn = internalMutation({
  args: {
    fightThreadId: v.id("fightThreads"),
    jobId: v.id("aiJobs"),
    expectedTurnNumber: v.number(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.fightThreadId);

    if (
      !thread ||
      thread.status !== "active" ||
      thread.mode !== "vs_ai" ||
      thread.nextTurnNumber !== args.expectedTurnNumber ||
      thread.currentTurnRole !== "ai"
    ) {
      return null;
    }

    const now = Date.now();
    await ctx.db.insert("fightTurns", {
      sessionId: thread.sessionId,
      fightThreadId: thread._id,
      role: "ai",
      turnNumber: args.expectedTurnNumber,
      body: normalizeText(args.body, MAX_TURN_LENGTH, "AI turn"),
      status: "submitted",
      source: "ai",
      createdAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: 1,
      progressTotal: 1,
      updatedAt: now,
    });
    await advanceAfterTurn(ctx, thread, args.expectedTurnNumber);

    return await ctx.db.get(thread._id);
  },
});

export const markJobProcessing = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: Date.now() });
  },
});

export const markJobError = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const generateAiTurn = internalAction({
  args: {
    fightThreadId: v.id("fightThreads"),
    jobId: v.id("aiJobs"),
    expectedTurnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.fightMe.markJobProcessing, { jobId: args.jobId });

    try {
      const { thread, session, sourceSubmission, turns, questionId } = await ctx.runQuery(
        internal.fightMe.loadAiTurnContext,
        { fightThreadId: args.fightThreadId },
      );
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        questionId,
        feature: "fight_challenge",
        promptKey: "fight.ai_challenge.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: session.openingPrompt,
          sourceResponse: sourceSubmission?.body ?? "",
          turnsJson: JSON.stringify(
            turns
              .sort((a, b) => a.turnNumber - b.turnNumber)
              .map((turn) => ({
                role: turn.role,
                turnNumber: turn.turnNumber,
                body: turn.body,
                status: turn.status,
              })),
          ),
          mode: thread.mode,
        },
      });
      const data = asRecord(result.data);

      await ctx.runMutation(internal.fightMe.applyAiTurn, {
        fightThreadId: args.fightThreadId,
        jobId: args.jobId,
        expectedTurnNumber: args.expectedTurnNumber,
        body: stringOrFallback(data.body, "Here is the strongest counterpoint I see."),
      });
    } catch (error) {
      await ctx.runMutation(internal.fightMe.markJobError, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "AI fight turn failed.",
      });
      throw error;
    }
  },
});

export const loadDebriefContext = internalQuery({
  args: {
    debriefId: v.id("fightDebriefs"),
  },
  handler: async (ctx, args) => {
    const debrief = await ctx.db.get(args.debriefId);

    if (!debrief) {
      throw new Error("Fight debrief not found.");
    }

    const thread = await ctx.db.get(debrief.fightThreadId);

    if (!thread) {
      throw new Error("Fight thread not found.");
    }

    const session = await ctx.db.get(thread.sessionId);
    const turns = await ctx.db
      .query("fightTurns")
      .withIndex("by_thread", (q) => q.eq("fightThreadId", thread._id))
      .take(20);
    const sourceSubmissionId = sourceSubmissionIdForDebrief(thread);
    const sourceSubmission = sourceSubmissionId ? await ctx.db.get(sourceSubmissionId) : null;

    if (!session) {
      throw new Error("Fight session not found.");
    }

    return {
      debrief,
      thread,
      session,
      turns,
      sourcePostJson: sourcePostJsonForDebrief(sourceSubmission),
      questionId: await questionIdForThread(ctx, thread),
    };
  },
});

export const markDebriefProcessing = internalMutation({
  args: {
    debriefId: v.id("fightDebriefs"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.debriefId, { status: "processing", updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
  },
});

export const markDebriefSuccess = internalMutation({
  args: {
    debriefId: v.id("fightDebriefs"),
    jobId: v.id("aiJobs"),
    summary: v.string(),
    attackerStrength: v.string(),
    defenderStrength: v.string(),
    strongerRebuttal: v.string(),
    nextPractice: v.string(),
    llmCallId: v.id("llmCalls"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.debriefId, {
      status: "success",
      summary: args.summary,
      attackerStrength: args.attackerStrength,
      defenderStrength: args.defenderStrength,
      strongerRebuttal: args.strongerRebuttal,
      nextPractice: args.nextPractice,
      llmCallId: args.llmCallId,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: 1,
      progressTotal: 1,
      updatedAt: now,
    });
  },
});

export const markDebriefError = internalMutation({
  args: {
    debriefId: v.id("fightDebriefs"),
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.debriefId, { status: "error", error: args.error, updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "error", error: args.error, updatedAt: now });
  },
});

export const generateDebrief = internalAction({
  args: {
    debriefId: v.id("fightDebriefs"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.fightMe.markDebriefProcessing, args);

    try {
      const { thread, session, turns, sourcePostJson, questionId } = await ctx.runQuery(
        internal.fightMe.loadDebriefContext,
        {
          debriefId: args.debriefId,
        },
      );
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        questionId,
        feature: "fight_debrief",
        promptKey: "fight.debrief.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: session.openingPrompt,
          mode: thread.mode,
          status: thread.status,
          sourcePostJson,
          turnsJson: JSON.stringify(
            turns
              .sort((a, b) => a.turnNumber - b.turnNumber)
              .map((turn) => ({
                role: turn.role,
                turnNumber: turn.turnNumber,
                body: turn.body,
                status: turn.status,
                source: turn.source,
              })),
          ),
        },
      });
      const data = asRecord(result.data);

      await ctx.runMutation(internal.fightMe.markDebriefSuccess, {
        debriefId: args.debriefId,
        jobId: args.jobId,
        summary: stringOrFallback(data.summary, "Fight completed."),
        attackerStrength: stringOrFallback(
          data.attackerStrength,
          "Clear attempt to defend a claim.",
        ),
        defenderStrength: stringOrFallback(data.defenderStrength, "Clear attempt to respond."),
        strongerRebuttal: stringOrFallback(
          data.strongerRebuttal,
          "Use more specific evidence and address the strongest opposing point directly.",
        ),
        nextPractice: stringOrFallback(data.nextPractice, "Practice concise rebuttals."),
        llmCallId: result.llmCallId,
      });
    } catch (error) {
      await ctx.runMutation(internal.fightMe.markDebriefError, {
        debriefId: args.debriefId,
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Fight debrief failed.",
      });
      throw error;
    }
  },
});
