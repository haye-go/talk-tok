import { describe, expect, it } from "vitest";
import { cleanRouteSegment, routeRegistry, routes } from "@/lib/routes";

describe("routes", () => {
  it("builds readable participant routes", () => {
    expect(routes.joinEntry()).toBe("/join");
    expect(routes.join("spark")).toBe("/join/SPARK");
    expect(routes.session("ethics-ai-healthcare")).toBe("/session/ethics-ai-healthcare");
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
    expect(routes.instructorProjector("ethics-ai-healthcare")).toBe(
      "/instructor/session/ethics-ai-healthcare/projector",
    );
  });

  it("trims accidental slashes from route segments", () => {
    expect(cleanRouteSegment("/ethics-ai-healthcare/")).toBe("ethics-ai-healthcare");
  });

  it("does not expose id-based param names in the route registry", () => {
    expect(routeRegistry.every((route) => !route.path.includes(":sessionId"))).toBe(true);
    expect(routeRegistry.every((route) => !route.path.includes(":fightId"))).toBe(true);
  });
});
