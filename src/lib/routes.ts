import { DEMO_SESSION_SLUG } from "@/lib/constants";

type ReadableSegment = string;

function cleanSegment(segment: ReadableSegment) {
  return segment.trim().replace(/^\/+|\/+$/g, "");
}

export const routes = {
  home: () => "/",
  join: (sessionCode: string) => `/join/${cleanSegment(sessionCode).toUpperCase()}`,
  session: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/session/${cleanSegment(sessionSlug)}`,
  sessionFight: (sessionSlug: ReadableSegment, fightSlug: ReadableSegment) =>
    `/session/${cleanSegment(sessionSlug)}/fight/${cleanSegment(fightSlug)}`,
  sessionReview: (sessionSlug: ReadableSegment) => `/session/${cleanSegment(sessionSlug)}/review`,
  instructor: () => "/instructor",
  instructorSessionNew: () => "/instructor/session/new",
  instructorSession: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanSegment(sessionSlug)}`,
  instructorProjector: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanSegment(sessionSlug)}/projector`,
  instructorTemplates: () => "/instructor/templates",
  instructorAdminModels: () => "/instructor/admin/models",
  instructorAdminPrompts: () => "/instructor/admin/prompts",
  instructorAdminRetrieval: () => "/instructor/admin/retrieval",
  instructorAdminProtection: () => "/instructor/admin/protection",
  instructorAdminObservability: () => "/instructor/admin/observability",
} as const;
