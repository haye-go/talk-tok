import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the setup checkpoint", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Live discussion intelligence foundation");
    expect(html).toContain("Design-system shell ready");
  });
});
