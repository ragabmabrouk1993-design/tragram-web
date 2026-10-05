import {
  normalizeSymbolKeyForTestId,
  resolveSpriteId,
  resolveSymbolIconLayout,
} from "./symbol-sprite-resolver";

describe("symbol sprite resolver", () => {
  test("resolves XAUUSD to base then quote icon ids", () => {
    const resolved = resolveSymbolIconLayout({ symbol: "XAUUSD" });

    expect(resolved.icons).toEqual([
      { id: "xau", code: "XAU", slot: "base" },
      { id: "usd", code: "USD", slot: "quote" },
    ]);
  });

  test("resolves BTCUSD to base then quote icon ids", () => {
    const resolved = resolveSymbolIconLayout({ symbol: "BTCUSD" });

    expect(resolved.icons).toEqual([
      { id: "btc", code: "BTC", slot: "base" },
      { id: "usd", code: "USD", slot: "quote" },
    ]);
  });

  test("uses full symbol fallback when leg icon is missing", () => {
    const resolved = resolveSymbolIconLayout({ symbol: "AAVEUSD" });

    expect(resolved.icons).toEqual([{ id: "aaveusd", code: "AAVEUSD", slot: "single" }]);
  });

  test("returns text fallback for unknown symbol", () => {
    const resolved = resolveSymbolIconLayout({ symbol: "UNKNOWNPAIR" });

    expect(resolved.icons).toEqual([]);
    expect(resolved.fallbackLabel).toBe("UNKNOWNP");
  });

  test("resolves compact underscore alias ids", () => {
    expect(resolveSpriteId("US30X10")).toBe("us30_x10");
    expect(resolveSpriteId("US500X100")).toBe("us500_x100");
    expect(resolveSpriteId("USTECX100")).toBe("ustec_x100");
  });

  test("normalizes test id symbol", () => {
    expect(normalizeSymbolKeyForTestId("XAU/USD.m")).toBe("XAUUSDM");
  });
});
