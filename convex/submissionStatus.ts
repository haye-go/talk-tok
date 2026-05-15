import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

async function deleteRowsBySubmissionId(
  ctx: MutationCtx,
  table:
    | "reactions"
    | "positionShiftEvents"
    | "semanticSignals"
    | "semanticClusterMembers"
    | "submissionCategories"
    | "categoryAssignmentReviews"
    | "recategorizationRequests"
    | "synthesisQuotes"
    | "submissionFeedback"
    | "aiJobs",
  submissionId: Id<"submissions">,
) {
  for (;;) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .take(50);

    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }
}

async function deleteSemanticEmbeddingsForSubmission(
  ctx: MutationCtx,
  submissionId: Id<"submissions">,
) {
  for (;;) {
    const rows = await ctx.db
      .query("semanticEmbeddings")
      .withIndex("by_entity", (q) => q.eq("entityType", "submission").eq("entityId", submissionId))
      .take(50);

    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }
}

async function deleteArgumentLinksForSubmission(
  ctx: MutationCtx,
  submissionId: Id<"submissions">,
) {
  for (;;) {
    const sourceLinks = await ctx.db
      .query("argumentLinks")
      .withIndex("by_source_entity", (q) =>
        q.eq("sourceEntityType", "submission").eq("sourceEntityId", submissionId),
      )
      .take(50);
    const targetLinks = await ctx.db
      .query("argumentLinks")
      .withIndex("by_target_entity", (q) =>
        q.eq("targetEntityType", "submission").eq("targetEntityId", submissionId),
      )
      .take(50);
    const linksById = new Map([...sourceLinks, ...targetLinks].map((link) => [link._id, link]));

    if (linksById.size === 0) {
      return;
    }

    for (const link of linksById.values()) {
      await ctx.db.delete(link._id);
    }
  }
}

async function patchSubmissionReferences(
  ctx: MutationCtx,
  submissionId: Id<"submissions">,
  sessionId: Id<"sessions">,
) {
  for (;;) {
    const clusters = await ctx.db
      .query("semanticClusters")
      .withIndex("by_representative_submission", (q) =>
        q.eq("representativeSubmissionId", submissionId),
      )
      .take(50);

    if (clusters.length === 0) {
      break;
    }

    for (const cluster of clusters) {
      await ctx.db.patch(cluster._id, {
        representativeSubmissionId: undefined,
        updatedAt: Date.now(),
      });
    }
  }

  const fightThreads = await ctx.db
    .query("fightThreads")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .take(200);

  for (const thread of fightThreads) {
    if (
      thread.attackerSubmissionId !== submissionId &&
      thread.defenderSubmissionId !== submissionId
    ) {
      continue;
    }

    await ctx.db.patch(thread._id, {
      attackerSubmissionId:
        thread.attackerSubmissionId === submissionId ? undefined : thread.attackerSubmissionId,
      defenderSubmissionId:
        thread.defenderSubmissionId === submissionId ? undefined : thread.defenderSubmissionId,
      updatedAt: Date.now(),
    });
  }
}

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

export const deleteSubmission = mutation({
  args: {
    previewPassword: v.string(),
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const now = Date.now();
    const pendingIds: Id<"submissions">[] = [submission._id];
    const submissionIds: Id<"submissions">[] = [];

    for (let index = 0; index < pendingIds.length; index += 1) {
      const currentId = pendingIds[index];
      submissionIds.push(currentId);

      const replies = await ctx.db
        .query("submissions")
        .withIndex("by_parent_submission", (q) => q.eq("parentSubmissionId", currentId))
        .take(200);

      for (const reply of replies) {
        pendingIds.push(reply._id);
      }
    }

    for (const id of submissionIds) {
      await deleteRowsBySubmissionId(ctx, "reactions", id);
      await deleteRowsBySubmissionId(ctx, "positionShiftEvents", id);
      await deleteRowsBySubmissionId(ctx, "semanticSignals", id);
      await deleteRowsBySubmissionId(ctx, "semanticClusterMembers", id);
      await deleteRowsBySubmissionId(ctx, "submissionCategories", id);
      await deleteRowsBySubmissionId(ctx, "categoryAssignmentReviews", id);
      await deleteRowsBySubmissionId(ctx, "recategorizationRequests", id);
      await deleteRowsBySubmissionId(ctx, "synthesisQuotes", id);
      await deleteRowsBySubmissionId(ctx, "submissionFeedback", id);
      await deleteRowsBySubmissionId(ctx, "aiJobs", id);
      await deleteSemanticEmbeddingsForSubmission(ctx, id);
      await deleteArgumentLinksForSubmission(ctx, id);
      await patchSubmissionReferences(ctx, id, submission.sessionId);
    }

    for (const id of [...submissionIds].reverse()) {
      await ctx.db.delete(id);
    }

    await ctx.db.insert("auditEvents", {
      sessionId: submission.sessionId,
      questionId: submission.questionId,
      actorType: "instructor",
      action: "submission.delete",
      targetType: "submission",
      targetId: submission._id,
      metadataJson: {
        deletedSubmissionCount: submissionIds.length,
      },
      createdAt: now,
    });

    return {
      submissionId: submission._id,
      deletedSubmissionCount: submissionIds.length,
    };
  },
});
