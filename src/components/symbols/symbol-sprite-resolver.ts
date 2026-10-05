import {
  FLAGS_SPRITE_COMPACT_ALIASES,
  FLAGS_SPRITE_IDS,
  type FlagsSpriteId,
} from "./flags-sprite-manifest";

type SymbolInput = string | null | undefined;

type SymbolIconSlot = "quote" | "base" | "single";

type SymbolIconEntry = {
  id: FlagsSpriteId;
  code: string;
  slot: SymbolIconSlot;
};

export type ResolvedSymbolIconLayout = {
  normalizedSymbol: string;
  icons: SymbolIconEntry[];
  fallbackLabel: string | null;
};

const SPRITE_ID_SET = new Set<string>(FLAGS_SPRITE_IDS);

const QUOTE_CODE_CANDIDATES = Array.from(
  new Set([
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CAD",
    "AUD",
    "NZD",
    "CHF",
    "CNY",
    "CNH",
    "HKD",
    "SGD",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "MXN",
    "ZAR",
    "TRY",
    "THB",
    "TWD",
    "SAR",
    "QAR",
    "KWD",
    "BHD",
    "OMR",
    "AED",
    "JOD",
    "EGP",
    "DZD",
    "MAD",
    "TND",
    "INR",
    "PKR",
    "BDT",
    "IDR",
    "MYR",
    "PHP",
    "KRW",
    "KZT",
    "UAH",
    "RON",
    "BGN",
    "HRK",
    "GEL",
    "AZN",
    "AMD",
    "KGS",
    "UZS",
    "TJS",
    "TMT",
    "RUB",
    "RUR",
    "ILS",
    "IQD",
    "LBP",
    "KES",
    "NGN",
    "GHS",
    "UGX",
    "CLP",
    "COP",
    "BRL",
    "ARS",
    "VND",
    "VUV",
    "XOF",
    "ISK",
    "NPR",
    "LKR",
    "BWP",
    "BND",
    "XAU",
    "XAG",
    "XPT",
    "XPD",
    "BTC",
    "ETH",
    "USDT",
    "USDC",
  ])
).sort((a, b) => b.length - a.length);

const normalizeToken = (value: SymbolInput): string =>
  typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

const compactSymbol = (value: string): string => value.trim().replace(/\s+/g, "").replace(/_/g, "");

const stripDecoratedSuffix = (value: string): string => value.replace(/[.\-][A-Z0-9]+$/i, "");

const stripBrokerLetterSuffix = (value: string): string =>
  value.length > 1 && /^[A-Z0-9]+M$/.test(value) ? value.slice(0, -1) : value;

const normalizeSymbolCode = (value: SymbolInput): string => {
  if (typeof value !== "string") {
    return "";
  }
  const compact = compactSymbol(value).toUpperCase();
  return stripBrokerLetterSuffix(stripDecoratedSuffix(compact));
};

const compactLookupKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const splitSymbol = (value: SymbolInput): { base: string | null; quote: string | null; cleaned: string } => {
  const normalized = typeof value === "string" ? value : "";
  const compact = compactSymbol(normalized);

  if (compact.includes("/")) {
    const [rawBase, rawQuote] = compact.split("/");
    const base = normalizeToken(rawBase ?? "");
    const quote = normalizeToken(rawQuote ?? "");
    return {
      base: base || null,
      quote: quote || null,
      cleaned: normalizeSymbolCode(normalized),
    };
  }

  const cleaned = normalizeSymbolCode(normalized);

  for (const quoteCandidate of QUOTE_CODE_CANDIDATES) {
    if (!cleaned.endsWith(quoteCandidate) || cleaned.length <= quoteCandidate.length) {
      continue;
    }

    const baseCandidate = cleaned.slice(0, cleaned.length - quoteCandidate.length);
    if (!/^[A-Z0-9]{2,10}$/.test(baseCandidate)) {
      continue;
    }

    return {
      base: baseCandidate,
      quote: quoteCandidate,
      cleaned,
    };
  }

  if (/^[A-Z]{6}$/.test(cleaned)) {
    return {
      base: cleaned.slice(0, 3),
      quote: cleaned.slice(3),
      cleaned,
    };
  }

  return {
    base: null,
    quote: null,
    cleaned,
  };
};

export const resolveSpriteId = (value: SymbolInput): FlagsSpriteId | null => {
  const normalized = normalizeToken(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (SPRITE_ID_SET.has(normalized)) {
    return normalized as FlagsSpriteId;
  }

  const compact = compactLookupKey(normalized);
  if (!compact) {
    return null;
  }

  if (SPRITE_ID_SET.has(compact)) {
    return compact as FlagsSpriteId;
  }

  const alias = FLAGS_SPRITE_COMPACT_ALIASES[compact];
  return alias ?? null;
};

export const normalizeSymbolKeyForTestId = (value: SymbolInput): string => {
  const normalized = normalizeToken(value);
  return normalized || "UNKNOWN";
};

const buildFallbackLabel = (value: string): string => {
  if (!value) {
    return "?";
  }
  return value.length > 8 ? value.slice(0, 8) : value;
};

export const resolveSymbolIconLayout = ({
  symbol,
  base,
  quote,
}: {
  symbol: SymbolInput;
  base?: SymbolInput;
  quote?: SymbolInput;
}): ResolvedSymbolIconLayout => {
  const parsed = splitSymbol(symbol);
  const baseCode = normalizeToken(base) || parsed.base;
  const quoteCode = normalizeToken(quote) || parsed.quote;

  const normalizedSymbol = normalizeSymbolKeyForTestId(symbol || `${baseCode ?? ""}${quoteCode ?? ""}`);

  if (baseCode && quoteCode) {
    const quoteId = resolveSpriteId(quoteCode);
    const baseId = resolveSpriteId(baseCode);

    if (quoteId && baseId) {
      return {
        normalizedSymbol,
        icons: [
          { id: baseId, code: baseCode, slot: "base" },
          { id: quoteId, code: quoteCode, slot: "quote" },
        ],
        fallbackLabel: null,
      };
    }
  }

  const fullSymbolCode = parsed.cleaned || normalizeToken(symbol) || `${baseCode ?? ""}${quoteCode ?? ""}`;
  const fullSymbolId = resolveSpriteId(fullSymbolCode);

  if (fullSymbolId) {
    return {
      normalizedSymbol,
      icons: [{ id: fullSymbolId, code: fullSymbolCode, slot: "single" }],
      fallbackLabel: null,
    };
  }

  return {
    normalizedSymbol,
    icons: [],
    fallbackLabel: buildFallbackLabel(fullSymbolCode || normalizedSymbol),
  };
};
