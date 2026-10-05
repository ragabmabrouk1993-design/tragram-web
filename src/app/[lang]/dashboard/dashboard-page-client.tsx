'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CountryCode } from 'libphonenumber-js';
import type { Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import {
  AccountMetaChips,
  BalanceSummary,
  ChecklistCard,
  ChecklistItemRow,
  CloseOrderModal,
  ConfirmMtAccountSwitchModal,
  DeleteMtAccountModal,
  GreetingHeader,
  IconButton,
  IntegrationCarousel,
  IntegrationCard,
  DashboardSkeleton,
  MtAccountSheetCard,
  OrdersEmptyState,
  OrderDetailsSheet,
  OrdersListRow,
  MtConnectSheet,
  NotificationsModal,
  QuickActionButton,
  SectionHeader,
  SegmentedTabs,
  TelegramConnectSheet,
  type DashboardNotificationThread,
} from '@/components/dashboard';
import { GlassCard } from '@/components/dashboard/glass-card';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { ChannelAvatar } from '@/components/channels';
import { SymbolPairBadge } from '@/components/symbols';
import { authService } from '@/services/auth.service';
import { connectionsService } from '@/services/connections.service';
import { notificationsService } from '@/services/notifications.service';
import { userService } from '@/services/user.service';
import { getErrorCode, getErrorMessage, getLocalizedErrorMessage } from '@/lib/error-utils';
import { getTradeActionErrorMessage } from '@/lib/trade-action-error';
import { createRealtimeSocket, resolveSocketBaseUrl } from '@/lib/realtime-socket';
import { asRecord, parseNonNegativeInt, parseSnapshotTimestamp } from '@/lib/socket-payload';
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
import {
  getApiUsersDashboardSummary,
  postApiTradesByIdClose,
  postApiAuthRefresh,
  type AuthTokens,
  type MtAccount,
  type User as ApiUser,
} from '@/lib/api-client';
import { client } from '@/lib/api-client/client.gen';
import { toast } from 'react-hot-toast';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import type { ChecklistItemKey } from '@/lib/analytics/types';
import { localizePath } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissTelegramReconnectToast } from '@/store/uiSlice';
import {
  mergeRealtimeOrderPatch,
  normalizeSnapshotRowsPreservingOrder,
  resolveOrderBucketFromStatusAndType,
} from '@/lib/realtime-order-list';
import {
  decodeRealtimeTransportEvent,
  normalizeRealtimeDashboardSummary,
  normalizeRealtimeNotificationCreated,
} from '@/lib/dashboard-realtime-payload';
import { createRealtimeEventDedupe } from '@/lib/realtime-event-dedupe';
import { decideDashboardRevision } from '@/lib/dashboard-resource-revisions';
import {
  createCoalescedDashboardRefresh,
  resolveDashboardRealtimeErrorAction,
} from '@/lib/dashboard-realtime-recovery';
import {
  createNotificationRefreshCoalescer,
  type NotificationRefreshCoalescer,
} from '@/lib/notification-refresh-coalescer';
import { buildDashboardChecklistItems, type DashboardChecklist } from '@/lib/dashboard-checklist';
import {
  getTradeMarketHoursTransitionMs,
  isTradeActionBlockedByMarketHours,
  normalizeTradeMarketHours,
  resolveEffectiveTradeMarketHours,
  type TradeMarketHours,
} from '@/lib/trade-market-hours';
import {
  applyDashboardSymbolPrice,
  applyDashboardSymbolPrices,
  mergeDashboardSymbolSpecs,
  normalizeDashboardSymbolPriceTick,
  type DashboardSymbolQuoteMap,
  type DashboardSymbolSpecMap,
} from '@/lib/dashboard-symbol-prices';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import {
  normalizeSubscriptionReadStatus,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { SubscriptionPausedNotice } from '@/components/subscription/subscription-paused-notice';

type TabKey = 'open' | 'pending' | 'closed';

type ProfileUser = ApiUser & { phoneNumber?: string };

type DashboardState = {
  mtAccounts: number;
  telegramConnected: boolean;
};

type DashboardSummary = {
  balance: number | null;
  equity: number | null;
  pnl: number | null;
  realizedPnl: number | null;
  floatingPnl: number | null;
  pnlStatus: 'SYNCING' | 'VERIFIED' | 'PARTIAL' | 'MISMATCH' | 'STALE' | 'ERROR';
  pnlAsOf: string | null;
  pnlSource?: 'BROKER_REALIZATION_LEDGER' | 'LEGACY_TRADE_ROWS';
  unresolvedTrades?: number;
  pnlRevision?: number;
  subscriptionPaused: boolean;
  subscriptionPauseReason: NormalizedSubscriptionReadStatus['subscriptionPauseReason'];
  subscriptionPauseMessage: string | null;
};

type DashboardOrderRecord = {
  id?: string;
  recordType?: string;
  parentTradeId?: string;
  tpExecutionId?: string;
  tpSliceId?: string;
  userId?: string;
  mtAccountId?: string;
  signalId?: string | null;
  orderId?: string;
  ticketId?: string | null;
  symbol?: string;
  side?: string;
  volume?: number;
  orderType?: string;
  entryPrice?: number;
  brokerOpenPrice?: number;
  currentPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  priceDigits?: number;
  takeProfitTargets?: TradeTakeProfitTarget[];
  status?: string;
  profit?: number;
  commission?: number;
  swap?: number;
  netProfit?: number;
  brokerPnl?: number;
  points?: number;
  executionDelayMs?: number;
  openTime?: string;
  closeTime?: string;
  closeReason?: string;
  closeTpLevel?: number;
  createdAt?: string;
  updatedAt?: string;
  accountNumber?: string | null;
  accountPlatform?: string | null;
  channelTitle?: string | null;
  channelUsername?: string | null;
  channelPhotoUrl?: string | null;
  marketHours?: TradeMarketHours;
};

type OrdersSummary = {
  counts: {
    open: number;
    pending: number;
    closed: number;
  };
  lists: {
    open: DashboardOrderRecord[];
    pending: DashboardOrderRecord[];
    closed: DashboardOrderRecord[];
  };
};

type OrdersCounts = {
  counts: OrdersSummary['counts'];
};

type OrdersPage = {
  status: string;
  counts: {
    open: number;
    pending: number;
    closed: number;
  };
  orders: DashboardOrderRecord[];
  symbolPrices?: DashboardSymbolQuoteMap;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

type SnapshotPayload<T> = T & {
  snapshotAt?: string;
};

type DashboardOrderPatchPayload = {
  action?: 'created' | 'updated' | 'closed';
  order: DashboardOrderRecord;
  previousStatus?: string | null;
  symbolPrices?: DashboardSymbolQuoteMap;
  snapshotAt?: string;
};

type OrderGroup = {
  key: string;
  label: string;
  items: DashboardOrderRecord[];
  totalPnl: number;
  channelPhotoUrl?: string | null;
};

const resolveOrderChannelLabel = (
  order: Pick<DashboardOrderRecord, 'channelTitle' | 'channelUsername'>,
  fallback: string
): string => order.channelTitle ?? order.channelUsername ?? fallback;

type DashboardViewStatus = {
  loading: boolean;
  error: boolean;
  subscriptionRequired: boolean;
};

const EMPTY_ORDERS_LIST: DashboardOrderRecord[] = [];
const DASHBOARD_ORDERS_PAGE_SIZE = 10;
const DASHBOARD_VISIBLE_REFRESH_STALE_MS = 30_000;
const NOTIFICATIONS_PAGE_SIZE = 20;
const SUBSCRIPTION_ERROR_CODES = new Set([
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_FEATURE_UNAVAILABLE',
]);
const localeMap: Record<string, string> = {
  en: 'en-US',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  ar: 'ar',
  'ar-EG': 'ar-EG',
  'ar-SA': 'ar-SA',
  fr: 'fr-FR',
  'fr-FR': 'fr-FR',
  de: 'de-DE',
  'de-DE': 'de-DE',
  es: 'es-ES',
  'es-ES': 'es-ES',
  it: 'it-IT',
  'it-IT': 'it-IT',
  pt: 'pt-PT',
  'pt-BR': 'pt-BR',
  ru: 'ru-RU',
  'ru-RU': 'ru-RU',
  tr: 'tr-TR',
  'tr-TR': 'tr-TR',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja-JP',
  'ja-JP': 'ja-JP',
  ko: 'ko-KR',
  'ko-KR': 'ko-KR',
  nl: 'nl-NL',
  'nl-NL': 'nl-NL',
  sv: 'sv-SE',
  'sv-SE': 'sv-SE',
  no: 'nb-NO',
  'nb-NO': 'nb-NO',
  da: 'da-DK',
  'da-DK': 'da-DK',
  fi: 'fi-FI',
  'fi-FI': 'fi-FI',
  hi: 'hi-IN',
  'hi-IN': 'hi-IN',
};

const resolveIntlLocale = (lang: string): string => localeMap[lang] ?? lang ?? 'en-US';

const isSubscriptionAccessError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  return typeof code === 'string' && SUBSCRIPTION_ERROR_CODES.has(code);
};

const isSelectedMtAccount = (account: MtAccount): boolean => {
  const alias = (account as MtAccount & { isSelected?: boolean | null }).isSelected;
  return typeof alias === 'boolean' ? alias : Boolean(account.isPrimary);
};

const formatMoney = (value: number, currency?: string | null, locale = 'en-US'): string => {
  const amount = Number.isFinite(value) ? value : 0;
  if (currency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency}${amount.toFixed(2)}`;
    }
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDeltaPercent = (pnl: number, balance: number): string => {
  if (!balance) return '0.00%';
  const percent = (pnl / balance) * 100;
  return `${percent.toFixed(2)}%`;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const resolveAccountCardMetrics = (
  account: MtAccount
): {
  amount: number | null;
  pnl: number | null;
  currency: string | null;
} => {
  const metricsVisible =
    (account as MtAccount & { metricsVisible?: boolean }).metricsVisible !== false;
  if (!metricsVisible) {
    return {
      amount: null,
      pnl: null,
      currency: account.currency ?? null,
    };
  }

  return {
    amount: account.balance ?? null,
    pnl: account.tragramClosedPnl ?? null,
    currency: account.currency ?? null,
  };
};

const CloseOrderActionIcon = () => (
  <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path
      d="M10.833 4.167L4.167 10.833M4.167 4.167L10.833 10.833M15 7.5C15 11.642 11.642 15 7.5 15C3.358 15 0 11.642 0 7.5C0 3.358 3.358 0 7.5 0C11.642 0 15 3.358 15 7.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DeleteOrderActionIcon = () => (
  <svg viewBox="0 0 14 15" fill="none" aria-hidden="true">
    <path
      d="M8.333 5.417C8.333 5.417 8.75 6.25 8.75 7.917C8.75 9.583 8.333 10.417 8.333 10.417M5 5.417C5 5.417 4.583 6.25 4.583 7.917C4.583 9.583 5 10.417 5 10.417M1.667 2.5C1.667 7.382 0.526 14.167 6.667 14.167C12.808 14.167 11.667 7.382 11.667 2.5M0 2.5H13.334M9.167 2.5V1.667C9.167 0.188 7.803 0 6.667 0C5.531 0 4.167 0.188 4.167 1.667V2.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type OrdersCopy = {
  sideValues: { buy: string; sell: string };
  orderTypeValues: { market: string; limit: string; stop: string; stopLimit: string };
  statusValues: { open: string; pending: string; closed: string; cancelled: string; limit: string };
};

const translateSide = (side: string | undefined, ordersCopy: OrdersCopy) => {
  const normalized = side?.toUpperCase();
  if (normalized === 'BUY') return ordersCopy.sideValues.buy;
  if (normalized === 'SELL') return ordersCopy.sideValues.sell;
  return side ?? '';
};

const translateOrderStatus = (
  status: string | undefined,
  ordersCopy: OrdersCopy,
  orderType?: string
): string => {
  const normalized = status?.toLowerCase();
  const normalizedType = orderType?.toUpperCase();
  if (normalized === 'open') return ordersCopy.statusValues.open;
  if (normalized === 'pending') {
    return normalizedType === 'MARKET'
      ? ordersCopy.statusValues.pending
      : ordersCopy.statusValues.limit;
  }
  if (normalized === 'closed') return ordersCopy.statusValues.closed;
  if (normalized === 'cancelled') return ordersCopy.statusValues.cancelled;
  return status ?? '—';
};

const resolveCloseReasonBadge = (
  closeReason: string | undefined,
  closeTpLevel: number | undefined,
  closeReasonValues?: { sl?: string; tp?: string; manual?: string }
): { tone: 'sl' | 'tp' | 'manual'; label: string } | null => {
  return resolveTradeCloseReasonBadge({
    closeReason,
    closeTpLevel,
    labels: closeReasonValues,
  });
};

const resolveTradingModeLabel = (
  value: unknown,
  labels: { real: string; demo: string }
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();

  if (/(demo|practice)/.test(normalized)) {
    return labels.demo;
  }

  if (/(real|live)/.test(normalized)) {
    return labels.real;
  }

  if (/contest/.test(normalized)) {
    return 'Contest';
  }

  return raw;
};

const translateChecklistLabel = (
  label?: string,
  key?: string,
  defaults?: { account: string; telegram: string; mt: string; channels: string }
): string => {
  if (!defaults) return label ?? '';

  // Prefer the localized default when we recognize the step key.
  if (key && key in defaults) {
    return defaults[key as keyof typeof defaults];
  }

  if (!label) return defaults.account;

  const normalized = label.trim().toLowerCase();
  const englishToLocalized: Record<string, string> = {
    'create tragram account': defaults.account,
    'connect telegram account': defaults.telegram,
    'connect mt4/mt5': defaults.mt,
    'join or enable channels': defaults.channels,
  };

  return englishToLocalized[normalized] ?? label;
};

const formatTimeLabel = (value?: string, locale = 'en-US'): string => {
  return formatTradeOrderLocalDateTime(value, locale);
};

const formatPriceLabel = (
  value: number | undefined,
  locale = 'en-US',
  priceDigits?: number
): string => formatTradePrice(value, { locale, priceDigits });

const formatLotsLabel = (value: number | undefined, locale = 'en-US'): string => {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatAccountBadgeValue = (value: unknown, maxLength = 16): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseTakeProfitTargets = (value: unknown): TradeTakeProfitTarget[] | undefined => {
  const targets = normalizeTradeTakeProfitTargets(value);
  return targets.length > 0 ? targets : undefined;
};

const resolveOrderPnlValue = (trade: DashboardOrderRecord): number | undefined =>
  trade.status === 'pending' ? undefined : trade.brokerPnl ?? trade.netProfit ?? trade.profit;

const getDashboardOrderIdentity = (order: DashboardOrderRecord): string | null =>
  order.id ?? order.orderId ?? order.ticketId ?? null;

const hasStoredDashboardOrderId = (order: DashboardOrderRecord): boolean =>
  typeof order.id === 'string' && order.id.trim().length > 0;

const resolveTopPrice = (trade: DashboardOrderRecord): number | undefined =>
  trade.status === 'open' ? (trade.currentPrice ?? trade.entryPrice) : trade.entryPrice;

const normalizeOrderRecord = (value: Record<string, unknown>): DashboardOrderRecord => {
  const signal = (value.signal as
    | {
        channel?: {
          channelTitle?: string | null;
          channelUsername?: string | null;
          photoUrl?: string | null;
        } | null;
      }
    | undefined) ?? { channel: null };

  const takeProfitTargets = parseTakeProfitTargets(value.takeProfitTargets);

  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    recordType: parseOptionalString(value.recordType),
    parentTradeId: parseOptionalString(value.parentTradeId),
    tpExecutionId: parseOptionalString(value.tpExecutionId),
    tpSliceId: parseOptionalString(value.tpSliceId),
    userId: parseOptionalString(value.userId),
    mtAccountId: parseOptionalString(value.mtAccountId),
    signalId: parseOptionalString(value.signalId) ?? (value.signalId === null ? null : undefined),
    orderId: parseOptionalString(value.orderId),
    ticketId:
      parseOptionalString(value.ticketId) ??
      parseOptionalString(value.orderId) ??
      parseOptionalString(value.id) ??
      null,
    symbol: typeof value.symbol === 'string' ? value.symbol : undefined,
    side: typeof value.side === 'string' ? value.side : undefined,
    volume: parseOptionalNumber(value.volume),
    orderType: parseOptionalString(value.orderType)?.toUpperCase(),
    entryPrice: parseOptionalNumber(value.entryPrice),
    brokerOpenPrice: parseOptionalNumber(value.brokerOpenPrice),
    currentPrice: parseOptionalNumber(value.currentPrice),
    closePrice: parseOptionalNumber(value.closePrice),
    stopLoss: parseOptionalNumber(value.stopLoss),
    priceDigits: parseOptionalNonNegativeInt(value.priceDigits),
    takeProfitTargets,
    status: typeof value.status === 'string' ? value.status.toLowerCase() : undefined,
    profit: parseOptionalNumber(value.profit),
    commission: parseOptionalNumber(value.commission),
    swap: parseOptionalNumber(value.swap),
    netProfit: parseOptionalNumber(value.netProfit),
    brokerPnl: parseOptionalNumber(value.brokerPnl),
    executionDelayMs: parseOptionalNumber(value.executionDelayMs),
    openTime: normalizeTradeOrderTimestamp(value.openTime),
    closeTime: normalizeTradeOrderTimestamp(value.closeTime),
    closeReason: parseOptionalString(value.closeReason)?.toUpperCase(),
    closeTpLevel: parseOptionalPositiveInt(value.closeTpLevel),
    createdAt: normalizeTradeOrderTimestamp(value.createdAt),
    updatedAt: normalizeTradeOrderTimestamp(value.updatedAt),
    accountNumber: parseOptionalString(value.accountNumber) ?? null,
    accountPlatform: parseOptionalString(value.accountPlatform) ?? null,
    channelTitle:
      parseOptionalString(value.channelTitle) ?? signal.channel?.channelTitle ?? null,
    channelUsername:
      parseOptionalString(value.channelUsername) ?? signal.channel?.channelUsername ?? null,
    channelPhotoUrl:
      (typeof value.channelPhotoUrl === 'string'
        ? value.channelPhotoUrl
        : signal.channel?.photoUrl) ?? null,
    marketHours: normalizeTradeMarketHours(value.marketHours),
  };
};

const normalizeDashboardSummary = (payload: unknown): SnapshotPayload<DashboardSummary> | null => {
  const normalized = normalizeRealtimeDashboardSummary(payload);
  if (!normalized) {
    return null;
  }

  return {
    balance: normalized.balance ?? null,
    equity: normalized.equity ?? null,
    pnl: normalized.realizedPnl ?? normalized.pnl,
    realizedPnl: normalized.realizedPnl ?? normalized.pnl,
    floatingPnl: normalized.floatingPnl,
    pnlStatus: normalized.pnlStatus ?? 'SYNCING',
    pnlAsOf: normalized.pnlAsOf ?? null,
    ...(normalized.pnlSource ? { pnlSource: normalized.pnlSource } : {}),
    ...(normalized.unresolvedTrades !== undefined ? { unresolvedTrades: normalized.unresolvedTrades } : {}),
    ...(normalized.pnlRevision !== undefined ? { pnlRevision: normalized.pnlRevision } : {}),
    ...normalizeSubscriptionReadStatus(payload),
    snapshotAt:
      normalized.snapshotAt === undefined ? undefined : String(normalized.snapshotAt),
  };
};

const normalizeOrdersCounts = (payload: unknown): SnapshotPayload<OrdersCounts> | null => {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const countsRecord = asRecord(record.counts);
  if (!countsRecord) {
    return null;
  }

  return {
    counts: {
      open: parseNonNegativeInt(countsRecord.open),
      pending: parseNonNegativeInt(countsRecord.pending),
      closed: parseNonNegativeInt(countsRecord.closed),
    },
    snapshotAt: typeof record.snapshotAt === 'string' ? record.snapshotAt : undefined,
  };
};

const normalizeDashboardSymbolPrices = (payload: unknown): DashboardSymbolQuoteMap | undefined => {
  const record = asRecord(payload);
  if (!record) {
    return undefined;
  }
  const entries = Object.values(record)
    .map((value) => normalizeDashboardSymbolPriceTick(value))
    .filter((tick): tick is NonNullable<ReturnType<typeof normalizeDashboardSymbolPriceTick>> =>
      Boolean(tick)
    )
    .map((tick) => [tick.s, tick] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const normalizeOrdersPage = (payload: unknown): SnapshotPayload<OrdersPage> | null => {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const countsRecord = asRecord(record.counts);
  const dataRecord = asRecord(record.data);
  const paginationRecord = asRecord(dataRecord?.pagination);
  const status = parseOptionalString(record.status);
  if (!countsRecord || !paginationRecord || !status) {
    return null;
  }

  const ordersSource = Array.isArray(dataRecord?.items) ? dataRecord.items : [];
  const orders = normalizeSnapshotRowsPreservingOrder(ordersSource, (item: unknown) => {
    const orderRecord = asRecord(item);
    if (!orderRecord) {
      return null;
    }
    return normalizeOrderRecord(orderRecord);
  });

  return {
    status,
    counts: {
      open: parseNonNegativeInt(countsRecord.open),
      pending: parseNonNegativeInt(countsRecord.pending),
      closed: parseNonNegativeInt(countsRecord.closed),
    },
    orders,
    symbolPrices: normalizeDashboardSymbolPrices(record.symbolPrices),
    pagination: {
      page: parseNonNegativeInt(paginationRecord.page) || 1,
      limit: parseNonNegativeInt(paginationRecord.limit) || DASHBOARD_ORDERS_PAGE_SIZE,
      total: parseNonNegativeInt(paginationRecord.total),
      totalPages: parseNonNegativeInt(paginationRecord.totalPages),
      hasMore: Boolean(paginationRecord.hasMore),
    },
    snapshotAt: typeof record.snapshotAt === 'string' ? record.snapshotAt : undefined,
  };
};

const normalizeDashboardOrderPatch = (payload: unknown): DashboardOrderPatchPayload | null => {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const orderRecord = asRecord(record.order);
  if (!orderRecord) {
    return null;
  }

  const action =
    record.action === 'created' || record.action === 'updated' || record.action === 'closed'
      ? record.action
      : undefined;

  return {
    action,
    order: normalizeOrderRecord(orderRecord),
    previousStatus:
      typeof record.previousStatus === 'string' ? record.previousStatus.toLowerCase() : undefined,
    symbolPrices: normalizeDashboardSymbolPrices(record.symbolPrices),
    snapshotAt: typeof record.snapshotAt === 'string' ? record.snapshotAt : undefined,
  };
};

const mergeDashboardLifecycleOrder = (
  existing: DashboardOrderRecord | undefined,
  update: DashboardOrderRecord
): DashboardOrderRecord => {
  if (!existing) {
    return update;
  }

  const next = { ...existing };
  const mergeKeys: Array<keyof DashboardOrderRecord> = [
    'id',
    'userId',
    'mtAccountId',
    'signalId',
    'orderId',
    'ticketId',
    'symbol',
    'side',
    'volume',
    'orderType',
    'entryPrice',
    'brokerOpenPrice',
    'currentPrice',
    'closePrice',
    'stopLoss',
    'priceDigits',
    'takeProfitTargets',
    'status',
    'profit',
    'commission',
    'swap',
    'netProfit',
    'brokerPnl',
    'points',
    'executionDelayMs',
    'openTime',
    'closeTime',
    'closeReason',
    'closeTpLevel',
    'createdAt',
    'updatedAt',
    'accountNumber',
    'accountPlatform',
    'channelTitle',
    'channelUsername',
    'channelPhotoUrl',
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

type DashboardPageClientProps = {
  defaultCountry?: CountryCode;
};

export default function DashboardPageClient({ defaultCountry }: DashboardPageClientProps) {
  const lang = useLocale();
  const router = useRouter();
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardPage;
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const dispatch = useAppDispatch();
  const { status: authStatus, accessToken } = useAppSelector((state) => state.auth);
  const dismissedTelegramReconnectToastKeys = useAppSelector(
    (state) => state.ui.dismissedTelegramReconnectToastKeys
  );
  const isAuthenticated = authStatus === 'authenticated' && Boolean(accessToken);
  const locale = useMemo(() => resolveIntlLocale(lang), [lang]);
  const tabs = useMemo(
    () => [
      { id: 'open' as TabKey, label: t.tabs.open },
      { id: 'pending' as TabKey, label: t.tabs.limit },
      { id: 'closed' as TabKey, label: t.tabs.closed },
    ],
    [t.tabs]
  );
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0].id);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [state, setState] = useState<DashboardState>({
    mtAccounts: 0,
    telegramConnected: false,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationThreads, setNotificationThreads] = useState<DashboardNotificationThread[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoadingMore, setNotificationsLoadingMore] = useState(false);
  const [notificationThreadLoadingIds, setNotificationThreadLoadingIds] = useState<string[]>([]);
  const [notificationThreadEventLoadingIds, setNotificationThreadEventLoadingIds] = useState<string[]>([]);
  const [notificationsCursor, setNotificationsCursor] = useState<string | null>(null);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [notificationsMarkingAllRead, setNotificationsMarkingAllRead] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState<DashboardViewStatus>({
    loading: true,
    error: false,
    subscriptionRequired: false,
  });
  const [ordersSubscriptionRequired, setOrdersSubscriptionRequired] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<NormalizedSubscriptionReadStatus>(
    normalizeSubscriptionReadStatus(null)
  );
  const [checklist, setChecklist] = useState<DashboardChecklist | null>(null);
  const [ordersCounts, setOrdersCounts] = useState<OrdersSummary['counts']>({
    open: 0,
    pending: 0,
    closed: 0,
  });
  const [ordersPageByTab, setOrdersPageByTab] = useState<Record<TabKey, number>>({
    open: 1,
    pending: 1,
    closed: 1,
  });
  const [ordersPageData, setOrdersPageData] = useState<OrdersPage | null>(null);
  const [ordersPageState, setOrdersPageState] = useState({ loading: true, error: false });
  const [activeOrder, setActiveOrder] = useState<DashboardOrderRecord | null>(null);
  const [pendingOrderAction, setPendingOrderAction] = useState<{
    order: DashboardOrderRecord;
    action: 'close' | 'delete';
  } | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [marketHoursNowMs, setMarketHoursNowMs] = useState(() => Date.now());
  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [mtSheetOpen, setMtSheetOpen] = useState(false);
  const [telegramSheetOpen, setTelegramSheetOpen] = useState(false);
  const [mtAccountsList, setMtAccountsList] = useState<MtAccount[]>([]);
  const [accountsStatus, setAccountsStatus] = useState({ loading: false, error: false });
  const [accountActionId, setAccountActionId] = useState<string | null>(null);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<{
    id: string;
    accountNumber: string;
    platform: string | null;
    subscribedChannelsCount: number | null;
  } | null>(null);
  const [pendingSwitchAccount, setPendingSwitchAccount] = useState<{
    id: string;
    accountNumber: string;
    platform: string;
  } | null>(null);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>(
    'connecting'
  );
  const summarySnapshotMsRef = useRef<number>(0);
  const summaryRevisionRef = useRef<number>(0);
  const ordersSnapshotMsRef = useRef<number>(0);
  const activeOrdersTabRef = useRef<TabKey>(activeTab);
  const activeOrdersPageRef = useRef<number>(1);
  const ordersCountsRef = useRef<OrdersSummary['counts']>({
    open: 0,
    pending: 0,
    closed: 0,
  });
  const ordersPageDataRef = useRef<OrdersPage | null>(null);
  const symbolSpecsRef = useRef<DashboardSymbolSpecMap>({});
  const symbolQuotesRef = useRef<DashboardSymbolQuoteMap>({});
  const symbolSpecsLoadedRef = useRef(false);
  const appliedOrderRealtimeKeysRef = useRef<Set<string>>(new Set());
  const appliedCreatedOrderIdentitiesRef = useRef<Set<string>>(new Set());
  const dashboardSocketRef = useRef<Socket | null>(null);
  const dashboardSocketConnectedOnceRef = useRef(false);
  const notificationsOpenRef = useRef<boolean>(false);
  const notificationRefreshCoalescerRef = useRef<NotificationRefreshCoalescer | null>(null);

  useEffect(() => {
    activeOrdersTabRef.current = activeTab;
    activeOrdersPageRef.current = ordersPageByTab[activeTab] ?? 1;
  }, [activeTab, ordersPageByTab]);

  useEffect(() => {
    ordersCountsRef.current = ordersCounts;
  }, [ordersCounts]);

  useEffect(() => {
    ordersPageDataRef.current = ordersPageData;
  }, [ordersPageData]);
  const seedDashboardSymbolPrices = useCallback((symbolPrices?: DashboardSymbolQuoteMap) => {
    if (!symbolPrices || Object.keys(symbolPrices).length === 0) {
      return;
    }
    symbolQuotesRef.current = {
      ...symbolQuotesRef.current,
      ...symbolPrices,
    };
  }, []);

  const applyCachedDashboardSymbolPrices = useCallback(
    <T extends DashboardOrderRecord,>(orders: T[]): T[] =>
      applyDashboardSymbolPrices(orders, symbolQuotesRef.current, symbolSpecsRef.current),
    []
  );

  const recomputeDashboardRowsFromCachedPrices = useCallback(() => {
    setOrdersPageData((current) =>
      current
        ? {
            ...current,
            orders: applyCachedDashboardSymbolPrices(current.orders),
          }
        : current
    );
    setActiveOrder((current) =>
      current ? applyCachedDashboardSymbolPrices([current])[0] ?? current : current
    );
  }, [applyCachedDashboardSymbolPrices]);

  useEffect(() => {
    const candidates = [
      ...(ordersPageData?.orders ?? []),
      ...(activeOrder ? [activeOrder] : []),
    ];
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
  }, [activeOrder, marketHoursNowMs, ordersPageData]);

  useEffect(() => {
    notificationsOpenRef.current = notificationsOpen;
  }, [notificationsOpen]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setNotificationsUnreadCount(count);
    } catch {
      // Intentionally silent to keep periodic badge refresh unobtrusive.
    }
  }, []);

  const promptTelegramReconnectIfNeeded = useCallback(
    (
      status: {
        requiresReconnect?: boolean;
        disconnectedAt?: string;
        reasonCode?: string;
      } | null
    ) => {
      if (!status?.requiresReconnect || typeof window === 'undefined') {
        return;
      }

      const token = status.disconnectedAt || status.reasonCode || 'unknown';
      if (dismissedTelegramReconnectToastKeys[token]) {
        return;
      }

      toast.error(t.connections.telegramReconnectPrompt);
      dispatch(dismissTelegramReconnectToast(token));
    },
    [dismissedTelegramReconnectToastKeys, dispatch, t.connections.telegramReconnectPrompt]
  );

  const loadNotificationThreads = useCallback(
    async (options?: {
      showLoader?: boolean;
      silent?: boolean;
      append?: boolean;
      cursor?: string | null;
    }) => {
      const showLoader = options?.showLoader ?? true;
      const append = options?.append ?? false;
      const cursor = options?.cursor ?? null;

      if (append) {
        setNotificationsLoadingMore(true);
      } else if (showLoader) {
        setNotificationsLoading(true);
      }

      try {
        const page = await notificationsService.getNotificationThreads({
          limit: NOTIFICATIONS_PAGE_SIZE,
          cursor,
        });

        setNotificationThreads((current) => {
          const mergeWithCurrent = (incoming: DashboardNotificationThread) => {
            const existing = current.find((item) => item.threadId === incoming.threadId);
            if (!existing) {
              return incoming;
            }
            return {
              ...incoming,
              notifications:
                incoming.notifications.length > 0
                  ? incoming.notifications
                  : existing.notifications,
              eventCursor: incoming.eventCursor ?? existing.eventCursor,
              eventsHasMore: incoming.eventsHasMore ?? existing.eventsHasMore,
            };
          };

          if (!append) {
            return page.items.map(mergeWithCurrent);
          }

          const existingIds = new Set(current.map((item) => item.threadId));
          const nextItems = page.items
            .filter((item) => !existingIds.has(item.threadId))
            .map(mergeWithCurrent);
          return [...current, ...nextItems];
        });
        setNotificationsCursor(page.nextCursor);
        setNotificationsHasMore(page.hasMore);
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              getErrorMessage(error) ||
              t.notifications.toastError
          );
        }
      } finally {
        if (append) {
          setNotificationsLoadingMore(false);
        } else if (showLoader) {
          setNotificationsLoading(false);
        }
      }
    },
    [intlMessages, t.notifications.toastError]
  );

  const loadNotificationThreadEvents = useCallback(
    async (
      threadId: string,
      options?: { silent?: boolean; append?: boolean; cursor?: string | null },
    ) => {
      const append = options?.append ?? false;
      const currentThread = notificationThreads.find((thread) => thread.threadId === threadId);
      if (!currentThread?.scopeKind) {
        return;
      }

      setNotificationThreadEventLoadingIds((current) =>
        current.includes(threadId) ? current : [...current, threadId],
      );
      try {
        const page = await notificationsService.getNotificationThreadEvents({
          threadId,
          limit: NOTIFICATIONS_PAGE_SIZE,
          cursor: options?.cursor ?? (append ? currentThread.eventCursor ?? null : null),
        });
        setNotificationThreads((current) =>
          current.map((thread) => {
            if (thread.threadId !== threadId) return thread;
            const nextNotifications = append
              ? [
                  ...thread.notifications,
                  ...page.items.filter(
                    (item) => !thread.notifications.some((existing) => existing.id === item.id),
                  ),
                ]
              : page.items;
            return {
              ...thread,
              notifications: nextNotifications,
              eventCursor: page.nextCursor,
              eventsHasMore: page.hasMore,
            };
          }),
        );
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              getErrorMessage(error) ||
              t.notifications.toastError,
          );
        }
      } finally {
        setNotificationThreadEventLoadingIds((current) => current.filter((id) => id !== threadId));
      }
    },
    [intlMessages, notificationThreads, t.notifications.toastError],
  );

  const loadNotificationThreadItems = useCallback(
    async (
      threadId: string,
      options?: { silent?: boolean; markReadIfUnread?: boolean; forceRefresh?: boolean }
    ) => {
      setNotificationThreadLoadingIds((current) =>
        current.includes(threadId) ? current : [...current, threadId]
      );

      try {
        const currentThread = notificationThreads.find((thread) => thread.threadId === threadId);
        if (!currentThread) {
          return;
        }

        if (
          currentThread.scopeKind &&
          (options?.forceRefresh || currentThread.notifications.length === 0)
        ) {
          await loadNotificationThreadEvents(threadId, {
            silent: true,
            append: false,
          });
        }

        if (
          options?.markReadIfUnread &&
          currentThread &&
          (currentThread.hasUnread || currentThread.unreadCount > 0)
        ) {
          setNotificationThreads((current) =>
            current.map((thread) =>
              thread.threadId === threadId
                ? {
                    ...thread,
                    hasUnread: false,
                    unreadCount: 0,
                    latestNotification: {
                      ...thread.latestNotification,
                      read: true,
                    },
                    notifications: thread.notifications.map((notification) => ({
                      ...notification,
                      read: true,
                    })),
                  }
                : thread
            )
          );

          setNotificationsUnreadCount((current) =>
            Math.max(0, current - currentThread.unreadCount)
          );

          void notificationsService.markThreadAsRead(threadId).then(() => {
            trackAnalyticsEvent('notifications_marked_read', { count: currentThread.unreadCount });
          }).catch(() => {
            void loadNotificationThreads({
              showLoader: false,
              append: false,
              cursor: null,
              silent: true,
            });
            void refreshUnreadCount();
          });
        }
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              getErrorMessage(error) ||
              t.notifications.toastError
          );
        }
      } finally {
        setNotificationThreadLoadingIds((current) => current.filter((id) => id !== threadId));
      }
    },
    [
      intlMessages,
      loadNotificationThreads,
      loadNotificationThreadEvents,
      notificationThreads,
      refreshUnreadCount,
      t.notifications.toastError,
    ]
  );

  const handleNotificationsClick = useCallback(() => {
    setNotificationsOpen(true);
    if (!notificationsLoading) {
      void loadNotificationThreads({ showLoader: true, append: false, cursor: null });
    }
    void refreshUnreadCount();
  }, [loadNotificationThreads, notificationsLoading, refreshUnreadCount]);

  const handleNotificationsLoadMore = useCallback(() => {
    if (
      notificationsLoading ||
      notificationsLoadingMore ||
      !notificationsHasMore ||
      !notificationsCursor
    ) {
      return;
    }

    void loadNotificationThreads({
      showLoader: false,
      append: true,
      cursor: notificationsCursor,
      silent: true,
    });
  }, [
    loadNotificationThreads,
    notificationsCursor,
    notificationsHasMore,
    notificationsLoading,
    notificationsLoadingMore,
  ]);

  const handleNotificationsOpenThread = useCallback(
    (threadId: string) => {
      const thread = notificationThreads.find((item) => item.threadId === threadId);
      if (!thread) {
        return;
      }
      const shouldMarkRead = thread.hasUnread || thread.unreadCount > 0;
      void loadNotificationThreadItems(threadId, {
        silent: true,
        markReadIfUnread: shouldMarkRead,
      });
    },
    [loadNotificationThreadItems, notificationThreads]
  );

  const handleNotificationsLoadMoreThreadEvents = useCallback(
    (threadId: string) => {
      const thread = notificationThreads.find((item) => item.threadId === threadId);
      if (!thread?.eventsHasMore || !thread.eventCursor || notificationThreadEventLoadingIds.includes(threadId)) {
        return;
      }
      void loadNotificationThreadEvents(threadId, {
        append: true,
        cursor: thread.eventCursor,
        silent: true,
      });
    },
    [loadNotificationThreadEvents, notificationThreadEventLoadingIds, notificationThreads],
  );

  const handleNotificationsMarkAllRead = useCallback(() => {
    const hasUnreadThreads = notificationThreads.some(
      (thread) => thread.hasUnread || thread.unreadCount > 0
    );
    if (notificationsMarkingAllRead || (!hasUnreadThreads && notificationsUnreadCount <= 0)) {
      return;
    }

    setNotificationsMarkingAllRead(true);
    setNotificationThreads((current) =>
      current.map((thread) => ({
        ...thread,
        hasUnread: false,
        unreadCount: 0,
        latestNotification: {
          ...thread.latestNotification,
          read: true,
        },
        notifications: thread.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      }))
    );
    setNotificationsUnreadCount(0);

    void notificationsService
      .markAllAsRead()
      .then(() => {
        if (notificationsUnreadCount > 0) {
          trackAnalyticsEvent('notifications_marked_read', { count: notificationsUnreadCount });
        }
      })
      .catch((error) => {
        toast.error(
          getLocalizedErrorMessage(error, intlMessages) ||
            getErrorMessage(error) ||
            t.notifications.toastError
        );
        void Promise.all([
          refreshUnreadCount(),
          loadNotificationThreads({
            showLoader: false,
            append: false,
            cursor: null,
            silent: true,
          }),
        ]);
      })
      .finally(() => {
        setNotificationsMarkingAllRead(false);
      });
  }, [
    intlMessages,
    loadNotificationThreads,
    notificationThreads,
    notificationsMarkingAllRead,
    notificationsUnreadCount,
    refreshUnreadCount,
    t.notifications.toastError,
  ]);

  const handleNotificationsClose = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const refreshNotificationContext = useCallback(async () => {
    await refreshUnreadCount();
    if (notificationsOpenRef.current) {
      await loadNotificationThreads({
        showLoader: false,
        append: false,
        cursor: null,
        silent: true,
      });
    }
  }, [loadNotificationThreads, refreshUnreadCount]);

  useEffect(() => {
    const coalescer = createNotificationRefreshCoalescer({
      refresh: refreshNotificationContext,
      delayMs: 100,
    });
    notificationRefreshCoalescerRef.current = coalescer;
    return () => {
      coalescer.dispose();
      if (notificationRefreshCoalescerRef.current === coalescer) {
        notificationRefreshCoalescerRef.current = null;
      }
    };
  }, [refreshNotificationContext]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshUnreadCount]);

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

  const loadOrdersPage = useCallback(
    async (
      tab: TabKey,
      page: number,
      options?: {
        showLoader?: boolean;
      }
    ) => {
      if (options?.showLoader !== false) {
        setOrdersPageState({ loading: true, error: false });
      }

      try {
        const response = await userService.getDashboardOrdersPage({
          status: tab,
          page,
          limit: DASHBOARD_ORDERS_PAGE_SIZE,
        });
        const normalized = normalizeOrdersPage(response);
        if (!normalized) {
          throw new Error('Invalid dashboard orders payload.');
        }
        seedDashboardSymbolPrices(normalized.symbolPrices);
        const pricedPage = {
          ...normalized,
          orders: applyCachedDashboardSymbolPrices(normalized.orders),
        };

        setOrdersCounts(pricedPage.counts);
        if (activeOrdersTabRef.current !== tab || activeOrdersPageRef.current !== page) {
          return;
        }

        setOrdersPageData(pricedPage);
        setOrdersPageState({ loading: false, error: false });
        setOrdersSubscriptionRequired(false);
      } catch (error) {
        if (!billingDisabled && isSubscriptionAccessError(error)) {
          setOrdersPageData(null);
          setOrdersSubscriptionRequired(true);
          setOrdersPageState({ loading: false, error: false });
          return;
        }
        if (activeOrdersTabRef.current !== tab || activeOrdersPageRef.current !== page) {
          return;
        }
        setOrdersPageState({ loading: false, error: true });
      }
    },
    [applyCachedDashboardSymbolPrices, billingDisabled, seedDashboardSymbolPrices]
  );

  const loadDashboardSymbolSpecs = useCallback(async () => {
    if (symbolSpecsLoadedRef.current) {
      return;
    }
    try {
      const response = await userService.getDashboardSymbolSpecs();
      symbolSpecsRef.current = mergeDashboardSymbolSpecs(symbolSpecsRef.current, response);
      symbolSpecsLoadedRef.current = true;
      recomputeDashboardRowsFromCachedPrices();
    } catch {
      // Price updates still refresh current prices; unsafe PnL recalculation is skipped without specs.
    }
  }, [recomputeDashboardRowsFromCachedPrices]);

  const refreshDashboardSymbolSpecsForMissingSymbols = useCallback(
    (symbols: Array<string | undefined>) => {
      const hasMissingSpec = symbols.some((symbol) => {
        const normalized = symbol?.trim();
        return Boolean(normalized && !symbolSpecsRef.current[normalized]);
      });
      if (!hasMissingSpec) {
        return;
      }
      symbolSpecsLoadedRef.current = false;
      void loadDashboardSymbolSpecs();
    },
    [loadDashboardSymbolSpecs]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      symbolSpecsRef.current = {};
      symbolQuotesRef.current = {};
      symbolSpecsLoadedRef.current = false;
      dashboardSocketConnectedOnceRef.current = false;
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setDashboardStatus({ loading: true, error: false, subscriptionRequired: false });
      setOrdersSubscriptionRequired(false);
      setAccountsStatus({ loading: true, error: false });

      const [statsResult, telegramResult, mtAccountsResult, profileResult, checklistResult] =
        await Promise.allSettled([
          userService.getUserStats(),
          connectionsService.getTelegramStatus(),
          connectionsService.getMtAccounts(),
          authService.getProfile(),
          userService.getDashboardChecklist(),
        ]);

      if (cancelled) return;

      const hasSubscriptionAccessFailure = [statsResult, mtAccountsResult, checklistResult].some(
        (result) => result.status === 'rejected' && isSubscriptionAccessError(result.reason)
      );
      const subscriptionRequired = !billingDisabled && hasSubscriptionAccessFailure;

      const dashboardError = [statsResult, mtAccountsResult, checklistResult, profileResult].some(
        (result) =>
          result.status === 'rejected' &&
          (billingDisabled || !isSubscriptionAccessError(result.reason))
      );

      const resolvedTelegram = telegramResult.status === 'fulfilled' ? telegramResult.value : null;
      const resolvedMtAccounts =
        mtAccountsResult.status === 'fulfilled' ? (mtAccountsResult.value ?? []) : [];
      const resolvedProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const resolvedChecklist =
        checklistResult.status === 'fulfilled' ? checklistResult.value : null;
      const resolvedSummary =
        statsResult.status === 'fulfilled' ? normalizeDashboardSummary(statsResult.value) : null;
      const summaryStatus = normalizeSubscriptionReadStatus(
        statsResult.status === 'fulfilled' ? statsResult.value : null
      );
      const checklistStatus = normalizeSubscriptionReadStatus(resolvedChecklist);
      setSubscriptionStatus(
        summaryStatus.subscriptionPaused ? summaryStatus : checklistStatus
      );

      setProfile(resolvedProfile ? (resolvedProfile as ProfileUser) : null);
      setChecklist(resolvedChecklist ?? null);
      if (resolvedSummary) {
        summarySnapshotMsRef.current =
          parseSnapshotTimestamp(resolvedSummary.snapshotAt) ?? Date.now();
        summaryRevisionRef.current = resolvedSummary.pnlRevision ?? 0;
        setSummary({
          balance: resolvedSummary.balance,
          equity: resolvedSummary.equity,
          pnl: resolvedSummary.pnl,
          realizedPnl: resolvedSummary.realizedPnl,
          floatingPnl: resolvedSummary.floatingPnl,
          pnlStatus: resolvedSummary.pnlStatus,
          pnlAsOf: resolvedSummary.pnlAsOf,
          pnlSource: resolvedSummary.pnlSource,
          unresolvedTrades: resolvedSummary.unresolvedTrades,
          pnlRevision: resolvedSummary.pnlRevision,
          subscriptionPaused: resolvedSummary.subscriptionPaused,
          subscriptionPauseReason: resolvedSummary.subscriptionPauseReason,
          subscriptionPauseMessage: resolvedSummary.subscriptionPauseMessage,
        });
      }
      setState({
        mtAccounts: resolvedMtAccounts.length,
        telegramConnected: Boolean(resolvedTelegram?.isConnected),
      });
      promptTelegramReconnectIfNeeded(
        resolvedTelegram as {
          requiresReconnect?: boolean;
          disconnectedAt?: string;
          reasonCode?: string;
        } | null
      );
      setMtAccountsList(resolvedMtAccounts);
      setAccountsStatus({
        loading: false,
        error:
          !subscriptionRequired &&
          mtAccountsResult.status === 'rejected' &&
          !isSubscriptionAccessError(mtAccountsResult.reason),
      });
      setDashboardStatus({
        loading: false,
        error: !subscriptionRequired && dashboardError,
        subscriptionRequired,
      });
      setOrdersSubscriptionRequired(subscriptionRequired);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [billingDisabled, isAuthenticated, promptTelegramReconnectIfNeeded]);

  const refreshConnections = useCallback(async () => {
    setAccountsStatus((prev) => ({ ...prev, loading: true }));
    const [statsResult, telegramResult, mtAccountsResult, checklistResult] =
      await Promise.allSettled([
        userService.getUserStats(),
        connectionsService.getTelegramStatus(),
        connectionsService.getMtAccounts(),
        userService.getDashboardChecklist(),
      ]);

    const hasSubscriptionAccessFailure = [statsResult, mtAccountsResult, checklistResult].some(
      (result) => result.status === 'rejected' && isSubscriptionAccessError(result.reason)
    );
    const subscriptionRequired = !billingDisabled && hasSubscriptionAccessFailure;

    const hasRefreshError = [statsResult, mtAccountsResult, checklistResult].some(
      (result) =>
        result.status === 'rejected' &&
        (billingDisabled || !isSubscriptionAccessError(result.reason))
    );

    const telegramStatus = telegramResult.status === 'fulfilled' ? telegramResult.value : null;
    const mtAccounts =
      mtAccountsResult.status === 'fulfilled' ? (mtAccountsResult.value ?? []) : [];
    const checklistResponse = checklistResult.status === 'fulfilled' ? checklistResult.value : null;
    const summaryStatus = normalizeSubscriptionReadStatus(
      statsResult.status === 'fulfilled' ? statsResult.value : null
    );
    const checklistStatus = normalizeSubscriptionReadStatus(checklistResponse);
    setSubscriptionStatus(summaryStatus.subscriptionPaused ? summaryStatus : checklistStatus);

    setState((prev) => ({
      ...prev,
      mtAccounts: mtAccounts.length,
      telegramConnected: Boolean(telegramStatus?.isConnected),
    }));
    promptTelegramReconnectIfNeeded(
      telegramStatus as {
        requiresReconnect?: boolean;
        disconnectedAt?: string;
        reasonCode?: string;
      } | null
    );
    setChecklist(checklistResponse ?? null);
    setMtAccountsList(mtAccounts);
    setDashboardStatus((prev) => ({
      ...prev,
      error: !subscriptionRequired && hasRefreshError,
      subscriptionRequired,
    }));
    setOrdersSubscriptionRequired(subscriptionRequired);
    setAccountsStatus({
      loading: false,
      error:
        !subscriptionRequired &&
        mtAccountsResult.status === 'rejected' &&
        !isSubscriptionAccessError(mtAccountsResult.reason),
    });
  }, [billingDisabled, promptTelegramReconnectIfNeeded]);

  const refreshDashboardSnapshots = useCallback(async () => {
    const summaryResult = await Promise.allSettled([
      getApiUsersDashboardSummary({
        throwOnError: true,
      }),
    ]);
    const [resolvedSummaryResult] = summaryResult;

    if (resolvedSummaryResult.status === 'fulfilled') {
      const normalized = normalizeDashboardSummary(resolvedSummaryResult.value.data);
      if (normalized) {
        const nextTimestamp = parseSnapshotTimestamp(normalized.snapshotAt) ?? Date.now();
        const revisionIsFresh =
          normalized.pnlRevision === undefined ||
          normalized.pnlRevision >= summaryRevisionRef.current;
        // A recovery fetch is allowed to win on revision even when its HTTP
        // response timestamp trails the live event that triggered recovery.
        // Never move either cursor backwards, though, or the next event will
        // look like another gap and create a recovery loop.
        if (
          revisionIsFresh &&
          (nextTimestamp >= summarySnapshotMsRef.current || normalized.pnlRevision !== undefined)
        ) {
          summarySnapshotMsRef.current = Math.max(summarySnapshotMsRef.current, nextTimestamp);
          if (normalized.pnlRevision !== undefined) {
            summaryRevisionRef.current = Math.max(summaryRevisionRef.current, normalized.pnlRevision);
          }
          setSummary({
            balance: normalized.balance,
            equity: normalized.equity,
            pnl: normalized.pnl,
            realizedPnl: normalized.realizedPnl,
            floatingPnl: normalized.floatingPnl,
            pnlStatus: normalized.pnlStatus,
            pnlAsOf: normalized.pnlAsOf,
            pnlSource: normalized.pnlSource,
            unresolvedTrades: normalized.unresolvedTrades,
            pnlRevision: normalized.pnlRevision,
            subscriptionPaused: normalized.subscriptionPaused,
            subscriptionPauseReason: normalized.subscriptionPauseReason,
            subscriptionPauseMessage: normalized.subscriptionPauseMessage,
          });
          setSubscriptionStatus(normalizeSubscriptionReadStatus(resolvedSummaryResult.value.data));
        }
      }
    }
    await loadOrdersPage(activeOrdersTabRef.current, activeOrdersPageRef.current, {
      showLoader: false,
    });
  }, [loadOrdersPage]);

  const scheduleDashboardRefreshRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    scheduleDashboardRefreshRef.current =
      createCoalescedDashboardRefresh(refreshDashboardSnapshots);
    return () => {
      scheduleDashboardRefreshRef.current = null;
    };
  }, [refreshDashboardSnapshots]);

  const scheduleDashboardRefresh = useCallback(() => {
    if (!scheduleDashboardRefreshRef.current) {
      scheduleDashboardRefreshRef.current =
        createCoalescedDashboardRefresh(refreshDashboardSnapshots);
    }
    return scheduleDashboardRefreshRef.current();
  }, [refreshDashboardSnapshots]);

  useEffect(() => {
    const page = ordersPageByTab[activeTab] ?? 1;
    const socket = dashboardSocketRef.current;
    if (socket?.connected) {
      socket.emit('orders:page:subscribe', {
        rt: 3,
        b: 'r',
        rv: summaryRevisionRef.current,
        os: activeTab[0],
        op: page,
        ol: DASHBOARD_ORDERS_PAGE_SIZE,
      });
    }
    const timeoutId = window.setTimeout(() => {
      void loadOrdersPage(activeTab, page);
      void loadDashboardSymbolSpecs();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, loadDashboardSymbolSpecs, loadOrdersPage, ordersPageByTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let authRetryUsed = false;
    const socket: Socket = createRealtimeSocket();
    const lifecycleDedupe = createRealtimeEventDedupe();
    dashboardSocketRef.current = socket;
    const applyRealtimeUpdate = (update: () => void) => {
      startTransition(update);
    };

    const handleSummary = (payload: unknown) => {
      const normalized = normalizeRealtimeDashboardSummary(payload);
      if (!normalized) {
        return;
      }

      const nextTimestamp = parseSnapshotTimestamp(normalized.snapshotAt) ?? Date.now();
      if (nextTimestamp < summarySnapshotMsRef.current) {
        return;
      }
      const revisionDecision = decideDashboardRevision(
        summaryRevisionRef.current,
        normalized.pnlRevision
      );
      if (!revisionDecision.apply) {
        return;
      }
      summarySnapshotMsRef.current = nextTimestamp;
      if (normalized.pnlRevision !== undefined) {
        summaryRevisionRef.current = normalized.pnlRevision;
      }
      if (revisionDecision.gap) {
        void scheduleDashboardRefresh().catch(() => undefined);
      }
      setSummary((current) => {
        return {
          ...current,
          balance: normalized.balance ?? current?.balance ?? null,
          equity: normalized.equity ?? current?.equity ?? null,
          pnl: normalized.realizedPnl ?? normalized.pnl ?? current?.pnl ?? null,
          realizedPnl:
            normalized.realizedPnl ?? normalized.pnl ?? current?.realizedPnl ?? null,
          floatingPnl: normalized.floatingPnl ?? current?.floatingPnl ?? null,
          pnlStatus: normalized.pnlStatus ?? current?.pnlStatus ?? 'SYNCING',
          pnlAsOf: normalized.pnlAsOf ?? current?.pnlAsOf ?? null,
          pnlSource: normalized.pnlSource ?? current?.pnlSource,
          unresolvedTrades: normalized.unresolvedTrades ?? current?.unresolvedTrades,
          pnlRevision: normalized.pnlRevision ?? current?.pnlRevision,
          subscriptionPaused: current?.subscriptionPaused ?? false,
          subscriptionPauseReason: current?.subscriptionPauseReason ?? null,
          subscriptionPauseMessage: current?.subscriptionPauseMessage ?? null,
        };
      });
    };
    const handleChecklist = (payload: DashboardChecklist) => {
      applyRealtimeUpdate(() => {
        setChecklist(payload);
      });
    };
    const handleOrdersCounts = (payload: unknown) => {
      const normalized = normalizeOrdersCounts(payload);
      if (!normalized) {
        return;
      }

      const nextTimestamp = parseSnapshotTimestamp(normalized.snapshotAt) ?? Date.now();
      if (nextTimestamp < ordersSnapshotMsRef.current) {
        return;
      }
      ordersSnapshotMsRef.current = nextTimestamp;
      applyRealtimeUpdate(() => {
        setOrdersCounts(normalized.counts);
        setOrdersSubscriptionRequired(false);
      });
    };
    const handleOrdersPage = (payload: unknown) => {
      const normalized = normalizeOrdersPage(payload);
      if (!normalized) {
        return;
      }
      const tab = normalized.status as TabKey;
      const page = normalized.pagination.page;
      if (activeOrdersTabRef.current !== tab || activeOrdersPageRef.current !== page) {
        return;
      }
      const nextTimestamp = parseSnapshotTimestamp(normalized.snapshotAt) ?? Date.now();
      if (nextTimestamp < ordersSnapshotMsRef.current) {
        return;
      }
      ordersSnapshotMsRef.current = nextTimestamp;
      seedDashboardSymbolPrices(normalized.symbolPrices);
      const pricedPage = {
        ...normalized,
        orders: applyCachedDashboardSymbolPrices(normalized.orders),
      };
      applyRealtimeUpdate(() => {
        setOrdersCounts(pricedPage.counts);
        setOrdersPageData(pricedPage);
        setOrdersPageState({ loading: false, error: false });
        setOrdersSubscriptionRequired(false);
      });
    };
    const handleOrderLifecycle = (payload: unknown) => {
      const normalized = normalizeDashboardOrderPatch(payload);
      if (!normalized) {
        return;
      }
      const orderKey =
        normalized.snapshotAt && (normalized.order.id ?? normalized.order.orderId)
          ? `${normalized.order.id ?? normalized.order.orderId}:${normalized.snapshotAt}`
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
      seedDashboardSymbolPrices(normalized.symbolPrices);
      refreshDashboardSymbolSpecsForMissingSymbols([normalized.order.symbol]);

      applyRealtimeUpdate(() => {
        const activeBucket = activeOrdersTabRef.current;
        const activePage = activeOrdersPageRef.current;
        const currentCounts = ordersCountsRef.current;
        const currentPageData = ordersPageDataRef.current;
        const orderIdentity = getDashboardOrderIdentity(normalized.order);
        const isCreatedOrderPatch =
          normalized.action === 'created' ||
          (normalized.action === undefined &&
            normalized.order.status !== 'closed' &&
            normalized.previousStatus === undefined);
        const isDuplicateCreatedOrder =
          isCreatedOrderPatch &&
          orderIdentity !== null &&
          appliedCreatedOrderIdentitiesRef.current.has(orderIdentity);
        if (isCreatedOrderPatch && orderIdentity) {
          appliedCreatedOrderIdentitiesRef.current.add(orderIdentity);
          if (appliedCreatedOrderIdentitiesRef.current.size > 100) {
            const firstIdentity = appliedCreatedOrderIdentitiesRef.current.values().next().value;
            if (firstIdentity) {
              appliedCreatedOrderIdentitiesRef.current.delete(firstIdentity);
            }
          }
        }
        const existingOrder = orderIdentity
          ? currentPageData?.orders.find(
              (order) => getDashboardOrderIdentity(order) === orderIdentity
            )
          : undefined;
        const mergedOrder = mergeDashboardLifecycleOrder(existingOrder, normalized.order);
        const nextOrder = applyCachedDashboardSymbolPrices([mergedOrder])[0] ?? mergedOrder;
        const shouldDisplayOrder = hasStoredDashboardOrderId(nextOrder);
        const previousBucket = normalized.previousStatus
          ? (resolveOrderBucketFromStatusAndType(
              normalized.previousStatus,
              nextOrder.orderType
            ) as TabKey)
          : null;
        const baseSummary = {
          counts: currentCounts,
          lists: {
            open:
              activePage === 1 && activeBucket === 'open'
                ? (currentPageData?.orders ?? EMPTY_ORDERS_LIST)
                : EMPTY_ORDERS_LIST,
            pending:
              activePage === 1 && activeBucket === 'pending'
                ? (currentPageData?.orders ?? EMPTY_ORDERS_LIST)
                : EMPTY_ORDERS_LIST,
            closed:
              activePage === 1 && activeBucket === 'closed'
                ? (currentPageData?.orders ?? EMPTY_ORDERS_LIST)
                : EMPTY_ORDERS_LIST,
          },
        };
        if (shouldDisplayOrder) {
          const merged = mergeRealtimeOrderPatch(baseSummary, nextOrder, {
            previousStatus: previousBucket ?? null,
            limit: DASHBOARD_ORDERS_PAGE_SIZE,
            adjustCounts: normalized.action !== 'updated' && !isDuplicateCreatedOrder,
          });
          setOrdersCounts(merged.counts);
          if (activePage === 1) {
            const total = merged.counts[activeBucket];
            setOrdersPageData((current) =>
              current
                ? {
                    ...current,
                    counts: merged.counts,
                    orders: merged.lists[activeBucket].filter(hasStoredDashboardOrderId),
                    pagination: {
                      ...current.pagination,
                      page: 1,
                      limit: DASHBOARD_ORDERS_PAGE_SIZE,
                      total,
                      totalPages: Math.ceil(total / DASHBOARD_ORDERS_PAGE_SIZE),
                      hasMore: total > DASHBOARD_ORDERS_PAGE_SIZE,
                    },
                  }
                : current
            );
          }
        }
        setOrdersSubscriptionRequired(false);
      });
    };
    const handleSymbolSpecs = (payload: unknown) => {
      symbolSpecsRef.current = mergeDashboardSymbolSpecs(symbolSpecsRef.current, payload);
      recomputeDashboardRowsFromCachedPrices();
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

      setOrdersPageData((current) =>
        current
          ? {
              ...current,
              orders: applyDashboardSymbolPrice(
                current.orders,
                tick,
                symbolSpecsRef.current,
                symbolQuotesRef.current
              ),
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
    const handleDashboardError = (payload: unknown) => {
      const data = asRecord(payload);
      const code = typeof data?.code === 'string' ? data.code : '';
      const action = resolveDashboardRealtimeErrorAction(code, SUBSCRIPTION_ERROR_CODES);
      if (!billingDisabled && action === 'subscription-required') {
        setOrdersPageData(null);
        setOrdersSubscriptionRequired(true);
        return;
      }
      if (action === 'revision-gap') {
        void scheduleDashboardRefresh().catch(() => undefined);
        return;
      }
      setWsStatus('error');
    };
    const handleNotificationCreated = (payload: unknown) => {
      const signal = normalizeRealtimeNotificationCreated(payload);
      if (!signal) {
        return;
      }

      // `dn` is an invalidation, not a count delta or a complete notification.
      // Read the authoritative unread/group projections through one coalesced
      // REST refresh so duplicate websocket deliveries stay harmless.
      const coalescer = notificationRefreshCoalescerRef.current;
      if (coalescer) {
        coalescer.schedule(signal.e);
      } else {
        void refreshNotificationContext();
      }
    };
    const handleSignalLifecycle = (
      payload: unknown,
      identity: { eventId?: unknown; sourceVersion?: unknown },
    ) => {
      if (!lifecycleDedupe.shouldApply(identity)) {
        return;
      }
      // Lifecycle delivery is an authoritative edge, while the dashboard
      // snapshot remains the source of truth for mutable order fields. One
      // coalesced recovery per durable event keeps redelivery harmless.
      void scheduleDashboardRefresh().catch(() => undefined);
      void payload;
    };
    const handleRealtimeTransport = (payload: unknown) => {
      const decoded = decodeRealtimeTransportEvent(payload);
      if (!decoded) {
        return;
      }
      switch (decoded.event) {
        case 'account:summary':
          handleSummary(decoded.payload);
          break;
        case 'account:checklist':
          handleChecklist(decoded.payload as DashboardChecklist);
          break;
        case 'orders:counts':
          handleOrdersCounts(decoded.payload);
          break;
        case 'orders:page':
          handleOrdersPage(decoded.payload);
          break;
        case 'orders:lifecycle':
          handleOrderLifecycle(decoded.payload);
          break;
        case 'order:created':
          handleOrderLifecycle(decoded.payload);
          break;
        case 'symbol:price':
          handleSymbolPrice(decoded.payload);
          break;
        case 'symbol:specs':
          handleSymbolSpecs(decoded.payload);
          break;
        case 'realtime:error':
          handleDashboardError(decoded.payload);
          break;
        case 'notification-created':
          handleNotificationCreated(decoded.payload);
          break;
        case 'signal-lifecycle':
          handleSignalLifecycle(decoded.payload, decoded);
          break;
      }
    };
    const handleCompactRealtimeEvent = (eventCode: string) => (payload: unknown) => {
      handleRealtimeTransport({ e: eventCode, d: payload });
    };
    const handleCompactSummary = handleCompactRealtimeEvent('as');
    const handleCompactChecklist = handleCompactRealtimeEvent('ak');
    const handleCompactOrdersCounts = handleCompactRealtimeEvent('ok');
    const handleCompactOrdersPage = handleCompactRealtimeEvent('opg');
    const handleCompactOrderLifecycle = handleCompactRealtimeEvent('olc');
    const handleCompactOrderCreated = handleCompactRealtimeEvent('oc');
    const handleCompactSymbolSpecs = handleCompactRealtimeEvent('ssx');
    const handleCompactSymbolPrice = handleCompactRealtimeEvent('spt');
    const handleCompactRealtimeError = handleCompactRealtimeEvent('re');
    const handleCompactNotificationCreated = handleCompactRealtimeEvent('dn');
    const handleCompactSignalLifecycle = handleCompactRealtimeEvent('slc');

    const connectSocket = async (forceRefresh = false) => {
      let token = forceRefresh ? null : window.localStorage.getItem('accessToken');
      if (!token) {
        token = await refreshSocketAccessToken();
      }
      if (!token) {
        if (!cancelled) setWsStatus('error');
        return;
      }
      socket.auth = { token };
      if (!cancelled) {
        setWsStatus(forceRefresh ? 'reconnecting' : 'connecting');
      }
      socket.connect();
    };

    socket.on('as', handleCompactSummary);
    socket.on('ak', handleCompactChecklist);
    socket.on('ok', handleCompactOrdersCounts);
    socket.on('opg', handleCompactOrdersPage);
    socket.on('olc', handleCompactOrderLifecycle);
    socket.on('oc', handleCompactOrderCreated);
    socket.on('ssx', handleCompactSymbolSpecs);
    socket.on('spt', handleCompactSymbolPrice);
    socket.on('re', handleCompactRealtimeError);
    socket.on('dn', handleCompactNotificationCreated);
    socket.on('slc', handleCompactSignalLifecycle);

    socket.on('connect', () => {
      authRetryUsed = false;
      setWsStatus('connected');
      setOrdersSubscriptionRequired(false);
      socket.emit('account:summary:subscribe', { rt: 3, b: 'r', rv: summaryRevisionRef.current });
      socket.emit('account:checklist:subscribe', { rt: 3, b: 'r', rv: summaryRevisionRef.current });
      socket.emit('orders:counts:subscribe', { rt: 3, b: 'r', rv: summaryRevisionRef.current });
      socket.emit('orders:page:subscribe', {
        rt: 3,
        b: 'r',
        rv: summaryRevisionRef.current,
        os: activeOrdersTabRef.current[0],
        op: activeOrdersPageRef.current,
        ol: DASHBOARD_ORDERS_PAGE_SIZE,
      });
      socket.emit('orders:lifecycle:subscribe', { rt: 3 });
      socket.emit('symbol:prices:subscribe', { rt: 3 });
      if (dashboardSocketConnectedOnceRef.current) {
        void loadOrdersPage(activeOrdersTabRef.current, activeOrdersPageRef.current, {
          showLoader: false,
        });
      } else {
        dashboardSocketConnectedOnceRef.current = true;
      }
      const coalescer = notificationRefreshCoalescerRef.current;
      if (coalescer) {
        coalescer.refreshNow();
      } else {
        void refreshNotificationContext();
      }
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      setWsStatus(reason === 'io server disconnect' ? 'error' : 'reconnecting');
    });

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
        return;
      }

      setWsStatus('error');
    });

    socket.io.on('reconnect_attempt', () => {
      setWsStatus('reconnecting');
    });

    void connectSocket();

    return () => {
      cancelled = true;
      socket.emit('account:summary:unsubscribe');
      socket.emit('account:checklist:unsubscribe');
      socket.emit('orders:counts:unsubscribe');
      socket.emit('orders:page:unsubscribe');
      socket.emit('orders:lifecycle:unsubscribe');
      socket.emit('symbol:prices:unsubscribe');
      socket.off('as', handleCompactSummary);
      socket.off('ak', handleCompactChecklist);
      socket.off('ok', handleCompactOrdersCounts);
      socket.off('opg', handleCompactOrdersPage);
      socket.off('olc', handleCompactOrderLifecycle);
      socket.off('oc', handleCompactOrderCreated);
      socket.off('ssx', handleCompactSymbolSpecs);
      socket.off('spt', handleCompactSymbolPrice);
      socket.off('re', handleCompactRealtimeError);
      socket.off('dn', handleCompactNotificationCreated);
      socket.off('slc', handleCompactSignalLifecycle);
      socket.disconnect();
      dashboardSocketRef.current = null;
      dashboardSocketConnectedOnceRef.current = false;
    };
  }, [
    applyCachedDashboardSymbolPrices,
    billingDisabled,
    loadNotificationThreads,
    loadOrdersPage,
    recomputeDashboardRowsFromCachedPrices,
    refreshNotificationContext,
    refreshDashboardSnapshots,
    scheduleDashboardRefresh,
    refreshDashboardSymbolSpecsForMissingSymbols,
    refreshSocketAccessToken,
    seedDashboardSymbolPrices,
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const socket = dashboardSocketRef.current;
      if (!socket?.connected) {
        return;
      }

      const latestSnapshotMs = Math.max(summarySnapshotMsRef.current, ordersSnapshotMsRef.current);
      if (latestSnapshotMs > 0 && Date.now() - latestSnapshotMs < DASHBOARD_VISIBLE_REFRESH_STALE_MS) {
        return;
      }

      void refreshDashboardSnapshots();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshDashboardSnapshots]);

  const integrations = useMemo(
    () => [
      {
        key: 'mt',
        name: t.integrations.mt,
        status: state.mtAccounts
          ? t.integrations.status.accounts.replace('{count}', String(state.mtAccounts))
          : t.integrations.status.disconnected,
        connected: state.mtAccounts > 0,
      },
      {
        key: 'telegram',
        name: t.integrations.telegram,
        status: state.telegramConnected
          ? t.integrations.status.connected
          : t.integrations.status.disconnected,
        connected: state.telegramConnected,
      },
    ],
    [state, t.integrations]
  );

  const checklistItems = useMemo(
    () =>
      buildDashboardChecklistItems(
        checklist,
        t.checklist.defaults,
        t.checklist.status,
        translateChecklistLabel
      ),
    [checklist, t.checklist.defaults, t.checklist.status]
  );

  const checklistStats = useMemo(() => {
    const completed =
      checklist?.completed ?? checklistItems.filter((item) => item.completed).length;
    return { completed, total: checklist?.total ?? checklistItems.length };
  }, [checklist?.completed, checklist?.total, checklistItems]);
  const setupCompleted = checklist?.isCompleted ?? false;
  const shouldShowChecklist = !setupCompleted;

  const primaryMtAccount =
    mtAccountsList.find((account) => isSelectedMtAccount(account)) ??
    mtAccountsList.find((account) => account.connectionStatus === 'CONNECTED') ??
    mtAccountsList[0];
  const notificationMtAccountNumbersById = useMemo(() => {
    const entries = mtAccountsList.flatMap((account) => {
      const accountId = parseOptionalString(account.id);
      const accountNumber = parseOptionalString(account.accountNumber);
      return accountId && accountNumber ? [[accountId, accountNumber] as const] : [];
    });
    return Object.fromEntries(entries);
  }, [mtAccountsList]);
  const displayCurrency = primaryMtAccount?.currency ?? 'USD';
  const accountIdValue =
    formatAccountBadgeValue(primaryMtAccount?.accountNumber) ??
    formatAccountBadgeValue(primaryMtAccount?.id) ??
    formatAccountBadgeValue(primaryMtAccount?.server) ??
    formatAccountBadgeValue(primaryMtAccount?.company);
  const accountId = accountIdValue ? `#${accountIdValue}` : undefined;
  const canManageAccounts = mtAccountsList.length > 0;
  const displayName = profile
    ? `${profile.firstName ?? ''}`.trim() || t.fallbacks.displayName
    : t.fallbacks.displayName;
  const accountChips = useMemo(() => {
    if (!primaryMtAccount) return [];
    const chips: string[] = [];
    const type = resolveTradingModeLabel(primaryMtAccount.accountType, {
      real: t.accounts.types.real,
      demo: t.accounts.types.demo,
    });
    const platform = primaryMtAccount.platform ?? primaryMtAccount.accountType ?? 'MT';
    const method =
      primaryMtAccount.accountMethod ?? primaryMtAccount.server ?? t.accounts.types.standard;
    if (type) chips.push(type);
    chips.push(platform);
    chips.push(method);
    return chips.filter(Boolean);
  }, [primaryMtAccount, t.accounts.types.demo, t.accounts.types.real, t.accounts.types.standard]);

  const handleSubscriptionRequiredAction = useCallback(() => {
    if (billingDisabled) {
      void refreshConnections();
      return;
    }
    router.push(localizePath(lang, '/profile/subscription'));
  }, [billingDisabled, lang, refreshConnections, router]);

  const handleOrdersTabChange = useCallback((value: TabKey) => {
    if (value === activeOrdersTabRef.current) {
      return;
    }
    trackAnalyticsEvent('trades_tab_changed', { tab: value });
    setActiveTab(value);
    setOrdersPageByTab((current) => {
      if (current[value] === 1) {
        return current;
      }
      return {
        ...current,
        [value]: 1,
      };
    });
  }, []);

  const handleOrdersPageChange = useCallback((page: number) => {
    if (page < 1) {
      return;
    }
    setOrdersPageByTab((current) => {
      if ((current[activeOrdersTabRef.current] ?? 1) === page) {
        return current;
      }
      return {
        ...current,
        [activeOrdersTabRef.current]: page,
      };
    });
  }, []);

  const showSubscriptionRequiredState =
    !billingDisabled && dashboardStatus.subscriptionRequired;
  const hasConnections = state.mtAccounts > 0 || state.telegramConnected;
  const showQuickAction =
    !dashboardStatus.loading &&
    !dashboardStatus.error &&
    !showSubscriptionRequiredState &&
    !hasConnections;
  const activeTabKey = activeTab;
  const activeOrdersPage = ordersPageByTab[activeTabKey] ?? 1;
  const ordersList = useMemo(
    () => (ordersPageData?.orders ?? EMPTY_ORDERS_LIST).filter(hasStoredDashboardOrderId),
    [ordersPageData]
  );
  const ordersLocked =
    !billingDisabled && (showSubscriptionRequiredState || ordersSubscriptionRequired);
  const ordersLoading = ordersPageState.loading && !ordersLocked;
  const ordersError = ordersPageState.error && !ordersLocked;
  const tabCounts = {
    open: ordersCounts.open ?? 0,
    pending: ordersCounts.pending ?? 0,
    closed: ordersCounts.closed ?? 0,
  };
  const ordersPagination = ordersPageData?.pagination ?? {
    page: activeOrdersPage,
    limit: DASHBOARD_ORDERS_PAGE_SIZE,
    total: tabCounts[activeTabKey],
    totalPages: Math.ceil(tabCounts[activeTabKey] / DASHBOARD_ORDERS_PAGE_SIZE),
    hasMore: tabCounts[activeTabKey] > activeOrdersPage * DASHBOARD_ORDERS_PAGE_SIZE,
  };
  const canGoToPreviousOrdersPage = ordersPagination.page > 1;
  const canGoToNextOrdersPage =
    ordersPagination.totalPages > 0 && ordersPagination.page < ordersPagination.totalPages;

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderGroup>();

    ordersList.forEach((item) => {
      const trade = item;
      const channelLabel = resolveOrderChannelLabel(trade, t.orders.recentLabel);
      const groupLabel = channelLabel;
      const groupKey = `channel:${channelLabel}`;

      const existing = groups.get(groupKey);
      const pnl = resolveOrderPnlValue(trade) ?? 0;
      if (existing) {
        existing.items.push(trade);
        existing.totalPnl += pnl;
        if (!existing.channelPhotoUrl && trade.channelPhotoUrl) {
          existing.channelPhotoUrl = trade.channelPhotoUrl;
        }
        return;
      }

      groups.set(groupKey, {
        key: groupKey,
        label: groupLabel,
        items: [trade],
        totalPnl: pnl,
        channelPhotoUrl: trade.channelPhotoUrl,
      });
    });

    return Array.from(groups.values());
  }, [ordersList, t.orders.recentLabel]);

  const selectedOrder = useMemo(() => {
    if (!activeOrder) {
      return null;
    }
    if (!hasStoredDashboardOrderId(activeOrder)) {
      return null;
    }

    const activeOrderId = getDashboardOrderIdentity(activeOrder);
    if (!activeOrderId || !ordersPageData) {
      return {
        ...activeOrder,
        marketHours: resolveEffectiveTradeMarketHours(activeOrder.marketHours, marketHoursNowMs),
      };
    }

    const liveOrder = ordersPageData.orders.find(
      (order) => getDashboardOrderIdentity(order) === activeOrderId
    );
    const resolvedOrder = liveOrder ?? activeOrder;

    return {
      ...resolvedOrder,
      marketHours: resolveEffectiveTradeMarketHours(resolvedOrder.marketHours, marketHoursNowMs),
    };
  }, [activeOrder, marketHoursNowMs, ordersPageData]);

  const selectedOrderAction =
    selectedOrder?.status === 'open'
      ? t.orders.closeOrder
      : selectedOrder?.status === 'pending'
        ? t.orders.deleteOrder
        : null;
  const selectedOrderActionBlocked =
    (selectedOrder?.status === 'open' || selectedOrder?.status === 'pending') &&
    isTradeActionBlockedByMarketHours(selectedOrder?.marketHours);
  const selectedOrderActionReason = selectedOrderActionBlocked
    ? selectedOrder?.marketHours?.reasonMessage ?? 'Trading hours are currently unavailable for this symbol.'
    : null;
  const displayEquity = summary?.equity ?? null;
  const displayDeltaPnl = summary?.realizedPnl ?? summary?.pnl ?? null;
  const displayDeltaDenominator = summary?.balance ?? 0;
  const displayBrokerFloatingPnl =
    summary?.equity !== null &&
    summary?.equity !== undefined &&
    summary?.balance !== null &&
    summary?.balance !== undefined
      ? summary.equity - summary.balance
      : null;

  const handleChecklistNavigate = (key?: string, label?: string) => {
    const checklistItem: Partial<Record<string, ChecklistItemKey>> = {
      account: 'create_account',
      telegram: 'connect_telegram',
      mt: 'connect_mt',
    };
    const analyticsItem = key ? checklistItem[key] : undefined;
    if (analyticsItem) {
      trackAnalyticsEvent('checklist_item_clicked', { item: analyticsItem });
    }
    if (key === 'telegram' || label?.toLowerCase().includes('telegram')) {
      setTelegramSheetOpen(true);
      return;
    }
    if (
      key === 'mt' ||
      label?.toLowerCase().includes('mt4') ||
      label?.toLowerCase().includes('mt5')
    ) {
      setMtSheetOpen(true);
      return;
    }
    if (key === 'channels' || label?.toLowerCase().includes('channel')) {
      router.push(localizePath(lang, '/channels'));
    }
  };

  const handleCloseMtSheet = useCallback(() => {
    setMtSheetOpen(false);
  }, []);

  const handleCloseTelegramSheet = useCallback(() => {
    setTelegramSheetOpen(false);
  }, []);

  const handleDisconnectAccount = async (accountId?: string) => {
    if (!accountId) return;
    const confirmDelete = window.confirm(t.accounts.confirmDisconnect);
    if (!confirmDelete) return;
    setAccountActionId(accountId);
    try {
      await connectionsService.disconnectMtAccount(accountId);
      await refreshConnections();
      await refreshDashboardSnapshots();
      toast.success(t.accounts.toastDisconnected);
    } catch (error: unknown) {
      const code = getErrorCode(error);
      const message =
        (code === 'SELECTED_ACCOUNT_LOCKED' ? t.accounts.toastSelectedAccountProtected : null) ||
        getLocalizedErrorMessage(error, intlMessages) ||
        getErrorMessage(error) ||
        t.accounts.toastDisconnectError;
      toast.error(message);
    } finally {
      setAccountActionId(null);
    }
  };

  const handleOpenDeleteAccount = (account?: MtAccount) => {
    if (!account?.id || !account.accountNumber) {
      return;
    }
    setDeleteAccountConfirmation('');
    setPendingDeleteAccount({
      id: account.id,
      accountNumber: account.accountNumber,
      platform: account.platform ?? account.accountType ?? null,
      subscribedChannelsCount: account.subscribedChannels?.length ?? null,
    });
  };

  const handleConfirmDeleteAccount = async () => {
    if (!pendingDeleteAccount) {
      return;
    }

    if (deleteAccountConfirmation.trim() !== pendingDeleteAccount.accountNumber.trim()) {
      toast.error(t.accounts.toastDeleteConfirmMismatch);
      return;
    }

    setDeleteAccountLoading(true);
    setAccountActionId(pendingDeleteAccount.id);
    try {
      await connectionsService.deleteMtAccount(
        pendingDeleteAccount.id,
        deleteAccountConfirmation.trim()
      );
      if (pendingDeleteAccount.platform && pendingDeleteAccount.subscribedChannelsCount !== null) {
        trackAnalyticsEvent('mt_account_deleted', {
          mt_account_id: pendingDeleteAccount.id,
          platform: pendingDeleteAccount.platform,
          subscribed_channels_count: pendingDeleteAccount.subscribedChannelsCount,
        });
      }
      await refreshConnections();
      await refreshDashboardSnapshots();
      toast.success(t.accounts.toastDeleted);
      setPendingDeleteAccount(null);
      setDeleteAccountConfirmation('');
    } catch (error: unknown) {
      const code = getErrorCode(error);
      if (code === 'ACTIVE_TRADES_PRESENT') {
        toast.error(t.accounts.toastDeleteActiveTrades);
      } else if (code === 'SELECTED_ACCOUNT_LOCKED') {
        toast.error(t.accounts.toastSelectedAccountProtected);
      } else if (code === 'DELETE_CONFIRMATION_MISMATCH') {
        toast.error(t.accounts.toastDeleteConfirmMismatch);
      } else {
        const message =
          getLocalizedErrorMessage(error, intlMessages) ||
          getErrorMessage(error) ||
          t.accounts.toastDeleteError;
        toast.error(message);
      }
    } finally {
      setDeleteAccountLoading(false);
      setAccountActionId(null);
    }
  };

  const handleSetPrimary = async (accountId?: string) => {
    if (!accountId) return;
    setAccountActionId(accountId);
    try {
      await connectionsService.setSelectedMtAccount(accountId);
      const selectedAccount = mtAccountsList.find((account) => account.id === accountId);
      if (selectedAccount?.platform && selectedAccount.accountType) {
        trackAnalyticsEvent('mt_account_switched', {
          mt_account_id: accountId,
          platform: selectedAccount.platform,
          account_type: selectedAccount.accountType,
        });
      }
      await refreshConnections();
      await Promise.all([refreshDashboardSnapshots(), refreshNotificationContext()]);
      toast.success(t.accounts.toastPrimary);
      setPendingSwitchAccount(null);
    } catch (error: unknown) {
      const message =
        getLocalizedErrorMessage(error, intlMessages) ||
        getErrorMessage(error) ||
        t.accounts.toastPrimaryError;
      toast.error(message);
    } finally {
      setAccountActionId(null);
    }
  };

  const handlePromptSwitchAccount = (account?: MtAccount, platformLabel?: string) => {
    if (!account?.id || !account.accountNumber) {
      return;
    }
    setPendingSwitchAccount({
      id: account.id,
      accountNumber: account.accountNumber,
      platform: platformLabel ?? account.platform ?? account.accountType ?? 'MT5',
    });
  };

  const handleTelegramConnectionChange = useCallback(
    (connected: boolean) => {
      setState((prev) => ({ ...prev, telegramConnected: connected }));
      void refreshConnections();
    },
    [refreshConnections]
  );

  const requestOrderAction = useCallback((order: DashboardOrderRecord) => {
    if (order.status !== 'open' && order.status !== 'pending') {
      return;
    }
    const effectiveMarketHours = resolveEffectiveTradeMarketHours(order.marketHours);
    if (isTradeActionBlockedByMarketHours(effectiveMarketHours)) {
      return;
    }
    const action = order.status === 'open' ? 'close' : 'delete';
    setPendingOrderAction({
      order: {
        ...order,
        marketHours: effectiveMarketHours,
      },
      action,
    });
  }, []);

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
    const pendingOrder = pendingOrderAction.order;
    const orderIdForAnalytics = pendingOrder.ticketId ?? pendingOrder.orderId ?? orderId;
    const symbolForAnalytics = pendingOrder.symbol;
    const sideForAnalytics = pendingOrder.side?.toUpperCase();
    if (pendingOrderAction.action === 'close' && symbolForAnalytics && (sideForAnalytics === 'BUY' || sideForAnalytics === 'SELL')) {
      trackAnalyticsEvent('order_close_clicked', {
        order_id: orderIdForAnalytics,
        symbol: symbolForAnalytics,
        side: sideForAnalytics,
        profit: typeof pendingOrder.profit === 'number' ? pendingOrder.profit : null,
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
        pendingOrderAction.action === 'delete' ? t.orders.deleteOrder : t.orders.closeOrder
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
  }, [intlMessages, pendingOrderAction, t.orders.closeOrder, t.orders.deleteOrder]);

  return (
    <>
      {dashboardStatus.loading && <DashboardSkeleton />}
      {!dashboardStatus.loading && (
        <div className="dashboard-page">
          <div className="dashboard-top-row">
            <GreetingHeader
              name={displayName}
              accountId={accountId}
              onAccountClick={canManageAccounts ? () => setAccountsSheetOpen(true) : undefined}
            />
            <div className="dashboard-top-actions">
              <span className={`dashboard-live-indicator is-${wsStatus}`}>
                <span className="dashboard-live-dot" aria-hidden="true" />
                {wsStatus === 'connected'
                  ? t.status.live
                  : wsStatus === 'reconnecting'
                    ? t.status.reconnecting
                    : wsStatus === 'error'
                      ? t.status.offline
                      : t.status.connecting}
              </span>
              <IconButton label={t.notifications.label} onClick={handleNotificationsClick}>
                <i className="fa-regular fa-bell" aria-hidden="true" />
                {notificationsUnreadCount > 0 && <span className="dashboard-notification-dot" />}
              </IconButton>
            </div>
          </div>

          {accountChips.length > 0 && <AccountMetaChips chips={accountChips} />}

          <SubscriptionPausedNotice
            status={subscriptionStatus}
            href={localizePath(lang, '/profile/subscription')}
          />

          <BalanceSummary
            label={t.balanceLabel}
            amount={
              displayEquity !== null
                ? formatMoney(displayEquity, displayCurrency, locale)
                : '—'
            }
            delta={
              displayDeltaPnl !== null
                ? {
                    amount: `${displayDeltaPnl >= 0 ? '+' : '-'}${formatMoney(
                      Math.abs(displayDeltaPnl),
                      displayCurrency,
                      locale
                    )}`,
                    percent: formatDeltaPercent(displayDeltaPnl, displayDeltaDenominator),
                    trend: displayDeltaPnl > 0 ? 'up' : displayDeltaPnl < 0 ? 'down' : 'flat',
                  }
                : { amount: '—', percent: '—', trend: 'flat' }
            }
            secondary={
              displayBrokerFloatingPnl !== null
                ? {
                    label: t.pnl.brokerFloating,
                    amount: `${displayBrokerFloatingPnl >= 0 ? '+' : '-'}${formatMoney(
                      Math.abs(displayBrokerFloatingPnl),
                      displayCurrency,
                      locale
                    )}`,
                    trend:
                      displayBrokerFloatingPnl > 0
                        ? 'up'
                        : displayBrokerFloatingPnl < 0
                          ? 'down'
                          : 'flat',
                  }
                : { label: t.pnl.brokerFloating, amount: '—', trend: 'flat' }
            }
          />

          {showQuickAction && (
            <QuickActionButton
              title={t.quickAction.title}
              subtitle={t.quickAction.subtitle}
              icon={<i className="fa-solid fa-link" aria-hidden="true" />}
              onClick={() => setMtSheetOpen(true)}
            />
          )}

          <div
            className={cn('dashboard-grid', !shouldShowChecklist && 'dashboard-grid--no-checklist')}
          >
            <section className="dashboard-area dashboard-area-connections">
              <SectionHeader
                title={t.connections.title}
                action={
                  showSubscriptionRequiredState ? (
                    <button
                      type="button"
                      className="dashboard-link-button"
                      onClick={handleSubscriptionRequiredAction}
                    >
                      {t.connections.subscriptionAction}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dashboard-link-button"
                      onClick={() => setAccountsSheetOpen(true)}
                    >
                      {t.connections.manage}
                    </button>
                  )
                }
              />
              {dashboardStatus.loading ? (
                <GlassCard className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.connections.loadingTitle}</p>
                  <p className="dashboard-message-subtitle">{t.connections.loadingSubtitle}</p>
                </GlassCard>
              ) : showSubscriptionRequiredState ? (
                <GlassCard className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">
                    {t.connections.subscriptionRequiredTitle}
                  </p>
                  <p className="dashboard-message-subtitle">
                    {t.connections.subscriptionRequiredSubtitle}
                  </p>
                  <button
                    type="button"
                    className="dashboard-link-button"
                    onClick={handleSubscriptionRequiredAction}
                  >
                    {t.connections.subscriptionAction}
                  </button>
                </GlassCard>
              ) : dashboardStatus.error ? (
                <GlassCard className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.connections.errorTitle}</p>
                  <p className="dashboard-message-subtitle">{t.connections.errorSubtitle}</p>
                </GlassCard>
              ) : !hasConnections ? (
                <GlassCard className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.connections.emptyTitle}</p>
                  <p className="dashboard-message-subtitle">{t.connections.emptySubtitle}</p>
                </GlassCard>
              ) : (
                <IntegrationCarousel>
                  {integrations.map((item) => (
                    <IntegrationCard
                      key={item.name}
                      name={item.name}
                      status={item.status}
                      connected={item.connected}
                      connectedLabel={t.connections.connectedLabel}
                      actionLabel={t.connections.actionLabel}
                      onActionClick={
                        item.key === 'mt'
                          ? () => setMtSheetOpen(true)
                          : item.key === 'telegram'
                            ? () => setTelegramSheetOpen(true)
                            : undefined
                      }
                    />
                  ))}
                </IntegrationCarousel>
              )}
            </section>

            {shouldShowChecklist && (
              <section className="dashboard-area dashboard-area-checklist">
                {dashboardStatus.loading ? (
                  <GlassCard className="dashboard-message-card dashboard-card-muted">
                    <p className="dashboard-message-title">{t.checklist.loadingTitle}</p>
                    <p className="dashboard-message-subtitle">{t.checklist.loadingSubtitle}</p>
                  </GlassCard>
                ) : showSubscriptionRequiredState ? (
                  <GlassCard className="dashboard-message-card dashboard-card-muted">
                    <p className="dashboard-message-title">
                      {t.checklist.subscriptionRequiredTitle}
                    </p>
                    <p className="dashboard-message-subtitle">
                      {t.checklist.subscriptionRequiredSubtitle}
                    </p>
                    <button
                      type="button"
                      className="dashboard-link-button"
                      onClick={handleSubscriptionRequiredAction}
                    >
                      {t.checklist.subscriptionAction}
                    </button>
                  </GlassCard>
                ) : dashboardStatus.error ? (
                  <GlassCard className="dashboard-message-card dashboard-card-muted">
                    <p className="dashboard-message-title">{t.checklist.errorTitle}</p>
                    <p className="dashboard-message-subtitle">{t.checklist.errorSubtitle}</p>
                  </GlassCard>
                ) : checklistItems.length === 0 ? (
                  <GlassCard className="dashboard-message-card dashboard-card-muted">
                    <p className="dashboard-message-title">{t.checklist.emptyTitle}</p>
                    <p className="dashboard-message-subtitle">{t.checklist.emptySubtitle}</p>
                  </GlassCard>
                ) : (
                  <ChecklistCard
                    title={t.checklist.title}
                    subtitle={t.checklist.subtitle}
                    total={checklistStats.total}
                    completed={checklistStats.completed}
                  >
                    {checklistItems.map((item) => (
                      <ChecklistItemRow
                        key={item.label}
                        label={item.label}
                        completed={item.completed}
                        trailingChevron={item.chevron}
                        status={item.status}
                        onClick={() => handleChecklistNavigate(item.key, item.label)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleChecklistNavigate(item.key, item.label);
                          }
                        }}
                      />
                    ))}
                  </ChecklistCard>
                )}
              </section>
            )}

            <section className="dashboard-area dashboard-area-orders">
              <GlassCard className="dashboard-orders">
                <SectionHeader title={t.orders.title} />
                <SegmentedTabs
                  tabs={tabs}
                  active={activeTab}
                  onChange={(value) => handleOrdersTabChange(value as TabKey)}
                  counts={tabCounts}
                  ariaLabel={t.orders.tabsAria}
                />
                {ordersLocked || ordersLoading || ordersError || ordersList.length === 0 ? (
                  <OrdersEmptyState
                    title={
                      ordersLocked
                        ? t.orders.subscriptionRequiredTitle
                        : ordersLoading
                          ? t.orders.loadingTitle
                          : ordersError
                            ? t.orders.errorTitle
                            : t.orders.emptyTitle.replace(
                                '{tab}',
                                tabs.find((tab) => tab.id === activeTab)?.label ?? ''
                              )
                    }
                    subtitle={
                      ordersLocked
                        ? t.orders.subscriptionRequiredSubtitle
                        : ordersLoading
                          ? t.orders.loadingSubtitle
                          : ordersError
                            ? t.orders.errorSubtitle
                            : setupCompleted
                              ? t.orders.emptySetupCompleteSubtitle.replace(
                                  '{tab}',
                                  tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase() ??
                                    ''
                                )
                              : t.orders.emptySubtitle
                    }
                    imageAlt={t.orders.emptyIllustrationAlt}
                  />
                ) : (
                  <>
                    <div className="dashboard-orders-groups">
                      {groupedOrders.map((group) => {
                        const groupPnlTrend =
                          group.totalPnl > 0 ? 'is-up' : group.totalPnl < 0 ? 'is-down' : 'is-flat';

                        return (
                          <div className="dashboard-order-group" key={group.key}>
                            <div className="dashboard-order-group-header">
                              <div className="dashboard-order-group-main">
                                <ChannelAvatar
                                  imageUrl={group.channelPhotoUrl}
                                  className="dashboard-order-group-avatar"
                                />
                                <p className="dashboard-order-group-title">{group.label}</p>
                              </div>
                              <span className={cn('dashboard-order-group-pnl', groupPnlTrend)}>
                                <i
                                  className={cn(
                                    'fa-solid',
                                    group.totalPnl < 0
                                      ? 'fa-arrow-trend-down'
                                      : group.totalPnl > 0
                                        ? 'fa-arrow-trend-up'
                                        : 'fa-minus'
                                  )}
                                  aria-hidden="true"
                                />
                                {`${group.totalPnl >= 0 ? '+' : '-'}${formatMoney(
                                  Math.abs(group.totalPnl),
                                  displayCurrency,
                                  locale
                                )}`}
                              </span>
                            </div>

                            {group.items.map((trade, index) => {
                              const pnl = resolveOrderPnlValue(trade);
                              const topPrice = resolveTopPrice(trade);
                              const pnlTrend =
                                pnl !== undefined
                                  ? pnl > 0
                                    ? 'up'
                                    : pnl < 0
                                      ? 'down'
                                      : 'flat'
                                  : 'flat';
                              const pnlLabel =
                                pnl !== undefined
                                  ? `${pnl >= 0 ? '+' : '-'}${formatMoney(
                                      Math.abs(pnl),
                                      displayCurrency,
                                      locale
                                    )}`
                                  : undefined;
                              const sideLabel = translateSide(trade.side, t.orders);
                              const sideTone =
                                trade.side?.toUpperCase() === 'BUY'
                                  ? 'buy'
                                  : trade.side?.toUpperCase() === 'SELL'
                                    ? 'sell'
                                    : 'neutral';
                              const ticketLabel =
                                trade.ticketId ?? trade.orderId ?? trade.id ?? null;
                              const activityTime = formatTimeLabel(
                                resolveTradeOrderRowTime(trade),
                                locale
                              );
                              const orderMeta = ticketLabel
                                ? `#${ticketLabel}${activityTime !== '—' ? ` • ${activityTime}` : ''}`
                                : activityTime;
                              const closeReasonBadge = resolveCloseReasonBadge(
                                trade.closeReason,
                                trade.closeTpLevel,
                                t.orders.closeReasonValues
                              );
                              const tpProgress = getTradeTakeProfitProgress(
                                trade.takeProfitTargets ?? []
                              );
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
                              const swipeActionLabel =
                                marketHoursBlocked
                                  ? undefined
                                  : trade.status === 'open'
                                  ? t.orders.closeAction
                                  : trade.status === 'pending'
                                    ? t.orders.deleteAction
                                    : undefined;
                              const swipeActionIcon =
                                marketHoursBlocked ? undefined : trade.status === 'open' ? (
                                  <CloseOrderActionIcon />
                                ) : trade.status === 'pending' ? (
                                  <DeleteOrderActionIcon />
                                ) : undefined;

                              return (
                                <OrdersListRow
                                  key={
                                    trade.id ?? `${trade.symbol ?? 'trade'}-${group.key}-${index}`
                                  }
                                  className="dashboard-home-order-card"
                                  leading={
                                    <SymbolPairBadge
                                      symbol={trade.symbol ?? ''}
                                      size="sm"
                                      className="dashboard-order-flag"
                                    />
                                  }
                                  title={trade.symbol ?? t.orders.symbolFallback}
                                  sideText={sideLabel}
                                  sideTone={sideTone}
                                  entryText={
                                    trade.volume
                                      ? `${formatLotsLabel(trade.volume, locale)} ${t.orders.lotLabel} ${t.orders.atLabel} ${formatPriceLabel(
                                          trade.entryPrice,
                                          locale,
                                          trade.priceDigits
                                        )}`
                                      : t.orders.volumePending
                                  }
                                  meta={orderMeta}
                                  status={translateOrderStatus(
                                    trade.status,
                                    t.orders,
                                    trade.orderType
                                  )}
                                  amount={
                                    topPrice !== undefined
                                      ? formatPriceLabel(topPrice, locale, trade.priceDigits)
                                      : undefined
                                  }
                                  pnl={pnlLabel}
                                  pnlTrend={pnlTrend}
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
                                  swipeActionLabel={swipeActionLabel}
                                  swipeActionIcon={swipeActionIcon}
                                  onSwipeAction={() => requestOrderAction(trade)}
                                  onClick={() => {
                                    const side = trade.side?.toUpperCase();
                                    const orderId = trade.ticketId ?? trade.orderId ?? trade.id;
                                    if (orderId && trade.symbol && (side === 'BUY' || side === 'SELL')) {
                                      trackAnalyticsEvent('order_details_viewed', {
                                        order_id: orderId,
                                        symbol: trade.symbol,
                                        side,
                                        status: trade.status ?? activeTab,
                                      });
                                    }
                                    setActiveOrder(trade);
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {ordersPagination.totalPages > 1 && (
                      <div className="dashboard-orders-pagination">
                        <button
                          type="button"
                          className="dashboard-orders-pagination-button"
                          onClick={() => handleOrdersPageChange(ordersPagination.page - 1)}
                          disabled={!canGoToPreviousOrdersPage}
                        >
                          {t.orders.pagination.previous}
                        </button>
                        <span className="dashboard-orders-pagination-label">
                          {t.orders.pagination.pageLabel
                            .replace('{page}', String(ordersPagination.page))
                            .replace('{total}', String(ordersPagination.totalPages))}
                        </span>
                        <button
                          type="button"
                          className="dashboard-orders-pagination-button"
                          onClick={() => handleOrdersPageChange(ordersPagination.page + 1)}
                          disabled={!canGoToNextOrdersPage}
                        >
                          {t.orders.pagination.next}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </GlassCard>
            </section>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsSheet
          order={selectedOrder}
          labels={t.orders}
          locale={locale}
          currency={displayCurrency}
          actionLabel={selectedOrderAction ?? undefined}
          actionDisabled={selectedOrderActionBlocked}
          actionReason={selectedOrderActionReason}
          onAction={() => requestOrderAction(selectedOrder)}
          onClose={() => setActiveOrder(null)}
        />
      )}

      {accountsSheetOpen && (
        <div className="dashboard-sheet-backdrop" onClick={() => setAccountsSheetOpen(false)}>
          <div className="dashboard-accounts-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="dashboard-accounts-header">
              <h2>{t.accounts.title.replace('{count}', String(mtAccountsList.length))}</h2>
              <button
                type="button"
                className="dashboard-accounts-add"
                onClick={() => setMtSheetOpen(true)}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </div>
            <div className="dashboard-accounts-list">
              {accountsStatus.loading ? (
                <div className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.accounts.loadingTitle}</p>
                </div>
              ) : accountsStatus.error ? (
                <div className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.accounts.errorTitle}</p>
                  <p className="dashboard-message-subtitle">{t.accounts.errorSubtitle}</p>
                </div>
              ) : mtAccountsList.length === 0 ? (
                <div className="dashboard-message-card dashboard-card-muted">
                  <p className="dashboard-message-title">{t.accounts.emptyTitle}</p>
                  <p className="dashboard-message-subtitle">{t.accounts.emptySubtitle}</p>
                </div>
              ) : (
                mtAccountsList.map((account) => {
                  const accountType = resolveTradingModeLabel(account.accountType, {
                    real: t.accounts.types.real,
                    demo: t.accounts.types.demo,
                  });
                  const platform = account.platform ?? account.accountType ?? 'MT5';
                  const accountMethod =
                    account.accountMethod ?? account.server ?? t.accounts.types.standard;
                  const status = account.connectionStatus ?? 'DISCONNECTED';
                  const accountMetrics = resolveAccountCardMetrics(account);
                  const isPrimary = isSelectedMtAccount(account);
                  const canModifyAccount = !isPrimary;
                  const subscribedChannels = account.subscribedChannels ?? [];
                  const accountChips = [
                    accountType
                      ? {
                          label: accountType,
                          tone: 'accent' as const,
                        }
                      : null,
                    {
                      label: platform,
                      tone: 'muted' as const,
                    },
                    accountMethod
                      ? {
                          label: accountMethod,
                          tone: 'muted' as const,
                        }
                      : null,
                    status !== 'CONNECTED'
                      ? {
                          label:
                            status === 'ERROR'
                              ? t.accounts.status.error
                              : t.accounts.status.offline,
                          tone: status === 'ERROR' ? ('error' as const) : ('muted' as const),
                        }
                      : null,
                  ].filter(
                    (value): value is { label: string; tone: 'accent' | 'muted' | 'error' } =>
                      Boolean(value)
                  );

                  const amountLabel = isFiniteNumber(accountMetrics.amount)
                    ? formatMoney(accountMetrics.amount, accountMetrics.currency, locale)
                    : '—';
                  const pnlLabel =
                    accountMetrics.pnl === null
                      ? '—'
                      : `${accountMetrics.pnl >= 0 ? '+' : '-'}${formatMoney(
                          Math.abs(accountMetrics.pnl),
                          accountMetrics.currency,
                          locale
                        )}`;
                  const pnlTrend =
                    accountMetrics.pnl === null ? null : accountMetrics.pnl >= 0 ? 'up' : 'down';

                  return (
                    <MtAccountSheetCard
                      key={account.id}
                      accountNumber={account.accountNumber ?? '—'}
                      amountLabel={amountLabel}
                      pnlLabel={pnlLabel}
                      pnlTrend={pnlTrend}
                      chips={accountChips}
                      channels={subscribedChannels}
                      isSelected={isPrimary}
                      disabled={accountActionId === account.id || deleteAccountLoading}
                      onSelect={
                        isPrimary ? undefined : () => handlePromptSwitchAccount(account, platform)
                      }
                      onDisconnect={
                        canModifyAccount ? () => handleDisconnectAccount(account.id) : undefined
                      }
                      onDelete={
                        canModifyAccount ? () => handleOpenDeleteAccount(account) : undefined
                      }
                      setPrimaryLabel={t.accounts.actions.setPrimary}
                      selectedLabel={t.accounts.status.primary}
                      disconnectLabel={t.accounts.actions.disconnect}
                      deleteLabel={t.accounts.actions.delete}
                      disconnectAriaLabel={`${t.accounts.actions.disconnect} #${account.accountNumber}`}
                      deleteAriaLabel={`${t.accounts.actions.delete} #${account.accountNumber}`}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <CloseOrderModal
        open={Boolean(pendingOrderAction)}
        orderName={pendingOrderAction?.order.symbol ?? t.orders.sheetFallback}
        channelName={
          pendingOrderAction
            ? resolveOrderChannelLabel(pendingOrderAction.order, '')
            : undefined
        }
        confirmLabel={
          pendingOrderAction?.action === 'delete' ? t.orders.deleteAction : t.orders.closeAction
        }
        cancelLabel="No"
        onConfirm={handleConfirmOrderAction}
        onClose={() => setPendingOrderAction(null)}
        isConfirming={orderActionLoading}
      />

      <DeleteMtAccountModal
        open={Boolean(pendingDeleteAccount)}
        title={t.accounts.deleteModalTitle}
        subtitle={
          pendingDeleteAccount
            ? `${t.accounts.deleteModalSubtitle} #${pendingDeleteAccount.accountNumber}`
            : t.accounts.deleteModalSubtitle
        }
        inputLabel={t.accounts.deleteModalInputLabel}
        inputPlaceholder={t.accounts.deleteModalInputPlaceholder}
        cancelLabel={t.accounts.deleteModalCancel}
        confirmLabel={t.accounts.deleteModalConfirm}
        typedValue={deleteAccountConfirmation}
        onTypedChange={setDeleteAccountConfirmation}
        onConfirm={handleConfirmDeleteAccount}
        onClose={() => {
          if (!deleteAccountLoading) {
            setPendingDeleteAccount(null);
            setDeleteAccountConfirmation('');
          }
        }}
        isConfirming={deleteAccountLoading}
      />

      <ConfirmMtAccountSwitchModal
        open={Boolean(pendingSwitchAccount)}
        title={t.accounts.switchModalTitle}
        subtitle={t.accounts.switchModalSubtitle
          .replace('{platform}', pendingSwitchAccount?.platform ?? '')
          .replace('{accountNumber}', pendingSwitchAccount?.accountNumber ?? '')}
        cancelLabel={t.accounts.switchModalCancel}
        confirmLabel={t.accounts.switchModalConfirm}
        onConfirm={() => handleSetPrimary(pendingSwitchAccount?.id)}
        onClose={() => {
          if (!accountActionId) {
            setPendingSwitchAccount(null);
          }
        }}
        isConfirming={accountActionId === pendingSwitchAccount?.id}
      />

      <MtConnectSheet
        open={mtSheetOpen}
        onClose={handleCloseMtSheet}
        onConnected={refreshConnections}
      />

      <TelegramConnectSheet
        open={telegramSheetOpen}
        onClose={handleCloseTelegramSheet}
        onConnected={handleTelegramConnectionChange}
        defaultCountry={defaultCountry}
      />

      <NotificationsModal
        open={notificationsOpen}
        onClose={handleNotificationsClose}
        threads={notificationThreads}
        title={t.notifications.title}
        selectedContextLabel={intlMessages.dashboardPage.notificationsModal.allAccounts}
        isLoading={notificationsLoading}
        hasMore={notificationsHasMore}
        isLoadingMore={notificationsLoadingMore}
        isMarkingAllRead={notificationsMarkingAllRead}
        canMarkAllRead={
          notificationsUnreadCount > 0 ||
          notificationThreads.some((thread) => thread.hasUnread || thread.unreadCount > 0)
        }
        onLoadMore={handleNotificationsLoadMore}
        onLoadMoreThreadEvents={handleNotificationsLoadMoreThreadEvents}
        loadingThreadEventIds={notificationThreadEventLoadingIds}
        onMarkAllRead={handleNotificationsMarkAllRead}
        onOpenThread={handleNotificationsOpenThread}
        loadingThreadIds={notificationThreadLoadingIds}
        mtAccountNumbersById={notificationMtAccountNumbersById}
      />
    </>
  );
}
