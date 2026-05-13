import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useInstructorShell(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  return useQuery(api.instructorCommandCenter.shell, {
    sessionSlug,
    questionId,
  });
}

export type InstructorShellData = NonNullable<ReturnType<typeof useInstructorShell>>;
