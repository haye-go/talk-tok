import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const MAX_CATEGORY_NAME_LENGTH = 80;
const MAX_CATEGORY_DESCRIPTION_LENGTH = 400;

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

  return slug || "category";
}

function normalizeName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 2) {
    throw new Error("Category name must be at least 2 characters.");
  }

  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new Error(`Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`);
  }

  return name;
}

function normalizeDescription(value: string | undefined) {
  const description = value?.trim().replace(/\s+/g, " ");

  if (!description) {
    return undefined;
  }

  if (description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    throw new Error(
      `Category description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  return description;
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toPublicCategory(category: Doc<"categories">) {
  return {
    id: category._id,
    sessionId: category.sessionId,
    slug: category.slug,
    name: category.name,
    description: category.description,
    color: category.color,
    parentCategoryId: category.parentCategoryId,
    smartTagId: category.smartTagId,
    source: category.source,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(100);

    return categories
      .filter((category) => args.includeArchived || category.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toPublicCategory);
  },
});

export const create = mutation({
  args: {
    sessionSlug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const name = normalizeName(args.name);
    const slug = slugify(name);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_session_slug", (q) => q.eq("sessionId", session._id).eq("slug", slug))
      .unique();

    if (existing && existing.status === "active") {
      throw new Error("A category with this name already exists.");
    }

    const now = Date.now();
    const categoryId = existing?._id
      ? existing._id
      : await ctx.db.insert("categories", {
          sessionId: session._id,
          slug,
          name,
          description: normalizeDescription(args.description),
          color: args.color,
          source: "instructor",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        description: normalizeDescription(args.description),
        color: args.color,
        source: existing.source === "llm" ? "hybrid" : existing.source,
        status: "active",
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "category.created",
      targetType: "category",
      targetId: categoryId,
      metadataJson: { name, slug },
    });

    return toPublicCategory((await ctx.db.get(categoryId))!);
  },
});

export const update = mutation({
  args: {
    sessionSlug: v.string(),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const category = await ctx.db.get(args.categoryId);

    if (!session || !category || category.sessionId !== session._id) {
      throw new Error("Category not found in this session.");
    }

    const name = normalizeName(args.name);
    const slug = slugify(name);
    const existingForSlug = await ctx.db
      .query("categories")
      .withIndex("by_session_slug", (q) => q.eq("sessionId", session._id).eq("slug", slug))
      .unique();

    if (existingForSlug && existingForSlug._id !== category._id) {
      throw new Error("Another category already uses this name.");
    }

    await ctx.db.patch(category._id, {
      slug,
      name,
      description: normalizeDescription(args.description),
      color: args.color,
      source: category.source === "llm" ? "hybrid" : category.source,
      updatedAt: Date.now(),
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "category.updated",
      targetType: "category",
      targetId: category._id,
      metadataJson: { name, slug },
    });

    return toPublicCategory((await ctx.db.get(category._id))!);
  },
});

export const archive = mutation({
  args: {
    sessionSlug: v.string(),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const category = await ctx.db.get(args.categoryId);

    if (!session || !category || category.sessionId !== session._id) {
      throw new Error("Category not found in this session.");
    }

    await ctx.db.patch(category._id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: "category.archived",
      targetType: "category",
      targetId: category._id,
    });

    return toPublicCategory((await ctx.db.get(category._id))!);
  },
});
