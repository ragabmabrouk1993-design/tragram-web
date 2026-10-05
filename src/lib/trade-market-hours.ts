export type TradeMarketHours = {
  isTradeSessionOpen: boolean | null;
  reasonCode: 'TRADE_SESSION_OPEN' | 'TRADE_SESSION_CLOSED' | 'TRADE_SESSION_UNKNOWN';
  reasonMessage: string | null;
  nextOpenAt: string | null;
  nextCloseAt: string | null;
  checkedAt: string;
  source: 'MT5_SYMBOL_SESSIONS' | 'MT4_LIVE_QUOTE_FALLBACK';
};

const parseOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const parseOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeTradeMarketHours = (value: unknown): TradeMarketHours | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const reasonCode = parseOptionalString(record.reasonCode);
  const source = parseOptionalString(record.source);
  const checkedAt = parseOptionalString(record.checkedAt);
  if (
    (reasonCode !== 'TRADE_SESSION_OPEN' &&
      reasonCode !== 'TRADE_SESSION_CLOSED' &&
      reasonCode !== 'TRADE_SESSION_UNKNOWN') ||
    (source !== 'MT5_SYMBOL_SESSIONS' && source !== 'MT4_LIVE_QUOTE_FALLBACK') ||
    !checkedAt
  ) {
    return undefined;
  }

  return {
    isTradeSessionOpen: parseOptionalBoolean(record.isTradeSessionOpen),
    reasonCode,
    reasonMessage: parseOptionalString(record.reasonMessage),
    nextOpenAt: parseOptionalString(record.nextOpenAt),
    nextCloseAt: parseOptionalString(record.nextCloseAt),
    checkedAt,
    source,
  };
};

export const resolveEffectiveTradeMarketHours = (
  marketHours: TradeMarketHours | undefined,
  nowMs = Date.now()
): TradeMarketHours | undefined => {
  if (!marketHours) {
    return undefined;
  }

  const nextOpenMs = parseTimestamp(marketHours.nextOpenAt);
  const nextCloseMs = parseTimestamp(marketHours.nextCloseAt);

  if (marketHours.isTradeSessionOpen === true) {
    if (nextCloseMs !== null && nextCloseMs <= nowMs) {
      return {
        ...marketHours,
        isTradeSessionOpen: false,
        reasonCode: 'TRADE_SESSION_CLOSED',
        reasonMessage: 'Market is closed for trading.',
      };
    }
    return marketHours;
  }

  if (marketHours.isTradeSessionOpen === false) {
    if (nextOpenMs !== null && nextOpenMs <= nowMs && (nextCloseMs === null || nextCloseMs > nowMs)) {
      return {
        ...marketHours,
        isTradeSessionOpen: true,
        reasonCode: 'TRADE_SESSION_OPEN',
        reasonMessage: null,
      };
    }
  }

  return marketHours;
};

export const getTradeMarketHoursTransitionMs = (
  marketHours: TradeMarketHours | undefined,
  nowMs = Date.now()
): number | null => {
  const effective = resolveEffectiveTradeMarketHours(marketHours, nowMs);
  if (!effective) {
    return null;
  }

  const candidate =
    effective.isTradeSessionOpen === true ? effective.nextCloseAt : effective.nextOpenAt;
  const candidateMs = parseTimestamp(candidate);
  if (candidateMs === null || candidateMs <= nowMs) {
    return null;
  }

  return candidateMs;
};

export const isTradeActionBlockedByMarketHours = (
  marketHours: TradeMarketHours | undefined,
  nowMs = Date.now()
): boolean => resolveEffectiveTradeMarketHours(marketHours, nowMs)?.isTradeSessionOpen === false;
