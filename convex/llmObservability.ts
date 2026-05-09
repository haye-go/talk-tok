import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const DEFAULT_CALL_LIMIT = 80;
const MAX_CALL_LIMIT = 200;
const SUMMARY_SAMPLE_LIMIT = 500;

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

function toPublicCall(call: Doc<"llmCalls">) {
  return {
    _id: call._id,
    id: call._id,
    sessionId: call.sessionId,
    feature: call.feature,
    provider: call.provider,
    model: call.model,
    status: call.status,
    promptTemplateKey: call.promptTemplateKey,
    inputTokens: call.inputTokens,
    cachedInputTokens: call.cachedInputTokens,
    outputTokens: call.outputTokens,
    reasoningTokens: call.reasoningTokens,
    estimatedCostUsd: call.estimatedCostUsd,
    latencyMs: call.latencyMs,
    error: call.error,
    createdAt: call.createdAt,
  };
}

function summarize(calls: Doc<"llmCalls">[]) {
  const successCalls = calls.filter((call) => call.status === "success");
  const latencyValues = successCalls
    .map((call) => call.latencyMs)
    .filter((latency): latency is number => typeof latency === "number");
  const totalLatency = latencyValues.reduce((sum, latency) => sum + latency, 0);

  const inputTokens = calls.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0);
  const cachedInputTokens = calls.reduce((sum, call) => sum + (call.cachedInputTokens ?? 0), 0);
  const outputTokens = calls.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0);
  const reasoningTokens = calls.reduce((sum, call) => sum + (call.reasoningTokens ?? 0), 0);
  const estimatedCostUsd = calls.reduce((sum, call) => sum + (call.estimatedCostUsd ?? 0), 0);
  const byFeature: Record<string, { calls: number; errors: number; estimatedCostUsd: number }> = {};

  for (const call of calls) {
    byFeature[call.feature] ??= { calls: 0, errors: 0, estimatedCostUsd: 0 };
    byFeature[call.feature].calls += 1;
    byFeature[call.feature].errors += call.status === "error" ? 1 : 0;
    byFeature[call.feature].estimatedCostUsd += call.estimatedCostUsd ?? 0;
  }

  const errors = calls.filter((call) => call.status === "error").length;

  return {
    calls: calls.length,
    totalCalls: calls.length,
    successes: successCalls.length,
    errors,
    errorCount: errors,
    queued: calls.filter((call) => call.status === "queued").length,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: inputTokens + cachedInputTokens + outputTokens + reasoningTokens,
    estimatedCostUsd,
    totalEstimatedCostUsd: estimatedCostUsd,
    averageLatencyMs:
      latencyValues.length > 0 ? Math.round(totalLatency / latencyValues.length) : 0,
    byFeature,
  };
}

export const recentCalls = query({
  args: {
    sessionSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(MAX_CALL_LIMIT, Math.max(1, args.limit ?? DEFAULT_CALL_LIMIT));

    if (args.sessionSlug) {
      const session = await getSessionBySlug(ctx, args.sessionSlug);

      if (!session) {
        return null;
      }

      const calls = await ctx.db
        .query("llmCalls")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(limit);

      return calls.map(toPublicCall);
    }

    const calls = await ctx.db.query("llmCalls").order("desc").take(limit);
    return calls.map(toPublicCall);
  },
});

export const summary = query({
  args: {
    sessionSlug: v.optional(v.string()),
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.sinceMs ?? 0;
    const calls = args.sessionSlug
      ? await getSessionBySlug(ctx, args.sessionSlug).then(async (session) =>
          session
            ? await ctx.db
                .query("llmCalls")
                .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
                .order("desc")
                .take(SUMMARY_SAMPLE_LIMIT)
            : null,
        )
      : await ctx.db.query("llmCalls").order("desc").take(SUMMARY_SAMPLE_LIMIT);

    if (!calls) {
      return null;
    }

    return summarize(calls.filter((call) => call.createdAt >= since));
  },
});
