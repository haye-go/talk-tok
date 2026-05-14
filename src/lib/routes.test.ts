import { describe, expect, it } from "vitest";
import { buildParticipantTabQuery, cleanRouteSegment, routeRegistry, routes } from "@/lib/routes";

describe("routes", () => {
  it("builds readable participant routes", () => {
    expect(routes.joinEntry()).toBe("/join");
    expect(routes.join("spark")).toBe("/join/SPARK");
    expect(routes.demoPersonas()).toBe("/demo/personas");
    expect(routes.session("ethics-ai-healthcare")).toBe("/session/ethics-ai-healthcare");
    expect(routes.sessionTab("ethics-ai-healthcare", "contribute")).toBe(
      "/session/ethics-ai-healthcare",
    );
    expect(routes.sessionTab("ethics-ai-healthcare", "explore")).toBe(
      "/session/ethics-ai-healthcare?tab=explore",
    );
    expect(routes.sessionFight("ethics-ai-healthcare", "liability-gap")).toBe(
      "/session/ethics-ai-healthcare/fight/liability-gap",
    );
    expect(routes.sessionReview("ethics-ai-healthcare")).toBe(
      "/session/ethics-ai-healthcare/review",
    );
  });

  it("builds readable instructor routes", () => {
    expect(routes.instructorSession("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare",
    );
    expect(routes.instructorSessionRoom("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare?tab=room",
    );
    expect(routes.instructorSessionRoom("ethics-ai-healthcare", { mode: "categories" })).toBe(
      "/instructor/session/ethics-ai-healthcare?tab=room&mode=categories",
    );
    expect(routes.instructorSessionSetup("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare?tab=setup",
    );
    expect(routes.instructorSessionReports("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare?tab=reports",
    );
    expect(routes.instructorProjector("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare/projector",
    );
    expect(routes.instructorAdminDemo()).toBe("/instructor/admin/demo");
  });

  it("trims accidental slashes from route segments", () => {
    expect(cleanRouteSegment("/ethics-ai-healthcare/")).toBe("ethics-ai-healthcare");
  });

  it("keeps participant tab query strings readable", () => {
    expect(buildParticipantTabQuery("contribute")).toBe("");
    expect(buildParticipantTabQuery("fight")).toBe("?tab=fight");
  });

  it("does not expose id-based param names in the route registry", () => {
    expect(routeRegistry.every((route) => !route.path.includes(":sessionId"))).toBe(true);
    expect(routeRegistry.every((route) => !route.path.includes(":fightId"))).toBe(true);
  });
});
