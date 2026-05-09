import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useInstructorOverview(sessionSlug: string) {
  return useQuery(api.instructorCommandCenter.overview, { sessionSlug });
}

export type InstructorOverview = NonNullable<ReturnType<typeof useInstructorOverview>>;
