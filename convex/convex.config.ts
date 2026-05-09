import { defineApp } from "convex/server";
import actionCache from "@convex-dev/action-cache/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();

app.use(rateLimiter);
app.use(workpool, { name: "aiWorkpool" });
app.use(actionCache);

export default app;
