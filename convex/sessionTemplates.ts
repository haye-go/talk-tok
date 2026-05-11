import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { createDefaultQuestionForSession } from "./sessionQuestions";

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMPLATE_LIMIT = 80;

const modePresetValidator = v.union(
  v.literal("class_discussion"),
  v.literal("conference_qna"),
  v.literal("debate_lab"),
  v.literal("custom"),
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
const presetCategoryValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  color: v.optional(v.string()),
});

function normalizeText(value: string, label: string, minLength: number, maxLength: number) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length < minLength) {
    throw new Error(`${label} must be at least ${minLength} characters.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function slugify(value: string, fallback = "template") {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || fallback;
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

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", slugify(sessionSlug, "session")))
    .unique();
}

async function createUniqueTemplateSlug(ctx: MutationCtx, name: string) {
  const baseSlug = slugify(name, "session-template");

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("sessionTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique template slug.");
}

async function createUniqueSessionSlug(ctx: MutationCtx, title: string) {
  const baseSlug = slugify(title, "discussion-session");

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();

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

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_join_code", (q) => q.eq("joinCode", normalized))
      .unique();

    if (existing) {
      throw new Error("That session code is already in use.");
    }

    return normalized;
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = generateJoinCode();
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_join_code", (q) => q.eq("joinCode", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique session code.");
}

function normalizePresetCategories(
  categories: Array<{ name: string; description?: string; color?: string }>,
) {
  return categories.slice(0, 12).map((category) => ({
    name: normalizeText(category.name, "Category name", 2, 80),
    description: category.description
      ? normalizeText(category.description, "Category description", 2, 240)
      : undefined,
    color: category.color?.trim() || undefined,
  }));
}

function toPublicTemplate(template: Doc<"sessionTemplates">) {
  return {
    id: template._id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    title: template.title,
    openingPrompt: template.openingPrompt,
    modePreset: template.modePreset,
    visibilityMode: template.visibilityMode,
    anonymityMode: template.anonymityMode,
    responseSoftLimitWords: template.responseSoftLimitWords,
    categorySoftCap: template.categorySoftCap,
    critiqueToneDefault: template.critiqueToneDefault,
    telemetryEnabled: template.telemetryEnabled,
    fightMeEnabled: template.fightMeEnabled,
    summaryGateEnabled: template.summaryGateEnabled,
    presetCategories: template.presetCategories,
    status: template.status,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    title: v.string(),
    openingPrompt: v.string(),
    modePreset: v.optional(modePresetValidator),
    visibilityMode: v.optional(visibilityModeValidator),
    anonymityMode: v.optional(anonymityModeValidator),
    responseSoftLimitWords: v.optional(v.number()),
    categorySoftCap: v.optional(v.number()),
    critiqueToneDefault: v.optional(critiqueToneValidator),
    telemetryEnabled: v.optional(v.boolean()),
    fightMeEnabled: v.optional(v.boolean()),
    summaryGateEnabled: v.optional(v.boolean()),
    presetCategories: v.optional(v.array(presetCategoryValidator)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const name = normalizeText(args.name, "Template name", 3, 120);
    const templateId = await ctx.db.insert("sessionTemplates", {
      slug: await createUniqueTemplateSlug(ctx, name),
      name,
      description: args.description
        ? normalizeText(args.description, "Template description", 2, 500)
        : undefined,
      title: normalizeText(args.title, "Session title", 3, 120),
      openingPrompt: normalizeText(args.openingPrompt, "Opening topic", 10, 2000),
      modePreset: args.modePreset ?? "class_discussion",
      visibilityMode: args.visibilityMode ?? "private_until_released",
      anonymityMode: args.anonymityMode ?? "nicknames_visible",
      responseSoftLimitWords: args.responseSoftLimitWords ?? 200,
      categorySoftCap: args.categorySoftCap ?? 8,
      critiqueToneDefault: args.critiqueToneDefault ?? "spicy",
      telemetryEnabled: args.telemetryEnabled ?? true,
      fightMeEnabled: args.fightMeEnabled ?? true,
      summaryGateEnabled: args.summaryGateEnabled ?? false,
      presetCategories: normalizePresetCategories(args.presetCategories ?? []),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      actorType: "instructor",
      action: "session_template.created",
      targetType: "sessionTemplate",
      targetId: templateId,
    });

    return toPublicTemplate((await ctx.db.get(templateId))!);
  },
});

export const createFromSession = mutation({
  args: {
    sessionSlug: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(50);
    const now = Date.now();
    const name = normalizeText(args.name ?? `${session.title} Template`, "Template name", 3, 120);
    const templateId = await ctx.db.insert("sessionTemplates", {
      slug: await createUniqueTemplateSlug(ctx, name),
      name,
      description: args.description
        ? normalizeText(args.description, "Template description", 2, 500)
        : undefined,
      title: session.title,
      openingPrompt: session.openingPrompt,
      modePreset: session.modePreset,
      visibilityMode: session.visibilityMode,
      anonymityMode: session.anonymityMode,
      responseSoftLimitWords: session.responseSoftLimitWords,
      categorySoftCap: session.categorySoftCap,
      critiqueToneDefault: session.critiqueToneDefault,
      telemetryEnabled: session.telemetryEnabled,
      fightMeEnabled: session.fightMeEnabled,
      summaryGateEnabled: session.summaryGateEnabled,
      presetCategories: normalizePresetCategories(
        categories
          .filter((category) => category.status === "active")
          .map((category) => ({
            name: category.name,
            description: category.description,
            color: category.color,
          })),
      ),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "session_template.created_from_session",
      targetType: "sessionTemplate",
      targetId: templateId,
    });

    return toPublicTemplate((await ctx.db.get(templateId))!);
  },
});

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const templates = args.includeArchived
      ? await ctx.db.query("sessionTemplates").order("desc").take(TEMPLATE_LIMIT)
      : await ctx.db
          .query("sessionTemplates")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .order("desc")
          .take(TEMPLATE_LIMIT);

    return templates.map(toPublicTemplate);
  },
});

export const archive = mutation({
  args: {
    templateId: v.id("sessionTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      throw new Error("Template not found.");
    }

    await ctx.db.patch(template._id, { status: "archived", updatedAt: Date.now() });
    await ctx.runMutation(internal.audit.record, {
      actorType: "instructor",
      action: "session_template.archived",
      targetType: "sessionTemplate",
      targetId: template._id,
    });

    return toPublicTemplate((await ctx.db.get(template._id))!);
  },
});

export const createSessionFromTemplate = mutation({
  args: {
    templateId: v.id("sessionTemplates"),
    title: v.optional(v.string()),
    openingPrompt: v.optional(v.string()),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template || template.status !== "active") {
      throw new Error("Active template not found.");
    }

    const now = Date.now();
    const title = normalizeText(args.title ?? template.title, "Session title", 3, 120);
    const sessionId = await ctx.db.insert("sessions", {
      slug: await createUniqueSessionSlug(ctx, title),
      joinCode: await createUniqueJoinCode(ctx, args.joinCode),
      title,
      openingPrompt: normalizeText(
        args.openingPrompt ?? template.openingPrompt,
        "Opening topic",
        10,
        2000,
      ),
      modePreset: template.modePreset,
      phase: "lobby",
      currentAct: "submit",
      visibilityMode: template.visibilityMode,
      anonymityMode: template.anonymityMode,
      responseSoftLimitWords: template.responseSoftLimitWords,
      categorySoftCap: template.categorySoftCap,
      critiqueToneDefault: template.critiqueToneDefault,
      telemetryEnabled: template.telemetryEnabled,
      fightMeEnabled: template.fightMeEnabled,
      summaryGateEnabled: template.summaryGateEnabled,
      createdAt: now,
      updatedAt: now,
    });
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new Error("Session was not created.");
    }

    await createDefaultQuestionForSession(ctx, session, now);

    for (const category of template.presetCategories) {
      await ctx.db.insert("categories", {
        sessionId,
        slug: slugify(category.name, "category"),
        name: category.name,
        description: category.description,
        color: category.color,
        source: "instructor",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId,
      actorType: "instructor",
      action: "session.created_from_template",
      targetType: "sessionTemplate",
      targetId: template._id,
    });

    const updatedSession = await ctx.db.get(sessionId);

    if (!updatedSession) {
      throw new Error("Session was not created.");
    }

    return {
      id: updatedSession._id,
      slug: updatedSession.slug,
      joinCode: updatedSession.joinCode,
      title: updatedSession.title,
      openingPrompt: updatedSession.openingPrompt,
      currentQuestionId: updatedSession.currentQuestionId,
      modePreset: updatedSession.modePreset,
      phase: updatedSession.phase,
      currentAct: updatedSession.currentAct,
      visibilityMode: updatedSession.visibilityMode,
      anonymityMode: updatedSession.anonymityMode,
      responseSoftLimitWords: updatedSession.responseSoftLimitWords,
      categorySoftCap: updatedSession.categorySoftCap,
      critiqueToneDefault: updatedSession.critiqueToneDefault,
      telemetryEnabled: updatedSession.telemetryEnabled,
      fightMeEnabled: updatedSession.fightMeEnabled,
      summaryGateEnabled: updatedSession.summaryGateEnabled,
      participantCount: 0,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
    };
  },
});
