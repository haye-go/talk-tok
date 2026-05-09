import { createRoute, createRootRoute, createRouter, Outlet } from "@tanstack/react-router";
import App from "./App";

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
  path: "/join/$sessionCode",
  component: App,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug",
  component: App,
});

const sessionFightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/fight/$fightSlug",
  component: App,
});

const sessionReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/review",
  component: App,
});

const instructorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor",
  component: App,
});

const instructorSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug",
  component: App,
});

const instructorProjectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug/projector",
  component: App,
});

const instructorAdminModelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/models",
  component: App,
});

const instructorAdminPromptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/prompts",
  component: App,
});

const instructorAdminProtectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/protection",
  component: App,
});

const instructorAdminObservabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/observability",
  component: App,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  joinRoute,
  sessionRoute,
  sessionFightRoute,
  sessionReviewRoute,
  instructorRoute,
  instructorSessionRoute,
  instructorProjectorRoute,
  instructorAdminModelsRoute,
  instructorAdminPromptsRoute,
  instructorAdminProtectionRoute,
  instructorAdminObservabilityRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
