export type DashboardSymbolPriceTick = {
  s: string;
  t: number;
  b: number;
  a: number;
};

export type DashboardSymbolCalculationSpec = {
  contractSize?: number;
  profitCurrency?: string;
  accountCurrency?: string;
  conversionSymbol?: string;
  conversionMode?: 'DIRECT_ASK' | 'INVERSE_1_OVER_BID';
  digits?: number;
  pointSize?: number;
  tickSize?: number;
  tickValue?: number;
};

export type DashboardSymbolSpecMap = Record<string, DashboardSymbolCalculationSpec>;

export type DashboardSymbolSpecsPayload = {
  symbols?: DashboardSymbolSpecMap;
};

export type DashboardSymbolQuoteMap = Record<string, DashboardSymbolPriceTick>;

export type DashboardPriceOrderRecord = {
  symbol?: string;
  status?: string;
  side?: string;
  entryPrice?: number;
  volume?: number;
  profit?: number;
  netProfit?: number;
  commission?: number;
  swap?: number;
  currentPrice?: number;
  points?: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const normalizeDashboardSymbolPriceTick = (
  payload: unknown
): DashboardSymbolPriceTick | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (
    typeof record.s !== 'string' ||
    !isFiniteNumber(record.t) ||
    !isFiniteNumber(record.b) ||
    !isFiniteNumber(record.a)
  ) {
    return null;
  }
  return {
    s: record.s,
    t: record.t,
    b: record.b,
    a: record.a,
  };
};

export const mergeDashboardSymbolSpecs = (
  current: DashboardSymbolSpecMap,
  payload: unknown
): DashboardSymbolSpecMap => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return current;
  }
  const symbols = (payload as DashboardSymbolSpecsPayload).symbols;
  if (!symbols || typeof symbols !== 'object' || Array.isArray(symbols)) {
    return current;
  }
  return {
    ...current,
    ...symbols,
  };
};

const resolveCurrentPrice = (
  side: string | undefined,
  tick: DashboardSymbolPriceTick
): number => {
  const normalizedSide = side?.trim().toUpperCase();
  return normalizedSide === 'SELL' ? tick.a : tick.b;
};

const canCalculateLocalPnl = (spec: DashboardSymbolCalculationSpec | undefined) =>
  Boolean(
    spec &&
    isFiniteNumber(spec.contractSize) &&
    spec.contractSize > 0 &&
    spec.profitCurrency?.trim() &&
    spec.accountCurrency?.trim()
  );

const resolveConversionRate = (
  spec: DashboardSymbolCalculationSpec
): ((quotes: DashboardSymbolQuoteMap) => number | null) => {
  const profitCurrency = spec.profitCurrency?.trim().toUpperCase();
  const accountCurrency = spec.accountCurrency?.trim().toUpperCase();
  if (profitCurrency && accountCurrency && profitCurrency === accountCurrency) {
    return () => 1;
  }
  if (!spec.conversionSymbol || !spec.conversionMode) {
    return () => null;
  }
  return (quotes) => {
    const quote = quotes[spec.conversionSymbol!];
    if (!quote) {
      return null;
    }
    if (spec.conversionMode === 'DIRECT_ASK') {
      return isFiniteNumber(quote.a) && quote.a > 0 ? quote.a : null;
    }
    return isFiniteNumber(quote.b) && quote.b > 0 ? 1 / quote.b : null;
  };
};

const calculatePriceDiff = (
  side: string | undefined,
  entryPrice: number | undefined,
  currentPrice: number
): number | undefined => {
  const normalizedSide = side?.trim().toUpperCase();
  return normalizedSide === 'SELL' && isFiniteNumber(entryPrice)
    ? entryPrice - currentPrice
    : isFiniteNumber(entryPrice)
      ? currentPrice - entryPrice
      : undefined;
};

const calculatePnlFromBrokerFallback = <T extends DashboardPriceOrderRecord>(
  order: T,
  nextPriceDiff: number | undefined,
  volume: number | undefined
): Pick<DashboardPriceOrderRecord, 'profit' | 'netProfit'> | null => {
  if (
    nextPriceDiff === undefined ||
    !isFiniteNumber(volume) ||
    volume <= 0 ||
    !isFiniteNumber(order.currentPrice) ||
    !isFiniteNumber(order.profit)
  ) {
    return null;
  }

  const previousPriceDiff = calculatePriceDiff(order.side, order.entryPrice, order.currentPrice);
  if (previousPriceDiff === undefined || Math.abs(previousPriceDiff) < Number.EPSILON) {
    return null;
  }

  const multiplier = order.profit / (previousPriceDiff * volume);
  if (!isFiniteNumber(multiplier) || Math.abs(multiplier) < Number.EPSILON) {
    return null;
  }

  const profit = Number((nextPriceDiff * volume * multiplier).toFixed(2));
  const netAdjustment = isFiniteNumber(order.netProfit)
    ? order.netProfit - order.profit
    : (isFiniteNumber(order.commission) ? order.commission : 0) +
    (isFiniteNumber(order.swap) ? order.swap : 0);

  return {
    profit,
    netProfit: Number((profit + netAdjustment).toFixed(2)),
  };
};

export const calculateDashboardOrderPnl = <T extends DashboardPriceOrderRecord>(
  order: T,
  specs: DashboardSymbolSpecMap,
  quotes: DashboardSymbolQuoteMap
): T & { currentPrice: number; points?: number } => {
  const tick = order.symbol ? quotes[order.symbol] : undefined;
  if (!tick) {
    return order as T & { currentPrice: number; points?: number };
  }
  const currentPrice = resolveCurrentPrice(order.side, tick);
  const spec = order.symbol ? specs[order.symbol] : undefined;
  const entryPrice = order.entryPrice;
  const volume = order.volume;
  const priceDiff = calculatePriceDiff(order.side, entryPrice, currentPrice);
  const points =
    priceDiff !== undefined && isFiniteNumber(spec?.pointSize) && spec.pointSize > 0
      ? Number((priceDiff / spec.pointSize).toFixed(6))
      : undefined;

  const base = {
    ...order,
    currentPrice,
    ...(points !== undefined ? { points } : {}),
  };

  if (
    priceDiff === undefined ||
    !isFiniteNumber(volume) ||
    !spec ||
    !canCalculateLocalPnl(spec)
  ) {
    return {
      ...base,
      ...(calculatePnlFromBrokerFallback(order, priceDiff, volume) ?? {}),
    };
  }

  const conversionRate = resolveConversionRate(spec)(quotes);
  if (!isFiniteNumber(conversionRate) || conversionRate <= 0) {
    return {
      ...base,
      ...(calculatePnlFromBrokerFallback(order, priceDiff, volume) ?? {}),
    };
  }

  const pnl = Number((priceDiff * volume * spec.contractSize! * conversionRate).toFixed(2));
  const netAdjustment =
    (isFiniteNumber(order.commission) ? order.commission : 0) +
    (isFiniteNumber(order.swap) ? order.swap : 0);
  return {
    ...base,
    profit: pnl,
    netProfit: Number((pnl + netAdjustment).toFixed(2)),
  };
};

const calculateDashboardOrderPriceContext = <T extends DashboardPriceOrderRecord>(
  order: T,
  specs: DashboardSymbolSpecMap,
  quotes: DashboardSymbolQuoteMap
): T & { currentPrice: number; points?: number } => {
  const tick = order.symbol ? quotes[order.symbol] : undefined;
  if (!tick) {
    return order as T & { currentPrice: number; points?: number };
  }
  const currentPrice = resolveCurrentPrice(order.side, tick);
  const spec = order.symbol ? specs[order.symbol] : undefined;
  const entryPrice = order.entryPrice;
  const priceDiff = calculatePriceDiff(order.side, entryPrice, currentPrice);
  const points =
    priceDiff !== undefined && isFiniteNumber(spec?.pointSize) && spec.pointSize > 0
      ? Number((priceDiff / spec.pointSize).toFixed(6))
      : undefined;

  const { ...rest } = order;
  return {
    ...(rest as T),
    currentPrice,
    ...(points !== undefined ? { points } : {}),
  };
};

export const applyDashboardSymbolPrice = <T extends DashboardPriceOrderRecord>(
  orders: T[],
  tick: DashboardSymbolPriceTick,
  specs: DashboardSymbolSpecMap,
  quotes: DashboardSymbolQuoteMap
): T[] => {
  const nextQuotes =
    quotes[tick.s] === tick
      ? quotes
      : {
        ...quotes,
        [tick.s]: tick,
      };

  return orders.map((order) => {
    const status = order.status?.trim().toUpperCase();
    const spec = order.symbol ? specs[order.symbol] : undefined;
    const isRelevantTick =
      order.symbol === tick.s || spec?.conversionSymbol === tick.s;
    if (!isRelevantTick || (status !== 'OPEN' && status !== 'PENDING')) {
      return order;
    }
    if (status === 'PENDING') {
      if (order.symbol !== tick.s) {
        return order;
      }
      return calculateDashboardOrderPriceContext(order, specs, nextQuotes);
    }
    return calculateDashboardOrderPnl(order, specs, nextQuotes);
  });
};

export const applyDashboardSymbolPrices = <T extends DashboardPriceOrderRecord>(
  orders: T[],
  quotes: DashboardSymbolQuoteMap,
  specs: DashboardSymbolSpecMap
): T[] =>
  Object.values(quotes).reduce(
    (nextOrders, tick) => applyDashboardSymbolPrice(nextOrders, tick, specs, quotes),
    orders
  );
