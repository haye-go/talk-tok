import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useInstructorRoom(sessionSlug: string, questionId?: Id<"sessionQuestions">) {
  return useQuery(api.instructorCommandCenter.room, {
    sessionSlug,
    questionId,
  });
}

export type InstructorRoom = NonNullable<ReturnType<typeof useInstructorRoom>>;
