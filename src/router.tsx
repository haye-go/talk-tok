import { createRoute, createRootRoute, createRouter, Outlet } from "@tanstack/react-router";
import App from "./App";
import { AdminModelsPage } from "@/pages/admin-models-page";
import { AdminObservabilityPage } from "@/pages/admin-observability-page";
import { AdminPromptsPage } from "@/pages/admin-prompts-page";
import { AdminProtectionPage } from "@/pages/admin-protection-page";
import { AdminRetrievalPage } from "@/pages/admin-retrieval-page";
import { FightPage } from "@/pages/fight-page";
import { InstructorDashboardPage } from "@/pages/instructor-dashboard-page";
import { JoinCodePage } from "@/pages/join-code-page";
import { InstructorSessionPage } from "@/pages/instructor-session-page";
import { JoinPage } from "@/pages/join-page";
import { ParticipantSessionPage } from "@/pages/participant-session-page";
import { ProjectorPage } from "@/pages/projector-page";
import { ReviewPage } from "@/pages/review-page";
import { SessionNewPage } from "@/pages/session-new-page";
import { TemplatesPage } from "@/pages/templates-page";

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join",
  component: JoinCodePage,
});

const joinWithCodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join/$sessionCode",
  component: JoinPage,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug",
  component: ParticipantSessionPage,
});

const sessionFightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/fight/$fightSlug",
  component: FightPage,
});

const sessionReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/review",
  component: ReviewPage,
});

const instructorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor",
  component: InstructorDashboardPage,
});

const instructorSessionNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/new",
  component: SessionNewPage,
});

const instructorSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug",
  component: InstructorSessionPage,
});

const instructorProjectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug/projector",
  component: ProjectorPage,
});

const instructorTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/templates",
  component: TemplatesPage,
});

const instructorAdminModelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/models",
  component: AdminModelsPage,
});

const instructorAdminPromptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/prompts",
  component: AdminPromptsPage,
});

const instructorAdminRetrievalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/retrieval",
  component: AdminRetrievalPage,
});

const instructorAdminProtectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/protection",
  component: AdminProtectionPage,
});

const instructorAdminObservabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/observability",
  component: AdminObservabilityPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  joinRoute,
  joinWithCodeRoute,
  sessionRoute,
  sessionFightRoute,
  sessionReviewRoute,
  instructorRoute,
  instructorSessionNewRoute,
  instructorSessionRoute,
  instructorProjectorRoute,
  instructorTemplatesRoute,
  instructorAdminModelsRoute,
  instructorAdminPromptsRoute,
  instructorAdminRetrievalRoute,
  instructorAdminProtectionRoute,
  instructorAdminObservabilityRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
