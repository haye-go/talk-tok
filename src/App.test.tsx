import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("convex/react", () => ({
  useQuery: () => null,
}));

describe("App", () => {
  it("renders the setup checkpoint", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Live discussion intelligence foundation");
    expect(html).toContain("Join discussion");
    expect(html).toContain("Instructor dashboard");
  });
});
