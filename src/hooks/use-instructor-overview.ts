import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useInstructorOverview(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  return useQuery(api.instructorCommandCenter.overview, {
    sessionSlug,
    questionId,
  });
}

export type InstructorOverview = NonNullable<ReturnType<typeof useInstructorOverview>>;
