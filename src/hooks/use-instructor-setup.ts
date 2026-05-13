import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useInstructorSetup(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  return useQuery(api.instructorCommandCenter.setup, {
    sessionSlug,
    questionId,
  });
}

export type InstructorSetup = NonNullable<ReturnType<typeof useInstructorSetup>>;
