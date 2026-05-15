import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

export function useInstructorShell(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  const { previewPassword } = useInstructorPreviewAuth();

  return useQuery(
    api.instructorCommandCenter.shell,
    previewPassword ? { sessionSlug, questionId, previewPassword } : "skip",
  );
}

export type InstructorShellData = NonNullable<ReturnType<typeof useInstructorShell>>;
