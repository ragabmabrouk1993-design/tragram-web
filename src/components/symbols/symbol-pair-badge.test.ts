import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SymbolPairBadge } from "./symbol-pair-badge";

describe("SymbolPairBadge", () => {
  test("applies the requested size variant through the shared component", () => {
    const html = renderToStaticMarkup(
      createElement(SymbolPairBadge, { symbol: "EURUSD", size: "sm" })
    );

    expect(html).toContain("symbolPairBadgeRoot");
    expect(html).toContain("symbolPairBadgeSm");
  });

  test("defaults to the medium size variant", () => {
    const html = renderToStaticMarkup(createElement(SymbolPairBadge, { symbol: "EURUSD" }));

    expect(html).toContain("symbolPairBadgeRoot");
    expect(html).toContain("symbolPairBadgeMd");
  });
});
