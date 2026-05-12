import { DEMO_SESSION_SLUG, type TabId } from "@/lib/constants";

type ReadableSegment = string;
export type InstructorWorkspaceTabId = "room" | "setup" | "reports";
export type InstructorRoomModeId = "latest" | "categories" | "similarity";

export function cleanRouteSegment(segment: ReadableSegment) {
  return segment.trim().replace(/^\/+|\/+$/g, "");
}

export function buildParticipantTabQuery(tab: TabId) {
  return tab === "contribute" ? "" : `?tab=${tab}`;
}

function buildSearchQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const routes = {
  home: () => "/",
  joinEntry: () => "/join",
  join: (sessionCode: string) => `/join/${cleanRouteSegment(sessionCode).toUpperCase()}`,
  session: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/session/${cleanRouteSegment(sessionSlug)}`,
  sessionTab: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG, tab: TabId = "contribute") =>
    `${routes.session(sessionSlug)}${buildParticipantTabQuery(tab)}`,
  sessionFight: (sessionSlug: ReadableSegment, fightSlug: ReadableSegment) =>
    `/session/${cleanRouteSegment(sessionSlug)}/fight/${cleanRouteSegment(fightSlug)}`,
  sessionReview: (sessionSlug: ReadableSegment) =>
    `/session/${cleanRouteSegment(sessionSlug)}/review`,
  instructor: () => "/instructor",
  instructorSessionNew: () => "/instructor/session/new",
  instructorSession: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanRouteSegment(sessionSlug)}`,
  instructorSessionWorkspace: (
    sessionSlug: ReadableSegment = DEMO_SESSION_SLUG,
    options?: {
      tab?: InstructorWorkspaceTabId;
      mode?: InstructorRoomModeId;
      questionId?: string;
    },
  ) =>
    `${routes.instructorSession(sessionSlug)}${buildSearchQuery({
      tab: options?.tab,
      mode: options?.mode,
      questionId: options?.questionId,
    })}`,
  instructorSessionRoom: (
    sessionSlug: ReadableSegment = DEMO_SESSION_SLUG,
    options?: { mode?: InstructorRoomModeId; questionId?: string },
  ) =>
    routes.instructorSessionWorkspace(sessionSlug, {
      tab: "room",
      mode: options?.mode,
      questionId: options?.questionId,
    }),
  instructorSessionSetup: (
    sessionSlug: ReadableSegment = DEMO_SESSION_SLUG,
    options?: { questionId?: string },
  ) =>
    routes.instructorSessionWorkspace(sessionSlug, {
      tab: "setup",
      questionId: options?.questionId,
    }),
  instructorSessionReports: (
    sessionSlug: ReadableSegment = DEMO_SESSION_SLUG,
    options?: { questionId?: string },
  ) =>
    routes.instructorSessionWorkspace(sessionSlug, {
      tab: "reports",
      questionId: options?.questionId,
    }),
  instructorProjector: (sessionSlug: ReadableSegment = DEMO_SESSION_SLUG) =>
    `/instructor/session/${cleanRouteSegment(sessionSlug)}/projector`,
  instructorTemplates: () => "/instructor/templates",
  instructorAdminModels: () => "/instructor/admin/models",
  instructorAdminPrompts: () => "/instructor/admin/prompts",
  instructorAdminRetrieval: () => "/instructor/admin/retrieval",
  instructorAdminProtection: () => "/instructor/admin/protection",
  instructorAdminObservability: () => "/instructor/admin/observability",
  instructorAdminDemo: () => "/instructor/admin/demo",
  demoPersonas: () => "/demo/personas",
} as const;

export const routeRegistry = [
  { id: "home", path: routes.home(), surface: "public" },
  { id: "join-entry", path: routes.joinEntry(), surface: "participant" },
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
  { id: "demo", path: routes.instructorAdminDemo(), surface: "admin" },
  { id: "demo-personas", path: routes.demoPersonas(), surface: "public" },
] as const;
