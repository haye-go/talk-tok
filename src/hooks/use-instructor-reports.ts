import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useInstructorReports(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  return useQuery(api.instructorCommandCenter.reports, {
    sessionSlug,
    questionId,
  });
}

export type InstructorReports = NonNullable<ReturnType<typeof useInstructorReports>>;
