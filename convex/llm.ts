import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type JsonRecord = Record<string, unknown>;

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function renderValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function renderTemplate(template: string, variables: JsonRecord) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : renderValue(value);
  });
}

function parseModelOverride(value: string | undefined, fallbackKey: string | undefined) {
  return value || fallbackKey || "openai:gpt-4.1-mini";
}

function estimateCostUsd(args: {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  inputCostPerMillion: number;
  cachedInputCostPerMillion?: number;
  outputCostPerMillion: number;
  reasoningCostPerMillion?: number;
}) {
  return (
    ((args.inputTokens ?? 0) * args.inputCostPerMillion) / 1_000_000 +
    ((args.cachedInputTokens ?? 0) * (args.cachedInputCostPerMillion ?? 0)) / 1_000_000 +
    ((args.outputTokens ?? 0) * args.outputCostPerMillion) / 1_000_000 +
    ((args.reasoningTokens ?? 0) * (args.reasoningCostPerMillion ?? 0)) / 1_000_000
  );
}

function extractUsage(responseJson: JsonRecord) {
  const usage = asRecord(responseJson.usage);
  const promptDetails = asRecord(usage.prompt_tokens_details);
  const completionDetails = asRecord(usage.completion_tokens_details);

  return {
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    cachedInputTokens:
      typeof promptDetails.cached_tokens === "number" ? promptDetails.cached_tokens : undefined,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
    reasoningTokens:
      typeof completionDetails.reasoning_tokens === "number"
        ? completionDetails.reasoning_tokens
        : undefined,
  };
}

function extractContent(responseJson: JsonRecord) {
  const choices = Array.isArray(responseJson.choices) ? responseJson.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice.message);

  if (typeof message.content !== "string") {
    throw new Error("OpenAI response did not include message content.");
  }

  return message.content;
}

function buildOpenAiRequest(args: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  variablesJson: JsonRecord;
}) {
  const temperature =
    typeof args.variablesJson.temperature === "number" ? args.variablesJson.temperature : 0.2;
  const maxOutputTokens =
    typeof args.variablesJson.maxOutputTokens === "number"
      ? args.variablesJson.maxOutputTokens
      : 1200;
  const responseFormat =
    args.variablesJson.responseFormat === "json_object" ? { type: "json_object" } : undefined;

  return {
    model: args.model,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ],
    temperature,
    max_tokens: maxOutputTokens,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
}

export const loadRuntime = internalQuery({
  args: {
    promptKey: v.string(),
    modelKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db
      .query("promptTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.promptKey))
      .unique();

    if (!prompt) {
      throw new Error(`Prompt template missing: ${args.promptKey}`);
    }

    const modelKey = parseModelOverride(prompt.modelOverride, args.modelKey);
    const modelSetting = await ctx.db
      .query("modelSettings")
      .withIndex("by_key", (q) => q.eq("key", modelKey))
      .unique();

    if (!modelSetting) {
      throw new Error(`Model setting missing: ${modelKey}`);
    }

    if (!modelSetting.enabled) {
      throw new Error(`Model setting is disabled: ${modelKey}`);
    }

    return { prompt, modelSetting };
  },
});

export const createCall = internalMutation({
  args: {
    sessionId: v.optional(v.id("sessions")),
    feature: v.string(),
    provider: v.string(),
    model: v.string(),
    promptTemplateKey: v.string(),
    requestJson: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("llmCalls", {
      sessionId: args.sessionId,
      feature: args.feature,
      provider: args.provider,
      model: args.model,
      status: "queued",
      promptTemplateKey: args.promptTemplateKey,
      requestJson: args.requestJson,
      createdAt: Date.now(),
    });
  },
});

export const markCallSuccess = internalMutation({
  args: {
    llmCallId: v.id("llmCalls"),
    inputTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    estimatedCostUsd: v.number(),
    latencyMs: v.number(),
    responseJson: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.llmCallId, {
      status: "success",
      inputTokens: args.inputTokens,
      cachedInputTokens: args.cachedInputTokens,
      outputTokens: args.outputTokens,
      reasoningTokens: args.reasoningTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      latencyMs: args.latencyMs,
      responseJson: args.responseJson,
    });

    return await ctx.db.get(args.llmCallId);
  },
});

export const markCallError = internalMutation({
  args: {
    llmCallId: v.id("llmCalls"),
    latencyMs: v.number(),
    error: v.string(),
    responseJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.llmCallId, {
      status: "error",
      latencyMs: args.latencyMs,
      error: args.error,
      responseJson: args.responseJson,
    });

    return await ctx.db.get(args.llmCallId);
  },
});

export const runJson = internalAction({
  args: {
    sessionId: v.optional(v.id("sessions")),
    feature: v.string(),
    promptKey: v.string(),
    modelKey: v.optional(v.string()),
    variables: v.any(),
  },
  handler: async (ctx, args): Promise<{ data: JsonRecord; llmCallId: Id<"llmCalls"> }> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured in Convex env.");
    }

    const runtime = await ctx.runQuery(internal.llm.loadRuntime, {
      promptKey: args.promptKey,
      modelKey: args.modelKey,
    });
    const variables = asRecord(args.variables);
    const promptVariables = {
      ...asRecord(runtime.prompt.variablesJson),
      ...asRecord(runtime.modelSetting.variablesJson),
      ...variables,
    };
    const systemPrompt = renderTemplate(runtime.prompt.systemPrompt, promptVariables);
    const userPrompt = renderTemplate(runtime.prompt.userTemplate, promptVariables);
    const requestJson = buildOpenAiRequest({
      model: runtime.modelSetting.model,
      systemPrompt,
      userPrompt,
      variablesJson: promptVariables,
    });
    const llmCallId: Id<"llmCalls"> = await ctx.runMutation(internal.llm.createCall, {
      sessionId: args.sessionId,
      feature: args.feature,
      provider: runtime.modelSetting.provider,
      model: runtime.modelSetting.model,
      promptTemplateKey: runtime.prompt.key,
      requestJson,
    });
    const startedAt = Date.now();
    let errorAlreadyLogged = false;

    try {
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestJson),
      });
      const responseJson = (await response.json()) as JsonRecord;
      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        const errorMessage =
          typeof asRecord(responseJson.error).message === "string"
            ? asRecord(responseJson.error).message
            : `OpenAI request failed with status ${response.status}`;
        await ctx.runMutation(internal.llm.markCallError, {
          llmCallId,
          latencyMs,
          error: errorMessage,
          responseJson,
        });
        errorAlreadyLogged = true;
        throw new Error(errorMessage);
      }

      const content = extractContent(responseJson);
      const parsed = JSON.parse(content) as JsonRecord;
      const usage = extractUsage(responseJson);
      const estimatedCostUsd = estimateCostUsd({
        ...usage,
        inputCostPerMillion: runtime.modelSetting.inputCostPerMillion,
        cachedInputCostPerMillion: runtime.modelSetting.cachedInputCostPerMillion,
        outputCostPerMillion: runtime.modelSetting.outputCostPerMillion,
        reasoningCostPerMillion: runtime.modelSetting.reasoningCostPerMillion,
      });

      await ctx.runMutation(internal.llm.markCallSuccess, {
        llmCallId,
        ...usage,
        estimatedCostUsd,
        latencyMs,
        responseJson,
      });

      return { data: parsed, llmCallId };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unknown LLM error.";

      if (!errorAlreadyLogged) {
        await ctx.runMutation(internal.llm.markCallError, {
          llmCallId,
          latencyMs,
          error: message,
        });
      }

      throw error;
    }
  },
});
