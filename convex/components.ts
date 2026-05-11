import { Migrations } from "@convex-dev/migrations";
import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  sessionJoin: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 30, shards: 4 },
  submitResponse: { kind: "token bucket", rate: 5, period: 30_000, capacity: 5, shards: 4 },
  followUpResponse: { kind: "token bucket", rate: 8, period: MINUTE, capacity: 8, shards: 4 },
  reactionAction: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 40, shards: 4 },
  positionShiftAction: { kind: "token bucket", rate: 4, period: MINUTE, capacity: 4, shards: 2 },
  recategorisationRequest: {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 3,
    shards: 2,
  },
  fightMeAction: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20, shards: 4 },
  fightDraftSave: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30, shards: 4 },
  heavyAiAction: { kind: "fixed window", rate: 20, period: MINUTE, capacity: 20, shards: 4 },
  dailyAiAction: { kind: "fixed window", rate: 600, period: 24 * HOUR, capacity: 600, shards: 8 },
});

export const aiWorkpool = new Workpool(components.aiWorkpool, {
  maxParallelism: 4,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

export const migrations = new Migrations<DataModel>(components.migrations, {
  defaultBatchSize: 50,
});
