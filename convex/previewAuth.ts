import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

export const login = mutation({
  args: {
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    requireInstructorPreviewPassword(args.password);
    return { ok: true };
  },
});
