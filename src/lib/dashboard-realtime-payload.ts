import { asRecord } from './socket-payload';
import {
  parseNotificationRealtimePayloadV1,
  type DashboardNotificationInvalidationV1,
} from '@tragram/types';

type RealtimeDashboardSummary = {
  balance?: number | null;
  equity?: number | null;
  pnl: number | null;
  realizedPnl: number | null;
  floatingPnl: number | null;
  pnlStatus?: 'SYNCING' | 'VERIFIED' | 'PARTIAL' | 'MISMATCH' | 'STALE' | 'ERROR';
  pnlAsOf?: string | null;
  pnlSource?: 'BROKER_REALIZATION_LEDGER' | 'LEGACY_TRADE_ROWS';
  unresolvedTrades?: number;
  pnlRevision?: number;
  brokerFloatingPnl?: number | null;
  snapshotAt?: string | number;
};

export type RealtimeNotificationCreated = DashboardNotificationInvalidationV1 & {
  mtAccountId: string | null;
};

export type DecodedRealtimeTransportEvent = {
  event: string;
  payload: unknown;
  /** Durable semantic identity, present on generation-2 lifecycle events. */
  eventId?: string;
  /** Monotonic aggregate revision used to reject stale redelivery. */
  sourceVersion?: number;
};

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const parseOptionalSourceVersion = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

const expandStatus = (value: unknown): string | undefined => {
  if (value === 'O') return 'open';
  if (value === 'P') return 'pending';
  if (value === 'C') return 'closed';
  return typeof value === 'string' ? value : undefined;
};

const expandSide = (value: unknown): string | undefined => {
  if (value === 'B') return 'BUY';
  if (value === 'S') return 'SELL';
  return typeof value === 'string' ? value : undefined;
};

const expandAction = (value: unknown): string | undefined => {
  if (value === 'n') return 'created';
  if (value === 'u') return 'updated';
  if (value === 'x') return 'closed';
  return typeof value === 'string' ? value : undefined;
};

const expandMetricFields = (record: Record<string, unknown>) => ({
  ...(typeof record.ms === 'string' ? { metricsScope: record.ms } : {}),
  ...(typeof record.ma === 'string' || record.ma === null ? { metricsAccountId: record.ma } : {}),
  ...(typeof record.mr === 'string' ? { metricsReasonCode: record.mr } : {}),
});

const expandCompactOrder = (value: unknown) => {
  const order = asRecord(value) ?? {};
  if (
    'id' in order ||
    'orderId' in order ||
    'ticketId' in order ||
    'takeProfitTargets' in order ||
    'marketHours' in order
  ) {
    return { ...order };
  }
  return {
    ...(typeof order.i === 'string' ? { id: order.i } : {}),
    ...(typeof order.oid === 'string' ? { orderId: order.oid } : {}),
    ...(typeof order.tk === 'string' ? { ticketId: order.tk } : {}),
    ...(typeof order.s === 'string' ? { symbol: order.s } : {}),
    ...(expandSide(order.sd) ? { side: expandSide(order.sd) } : {}),
    ...(typeof order.ot === 'string' ? { orderType: order.ot } : {}),
    ...(expandStatus(order.st) ? { status: expandStatus(order.st) } : {}),
    ...(parseOptionalNumber(order.ep) !== undefined ? { entryPrice: parseOptionalNumber(order.ep) } : {}),
    ...(parseOptionalNumber(order.cp) !== undefined ? { closePrice: parseOptionalNumber(order.cp) } : {}),
    ...(parseOptionalNumber(order.v) !== undefined ? { volume: parseOptionalNumber(order.v) } : {}),
    ...(parseOptionalNumber(order.ol) !== undefined ? { openLots: parseOptionalNumber(order.ol) } : {}),
    ...(parseOptionalNumber(order.sl) !== undefined ? { stopLoss: parseOptionalNumber(order.sl) } : {}),
    ...(typeof order.op === 'string' ? { openTime: order.op } : {}),
    ...(typeof order.cl === 'string' ? { closeTime: order.cl } : {}),
    ...(typeof order.cr === 'string' ? { closeReason: order.cr } : {}),
    ...(parseOptionalNumber(order.ctl) !== undefined ? { closeTpLevel: parseOptionalNumber(order.ctl) } : {}),
    ...(typeof order.ca === 'string' ? { createdAt: order.ca } : {}),
    ...(typeof order.ua === 'string' ? { updatedAt: order.ua } : {}),
    ...(parseOptionalNumber(order.p) !== undefined ? { profit: parseOptionalNumber(order.p) } : {}),
    ...(parseOptionalNumber(order.bp) !== undefined ? { brokerPnl: parseOptionalNumber(order.bp) } : {}),
    ...(parseOptionalNumber(order.ed) !== undefined
      ? { executionDelayMs: parseOptionalNumber(order.ed) }
      : {}),
  };
};

const expandCompactCounts = (value: unknown) => {
  const counts = asRecord(value) ?? {};
  return {
    open: parseOptionalNumber(counts.o) ?? 0,
    pending: parseOptionalNumber(counts.p) ?? 0,
    closed: parseOptionalNumber(counts.c) ?? 0,
  };
};

const expandCompactBreakdown = (value: unknown) => {
  const record = asRecord(value) ?? {};
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => {
      const item = asRecord(entry) ?? {};
      return [
        key,
        {
          count: parseOptionalNumber(item.c) ?? 0,
          netProfit: parseOptionalNumber(item.n) ?? 0,
        },
      ];
    })
  );
};

const expandCompactChannelStats = (value: unknown) => {
  const stats = asRecord(value) ?? {};
  if ('schemaVersion' in stats) {
    return stats;
  }

  const signals = asRecord(stats.sg) ?? {};
  const executions = asRecord(stats.ex) ?? {};
  const trades = asRecord(stats.tr) ?? {};
  const realized = asRecord(stats.rl) ?? {};
  const executionDelay = asRecord(stats.ed) ?? {};

  return {
    schemaVersion: 2,
    status: typeof stats.s === 'string' ? stats.s : 'STALE',
    calculatedAt: typeof stats.ca === 'string' || stats.ca === null ? stats.ca : null,
    staleAfter: typeof stats.sa === 'string' || stats.sa === null ? stats.sa : null,
    signals: {
      observed: parseOptionalNumber(signals.o) ?? 0,
      executedFinal: parseOptionalNumber(signals.e) ?? 0,
      superseded: parseOptionalNumber(signals.sp) ?? 0,
      cancelled: parseOptionalNumber(signals.c) ?? 0,
      failed: parseOptionalNumber(signals.f) ?? 0,
    },
    executions: {
      total: parseOptionalNumber(executions.t) ?? 0,
      executed: parseOptionalNumber(executions.e) ?? 0,
      rejectedPolicy: parseOptionalNumber(executions.rp) ?? 0,
      rejectedBroker: parseOptionalNumber(executions.rb) ?? 0,
      failed: parseOptionalNumber(executions.f) ?? 0,
      cancelled: parseOptionalNumber(executions.c) ?? 0,
    },
    trades: {
      opened: parseOptionalNumber(trades.o) ?? 0,
      open: parseOptionalNumber(trades.op) ?? 0,
      closed: parseOptionalNumber(trades.c) ?? 0,
      cancelled: parseOptionalNumber(trades.x) ?? 0,
      pendingExpired: parseOptionalNumber(trades.pe) ?? 0,
    },
    realized: {
      total: parseOptionalNumber(realized.t) ?? 0,
      wins: parseOptionalNumber(realized.w) ?? 0,
      losses: parseOptionalNumber(realized.l) ?? 0,
      breakeven: parseOptionalNumber(realized.b) ?? 0,
      grossProfit: parseOptionalNumber(realized.gp) ?? 0,
      grossLoss: parseOptionalNumber(realized.gl) ?? 0,
      netProfit: parseOptionalNumber(realized.n) ?? 0,
      profitFactor: parseOptionalNumber(realized.pf) ?? (realized.pf === null ? null : 0),
      winRate: parseOptionalNumber(realized.wr) ?? 0,
      averageWin: parseOptionalNumber(realized.aw) ?? 0,
      averageLoss: parseOptionalNumber(realized.al) ?? 0,
      byCloseReason: expandCompactBreakdown(realized.cr),
      bySource: expandCompactBreakdown(realized.bs),
    },
    executionDelay: {
      avgMs: parseOptionalNumber(executionDelay.a) ?? 0,
      samples: parseOptionalNumber(executionDelay.s) ?? 0,
      lastMs: parseOptionalNumber(executionDelay.l) ?? null,
    },
  };
};

const expandCompactChecklist = (value: unknown) => {
  const record = asRecord(value) ?? {};
  const steps = Array.isArray(record.s)
    ? record.s.flatMap((step) => {
        if (!Array.isArray(step) || typeof step[0] !== 'string') {
          return [];
        }
        return [
          {
            key: step[0],
            completed: step[1] === 1 || step[1] === true,
            ...(parseOptionalNumber(step[2]) !== undefined ? { count: parseOptionalNumber(step[2]) } : {}),
          },
        ];
      })
    : [];
  const completed = parseOptionalNumber(record.c);
  const total = parseOptionalNumber(record.t);
  return {
    steps,
    completed: completed ?? steps.filter((step) => step.completed).length,
    total: total ?? steps.length,
    isCompleted: record.d === 1 || record.d === true,
  };
};

export const decodeRealtimeTransportEvent = (
  payload: unknown
): DecodedRealtimeTransportEvent | null => {
  const record = asRecord(payload);
  if (!record || typeof record.e !== 'string') {
    return null;
  }
  const data = asRecord(record.d) ?? {};
  const snapshotAt = parseOptionalNumber(data.ts);

  switch (record.e) {
    case 'as':
      return {
        event: 'account:summary',
        payload: {
          ...(parseOptionalNumber(data.b) !== undefined ? { b: parseOptionalNumber(data.b) } : {}),
          ...(parseOptionalNumber(data.e) !== undefined ? { e: parseOptionalNumber(data.e) } : {}),
          ...(parseOptionalNumber(data.p) !== undefined ? { p: parseOptionalNumber(data.p) } : {}),
          ...(parseOptionalNumber(data.fp) !== undefined ? { fp: parseOptionalNumber(data.fp) } : {}),
          ...(typeof data.ps === 'string' ? { ps: data.ps } : {}),
          ...(typeof data.pa === 'string' ? { pa: data.pa } : {}),
          ...(typeof data.px === 'string' ? { px: data.px } : {}),
          ...(parseOptionalNumber(data.ut) !== undefined ? { ut: parseOptionalNumber(data.ut) } : {}),
          ...(parseOptionalNumber(data.rv) !== undefined ? { rv: parseOptionalNumber(data.rv) } : {}),
        },
      };
    case 'ak':
      return { event: 'account:checklist', payload: expandCompactChecklist(data) };
    case 'ok':
      return {
        event: 'orders:counts',
        payload: {
          ...(snapshotAt !== undefined ? { snapshotAt } : {}),
          counts: expandCompactCounts(data.c),
          ...expandMetricFields(data),
        },
      };
    case 'opg':
      return { event: 'orders:page', payload: record.d };
    case 'olc':
      return {
        event: 'orders:lifecycle',
        payload: {
          ...(snapshotAt !== undefined ? { snapshotAt } : {}),
          ...(expandAction(data.a) ? { action: expandAction(data.a) } : {}),
          ...(expandStatus(data.ps) ? { previousStatus: expandStatus(data.ps) } : {}),
          ...expandMetricFields(data),
          ...(data.sp ? { symbolPrices: data.sp } : {}),
          order: expandCompactOrder(data.o),
        },
      };
    case 'oc':
      return {
        event: 'order:created',
        payload: {
          ...(snapshotAt !== undefined ? { snapshotAt } : {}),
          action: 'created',
          ...(data.sp ? { symbolPrices: data.sp } : {}),
          order: expandCompactOrder(data.o),
        },
      };
    case 'spt':
      return { event: 'symbol:price', payload: record.d };
    case 'ssx':
      return { event: 'symbol:specs', payload: record.d };
    case 're':
      return { event: 'realtime:error', payload: record.d };
    case 'dn': {
      // Notification transport is deliberately identity-only. Reject legacy
      // copy-bearing or malformed payloads before they can reach dashboard
      // state; the authoritative title/count/timeline always comes from REST.
      const notification = normalizeRealtimeNotificationCreated(record.d);
      return notification
        ? { event: 'notification-created', payload: notification }
        : null;
    }
    case 'slc': {
      const lifecycle = asRecord(record.d) ?? {};
      const eventId =
        typeof record.eventId === 'string' && record.eventId.trim().length > 0
          ? record.eventId
          : typeof lifecycle.eventId === 'string' && lifecycle.eventId.trim().length > 0
            ? lifecycle.eventId
            : undefined;
      const sourceVersion = parseOptionalSourceVersion(record.sourceVersion ?? lifecycle.sourceVersion);
      return {
        event: 'signal-lifecycle',
        ...(eventId ? { eventId } : {}),
        ...(sourceVersion !== undefined ? { sourceVersion } : {}),
        payload: record.d,
      };
    }
    case 'cs': {
      const channel = asRecord(data.ch) ?? {};
      const performance = asRecord(data.pf) ?? {};
      const stats = asRecord(data.st);
      return {
        event: 'channel:summary',
        payload: {
          ...(snapshotAt !== undefined ? { snapshotAt } : {}),
          ...(typeof data.si === 'string' ? { subscriptionId: data.si } : {}),
          success: true,
          channel: {
            ...(typeof channel.i === 'string' ? { id: channel.i } : {}),
            ...(typeof channel.cid === 'string' ? { channelId: channel.cid } : {}),
            ...(typeof channel.t === 'string' ? { title: channel.t } : {}),
            ...(typeof channel.u === 'string' || channel.u === null ? { username: channel.u } : {}),
            ...(parseOptionalNumber(channel.m) !== undefined
              ? { members: parseOptionalNumber(channel.m) }
              : {}),
            ...(typeof channel.ph === 'string' || channel.ph === null ? { photoUrl: channel.ph } : {}),
          },
          performance: {
            ...(parseOptionalNumber(performance.v) !== undefined
              ? { value: parseOptionalNumber(performance.v) }
              : {}),
            ...(parseOptionalNumber(performance.f) !== undefined
              ? { financialResult: parseOptionalNumber(performance.f) }
              : parseOptionalNumber(performance.v) !== undefined
                ? { financialResult: parseOptionalNumber(performance.v) }
                : {}),
            ...(parseOptionalNumber(performance.r) !== undefined || performance.r === null
              ? { returnPercent: performance.r }
              : {}),
            ...(typeof performance.c === 'string' ? { currency: performance.c } : {}),
            ...(typeof performance.t === 'string' ? { trend: performance.t } : {}),
          },
          ...(stats
            ? {
                stats: expandCompactChannelStats(stats),
              }
            : {}),
        },
      };
    }
    case 'co':
      return {
        event: 'channel:orders',
        payload: {
          ...(snapshotAt !== undefined ? { snapshotAt } : {}),
          ...(typeof data.si === 'string' ? { subscriptionId: data.si } : {}),
          ...(expandStatus(data.st) ? { status: expandStatus(data.st) } : {}),
          ...(data.c ? { counts: expandCompactCounts(data.c) } : {}),
          ...(data.d ? { data: data.d } : {}),
        },
      };
    case 'ce':
      return { event: 'channel:error', payload: record.d };
    default:
      return null;
  }
};

export const normalizeRealtimeDashboardSummary = (
  payload: unknown
): RealtimeDashboardSummary | null => {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const compactBalance = parseOptionalNumber(record.b);
  const compactEquity = parseOptionalNumber(record.e);
  const compactPnl = parseOptionalNumber(record.p);
  const compactFloatingPnl = parseOptionalNumber(record.fp);
  const balance = compactBalance ?? parseOptionalNumber(record.balance);
  const equity = compactEquity ?? parseOptionalNumber(record.equity);
  const realizedPnl =
    parseOptionalNumber(record.realizedPnl) ?? compactPnl ?? parseOptionalNumber(record.pnl);
  const floatingPnl = compactFloatingPnl ?? parseOptionalNumber(record.floatingPnl);
  const brokerFloatingPnl = parseOptionalNumber(record.brokerFloatingPnl);
  const rawStatus = record.ps ?? record.pnlStatus;
  const pnlStatus =
    rawStatus === 'SYNCING' || rawStatus === 'VERIFIED' || rawStatus === 'PARTIAL' || rawStatus === 'MISMATCH' || rawStatus === 'STALE' || rawStatus === 'ERROR'
      ? rawStatus
      : undefined;
  const rawSource = record.px ?? record.pnlSource;
  const pnlSource =
    rawSource === 'BROKER_REALIZATION_LEDGER' || rawSource === 'LEGACY_TRADE_ROWS'
      ? rawSource
      : undefined;
  const rawAsOf = record.pa ?? record.pnlAsOf;
  const pnlAsOf = typeof rawAsOf === 'string' ? rawAsOf : null;
  const unresolvedTrades = parseOptionalNumber(record.ut ?? record.unresolvedTrades);
  const pnlRevision = parseOptionalNumber(record.rv ?? record.pnlRevision);
  if (
    balance === undefined &&
    equity === undefined &&
    realizedPnl === undefined &&
    floatingPnl === undefined &&
    brokerFloatingPnl === undefined &&
    pnlStatus === undefined &&
    unresolvedTrades === undefined &&
    pnlRevision === undefined
  ) {
    return null;
  }

  const snapshotAt =
    typeof record.snapshotAt === 'string' || typeof record.snapshotAt === 'number'
      ? record.snapshotAt
      : undefined;

  return {
    balance: balance ?? null,
    equity: equity ?? null,
    pnl: realizedPnl ?? null,
    realizedPnl: realizedPnl ?? null,
    floatingPnl: floatingPnl ?? null,
    ...(brokerFloatingPnl !== undefined ? { brokerFloatingPnl } : {}),
    ...(pnlStatus !== undefined ? { pnlStatus } : {}),
    ...(pnlSource !== undefined ? { pnlSource } : {}),
    ...(rawAsOf !== undefined ? { pnlAsOf } : {}),
    ...(unresolvedTrades !== undefined ? { unresolvedTrades } : {}),
    ...(pnlRevision !== undefined ? { pnlRevision } : {}),
    ...(snapshotAt !== undefined ? { snapshotAt } : {}),
  };
};

export const normalizeRealtimeNotificationCreated = (
  payload: unknown
): RealtimeNotificationCreated | null => {
  const parsed = parseNotificationRealtimePayloadV1(payload);
  if (!parsed.ok) return null;
  return {
    ...parsed.value,
    mtAccountId: parsed.value.k === 'm' ? parsed.value.m : null,
  };
};
