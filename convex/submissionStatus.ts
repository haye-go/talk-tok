import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

export const setAnswered = mutation({
  args: {
    previewPassword: v.string(),
    submissionId: v.id("submissions"),
    answered: v.boolean(),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const now = Date.now();

    await ctx.db.patch(submission._id, {
      answeredAt: args.answered ? now : undefined,
      answeredBy: args.answered ? "instructor" : undefined,
    });

    await ctx.db.insert("auditEvents", {
      sessionId: submission.sessionId,
      questionId: submission.questionId,
      actorType: "instructor",
      action: args.answered ? "submission.mark_answered" : "submission.reopen_answered",
      targetType: "submission",
      targetId: submission._id,
      metadataJson: {
        answered: args.answered,
      },
      createdAt: now,
    });

    return {
      submissionId: submission._id,
      answeredAt: args.answered ? now : null,
    };
  },
});
