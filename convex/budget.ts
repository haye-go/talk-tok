import { v } from "convex/values";
import { internalQuery, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type JsonRecord = Record<string, unknown>;

const DEFAULT_SESSION_BUDGET_USD = 3;
const DEFAULT_WARN_AT_PERCENT = 80;
const LLM_CALL_LOOKBACK_LIMIT = 500;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function numberFrom(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanFrom(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

async function getBudgetSetting(ctx: QueryCtx) {
  const setting = await ctx.db
    .query("protectionSettings")
    .withIndex("by_session_and_key", (q) => q.eq("sessionId", null).eq("key", "aiBudget"))
    .unique();

  return asRecord(setting?.valueJson);
}

async function getBudgetSettingForSession(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const sessionSetting = await ctx.db
    .query("protectionSettings")
    .withIndex("by_session_and_key", (q) => q.eq("sessionId", sessionId).eq("key", "aiBudget"))
    .unique();

  if (sessionSetting) {
    return asRecord(sessionSetting.valueJson);
  }

  return await getBudgetSetting(ctx);
}

async function sumSessionSpend(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const calls = await ctx.db
    .query("llmCalls")
    .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .take(LLM_CALL_LOOKBACK_LIMIT);

  return calls.reduce((total, call) => total + (call.estimatedCostUsd ?? 0), 0);
}

export const checkSessionBudget = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const simulatedBudgetExceeded = await ctx.runQuery(internal.demo.isToggleEnabled, {
      key: "simulateBudgetExceeded",
    });

    if (simulatedBudgetExceeded.enabled) {
      return {
        allowed: false,
        warning: true,
        feature: args.feature,
        hardStopEnabled: true,
        totalEstimatedCostUsd: DEFAULT_SESSION_BUDGET_USD,
        perSessionEstimatedCostUsd: DEFAULT_SESSION_BUDGET_USD,
        usagePercent: 100,
      };
    }

    const budget = await getBudgetSettingForSession(ctx, args.sessionId);
    const perSessionEstimatedCostUsd = numberFrom(
      budget.perSessionEstimatedCostUsd,
      DEFAULT_SESSION_BUDGET_USD,
    );
    const warnAtPercent = numberFrom(budget.warnAtPercent, DEFAULT_WARN_AT_PERCENT);
    const hardStopEnabled = booleanFrom(budget.hardStopEnabled, false);
    const totalEstimatedCostUsd = await sumSessionSpend(ctx, args.sessionId);
    const usagePercent =
      perSessionEstimatedCostUsd > 0
        ? (totalEstimatedCostUsd / perSessionEstimatedCostUsd) * 100
        : 0;
    const warning = usagePercent >= warnAtPercent;
    const allowed = !hardStopEnabled || totalEstimatedCostUsd < perSessionEstimatedCostUsd;

    return {
      allowed,
      warning,
      feature: args.feature,
      hardStopEnabled,
      totalEstimatedCostUsd,
      perSessionEstimatedCostUsd,
      usagePercent,
    };
  },
});

export const getSessionSpend = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const budget = await getBudgetSettingForSession(ctx, args.sessionId);
    const perSessionEstimatedCostUsd = numberFrom(
      budget.perSessionEstimatedCostUsd,
      DEFAULT_SESSION_BUDGET_USD,
    );
    const totalEstimatedCostUsd = await sumSessionSpend(ctx, args.sessionId);

    return {
      totalEstimatedCostUsd,
      perSessionEstimatedCostUsd,
      warnAtPercent: numberFrom(budget.warnAtPercent, DEFAULT_WARN_AT_PERCENT),
      hardStopEnabled: booleanFrom(budget.hardStopEnabled, false),
    };
  },
});
