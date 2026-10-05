'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OrdersListRow } from '@/components/dashboard';
import { ChannelAvatar } from '@/components/channels';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { SymbolPairBadge } from '@/components/symbols';
import { localizePath, type Dictionary } from '@/lib/i18n';
import { createRealtimeSocket } from '@/lib/realtime-socket';
import { decodeRealtimeTransportEvent } from '@/lib/dashboard-realtime-payload';
import { parseSnapshotTimestamp } from '@/lib/socket-payload';
import {
  buildOrderIdentity,
  mergeRealtimeOrderPatch,
  normalizeSnapshotRowsPreservingOrder,
  resolveOrderBucketFromStatusAndType,
} from '@/lib/realtime-order-list';
import {
  applyDashboardSymbolPrice,
  applyDashboardSymbolPrices,
  mergeDashboardSymbolSpecs,
  normalizeDashboardSymbolPriceTick,
  type DashboardSymbolQuoteMap,
  type DashboardSymbolSpecMap,
} from '@/lib/dashboard-symbol-prices';
import {
  getTradeTakeProfitProgress,
  formatTradeOrderLocalDateTime,
  normalizeTradeOrderTimestamp,
  normalizeTradeTakeProfitTargets,
  resolveTradeOrderRowTime,
  resolveTradeCloseReasonBadge,
  type TradeTakeProfitTarget,
} from '@/lib/trade-order-ui';
import { formatTradePrice } from '@/lib/trade-price-format';
import { formatExecutionDuration } from '@/lib/execution-delay-format';
import { cn } from '@/lib/utils';
import { getErrorCode, getErrorMessage, getLocalizedErrorMessage } from '@/lib/error-utils';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import { getTradeActionErrorMessage } from '@/lib/trade-action-error';
import {
  channelsService,
  mergeChannelOrdersMarketHours,
  normalizeChannelOrdersPayload,
} from '@/services/channels.service';
import { BackButton } from '@/components/ui/back-button';
import { CloseOrderModal } from '@/components/dashboard';
import {
  postApiAuthRefresh,
  postApiTradesByIdClose,
  type AuthTokens,
} from '@/lib/api-client';
import { client } from '@/lib/api-client/client.gen';
import { resolveSocketBaseUrl } from '@/lib/realtime-socket';
import { toast } from 'react-hot-toast';
import {
  getTradeMarketHoursTransitionMs,
  isTradeActionBlockedByMarketHours,
  normalizeTradeMarketHours,
  resolveEffectiveTradeMarketHours,
  type TradeMarketHours,
} from '@/lib/trade-market-hours';
import { userService } from '@/services/user.service';
import {
  normalizeSubscriptionReadStatus,
  subscriptionPauseFallbackMessage,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { SubscriptionPausedNotice } from '@/components/subscription/subscription-paused-notice';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';

const timeRangeKeys = ['Week', 'Month', '3Month', 'Year', 'All'] as const;
type TimeRangeKey = (typeof timeRangeKeys)[number];
const CHANNEL_DETAIL_ORDERS_LIMIT = 10;
const MAX_CHART_AXIS_TICKS = 6;

const formatMembers = (value?: number | null, copy?: Dictionary['channelDetailPage']) => {
  if (!value || !copy) return '';
  if (value >= 1_000_000)
    return copy.members.millions.replace('{value}', (value / 1_000_000).toFixed(1));
  if (value >= 1_000) return copy.members.thousands.replace('{value}', (value / 1_000).toFixed(1));
  return `${value} ${copy.members.unit}`;
};

const formatMoney = (value: number, currency = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const normalizeOrdersStatus = (status?: string): string => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'open') return 'open';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'closed') return 'closed';
  return status ?? 'open';
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : undefined;
};

const parseOptionalNonNegativeInt = (value: unknown): number | undefined => {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  const normalized = Math.trunc(parsed);
  return normalized >= 0 ? normalized : undefined;
};

const parseOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

type ChannelOrderRecord = {
  id?: string;
  subscriptionId?: string;
  recordType?: string;
  parentTradeId?: string;
  tpExecutionId?: string;
  tpSliceId?: string;
  orderId?: string;
  ticketId?: string | null;
  symbol?: string;
  side?: string;
  volume?: number;
  orderType?: string;
  status?: string;
  entryPrice?: number;
  brokerOpenPrice?: number;
  currentPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  priceDigits?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  netProfit?: number;
  brokerPnl?: number;
  points?: number;
  executionDelayMs?: number;
  closeReason?: string;
  closeTpLevel?: number;
  takeProfitTargets: TradeTakeProfitTarget[];
  openTime?: string;
  closeTime?: string;
  createdAt?: string;
  updatedAt?: string;
  accountNumber?: string | null;
  accountPlatform?: string | null;
  marketHours?: TradeMarketHours;
};

const normalizeChannelOrderRecord = (value: unknown): ChannelOrderRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const takeProfitTargets = normalizeTradeTakeProfitTargets(record.takeProfitTargets);

  return {
    id: parseOptionalString(record.id),
    subscriptionId: parseOptionalString(record.subscriptionId),
    recordType: parseOptionalString(record.recordType),
    parentTradeId: parseOptionalString(record.parentTradeId),
    tpExecutionId: parseOptionalString(record.tpExecutionId),
    tpSliceId: parseOptionalString(record.tpSliceId),
    orderId: parseOptionalString(record.orderId),
    ticketId:
      parseOptionalString(record.ticketId) ??
      parseOptionalString(record.orderId) ??
      parseOptionalString(record.id) ??
      null,
    symbol: parseOptionalString(record.symbol),
    side: parseOptionalString(record.side)?.toUpperCase(),
    volume: parseOptionalNumber(record.volume),
    orderType: parseOptionalString(record.orderType)?.toUpperCase(),
    status: parseOptionalString(record.status)?.toLowerCase(),
    entryPrice: parseOptionalNumber(record.entryPrice),
    brokerOpenPrice: parseOptionalNumber(record.brokerOpenPrice),
    currentPrice: parseOptionalNumber(record.currentPrice),
    closePrice: parseOptionalNumber(record.closePrice),
    stopLoss: parseOptionalNumber(record.stopLoss),
    priceDigits: parseOptionalNonNegativeInt(record.priceDigits),
    profit: parseOptionalNumber(record.profit),
    commission: parseOptionalNumber(record.commission),
    swap: parseOptionalNumber(record.swap),
    netProfit: parseOptionalNumber(record.netProfit),
    brokerPnl: parseOptionalNumber(record.brokerPnl),
    points: parseOptionalNumber(record.points),
    executionDelayMs: parseOptionalNumber(record.executionDelayMs),
    closeReason: parseOptionalString(record.closeReason)?.toUpperCase(),
    closeTpLevel: parseOptionalPositiveInt(record.closeTpLevel),
    takeProfitTargets,
    openTime: normalizeTradeOrderTimestamp(record.openTime),
    closeTime: normalizeTradeOrderTimestamp(record.closeTime),
    createdAt: normalizeTradeOrderTimestamp(record.createdAt),
    updatedAt: normalizeTradeOrderTimestamp(record.updatedAt),
    accountNumber: parseOptionalString(record.accountNumber) ?? null,
    accountPlatform: parseOptionalString(record.accountPlatform) ?? null,
    marketHours: normalizeTradeMarketHours(record.marketHours),
  };
};

type ChannelOrderPatchPayload = {
  order: ChannelOrderRecord;
  previousStatus?: string | null;
  symbolPrices?: DashboardSymbolQuoteMap;
  snapshotAt?: string;
};

const normalizeChannelSymbolPrices = (payload: unknown): DashboardSymbolQuoteMap | undefined => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }
  const entries = Object.values(payload as Record<string, unknown>)
    .map((value) => normalizeDashboardSymbolPriceTick(value))
    .filter((tick): tick is NonNullable<ReturnType<typeof normalizeDashboardSymbolPriceTick>> =>
      Boolean(tick)
    )
    .map((tick) => [tick.s, tick] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const normalizeChannelOrderPatch = (payload: unknown): ChannelOrderPatchPayload | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const order = normalizeChannelOrderRecord(record.order);
  if (!order) {
    return null;
  }

  return {
    order,
    previousStatus:
      typeof record.previousStatus === 'string' ? record.previousStatus.toLowerCase() : undefined,
    symbolPrices: normalizeChannelSymbolPrices(record.symbolPrices),
    snapshotAt: typeof record.snapshotAt === 'string' ? record.snapshotAt : undefined,
  };
};

const mergeChannelLifecycleOrder = (
  existing: ChannelOrderRecord | undefined,
  update: ChannelOrderRecord
): ChannelOrderRecord => {
  if (!existing) {
    return update;
  }

  const next = { ...existing };
  const mergeKeys: Array<keyof ChannelOrderRecord> = [
    'id',
    'subscriptionId',
    'recordType',
    'parentTradeId',
    'tpExecutionId',
    'tpSliceId',
    'orderId',
    'ticketId',
    'symbol',
    'side',
    'volume',
    'orderType',
    'status',
    'entryPrice',
    'brokerOpenPrice',
    'currentPrice',
    'closePrice',
    'stopLoss',
    'priceDigits',
    'profit',
    'commission',
    'swap',
    'netProfit',
    'brokerPnl',
    'points',
    'closeReason',
    'closeTpLevel',
    'takeProfitTargets',
    'openTime',
    'closeTime',
    'createdAt',
    'updatedAt',
    'accountNumber',
    'accountPlatform',
    'marketHours',
  ];

  mergeKeys.forEach((key) => {
    const value = update[key];
    if (value !== undefined && value !== null) {
      (next as Record<string, unknown>)[key] = value;
    }
  });

  return next;
};

const hasStoredChannelOrderId = (order: ChannelOrderRecord): boolean =>
  typeof order.id === 'string' && order.id.trim().length > 0;

const formatOrderTime = (value?: string, lang = 'en-US'): string => {
  return formatTradeOrderLocalDateTime(value, lang, { includeYear: false });
};

const formatVolumeLabel = (value?: number, lang = 'en-US'): string =>
  value === undefined
    ? '—'
    : new Intl.NumberFormat(lang, {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(value);

const translateOrderType = (
  value: string | undefined,
  copy: Dictionary['dashboardPage']['orders']
): string => {
  switch (value?.toUpperCase()) {
    case 'MARKET':
      return copy.orderTypeValues.market;
    case 'LIMIT':
      return copy.orderTypeValues.limit;
    case 'STOP':
      return copy.orderTypeValues.stop;
    case 'STOP_LIMIT':
      return copy.orderTypeValues.stopLimit;
    default:
      return value ?? '—';
  }
};

const translateOrderStatus = (
  status: string | undefined,
  copy: Dictionary['channelDetailPage']['orders'],
  orderType?: string
): string => {
  switch (status?.toLowerCase()) {
    case 'open':
      return copy.statusValues.open;
    case 'pending':
      return orderType === 'MARKET' ? copy.statusValues.pending : copy.statusValues.limit;
    case 'closed':
      return copy.statusValues.closed;
    case 'cancelled':
      return copy.statusValues.cancelled;
    default:
      return status ?? '—';
  }
};

const translateSide = (
  side: string | undefined,
  copy: Dictionary['channelDetailPage']['orders']
): string => {
  switch (side?.toUpperCase()) {
    case 'BUY':
      return copy.sideValues.buy;
    case 'SELL':
      return copy.sideValues.sell;
    default:
      return side ?? '—';
  }
};

const translateCloseReason = (
  reason: string | undefined,
  tpLevel: number | undefined,
  copy: Dictionary['dashboardPage']['orders']['closeReasonValues']
): string => {
  switch (reason?.toUpperCase()) {
    case 'STOP_LOSS':
    case 'SL':
      return copy.sl;
    case 'TAKE_PROFIT':
    case 'TP':
      return tpLevel ? `${copy.tp} ${tpLevel}` : copy.tp;
    case 'MANUAL':
      return copy.manual;
    default:
      return '—';
  }
};

const resolveTopPrice = (trade: ChannelOrderRecord): number | undefined =>
  trade.status === 'open' || trade.status === 'pending'
    ? (trade.currentPrice ?? trade.entryPrice)
    : trade.entryPrice;

type PendingOrderAction = {
  order: ChannelOrderRecord;
  action: 'close' | 'delete';
};

type ChannelDetailPageProps = {
  params: Promise<{ subscriptionId: string }>;
};

const ChannelChartSkeleton = () => (
  <div className="channels-detail-chart-loading" aria-hidden="true">
    <div className="channels-detail-chart-loading-header">
      <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
      <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
    </div>
    <div className="channels-detail-skeleton-chart-surface">
      <div className="channels-detail-skeleton-chart-y-axis">
        {Array.from({ length: 4 }).map((_, idx) => (
          <span
            key={`channel-chart-y-axis-skeleton-${idx}`}
            className="channels-detail-skeleton-line channels-detail-skeleton-line-axis"
          />
        ))}
      </div>
      <div className="channels-detail-skeleton-chart-plot">
        <div className="channels-detail-skeleton-chart-grid" />
        <div className="channels-detail-skeleton-chart-zero-line" />
        <div className="channels-detail-skeleton-chart-bars">
          {Array.from({ length: 12 }).map((_, idx) => (
            <span
              key={`channel-chart-bar-skeleton-${idx}`}
              className="channels-detail-skeleton-chart-bar"
            />
          ))}
        </div>
        <div className="channels-detail-skeleton-chart-line" />
      </div>
      <div className="channels-detail-skeleton-chart-axis-row">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span
            key={`channel-chart-x-axis-skeleton-${idx}`}
            className="channels-detail-skeleton-line channels-detail-skeleton-line-axis"
          />
        ))}
      </div>
    </div>
    <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
  </div>
);

const ChannelDetailPageSkeleton = () => (
  <div className="channels-detail-skeleton" aria-hidden="true">
    <div className="channels-detail-header channels-detail-header-skeleton">
      <div className="channels-detail-header-skeleton-circle" />
      <div className="channels-detail-header-skeleton-meta">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
      </div>
      <div className="channels-detail-header-skeleton-circle" />
    </div>

    <div className="channels-detail-skeleton-overview">
      <div className="channels-detail-stats channels-detail-skeleton-stats">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={`channel-stat-skeleton-${idx}`}
            className="channels-detail-skeleton-card channels-detail-skeleton-kpi"
          >
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          </div>
        ))}
      </div>

      <div className="channels-detail-skeleton-card channels-detail-skeleton-tabs channels-detail-skeleton-selector">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`channel-tab-skeleton-${idx}`} className="channels-detail-skeleton-pill" />
        ))}
      </div>
    </div>

    <div className="channels-detail-skeleton-card channels-detail-skeleton-chart-card">
      <ChannelChartSkeleton />
    </div>

    <div className="channels-detail-orders channels-detail-skeleton-orders-section">
      <div className="channels-detail-orders-tabs channels-detail-skeleton-order-tabs">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`channel-orders-tab-skeleton-${idx}`}
            className="channels-detail-skeleton-pill"
          />
        ))}
      </div>

      <div className="channels-detail-orders-skeleton">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`channel-order-skeleton-${idx}`}
            className="channels-detail-skeleton-order-card"
          >
            <div className="channels-detail-skeleton-order-top">
              <div className="channels-detail-skeleton-order-identity">
                <div className="channels-detail-header-skeleton-circle channels-detail-skeleton-order-icon" />
                <div className="channels-detail-skeleton-order-copy">
                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-long" />
                </div>
              </div>

              <div className="channels-detail-skeleton-order-summary">
                <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function ChannelDetailPage({ params }: ChannelDetailPageProps) {
  const { subscriptionId } = use(params);
  const router = useRouter();
  const lang = useLocale();
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const intlMessages = useRouteMessages();
  const t = intlMessages.channelDetailPage;
  const dashboardOrdersT = intlMessages.dashboardPage.orders;
  const [activeRange, setActiveRange] = useState<TimeRangeKey>('Month');
  const orderTabs = useMemo(
    () => [
      { id: 'open', key: 'open' as const, label: t.orders.tabs.open },
      { id: 'pending', key: 'pending' as const, label: t.orders.tabs.limit },
      { id: 'closed', key: 'closed' as const, label: t.orders.tabs.closed },
    ],
    [t.orders.tabs]
  );
  const [activeOrdersTab, setActiveOrdersTab] = useState<string>('open');
  const [activeOrdersPage, setActiveOrdersPage] = useState(1);
  const [status, setStatus] = useState({ loading: true, error: false });
  const [subscriptionStatus, setSubscriptionStatus] = useState<NormalizedSubscriptionReadStatus>(
    normalizeSubscriptionReadStatus(null)
  );
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof channelsService.getChannelSummary>
  > | null>(null);
  const [chart, setChart] = useState<Awaited<
    ReturnType<typeof channelsService.getChannelChart>
  > | null>(null);
  const [orders, setOrders] = useState<Awaited<
    ReturnType<typeof channelsService.getChannelOrders>
  > | null>(null);
  const [chartState, setChartState] = useState({ loading: false, error: false });
  const [ordersState, setOrdersState] = useState({ loading: false, error: false });
  const [activeOrder, setActiveOrder] = useState<ChannelOrderRecord | null>(null);
  const [pendingOrderAction, setPendingOrderAction] = useState<PendingOrderAction | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [marketHoursNowMs, setMarketHoursNowMs] = useState(() => Date.now());
  const socketRef = useRef<Socket | null>(null);
  const activeRangeRef = useRef<TimeRangeKey>(activeRange);
  const activeOrdersTabRef = useRef<string>(activeOrdersTab);
  const activeOrdersPageRef = useRef<number>(activeOrdersPage);
  const summarySnapshotMsRef = useRef(0);
  const ordersSnapshotMsRef = useRef(0);
  const hasInitialSummaryRef = useRef(false);
  const trackedProfileSubscriptionRef = useRef<string | null>(null);
  const hasInitialOrdersRef = useRef(false);
  const ordersRef = useRef<Awaited<ReturnType<typeof channelsService.getChannelOrders>> | null>(null);
  const symbolSpecsRef = useRef<DashboardSymbolSpecMap>({});
  const symbolQuotesRef = useRef<DashboardSymbolQuoteMap>({});
  const symbolSpecsLoadedRef = useRef(false);
  const appliedOrderRealtimeKeysRef = useRef<Set<string>>(new Set());

  const refreshSocketAccessToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const refreshToken = window.localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await postApiAuthRefresh({
        body: { refreshToken },
        throwOnError: true,
      });
      const payload = response.data as { tokens?: AuthTokens };
      const nextToken = payload.tokens?.accessToken ?? null;
      const nextRefreshToken = payload.tokens?.refreshToken ?? null;
      if (nextToken) {
        window.localStorage.setItem('accessToken', nextToken);
      }
      if (nextRefreshToken) {
        window.localStorage.setItem('refreshToken', nextRefreshToken);
      }
      return nextToken;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const seedChannelSymbolPrices = useCallback((symbolPrices?: DashboardSymbolQuoteMap) => {
    if (!symbolPrices || Object.keys(symbolPrices).length === 0) {
      return;
    }
    symbolQuotesRef.current = {
      ...symbolQuotesRef.current,
      ...symbolPrices,
    };
  }, []);

  const applyCachedChannelSymbolPrices = useCallback(
    <T extends ChannelOrderRecord,>(rows: T[]): T[] =>
      applyDashboardSymbolPrices(rows, symbolQuotesRef.current, symbolSpecsRef.current),
    []
  );

  const recomputeChannelRowsFromCachedPrices = useCallback(() => {
    setOrders((current) =>
      current
        ? {
            ...current,
            orders: applyCachedChannelSymbolPrices(
              normalizeSnapshotRowsPreservingOrder(current.orders, normalizeChannelOrderRecord)
            ) as Array<Record<string, unknown>>,
          }
        : current
    );
    setActiveOrder((current) =>
      current ? applyCachedChannelSymbolPrices([current])[0] ?? current : current
    );
  }, [applyCachedChannelSymbolPrices]);

  const loadChannelSymbolSpecs = useCallback(async () => {
    if (symbolSpecsLoadedRef.current) {
      return;
    }
    try {
      const response = await userService.getDashboardSymbolSpecs();
      symbolSpecsRef.current = mergeDashboardSymbolSpecs(symbolSpecsRef.current, response);
      symbolSpecsLoadedRef.current = true;
      recomputeChannelRowsFromCachedPrices();
    } catch {
      symbolSpecsLoadedRef.current = false;
    }
  }, [recomputeChannelRowsFromCachedPrices]);

  const refreshChannelSymbolSpecsForMissingSymbols = useCallback(
    (symbols: Array<string | undefined>) => {
      const needsSpecs = symbols.some((symbol) => symbol && !symbolSpecsRef.current[symbol]);
      if (!needsSpecs) {
        return;
      }
      symbolSpecsLoadedRef.current = false;
      void loadChannelSymbolSpecs();
    },
    [loadChannelSymbolSpecs]
  );

  const emitChannelSubscription = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    socket.emit('channel:subscribe', {
      rt: 3,
      id: subscriptionId,
      r: activeRangeRef.current,
      ch: 0,
      io: 1,
      os: activeOrdersTabRef.current[0],
      op: activeOrdersPageRef.current,
      ol: CHANNEL_DETAIL_ORDERS_LIMIT,
    });
  }, [subscriptionId]);

  const resolveInitialStatus = useCallback(() => {
    if (hasInitialSummaryRef.current && hasInitialOrdersRef.current) {
      setStatus({ loading: false, error: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      hasInitialSummaryRef.current = false;
      hasInitialOrdersRef.current = false;
      setStatus({ loading: true, error: false });
      setChartState({ loading: true, error: false });
      setOrdersState({ loading: true, error: false });
      try {
        const [summaryResponse, chartResponse, ordersResponse] = await Promise.all([
          channelsService.getChannelSummary(subscriptionId),
          channelsService.getChannelChart(subscriptionId, activeRangeRef.current),
          channelsService.getChannelOrders(
            subscriptionId,
            activeOrdersTabRef.current,
            activeOrdersPageRef.current,
            CHANNEL_DETAIL_ORDERS_LIMIT
          ),
        ]);
        if (cancelled) return;
        hasInitialSummaryRef.current = true;
        hasInitialOrdersRef.current = true;
        const initialSymbolPrices = normalizeChannelSymbolPrices(ordersResponse.symbolPrices);
        seedChannelSymbolPrices(initialSymbolPrices);
        const pricedOrdersResponse = {
          ...ordersResponse,
          orders: applyCachedChannelSymbolPrices(
            normalizeSnapshotRowsPreservingOrder(ordersResponse.orders, normalizeChannelOrderRecord)
          ) as Array<Record<string, unknown>>,
        };
        setSummary(summaryResponse);
        if (trackedProfileSubscriptionRef.current !== subscriptionId) {
          trackedProfileSubscriptionRef.current = subscriptionId;
          trackAnalyticsEvent('channel_profile_viewed', {
            channel_id: summaryResponse.channel.channelId,
            subscription_id: subscriptionId,
            ...(typeof summaryResponse.performance.returnPercent === 'number'
              ? { return_percent: summaryResponse.performance.returnPercent }
              : {}),
            trend: summaryResponse.performance.trend,
          });
        }
        setSubscriptionStatus(normalizeSubscriptionReadStatus(summaryResponse));
        setChart(chartResponse);
        setOrders(pricedOrdersResponse);
        setStatus({ loading: false, error: false });
        setChartState({ loading: false, error: false });
        setOrdersState({ loading: false, error: false });
      } catch {
        if (!cancelled) {
          setStatus({ loading: false, error: true });
          setChartState({ loading: false, error: true });
          setOrdersState({ loading: false, error: true });
        }
      }
    };

    load();
    const symbolSpecsTimeout = window.setTimeout(() => {
      void loadChannelSymbolSpecs();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(symbolSpecsTimeout);
    };
  }, [applyCachedChannelSymbolPrices, loadChannelSymbolSpecs, seedChannelSymbolPrices, subscriptionId]);

  const title = summary?.channel?.title ?? 'Channel';
  const subtitle = useMemo(() => {
    if (!summary?.channel) return '';
    const username = summary.channel.username ? `@${summary.channel.username}` : '';
    const members = summary.channel.members ? formatMembers(summary.channel.members, t) : '';
    const fallback = !username && !members ? t.channelSubtitleFallback : '';
    return [username, members, fallback].filter(Boolean).join(' • ');
  }, [summary, t]);
  const headerVariant = summary?.channel?.photoUrl?.trim() ? 'is-hero' : 'is-compact';
  const chartData = useMemo(() => {
    let cumulative = 0;
    return (
      chart?.points?.map((point, index) => {
        cumulative += point.value;
        return {
          x: index,
          label: point.date,
          date: point.date,
          value: point.value,
          cumulative,
        };
      }) ?? []
    );
  }, [chart]);
  const chartTicks = useMemo(() => {
    if (!chartData.length) return [];
    if (chartData.length <= MAX_CHART_AXIS_TICKS) {
      return chartData.map((point) => point.x);
    }

    const lastIndex = chartData.length - 1;
    const tickIndexes = new Set<number>();
    for (let index = 0; index < MAX_CHART_AXIS_TICKS; index += 1) {
      tickIndexes.add(Math.round((index * lastIndex) / (MAX_CHART_AXIS_TICKS - 1)));
    }
    return Array.from(tickIndexes).sort((left, right) => left - right);
  }, [chartData]);
  const chartDomain = useMemo(() => {
    if (!chartData.length) return undefined;
    const values = chartData.flatMap((item) => [item.value, item.cumulative, 0]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const magnitude = Math.max(Math.abs(min), Math.abs(max));
    const padding = magnitude * 0.12 || 1;
    return [min - padding, max + padding];
  }, [chartData]);
  const normalizedOrders = useMemo(
    () => normalizeSnapshotRowsPreservingOrder(orders?.orders ?? [], normalizeChannelOrderRecord),
    [orders?.orders]
  );
  useEffect(() => {
    const candidates = [...normalizedOrders, ...(activeOrder ? [activeOrder] : [])];
    const nowMs = Math.max(Date.now(), marketHoursNowMs);
    const nextTransitionMs = candidates.reduce<number | null>((closest, order) => {
      const transitionMs = getTradeMarketHoursTransitionMs(order.marketHours, nowMs);
      if (transitionMs === null) {
        return closest;
      }
      return closest === null ? transitionMs : Math.min(closest, transitionMs);
    }, null);

    if (nextTransitionMs === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMarketHoursNowMs(Date.now());
    }, Math.max(0, nextTransitionMs - nowMs + 50));

    return () => window.clearTimeout(timeoutId);
  }, [activeOrder, marketHoursNowMs, normalizedOrders]);
  const ordersPagination = orders?.pagination ?? {
    page: activeOrdersPage,
    limit: CHANNEL_DETAIL_ORDERS_LIMIT,
    total: normalizedOrders.length,
    totalPages: normalizedOrders.length > 0 ? 1 : 0,
    hasMore: false,
  };
  const canGoToPreviousOrdersPage = ordersPagination.page > 1;
  const canGoToNextOrdersPage =
    ordersPagination.totalPages > 0 && ordersPagination.page < ordersPagination.totalPages;
  const selectedOrder = useMemo(() => {
    if (!activeOrder) {
      return null;
    }

    const activeOrderId = activeOrder.id;
    if (!activeOrderId) {
      return {
        ...activeOrder,
        marketHours: resolveEffectiveTradeMarketHours(activeOrder.marketHours, marketHoursNowMs),
      };
    }

    const resolvedOrder = normalizedOrders.find((order) => order.id === activeOrderId) ?? activeOrder;

    return {
      ...resolvedOrder,
      marketHours: resolveEffectiveTradeMarketHours(resolvedOrder.marketHours, marketHoursNowMs),
    };
  }, [activeOrder, marketHoursNowMs, normalizedOrders]);

  const formatAxisValue = (value: number) => {
    if (!summary?.performance?.currency) return `${value}`;
    try {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: summary.performance.currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${value}`;
    }
  };

  const formatTooltipValue = (value: number) => {
    return formatMoney(value, summary?.performance?.currency ?? 'USD', lang);
  };

  const formatDateLabel = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }).format(parsed);
  };
  const formatSignedPercent = (value: number | null | undefined, signReference = 0) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }

    const signSource = value === 0 ? signReference : value;
    const sign = signSource > 0 ? '+' : signSource < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
  };
  const formatChartTickLabel = (value: number) => {
    const point = chart?.points?.[value];
    if (!point) return '';
    return formatDateLabel(point.date);
  };

  const chartTone = (chart?.totalProfit ?? 0) >= 0 ? 'profit' : 'loss';
  const financialResultTone =
    summary?.performance.financialResult === undefined || summary.performance.financialResult === 0
      ? 'neutral'
      : summary.performance.financialResult > 0
        ? 'profit'
        : 'loss';
  const returnTone =
    summary?.performance.returnPercent === null || summary?.performance.returnPercent === undefined
      ? 'neutral'
      : (summary.performance.returnPercent === 0
            ? summary.performance.financialResult
            : summary.performance.returnPercent) > 0
        ? 'profit'
        : (summary.performance.returnPercent === 0
              ? summary.performance.financialResult
              : summary.performance.returnPercent) < 0
          ? 'loss'
          : 'neutral';
  const chartStyle = useMemo(
    () =>
      ({
        '--channels-chart-surface-glow':
          chartTone === 'profit' ? 'rgba(16, 185, 129, 0.11)' : 'rgba(239, 68, 68, 0.1)',
      }) as React.CSSProperties,
    [chartTone]
  );

  const selectedOrderPnl = selectedOrder
    ? (selectedOrder.brokerPnl ?? selectedOrder.netProfit ?? selectedOrder.profit)
    : undefined;
  const selectedOrderPnlTrend =
    selectedOrderPnl !== undefined
      ? selectedOrderPnl > 0
        ? 'up'
        : selectedOrderPnl < 0
          ? 'down'
          : 'flat'
      : null;
  const selectedOrderPnlLabel =
    selectedOrderPnl !== undefined
      ? `${selectedOrderPnl >= 0 ? '+' : '-'}${formatMoney(
          Math.abs(selectedOrderPnl),
          summary?.performance.currency ?? 'USD',
          lang
        )}`
      : null;
  const selectedOrderTopPrice = selectedOrder ? resolveTopPrice(selectedOrder) : undefined;
  const selectedOrderStatusLabel = translateOrderStatus(
    selectedOrder?.status,
    t.orders,
    selectedOrder?.orderType
  );
  const selectedOrderTypeLabel = translateOrderType(selectedOrder?.orderType, dashboardOrdersT);
  const selectedOrderSideLabel = translateSide(selectedOrder?.side, t.orders);
  const selectedOrderSideTone =
    selectedOrder?.side === 'BUY' ? 'buy' : selectedOrder?.side === 'SELL' ? 'sell' : 'neutral';
  const selectedOrderCloseReasonLabel = translateCloseReason(
    selectedOrder?.closeReason,
    selectedOrder?.closeTpLevel,
    dashboardOrdersT.closeReasonValues
  );
  const selectedOrderCloseReasonBadge = resolveTradeCloseReasonBadge({
    closeReason: selectedOrder?.closeReason,
    closeTpLevel: selectedOrder?.closeTpLevel,
    labels: t.orders.closeReasonValues,
  });
  const selectedOrderTakeProfitLabel = selectedOrder?.takeProfitTargets?.length
    ? selectedOrder.takeProfitTargets
        .map((target) =>
          formatTradePrice(target.price, {
            locale: lang,
            priceDigits: selectedOrder.priceDigits,
          })
        )
        .join(', ')
    : '—';
  const selectedOrderTakenTpLabel =
    selectedOrder?.takeProfitTargets
      ?.filter((target) => target.status === 'TAKEN')
      .map((target) =>
        formatTradePrice(target.price, {
          locale: lang,
          priceDigits: selectedOrder.priceDigits,
        })
      )
      .join(', ') || '—';
  const selectedOrderRemainingTpLabel =
    selectedOrder?.takeProfitTargets
      ?.filter((target) => target.status === 'REMAINING')
      .map((target) =>
        formatTradePrice(target.price, {
          locale: lang,
          priceDigits: selectedOrder.priceDigits,
        })
      )
      .join(', ') || '—';
  const selectedOrderNotAllocatedTpLabel =
    selectedOrder?.takeProfitTargets
      ?.filter((target) => target.status === 'NOT_ALLOCATED')
      .map((target) =>
        formatTradePrice(target.price, {
          locale: lang,
          priceDigits: selectedOrder.priceDigits,
        })
      )
      .join(', ') || '—';
  const selectedOrderAction =
    selectedOrder?.status === 'open'
      ? dashboardOrdersT.closeOrder
      : selectedOrder?.status === 'pending'
        ? dashboardOrdersT.deleteOrder
        : null;
  const selectedOrderActionBlocked =
    (selectedOrder?.status === 'open' || selectedOrder?.status === 'pending') &&
    isTradeActionBlockedByMarketHours(selectedOrder?.marketHours);
  const selectedOrderActionReason = selectedOrderActionBlocked
    ? selectedOrder?.marketHours?.reasonMessage ?? 'Trading hours are currently unavailable for this symbol.'
    : null;
  const selectedOrderTicket =
    selectedOrder?.ticketId ?? selectedOrder?.orderId ?? selectedOrder?.id ?? '—';
  const selectedOrderAccountLabel = selectedOrder?.accountNumber
    ? `#${selectedOrder.accountNumber}${selectedOrder.accountPlatform ? ` (${selectedOrder.accountPlatform})` : ''}`
    : (selectedOrder?.accountPlatform ?? '—');
  const selectedOrderExecutionDuration = formatExecutionDuration(
    selectedOrder?.executionDelayMs,
    lang
  );
  const selectedOrderExecutionSpeedLabel = selectedOrderExecutionDuration
    ? `${dashboardOrdersT.executionSpeedPrefix} ${selectedOrderExecutionDuration}`
    : null;
  const showCurrentPriceInModal =
    selectedOrder?.status === 'open' || selectedOrder?.status === 'pending';
  const showClosePriceInModal =
    selectedOrder?.status === 'closed' || selectedOrder?.status === 'cancelled';

  const requestOrderAction = useCallback((order: ChannelOrderRecord) => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    if (order.status !== 'open' && order.status !== 'pending') {
      return;
    }
    const effectiveMarketHours = resolveEffectiveTradeMarketHours(order.marketHours);
    if (isTradeActionBlockedByMarketHours(effectiveMarketHours)) {
      return;
    }
    setPendingOrderAction({
      order: {
        ...order,
        marketHours: effectiveMarketHours,
      },
      action: order.status === 'open' ? 'close' : 'delete',
    });
  }, [subscriptionStatus]);

  const handleConfirmOrderAction = useCallback(async () => {
    if (!pendingOrderAction || typeof window === 'undefined') {
      return;
    }

    const orderId = pendingOrderAction.order.id;
    if (!orderId) {
      toast.error('Order ID is missing.');
      setPendingOrderAction(null);
      return;
    }

    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Please log in again.');
      setPendingOrderAction(null);
      return;
    }

    setOrderActionLoading(true);
    const orderForAnalytics = pendingOrderAction.order;
    const orderIdForAnalytics = orderForAnalytics.ticketId ?? orderForAnalytics.orderId ?? orderId;
    const orderSymbol = orderForAnalytics.symbol;
    const orderSide = orderForAnalytics.side?.toUpperCase();
    if (pendingOrderAction.action === 'close' && orderSymbol && (orderSide === 'BUY' || orderSide === 'SELL')) {
      trackAnalyticsEvent('order_close_clicked', {
        order_id: orderIdForAnalytics,
        symbol: orderSymbol,
        side: orderSide,
        profit: typeof orderForAnalytics.profit === 'number' ? orderForAnalytics.profit : null,
      });
    }
    try {
      client.setConfig({
        baseURL: resolveSocketBaseUrl(),
      });
      const response = await postApiTradesByIdClose({
        auth: token,
        path: { id: orderId },
      });

      if ('error' in response) {
        throw Object.assign(new Error('Trade action failed.'), {
          response: { data: response.error },
        });
      }

      toast.success(
        pendingOrderAction.action === 'delete'
          ? dashboardOrdersT.deleteOrder
          : dashboardOrdersT.closeOrder
      );
      setPendingOrderAction(null);
      setActiveOrder(null);
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (pendingOrderAction.action === 'close') {
        trackAnalyticsEvent('order_close_failed', {
          order_id: orderIdForAnalytics,
          ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
        });
      }
      toast.error(getTradeActionErrorMessage(error, intlMessages, pendingOrderAction.action));
    } finally {
      setOrderActionLoading(false);
    }
  }, [dashboardOrdersT.closeOrder, dashboardOrdersT.deleteOrder, intlMessages, pendingOrderAction]);

  const loadOrdersPage = useCallback(
    async (tabId: string, page: number) => {
      try {
        const response = await channelsService.getChannelOrders(
          subscriptionId,
          tabId,
          page,
          CHANNEL_DETAIL_ORDERS_LIMIT
        );
        if (
          normalizeOrdersStatus(response.status) !==
            normalizeOrdersStatus(activeOrdersTabRef.current) ||
          activeOrdersPageRef.current !== page
        ) {
          return;
        }
        const symbolPrices = normalizeChannelSymbolPrices(response.symbolPrices);
        seedChannelSymbolPrices(symbolPrices);
        setOrders({
          ...response,
          orders: applyCachedChannelSymbolPrices(
            normalizeSnapshotRowsPreservingOrder(response.orders, normalizeChannelOrderRecord)
          ) as Array<Record<string, unknown>>,
        });
        setOrdersState({ loading: false, error: false });
      } catch {
        setOrdersState({ loading: false, error: true });
      }
    },
    [applyCachedChannelSymbolPrices, seedChannelSymbolPrices, subscriptionId]
  );

  const loadChannelChart = useCallback(
    async (range: TimeRangeKey) => {
      try {
        const response = await channelsService.getChannelChart(subscriptionId, range);
        if (range !== activeRangeRef.current) {
          return;
        }
        setChart(response);
        setChartState({ loading: false, error: false });
      } catch {
        if (range === activeRangeRef.current) {
          setChartState({ loading: false, error: true });
        }
      }
    },
    [subscriptionId]
  );

  const handleRangeChange = useCallback(
    (range: TimeRangeKey) => {
      if (range === activeRangeRef.current) {
        return;
      }

      activeRangeRef.current = range;
      setActiveRange(range);
      trackAnalyticsEvent('channel_chart_range_changed', { subscription_id: subscriptionId, range });
      setChartState({ loading: true, error: false });
      void loadChannelChart(range);
      emitChannelSubscription();
    },
    [emitChannelSubscription, loadChannelChart]
  );

  const handleOrdersTabChange = useCallback(
    (tabId: string) => {
      if (tabId === activeOrdersTabRef.current) {
        return;
      }

      activeOrdersTabRef.current = tabId;
      if (summary?.channel.channelId) {
        trackAnalyticsEvent('channel_orders_tab_changed', {
          channel_id: summary.channel.channelId,
          subscription_id: subscriptionId,
          tab: tabId,
        });
      }
      activeOrdersPageRef.current = 1;
      setActiveOrdersTab(tabId);
      setActiveOrdersPage(1);
      setOrdersState({ loading: true, error: false });
      void loadOrdersPage(tabId, 1);
      emitChannelSubscription();
    },
    [emitChannelSubscription, loadOrdersPage, subscriptionId, summary]
  );

  const handleOrdersPageChange = useCallback(
    (page: number) => {
      if (page === activeOrdersPageRef.current || page < 1) {
        return;
      }

      activeOrdersPageRef.current = page;
      setActiveOrdersPage(page);
      setOrdersState({ loading: true, error: false });
      void loadOrdersPage(activeOrdersTabRef.current, page);
      emitChannelSubscription();
    },
    [emitChannelSubscription, loadOrdersPage]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let authRetryUsed = false;

    const socket: Socket = createRealtimeSocket();
    socketRef.current = socket;
    summarySnapshotMsRef.current = 0;
    ordersSnapshotMsRef.current = 0;

    const connectSocket = async (forceRefresh = false) => {
      let token = forceRefresh ? null : window.localStorage.getItem('accessToken');
      if (!token) {
        token = await refreshSocketAccessToken();
      }
      if (!token || cancelled) {
        return;
      }

      socket.auth = { token };
      socket.connect();
    };

    const handleChannelSummary = (
      payload: { subscriptionId?: string } & Record<string, unknown>
    ) => {
      if (payload.subscriptionId && payload.subscriptionId !== subscriptionId) {
        return;
      }
      const snapshotTimestamp = parseSnapshotTimestamp(payload.snapshotAt);
      if (snapshotTimestamp !== null && snapshotTimestamp < summarySnapshotMsRef.current) {
        return;
      }
      if (snapshotTimestamp !== null) {
        summarySnapshotMsRef.current = snapshotTimestamp;
      }
      const summaryPayload = { ...payload };
      delete summaryPayload.subscriptionId;
      hasInitialSummaryRef.current = true;
      setSummary((current) => {
        const nextSummary = summaryPayload as Awaited<ReturnType<typeof channelsService.getChannelSummary>>;
        if (!current) {
          return nextSummary;
        }
        return {
          ...current,
          ...nextSummary,
          channel: {
            ...current.channel,
            ...(nextSummary.channel ?? {}),
          },
          performance: {
            ...current.performance,
            ...(nextSummary.performance ?? {}),
          },
          stats: nextSummary.stats ?? current.stats,
        };
      });
      resolveInitialStatus();
    };

    const handleChannelOrders = (
      payload: { subscriptionId?: string } & Record<string, unknown>
    ) => {
      if (payload.subscriptionId && payload.subscriptionId !== subscriptionId) {
        return;
      }
      const payloadStatus = typeof payload.status === 'string' ? payload.status : undefined;
      if (
        payloadStatus &&
        normalizeOrdersStatus(payloadStatus) !== normalizeOrdersStatus(activeOrdersTabRef.current)
      ) {
        return;
      }
      const payloadData =
        typeof payload.data === 'object' && payload.data !== null
          ? (payload.data as { pagination?: { page?: number } })
          : null;
      const payloadPagination = payloadData?.pagination ?? null;
      if (
        payloadPagination &&
        typeof payloadPagination.page === 'number' &&
        payloadPagination.page !== activeOrdersPageRef.current
      ) {
        return;
      }
      const snapshotTimestamp = parseSnapshotTimestamp(payload.snapshotAt);
      if (snapshotTimestamp !== null && snapshotTimestamp < ordersSnapshotMsRef.current) {
        return;
      }
      if (snapshotTimestamp !== null) {
        ordersSnapshotMsRef.current = snapshotTimestamp;
      }
      const ordersPayload = { ...payload };
      delete ordersPayload.subscriptionId;
      hasInitialOrdersRef.current = true;
      const nextOrders = normalizeChannelOrdersPayload(ordersPayload, {
        status: activeOrdersTabRef.current,
        page: activeOrdersPageRef.current,
        limit: CHANNEL_DETAIL_ORDERS_LIMIT,
      });
      const symbolPrices = normalizeChannelSymbolPrices(nextOrders.symbolPrices);
      seedChannelSymbolPrices(symbolPrices);
      const pricedOrders = {
        ...nextOrders,
        orders: applyCachedChannelSymbolPrices(
          normalizeSnapshotRowsPreservingOrder(nextOrders.orders, normalizeChannelOrderRecord)
        ) as Array<Record<string, unknown>>,
      };
      setOrders((current) => mergeChannelOrdersMarketHours(current, pricedOrders));
      setOrdersState({ loading: false, error: false });
      resolveInitialStatus();
    };

    const handleOrderLifecycle = (payload: unknown) => {
      const normalized = normalizeChannelOrderPatch(payload);
      if (!normalized) {
        return;
      }
      const orderKey =
        normalized.snapshotAt && buildOrderIdentity(normalized.order)
          ? `${buildOrderIdentity(normalized.order)}:${normalized.snapshotAt}`
          : null;
      if (orderKey && appliedOrderRealtimeKeysRef.current.has(orderKey)) {
        return;
      }

      const nextTimestamp = parseSnapshotTimestamp(normalized.snapshotAt) ?? Date.now();
      if (nextTimestamp < ordersSnapshotMsRef.current) {
        return;
      }
      if (orderKey) {
        appliedOrderRealtimeKeysRef.current.add(orderKey);
        if (appliedOrderRealtimeKeysRef.current.size > 100) {
          const firstKey = appliedOrderRealtimeKeysRef.current.values().next().value;
          if (firstKey) {
            appliedOrderRealtimeKeysRef.current.delete(firstKey);
          }
        }
      }
      ordersSnapshotMsRef.current = nextTimestamp;
      seedChannelSymbolPrices(normalized.symbolPrices);
      refreshChannelSymbolSpecsForMissingSymbols([normalized.order.symbol]);

      const activeBucket = normalizeOrdersStatus(activeOrdersTabRef.current) as
        | 'open'
        | 'pending'
        | 'closed';
      const activePage = activeOrdersPageRef.current;
      const currentOrders = ordersRef.current;
      const currentRows = normalizeSnapshotRowsPreservingOrder(
        currentOrders?.orders ?? [],
        normalizeChannelOrderRecord
      );
      const orderIdentity = buildOrderIdentity(normalized.order);
      const existingOrder = orderIdentity
        ? currentRows.find((order) => buildOrderIdentity(order) === orderIdentity)
        : undefined;
      const mergedOrder = mergeChannelLifecycleOrder(existingOrder, normalized.order);
      const nextOrder = applyCachedChannelSymbolPrices([mergedOrder])[0] ?? mergedOrder;
      const previousBucket = normalized.previousStatus
        ? resolveOrderBucketFromStatusAndType(normalized.previousStatus, nextOrder.orderType)
        : null;
      const currentCounts = currentOrders?.counts ?? { open: 0, pending: 0, closed: 0 };
      const baseSummary = {
        counts: currentCounts,
        lists: {
          open: activePage === 1 && activeBucket === 'open' ? currentRows : [],
          pending: activePage === 1 && activeBucket === 'pending' ? currentRows : [],
          closed: activePage === 1 && activeBucket === 'closed' ? currentRows : [],
        },
      };
      const merged = hasStoredChannelOrderId(nextOrder)
        ? mergeRealtimeOrderPatch(baseSummary, nextOrder, {
            previousStatus: previousBucket,
            limit: CHANNEL_DETAIL_ORDERS_LIMIT,
          })
        : baseSummary;

      setOrders((current) => {
        if (!current) {
          return current;
        }
        const total = merged.counts[activeBucket];
        return {
          ...current,
          counts: merged.counts,
          orders:
            activePage === 1
              ? (merged.lists[activeBucket].filter(hasStoredChannelOrderId) as Array<
                  Record<string, unknown>
                >)
              : current.orders,
          pagination: {
            ...current.pagination,
            total,
            totalPages: Math.ceil(total / CHANNEL_DETAIL_ORDERS_LIMIT),
            hasMore: total > current.pagination.page * CHANNEL_DETAIL_ORDERS_LIMIT,
          },
        };
      });
      setActiveOrder((current) => {
        if (!current || !orderIdentity || buildOrderIdentity(current) !== orderIdentity) {
          return current;
        }
        return nextOrder;
      });
    };

    const handleSymbolSpecs = (payload: unknown) => {
      symbolSpecsRef.current = mergeDashboardSymbolSpecs(symbolSpecsRef.current, payload);
      recomputeChannelRowsFromCachedPrices();
    };

    const handleSymbolPrice = (payload: unknown) => {
      const tick = normalizeDashboardSymbolPriceTick(payload);
      if (!tick) {
        return;
      }
      symbolQuotesRef.current = {
        ...symbolQuotesRef.current,
        [tick.s]: tick,
      };
      setOrders((current) =>
        current
          ? {
              ...current,
              orders: applyDashboardSymbolPrice(
                normalizeSnapshotRowsPreservingOrder(current.orders, normalizeChannelOrderRecord),
                tick,
                symbolSpecsRef.current,
                symbolQuotesRef.current
              ) as Array<Record<string, unknown>>,
            }
          : current
      );
      setActiveOrder((current) =>
        current
          ? applyDashboardSymbolPrice(
              [current],
              tick,
              symbolSpecsRef.current,
              symbolQuotesRef.current
            )[0] ?? current
          : current
      );
    };

    const handleChannelError = (payload: { subscriptionId?: string; message?: string }) => {
      if (payload.subscriptionId && payload.subscriptionId !== subscriptionId) {
        return;
      }
      hasInitialOrdersRef.current = true;
      setOrdersState((current) => ({ ...current, loading: false, error: true }));
      if (!hasInitialSummaryRef.current) {
        setStatus({ loading: false, error: true });
        return;
      }
      resolveInitialStatus();
    };

    const handleRealtimeTransport = (payload: unknown) => {
      const decoded = decodeRealtimeTransportEvent(payload);
      if (!decoded) {
        return;
      }
      switch (decoded.event) {
        case 'channel:summary':
          handleChannelSummary(decoded.payload as { subscriptionId?: string } & Record<string, unknown>);
          break;
        case 'channel:orders':
          handleChannelOrders(decoded.payload as { subscriptionId?: string } & Record<string, unknown>);
          break;
        case 'orders:lifecycle':
          handleOrderLifecycle(decoded.payload);
          break;
        case 'order:created':
          handleOrderLifecycle(decoded.payload);
          break;
        case 'symbol:specs':
          handleSymbolSpecs(decoded.payload);
          break;
        case 'symbol:price':
          handleSymbolPrice(decoded.payload);
          break;
        case 'channel:error':
          handleChannelError(decoded.payload as { subscriptionId?: string; message?: string });
          break;
      }
    };
    const handleCompactRealtimeEvent = (eventCode: string) => (payload: unknown) => {
      handleRealtimeTransport({ e: eventCode, d: payload });
    };
    const handleCompactChannelSummary = handleCompactRealtimeEvent('cs');
    const handleCompactChannelOrders = handleCompactRealtimeEvent('co');
    const handleCompactChannelError = handleCompactRealtimeEvent('ce');
    const handleCompactOrderLifecycle = handleCompactRealtimeEvent('olc');
    const handleCompactOrderCreated = handleCompactRealtimeEvent('oc');
    const handleCompactSymbolSpecs = handleCompactRealtimeEvent('ssx');
    const handleCompactSymbolPrice = handleCompactRealtimeEvent('spt');

    socket.on('connect', () => {
      authRetryUsed = false;
      emitChannelSubscription();
      socket.emit('orders:lifecycle:subscribe', { rt: 3, sc: 'ch', si: subscriptionId });
      socket.emit('symbol:prices:subscribe', { rt: 3, sc: 'ch', si: subscriptionId });
    });

    socket.on('cs', handleCompactChannelSummary);
    socket.on('co', handleCompactChannelOrders);
    socket.on('ce', handleCompactChannelError);
    socket.on('olc', handleCompactOrderLifecycle);
    socket.on('oc', handleCompactOrderCreated);
    socket.on('ssx', handleCompactSymbolSpecs);
    socket.on('spt', handleCompactSymbolPrice);

    socket.on('connect_error', async (error) => {
      if (cancelled) return;
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';
      const isAuthError = /auth|token|jwt/i.test(message);

      if (isAuthError && !authRetryUsed) {
        authRetryUsed = true;
        await connectSocket(true);
      }
    });

    void connectSocket();

    return () => {
      cancelled = true;
      socket.emit('channel:unsubscribe', subscriptionId);
      socket.emit('orders:lifecycle:unsubscribe');
      socket.emit('symbol:prices:unsubscribe');
      socket.off('cs', handleCompactChannelSummary);
      socket.off('co', handleCompactChannelOrders);
      socket.off('ce', handleCompactChannelError);
      socket.off('olc', handleCompactOrderLifecycle);
      socket.off('oc', handleCompactOrderCreated);
      socket.off('ssx', handleCompactSymbolSpecs);
      socket.off('spt', handleCompactSymbolPrice);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    applyCachedChannelSymbolPrices,
    emitChannelSubscription,
    recomputeChannelRowsFromCachedPrices,
    refreshChannelSymbolSpecsForMissingSymbols,
    refreshSocketAccessToken,
    resolveInitialStatus,
    seedChannelSymbolPrices,
    subscriptionId,
  ]);

  if (status.loading) {
    return (
      <div className="channels-detail-shell">
        <div className="channels-detail-layout">
          <div className="channels-detail">
            <ChannelDetailPageSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="channels-detail-shell">
      <div className="channels-detail-layout">
        <div className="channels-detail">
          <div className={cn('channels-detail-header', headerVariant)}>
            <BackButton className="channels-detail-back" onClick={() => router.back()} />
            <div className="channels-detail-meta">
              <ChannelAvatar
                imageUrl={summary?.channel?.photoUrl ?? null}
                className="channels-detail-avatar"
                imgClassName="channels-detail-avatar-img"
              />
              <div className="channels-detail-text">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              className="channels-detail-settings"
              onClick={() =>
                router.push(localizePath(lang, `/channels/${subscriptionId}/settings`))
              }
              aria-label={t.buttons.settings}
            >
              <Image
                src="/assets/channel-settings.svg"
                alt=""
                width={44}
                height={44}
                aria-hidden="true"
              />
            </button>
          </div>

          {!status.loading && status.error && <div className="channels-loading">{t.error}</div>}

          {!status.loading && !status.error && (
            <SubscriptionPausedNotice
              status={subscriptionStatus}
              href={localizePath(
                lang,
                billingDisabled ? '/auth/signup' : '/profile/subscription'
              )}
            />
          )}

          {!status.loading && !status.error && summary && (
            <div className="channels-detail-body">
              <div className="channels-detail-overview">
                <div className="channels-detail-stats">
                  <div className={cn('channels-detail-card', `is-${financialResultTone}`)}>
                    <span className="channels-detail-card-label">
                      <Image
                        src="/assets/channels/financial.svg"
                        alt=""
                        width={12}
                        height={11}
                        aria-hidden="true"
                      />
                      <span>{t.stats.financialResult}</span>
                    </span>
                    <strong>
                      {`${summary.performance.financialResult >= 0 ? '+' : '-'}${formatMoney(
                        Math.abs(summary.performance.financialResult),
                        summary.performance.currency,
                        lang
                      )}`}
                    </strong>
                  </div>
                  <div className={cn('channels-detail-card', `is-${returnTone}`)}>
                    <span className="channels-detail-card-label">
                      <Image
                        src="/assets/channels/return.svg"
                        alt=""
                        width={12}
                        height={12}
                        aria-hidden="true"
                      />
                      <span>{t.stats.return}</span>
                    </span>
                    <strong>
                      {summary.performance.returnPercent !== null
                        ? formatSignedPercent(
                            summary.performance.returnPercent,
                            summary.performance.financialResult
                          )
                        : '--'}
                    </strong>
                  </div>
                </div>

                <div className="channels-detail-tabs">
                  {timeRangeKeys.map((range) => {
                    const label =
                      range === 'Week'
                        ? t.timeRanges.week
                        : range === 'Month'
                          ? t.timeRanges.month
                          : range === '3Month'
                            ? t.timeRanges.threeMonths
                            : range === 'Year'
                              ? t.timeRanges.year
                              : t.timeRanges.all;
                    return (
                      <button
                        key={range}
                        type="button"
                        className={range === activeRange ? 'is-active' : undefined}
                        onClick={() => handleRangeChange(range)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="channels-detail-main">
                <div className="channels-detail-chart">
                  {chartState.loading ? (
                    <ChannelChartSkeleton />
                  ) : (
                    <>
                      <div className="channels-detail-chart-header">
                        <span>{t.chart.totalProfit}</span>
                        <strong className={chartTone === 'profit' ? 'is-profit' : 'is-loss'}>
                          {formatMoney(chart?.totalProfit ?? 0, summary.performance.currency, lang)}
                        </strong>
                      </div>
                      <div
                        className={cn(
                          'channels-detail-chart-body',
                          chartTone === 'profit' ? 'is-profit' : 'is-loss'
                        )}
                        style={chartStyle}
                      >
                        {chartState.error && (
                          <div className="channels-detail-chart-state">
                            <i className="fa-solid fa-chart-line" aria-hidden="true" />
                            <span>{t.chart.error}</span>
                          </div>
                        )}
                        {!chartState.error && chart?.points?.length ? (
                          <div className="channels-chart">
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              minWidth={0}
                              minHeight={0}
                            >
                              <ComposedChart
                                data={chartData}
                                margin={{ top: 16, right: 18, left: 4, bottom: 8 }}
                              >
                                <CartesianGrid
                                  vertical={false}
                                  stroke="var(--channels-chart-grid)"
                                  strokeDasharray="3 5"
                                />
                                <XAxis
                                  dataKey="x"
                                  type="number"
                                  axisLine={false}
                                  tickLine={false}
                                  ticks={chartTicks}
                                  domain={
                                    chartTicks.length
                                      ? [chartTicks[0], chartTicks[chartTicks.length - 1]]
                                      : undefined
                                  }
                                  tick={{ fill: 'var(--channels-chart-axis)', fontSize: 11 }}
                                  tickFormatter={formatChartTickLabel}
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: 'var(--channels-chart-axis)', fontSize: 11 }}
                                  tickFormatter={formatAxisValue}
                                  domain={chartDomain as [number, number] | undefined}
                                  width={48}
                                />
                                <ReferenceLine
                                  y={0}
                                  stroke="var(--channels-chart-zero)"
                                  strokeWidth={1.4}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const item = payload.find((entry) => entry.dataKey === 'value')
                                      ?.payload as {
                                      value: number;
                                      cumulative: number;
                                      date: string;
                                    };
                                    if (!item) return null;
                                    const isPositive = item.value >= 0;
                                    return (
                                      <div className="channels-chart-tooltip">
                                        <div className="channels-chart-tooltip-row">
                                          <span className="channels-chart-tooltip-tag">
                                            {t.chart.periodLabel}
                                          </span>
                                          <span
                                            className={cn(
                                              'channels-chart-tooltip-value',
                                              isPositive ? 'is-positive' : 'is-negative'
                                            )}
                                          >
                                            {formatTooltipValue(item.value)}
                                          </span>
                                        </div>
                                        <div className="channels-chart-tooltip-row">
                                          <span className="channels-chart-tooltip-tag">
                                            {t.chart.cumulativeLabel}
                                          </span>
                                          <span
                                            className={cn(
                                              'channels-chart-tooltip-value',
                                              item.cumulative >= 0 ? 'is-positive' : 'is-negative'
                                            )}
                                          >
                                            {formatTooltipValue(item.cumulative)}
                                          </span>
                                        </div>
                                        <span className="channels-chart-tooltip-date">
                                          {item.date}
                                        </span>
                                      </div>
                                    );
                                  }}
                                  cursor={{
                                    stroke: 'var(--channels-chart-cursor)',
                                    strokeWidth: 1,
                                  }}
                                />
                                <Bar
                                  dataKey="value"
                                  isAnimationActive={false}
                                  radius={[4, 4, 4, 4]}
                                  maxBarSize={34}
                                >
                                  {chartData.map((point) => (
                                    <Cell
                                      key={`channels-chart-bar-${point.x}`}
                                      fill={
                                        point.value >= 0
                                          ? 'var(--channels-chart-profit)'
                                          : 'var(--channels-chart-loss)'
                                      }
                                    />
                                  ))}
                                </Bar>
                                <Line
                                  type="monotone"
                                  dataKey="cumulative"
                                  stroke="var(--channels-chart-line)"
                                  strokeWidth={2.4}
                                  dot={false}
                                  activeDot={{
                                    r: 4,
                                    fill: 'var(--channels-chart-line)',
                                    stroke: 'var(--channels-chart-dot)',
                                    strokeWidth: 2,
                                  }}
                                  isAnimationActive={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="channels-detail-chart-state">
                            <i className="fa-regular fa-circle-xmark" aria-hidden="true" />
                            <span>{t.chart.empty}</span>
                          </div>
                        )}
                      </div>
                      <p>
                        {chart?.points?.length
                          ? t.chart.rangeSummary
                              .replace('{range}', chart.range)
                              .replace('{points}', String(chart.points.length))
                          : ' '}
                      </p>
                    </>
                  )}
                </div>

                <div className="channels-detail-orders">
                  {ordersState.loading ? (
                    <div className="channels-detail-skeleton-orders-section" aria-hidden="true">
                      <div className="channels-detail-orders-tabs channels-detail-skeleton-order-tabs">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div
                            key={`channel-orders-loading-tab-${idx}`}
                            className="channels-detail-skeleton-pill"
                          />
                        ))}
                      </div>
                      <div className="channels-detail-orders-skeleton">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div
                            key={`channel-orders-loading-${idx}`}
                            className="channels-detail-skeleton-order-card"
                          >
                            <div className="channels-detail-skeleton-order-top">
                              <div className="channels-detail-skeleton-order-identity">
                                <div className="channels-detail-header-skeleton-circle channels-detail-skeleton-order-icon" />
                                <div className="channels-detail-skeleton-order-copy">
                                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
                                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-long" />
                                </div>
                              </div>
                              <div className="channels-detail-skeleton-order-summary">
                                <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                                <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="channels-detail-orders-tabs">
                        {orderTabs.map((tab) => {
                          const count = orders?.counts?.[tab.key];
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              className={tab.id === activeOrdersTab ? 'is-active' : undefined}
                              onClick={() => handleOrdersTabChange(tab.id)}
                            >
                              {tab.label}
                              {typeof count === 'number' && <span> {count}</span>}
                            </button>
                          );
                        })}
                      </div>
                      <div className="channels-detail-orders-list">
                        {ordersState.error && (
                          <div className="channels-detail-orders-state">{t.orders.error}</div>
                        )}
                        {!ordersState.error && normalizedOrders.length === 0 && (
                          <div className="channels-detail-orders-state">{t.orders.empty}</div>
                        )}
                        {normalizedOrders.map((trade, index) => {
                          const profit =
                            trade.status === 'pending'
                              ? undefined
                              : (trade.brokerPnl ?? trade.netProfit ?? trade.profit);
                          const trend =
                            profit !== undefined
                              ? profit > 0
                                ? 'up'
                                : profit < 0
                                  ? 'down'
                                  : 'flat'
                              : 'flat';
                          const sideLabel =
                            trade.side === 'BUY'
                              ? t.orders.sideValues.buy
                              : trade.side === 'SELL'
                                ? t.orders.sideValues.sell
                                : (trade.side ?? '-');
                          const sideTone =
                            trade.side === 'BUY'
                              ? 'buy'
                              : trade.side === 'SELL'
                                ? 'sell'
                                : 'neutral';
                          const closeReasonBadge = resolveTradeCloseReasonBadge({
                            closeReason: trade.closeReason,
                            closeTpLevel: trade.closeTpLevel,
                            labels: t.orders.closeReasonValues,
                          });
                          const tpProgress = getTradeTakeProfitProgress(trade.takeProfitTargets);
                          const showTpProgress =
                            (trade.status === 'open' || trade.status === 'pending') &&
                            tpProgress.totalCount > 0;
                          const effectiveMarketHours = resolveEffectiveTradeMarketHours(
                            trade.marketHours
                          );
                          const marketHoursBlocked =
                            (trade.status === 'open' || trade.status === 'pending') &&
                            isTradeActionBlockedByMarketHours(effectiveMarketHours);
                          const marketHoursReason = marketHoursBlocked
                            ? effectiveMarketHours?.reasonMessage ??
                              'Trading hours are currently unavailable for this symbol.'
                            : null;
                          const activityTime = formatOrderTime(
                            resolveTradeOrderRowTime(trade),
                            lang
                          );
                          const orderMeta = trade.ticketId
                            ? `#${trade.ticketId}${activityTime !== '—' ? ` • ${activityTime}` : ''}`
                            : activityTime;
                          const orderStatus =
                            trade.status === 'open'
                              ? t.orders.statusValues.open
                              : trade.status === 'pending'
                                ? trade.orderType === 'MARKET'
                                  ? t.orders.statusValues.pending
                                  : t.orders.statusValues.limit
                                : trade.status === 'closed'
                                  ? t.orders.statusValues.closed
                                  : trade.status === 'cancelled'
                                    ? t.orders.statusValues.cancelled
                                    : (trade.status ?? '—');
                          const topPrice =
                            trade.status === 'open' || trade.status === 'pending'
                              ? (trade.currentPrice ?? trade.entryPrice)
                              : trade.entryPrice;

                          return (
                            <OrdersListRow
                              key={trade.id ?? `${trade.symbol ?? 'order'}-${index}`}
                              className="dashboard-home-order-card"
                              leading={
                                <SymbolPairBadge
                                  symbol={trade.symbol ?? ''}
                                  size="sm"
                                  className="dashboard-order-flag"
                                />
                              }
                              title={trade.symbol ?? '-'}
                              sideText={sideLabel}
                              sideTone={sideTone}
                              entryText={
                                trade.volume !== undefined
                                  ? `${trade.volume} ${t.orders.lotLabel} ${t.orders.atLabel} ${formatTradePrice(
                                      trade.entryPrice,
                                      {
                                        locale: lang,
                                        priceDigits: trade.priceDigits,
                                      }
                                    )}`
                                  : t.orders.volumePending
                              }
                              meta={orderMeta}
                              status={orderStatus}
                              amount={
                                topPrice !== undefined
                                  ? formatTradePrice(topPrice, {
                                      locale: lang,
                                      priceDigits: trade.priceDigits,
                                    })
                                  : undefined
                              }
                              pnl={
                                profit !== undefined
                                  ? `${profit >= 0 ? '+' : '-'}${formatMoney(
                                      Math.abs(profit),
                                      summary.performance.currency,
                                      lang
                                    )}`
                                  : undefined
                              }
                              pnlTrend={trend}
                              action={
                                (trade.status === 'closed' || trade.status === 'cancelled') &&
                                closeReasonBadge ? (
                                  <span
                                    className={cn(
                                      'dashboard-order-close-reason-badge',
                                      `is-${closeReasonBadge.tone}`
                                    )}
                                  >
                                    {closeReasonBadge.label}
                                  </span>
                                ) : marketHoursReason ? (
                                  <span className="dashboard-order-disabled-reason">
                                    {marketHoursReason}
                                  </span>
                                ) : showTpProgress ? (
                                  <span className="dashboard-order-tp-progress">
                                    <span className="dashboard-order-tp-pill is-taken">
                                      {t.orders.tpProgress.takenShort} {tpProgress.takenCount}
                                    </span>
                                    <span className="dashboard-order-tp-pill is-remaining">
                                      {t.orders.tpProgress.remainingShort}{' '}
                                      {tpProgress.remainingCount}
                                    </span>
                                    {tpProgress.notAllocatedCount > 0 && (
                                      <span className="dashboard-order-tp-pill is-not-allocated">
                                        {t.orders.tpProgress.notAllocatedShort}{' '}
                                        {tpProgress.notAllocatedCount}
                                      </span>
                                    )}
                                  </span>
                                ) : undefined
                              }
                              swipeActionLabel={
                                marketHoursBlocked
                                  ? undefined
                                  : trade.status === 'open'
                                    ? dashboardOrdersT.closeAction
                                    : trade.status === 'pending'
                                      ? dashboardOrdersT.deleteAction
                                      : undefined
                              }
                              swipeActionIcon={
                                marketHoursBlocked ? undefined : trade.status === 'open' ? (
                                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                                ) : trade.status === 'pending' ? (
                                  <i className="fa-solid fa-trash" aria-hidden="true" />
                                ) : undefined
                              }
                              onSwipeAction={() => requestOrderAction(trade)}
                              onClick={() => {
                                const side = trade.side?.toUpperCase();
                                const orderIdForAnalytics = trade.ticketId ?? trade.orderId ?? trade.id;
                                if (orderIdForAnalytics && trade.symbol && (side === 'BUY' || side === 'SELL')) {
                                  trackAnalyticsEvent('order_details_viewed', {
                                    order_id: orderIdForAnalytics,
                                    symbol: trade.symbol,
                                    side,
                                    status: trade.status ?? 'unknown',
                                    ...(summary?.channel.channelId ? { channel_id: summary.channel.channelId } : {}),
                                  });
                                }
                                setActiveOrder(trade);
                              }}
                            />
                          );
                        })}
                      </div>
                      {!ordersState.error && ordersPagination.totalPages > 1 && (
                        <div className="channels-detail-orders-pagination">
                          <button
                            type="button"
                            className="channels-detail-orders-pagination-button"
                            onClick={() => handleOrdersPageChange(ordersPagination.page - 1)}
                            disabled={!canGoToPreviousOrdersPage}
                          >
                            {t.orders.pagination.previous}
                          </button>
                          <span className="channels-detail-orders-pagination-label">
                            {t.orders.pagination.pageLabel
                              .replace('{page}', String(ordersPagination.page))
                              .replace('{total}', String(ordersPagination.totalPages))}
                          </span>
                          <button
                            type="button"
                            className="channels-detail-orders-pagination-button"
                            onClick={() => handleOrdersPageChange(ordersPagination.page + 1)}
                            disabled={!canGoToNextOrdersPage}
                          >
                            {t.orders.pagination.next}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="dashboard-sheet-backdrop" onClick={() => setActiveOrder(null)}>
          <div className="dashboard-order-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="dashboard-order-sheet-header">
              <div>
                <div className="dashboard-order-sheet-title-row">
                  <SymbolPairBadge
                    symbol={selectedOrder.symbol ?? ''}
                    size="sm"
                    className="dashboard-order-sheet-icon"
                  />
                  <p className="dashboard-order-sheet-title">
                    {selectedOrder.symbol ?? dashboardOrdersT.sheetFallback}
                  </p>
                </div>
                <p className="dashboard-order-sheet-subtitle">
                  {selectedOrderSideLabel}{' '}
                  {selectedOrder.volume !== undefined
                    ? `${formatVolumeLabel(selectedOrder.volume, lang)} ${dashboardOrdersT.lotLabel}`
                    : dashboardOrdersT.lotLabel}{' '}
                  {dashboardOrdersT.atLabel}{' '}
                  {formatTradePrice(selectedOrder.entryPrice, {
                    locale: lang,
                    priceDigits: selectedOrder.priceDigits,
                  })}
                </p>
                <div className="channels-detail-order-sheet-channel">
                  <ChannelAvatar
                    imageUrl={summary?.channel?.photoUrl ?? null}
                    className="channels-detail-order-sheet-channel-avatar"
                    imgClassName="channels-detail-order-sheet-channel-avatar-img"
                  />
                  <div className="channels-detail-order-sheet-channel-copy">
                    <p className="channels-detail-order-sheet-channel-title">{title}</p>
                    {subtitle ? (
                      <p className="channels-detail-order-sheet-channel-subtitle">{subtitle}</p>
                    ) : null}
                  </div>
                </div>
                <div className="dashboard-order-sheet-tags">
                  <span className="dashboard-order-sheet-tag">{selectedOrderStatusLabel}</span>
                  <span className={cn('dashboard-order-sheet-tag', `is-${selectedOrderSideTone}`)}>
                    {selectedOrderSideLabel}
                  </span>
                  <span className="dashboard-order-sheet-tag">{selectedOrderTypeLabel}</span>
                  {selectedOrderCloseReasonBadge && selectedOrderCloseReasonLabel !== '—' ? (
                    <span
                      className={cn(
                        'dashboard-order-sheet-tag',
                        'is-close-reason',
                        `is-close-${selectedOrderCloseReasonBadge.tone}`
                      )}
                    >
                      {selectedOrderCloseReasonLabel}
                    </span>
                  ) : null}
                  {selectedOrderExecutionSpeedLabel ? (
                    <span className="dashboard-order-sheet-tag is-execution-speed">
                      {selectedOrderExecutionSpeedLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="dashboard-order-sheet-side">
                <button
                  type="button"
                  className="dashboard-order-sheet-close"
                  aria-label={dashboardOrdersT.closeAction}
                  onClick={() => setActiveOrder(null)}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
                <div className="dashboard-order-sheet-header-summary">
                  <span
                    className={cn(
                      'dashboard-order-sheet-pnl-hero',
                      selectedOrderPnlTrend ? `is-${selectedOrderPnlTrend}` : undefined
                    )}
                  >
                    {selectedOrderPnlLabel ? (
                      <>
                        <i
                          className={cn(
                            'fa-solid',
                            selectedOrderPnlTrend === 'down'
                              ? 'fa-arrow-trend-down'
                              : selectedOrderPnlTrend === 'up'
                                ? 'fa-arrow-trend-up'
                                : 'fa-minus'
                          )}
                          aria-hidden="true"
                        />
                        {selectedOrderPnlLabel}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                  <span className="dashboard-order-sheet-amount">
                    {selectedOrderTopPrice !== undefined
                      ? formatTradePrice(selectedOrderTopPrice, {
                          locale: lang,
                          priceDigits: selectedOrder.priceDigits,
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="dashboard-order-sheet-grid">
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.ticketLabel}</p>
                <p className="dashboard-order-sheet-value">{selectedOrderTicket}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.accountLabel}</p>
                <p className="dashboard-order-sheet-value">{selectedOrderAccountLabel}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.channelLabel}</p>
                <p className="dashboard-order-sheet-value">{title}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.openTimeLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {formatOrderTime(selectedOrder.openTime ?? selectedOrder.createdAt, lang)}
                </p>
              </div>
              {selectedOrderExecutionSpeedLabel ? (
                <div>
                  <p className="dashboard-order-sheet-label">
                    {dashboardOrdersT.executionSpeedLabel}
                  </p>
                  <p className="dashboard-order-sheet-value">{selectedOrderExecutionSpeedLabel}</p>
                </div>
              ) : null}
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.closeTimeLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {formatOrderTime(selectedOrder.closeTime, lang)}
                </p>
              </div>
              {showCurrentPriceInModal ? (
                <div>
                  <p className="dashboard-order-sheet-label">
                    {dashboardOrdersT.currentPriceLabel}
                  </p>
                  <p className="dashboard-order-sheet-value">
                    {formatTradePrice(selectedOrder.currentPrice, {
                      locale: lang,
                      priceDigits: selectedOrder.priceDigits,
                    })}
                  </p>
                </div>
              ) : null}
              {showClosePriceInModal ? (
                <div>
                  <p className="dashboard-order-sheet-label">
                    {dashboardOrdersT.closePriceLabel}
                  </p>
                  <p className="dashboard-order-sheet-value">
                    {formatTradePrice(selectedOrder.closePrice ?? selectedOrder.currentPrice, {
                      locale: lang,
                      priceDigits: selectedOrder.priceDigits,
                    })}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.entryLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {formatTradePrice(selectedOrder.entryPrice, {
                    locale: lang,
                    priceDigits: selectedOrder.priceDigits,
                  })}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.stopLossLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {formatTradePrice(selectedOrder.stopLoss, {
                    locale: lang,
                    priceDigits: selectedOrder.priceDigits,
                  })}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.takeProfitLabel}</p>
                <p className="dashboard-order-sheet-value">{selectedOrderTakeProfitLabel}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.takenTpLabel}</p>
                <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-taken">
                  {selectedOrderTakenTpLabel}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.remainingTpLabel}</p>
                <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-remaining">
                  {selectedOrderRemainingTpLabel}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">
                  {dashboardOrdersT.notAllocatedTpLabel}
                </p>
                <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-not-allocated">
                  {selectedOrderNotAllocatedTpLabel}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.commissionLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {selectedOrder.commission !== undefined
                    ? formatMoney(
                        selectedOrder.commission,
                        summary?.performance.currency ?? 'USD',
                        lang
                      )
                    : '—'}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.swapLabel}</p>
                <p className="dashboard-order-sheet-value">
                  {selectedOrder.swap !== undefined
                    ? formatMoney(selectedOrder.swap, summary?.performance.currency ?? 'USD', lang)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{dashboardOrdersT.netPnlLabel}</p>
                <p
                  className={cn(
                    'dashboard-order-sheet-value',
                    selectedOrderPnlTrend
                      ? 'dashboard-order-pnl dashboard-order-sheet-pnl'
                      : undefined,
                    selectedOrderPnlTrend ? `is-${selectedOrderPnlTrend}` : undefined
                  )}
                >
                  {selectedOrderPnlLabel ? (
                    <>
                      <i
                        className={cn(
                          'fa-solid',
                          selectedOrderPnlTrend === 'down'
                            ? 'fa-arrow-trend-down'
                            : selectedOrderPnlTrend === 'up'
                              ? 'fa-arrow-trend-up'
                              : 'fa-minus'
                        )}
                        aria-hidden="true"
                      />
                      {selectedOrderPnlLabel}
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            {selectedOrderAction && (
              <>
                <button
                  type="button"
                  className="dashboard-order-sheet-action"
                  onClick={() => requestOrderAction(selectedOrder)}
                  disabled={selectedOrderActionBlocked}
                >
                  {selectedOrderAction}
                </button>
                {selectedOrderActionReason ? (
                  <p className="dashboard-order-sheet-action-reason">
                    {selectedOrderActionReason}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <CloseOrderModal
        open={Boolean(pendingOrderAction)}
        orderName={pendingOrderAction?.order.symbol ?? dashboardOrdersT.orderLabel}
        channelName={title}
        confirmLabel={
          pendingOrderAction?.action === 'delete'
            ? dashboardOrdersT.deleteOrder
            : dashboardOrdersT.closeOrder
        }
        cancelLabel={intlMessages.channelsPage.deleteConfirm.no}
        onConfirm={handleConfirmOrderAction}
        onClose={() => setPendingOrderAction(null)}
        isConfirming={orderActionLoading}
      />
    </div>
  );
}
