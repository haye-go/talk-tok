import { DEMO_SESSION_SLUG } from "@/lib/constants";

type ReadableSegment = string;

export function cleanRouteSegment(segment: ReadableSegment) {
  return segment.trim().replace(/^\/+|\/+$/g, "");
}

export const routes = {
  home: () => "/",
  join: (sessionCode: string) => `/join/${cleanRouteSegment(sessionCode).toUpperCase()}`,
  session: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/session/${cleanRouteSegment(sessionSlug)}`,
  sessionFight: (sessionSlug: ReadableSegment, fightSlug: ReadableSegment) =>
    `/session/${cleanRouteSegment(sessionSlug)}/fight/${cleanRouteSegment(fightSlug)}`,
  sessionReview: (sessionSlug: ReadableSegment) =>
    `/session/${cleanRouteSegment(sessionSlug)}/review`,
  instructor: () => "/instructor",
  instructorSessionNew: () => "/instructor/session/new",
  instructorSession: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanRouteSegment(sessionSlug)}`,
  instructorProjector: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanRouteSegment(sessionSlug)}/projector`,
  instructorTemplates: () => "/instructor/templates",
  instructorAdminModels: () => "/instructor/admin/models",
  instructorAdminPrompts: () => "/instructor/admin/prompts",
  instructorAdminRetrieval: () => "/instructor/admin/retrieval",
  instructorAdminProtection: () => "/instructor/admin/protection",
  instructorAdminObservability: () => "/instructor/admin/observability",
} as const;

export const routeRegistry = [
  { id: "home", path: routes.home(), surface: "public" },
  { id: "join", path: "/join/:sessionCode", surface: "participant" },
  { id: "session", path: "/session/:sessionSlug", surface: "participant" },
  { id: "fight", path: "/session/:sessionSlug/fight/:fightSlug", surface: "participant" },
  { id: "review", path: "/session/:sessionSlug/review", surface: "participant" },
  { id: "instructor", path: routes.instructor(), surface: "instructor" },
  { id: "session-new", path: routes.instructorSessionNew(), surface: "instructor" },
  { id: "instructor-session", path: "/instructor/session/:sessionSlug", surface: "instructor" },
  {
    id: "projector",
    path: "/instructor/session/:sessionSlug/projector",
    surface: "projector",
  },
  { id: "templates", path: routes.instructorTemplates(), surface: "instructor" },
  { id: "models", path: routes.instructorAdminModels(), surface: "admin" },
  { id: "prompts", path: routes.instructorAdminPrompts(), surface: "admin" },
  { id: "retrieval", path: routes.instructorAdminRetrieval(), surface: "admin" },
  { id: "protection", path: routes.instructorAdminProtection(), surface: "admin" },
  { id: "observability", path: routes.instructorAdminObservability(), surface: "admin" },
] as const;
