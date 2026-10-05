const DEFAULT_TRADE_PRICE_DIGITS = 5;
const MAX_TRADE_PRICE_DIGITS = 10;

const clampDigits = (value: number): number =>
  Math.max(0, Math.min(MAX_TRADE_PRICE_DIGITS, Math.trunc(value)));

export const normalizeTradePriceDigits = (value: unknown, fallback = DEFAULT_TRADE_PRICE_DIGITS): number => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return clampDigits(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return clampDigits(parsed);
    }
  }
  return clampDigits(fallback);
};

export const formatTradePrice = (
  value: number | undefined,
  options?: {
    locale?: string;
    priceDigits?: unknown;
    fallback?: string;
  }
): string => {
  const fallback = options?.fallback ?? "—";
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const locale = options?.locale ?? "en-US";
  const digits = normalizeTradePriceDigits(options?.priceDigits);
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return value.toFixed(digits);
  }
};

