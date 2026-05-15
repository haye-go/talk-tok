import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

const DEFAULT_JOB_LIMIT = 80;
const MAX_JOB_LIMIT = 200;

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

function toPublicJob(job: Doc<"aiJobs">) {
  return {
    id: job._id,
    sessionId: job.sessionId,
    questionId: job.questionId,
    submissionId: job.submissionId,
    type: job.type,
    status: job.status,
    requestedBy: job.requestedBy,
    progressTotal: job.progressTotal,
    progressDone: job.progressDone,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export const listForSession = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("success"),
        v.literal("error"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const limit = Math.min(MAX_JOB_LIMIT, Math.max(1, args.limit ?? DEFAULT_JOB_LIMIT));
    const jobs = args.questionId
      ? await ctx.db
          .query("aiJobs")
          .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
          .order("desc")
          .take(limit)
      : args.status
        ? await ctx.db
            .query("aiJobs")
            .withIndex("by_session_and_status", (q) =>
              q.eq("sessionId", session._id).eq("status", args.status!),
            )
            .order("desc")
            .take(limit)
        : await ctx.db
            .query("aiJobs")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(limit);

    return jobs
      .filter(
        (job) => job.sessionId === session._id && (!args.status || job.status === args.status),
      )
      .map(toPublicJob);
  },
});

export const listForSubmission = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("aiJobs")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("desc")
      .take(20);

    return jobs.map(toPublicJob);
  },
});
