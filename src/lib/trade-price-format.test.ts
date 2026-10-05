import { formatTradePrice, normalizeTradePriceDigits } from "./trade-price-format";

describe("trade price formatting", () => {
  test("normalizes price digits safely", () => {
    expect(normalizeTradePriceDigits(5)).toBe(5);
    expect(normalizeTradePriceDigits("3")).toBe(3);
    expect(normalizeTradePriceDigits(-1)).toBe(5);
    expect(normalizeTradePriceDigits(undefined)).toBe(5);
  });

  test("formats EURUSD-style price with fixed broker digits", () => {
    expect(formatTradePrice(1.16052, { locale: "en-US", priceDigits: 5 })).toBe("1.16052");
  });

  test("formats XAUUSD-style price with 3 digits", () => {
    expect(formatTradePrice(5168.716, { locale: "en-US", priceDigits: 3 })).toBe("5,168.716");
  });

  test("formats BTCUSD-style price with 2 digits", () => {
    expect(formatTradePrice(68337.52, { locale: "en-US", priceDigits: 2 })).toBe("68,337.52");
  });
});

