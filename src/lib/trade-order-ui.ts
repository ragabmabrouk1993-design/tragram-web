export type TradeTakeProfitTargetStatus = 'TAKEN' | 'REMAINING' | 'NOT_ALLOCATED';

export type TradeTakeProfitTarget = {
  level: number;
  price: number;
  percentage: number | null;
  status: TradeTakeProfitTargetStatus;
};

type TradeCloseReason =
  | 'SL'
  | 'TP'
  | 'BREAKEVEN'
  | 'TRAILING_STOP'
  | 'MANUAL'
  | 'PENDING_EXPIRATION';

type CloseReasonLabels = {
  sl?: string;
  tp?: string;
  breakeven?: string;
  trailingStop?: string;
  manual?: string;
};

type TradeOrderTimelineInput = {
  status?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TradeOrderDateFormatOptions = {
  includeYear?: boolean;
  timeZone?: string;
};

const DATE_TIME_WITHOUT_TIME_ZONE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;
const DATE_TIME_WITH_TIME_ZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/i;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const toPositiveInt = (value: unknown): number | null => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    return null;
  }
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
};

const normalizeCloseReason = (value: unknown): TradeCloseReason | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (
    normalized === 'SL' ||
    normalized === 'TP' ||
    normalized === 'BREAKEVEN' ||
    normalized === 'BREAK_EVEN' ||
    normalized === 'TRAILING_STOP' ||
    normalized === 'TRAILINGSTOP' ||
    normalized === 'MANUAL' ||
    normalized === 'PENDING_EXPIRATION'
  ) {
    if (normalized === 'BREAK_EVEN') {
      return 'BREAKEVEN';
    }
    if (normalized === 'TRAILINGSTOP') {
      return 'TRAILING_STOP';
    }
    return normalized;
  }
  return null;
};

const normalizeTargetStatus = (value: unknown): TradeTakeProfitTargetStatus => {
  if (typeof value === 'string' && value.trim().toUpperCase() === 'TAKEN') {
    return 'TAKEN';
  }
  if (typeof value === 'string' && value.trim().toUpperCase() === 'NOT_ALLOCATED') {
    return 'NOT_ALLOCATED';
  }
  return 'REMAINING';
};

export const normalizeTradeTakeProfitTargets = (value: unknown): TradeTakeProfitTarget[] => {
  const source = Array.isArray(value) ? value : null;

  const normalizedFromTargets =
    source
      ?.map((item, index) => {
        const fallbackLevel = index + 1;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const price =
          toFiniteNumber(record.price) ??
          toFiniteNumber(record.value) ??
          toFiniteNumber(record.tp) ??
          toFiniteNumber(record.target);
        if (price === null) {
          return null;
        }

        return {
          level:
            toPositiveInt(record.level) ??
            toPositiveInt(record.tpLevel) ??
            toPositiveInt(record.targetLevel) ??
            fallbackLevel,
          price,
          percentage: toFiniteNumber(record.percentage),
          status: normalizeTargetStatus(record.status),
        };
      })
      .filter((item): item is TradeTakeProfitTarget => item !== null) ?? [];

  const deduped = new Map<number, TradeTakeProfitTarget>();
  for (const target of normalizedFromTargets) {
    if (!deduped.has(target.level)) {
      deduped.set(target.level, target);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => left.level - right.level);
};

export const normalizeTradeOrderTimestamp = (value: unknown): string | undefined => {
  const parsed = parseTradeOrderDate(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
};

export const parseTradeOrderDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : new Date(Number.NaN);
  }
  if (typeof value !== 'string') {
    return new Date(Number.NaN);
  }
  const normalized = value.trim();
  if (!normalized) {
    return new Date(Number.NaN);
  }
  const timestamp =
    DATE_TIME_WITHOUT_TIME_ZONE_PATTERN.test(normalized) &&
    !DATE_TIME_WITH_TIME_ZONE_PATTERN.test(normalized)
      ? `${normalized}Z`
      : normalized;
  return new Date(timestamp);
};

export const formatTradeOrderLocalDateTime = (
  value: Date | string | null | undefined,
  locale = 'en-US',
  options: TradeOrderDateFormatOptions = {}
): string => {
  if (!value) {
    return '—';
  }
  const date = parseTradeOrderDate(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    ...(options.includeYear === false ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
};

export const getTradeTakeProfitProgress = (targets: TradeTakeProfitTarget[]) => {
  const takenTargets = targets.filter((target) => target.status === 'TAKEN');
  const remainingTargets = targets.filter((target) => target.status === 'REMAINING');
  const notAllocatedTargets = targets.filter((target) => target.status === 'NOT_ALLOCATED');

  return {
    totalCount: targets.length,
    takenTargets,
    remainingTargets,
    notAllocatedTargets,
    takenCount: takenTargets.length,
    remainingCount: remainingTargets.length,
    notAllocatedCount: notAllocatedTargets.length,
  };
};

export const resolveTradeOrderRowTime = (
  trade: TradeOrderTimelineInput
): string | undefined => {
  const status = trade.status?.toLowerCase();

  if (status === 'closed' || status === 'cancelled') {
    return trade.closeTime ?? undefined;
  }

  if (status === 'pending') {
    return trade.createdAt ?? undefined;
  }

  return trade.openTime ?? undefined;
};

export const formatTradeTakeProfitTargets = (
  targets: TradeTakeProfitTarget[],
  status: TradeTakeProfitTargetStatus,
  formatPrice: (price: number) => string
): string => {
  const filtered = targets.filter((target) => target.status === status);
  if (filtered.length === 0) {
    return '—';
  }

  return filtered
    .map((target) => `TP${target.level} ${formatPrice(target.price)}`)
    .join(', ');
};

export const resolveTradeCloseReasonLabel = (input: {
  closeReason: unknown;
  closeTpLevel?: unknown;
  labels?: CloseReasonLabels;
}): string => {
  const reason = normalizeCloseReason(input.closeReason);
  const tpLevel = toPositiveInt(input.closeTpLevel);

  if (reason === 'SL') {
    return input.labels?.sl ?? 'SL';
  }
  if (reason === 'TP') {
    return tpLevel ? `TP${tpLevel}` : input.labels?.tp ?? 'TP';
  }
  if (reason === 'BREAKEVEN') {
    return input.labels?.breakeven ?? 'Break-even';
  }
  if (reason === 'TRAILING_STOP') {
    return input.labels?.trailingStop ?? 'Trailing stop';
  }
  if (reason === 'MANUAL') {
    return input.labels?.manual ?? 'Manual';
  }
  if (reason === 'PENDING_EXPIRATION') {
    return 'Deleted';
  }

  return '—';
};

export const resolveTradeCloseReasonBadge = (input: {
  closeReason: unknown;
  closeTpLevel?: unknown;
  labels?: CloseReasonLabels;
}): { tone: 'sl' | 'tp' | 'manual'; label: string } | null => {
  const reason = normalizeCloseReason(input.closeReason);
  const tpLevel = toPositiveInt(input.closeTpLevel);

  if (reason === 'SL') {
    return { tone: 'sl', label: 'SL' };
  }
  if (reason === 'TP') {
    return { tone: 'tp', label: tpLevel ? `TP${tpLevel}` : 'TP' };
  }
  if (reason === 'BREAKEVEN') {
    return { tone: 'sl', label: input.labels?.breakeven ?? 'Break-even' };
  }
  if (reason === 'TRAILING_STOP') {
    return { tone: 'sl', label: input.labels?.trailingStop ?? 'Trailing stop' };
  }
  if (reason === 'MANUAL') {
    return { tone: 'manual', label: input.labels?.manual ?? 'Manual' };
  }
  if (reason === 'PENDING_EXPIRATION') {
    return { tone: 'manual', label: 'Deleted' };
  }

  return null;
};
