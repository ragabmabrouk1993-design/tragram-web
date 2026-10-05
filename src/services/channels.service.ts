import {
  deleteApiTelegramChannelsSubscriptionsBySubscriptionId,
  getApiTelegramChannelsCatalog,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdOrders,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdChart,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMeta,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdSummary,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdSymbols,
  getApiTelegramChannelsSymbols,
  patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettings,
  patchApiTelegramChannelsSubscriptionsBySubscriptionIdToggle,
  postApiTelegramAuthDisconnect,
  postApiTelegramAuthRequestCode,
  postApiTelegramAuthVerifyCode,
  postApiTelegramAuthVerifyPassword,
  postApiTelegramChannelsRegister,
  postApiTelegramChannelsRefresh,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigration,
  getApiTelegramChannelsRequestsByRequestId,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdHealth,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccess,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistory,
} from '@/lib/api-client';
import type {
  TelegramChannelSubscriptionHealthResponse,
  TelegramRequestCodeResponse,
  TelegramVerifyResponse,
} from '@/lib/api-client';
import type {
  ChannelSymbolCatalogResponse,
  ChannelSymbolPolicy,
  SubscriptionReadStatus,
} from '@/lib/api-client';
import { initApiClient } from '@/lib/api-client-setup';
import { normalizeSubscriptionReadStatus, type NormalizedSubscriptionReadStatus } from '@/lib/subscription-read-status';

initApiClient();

type TelegramChannel = {
  id?: string;
  title?: string;
  username?: string;
  participantsCount?: number;
  isChannel?: boolean;
  isGroup?: boolean;
  photoUrl?: string;
  peerId?: string;
  peerKey?: string;
  numericId?: string;
  peerNamespace?: 'CHANNEL' | 'CHAT';
  kind?: 'BROADCAST' | 'SUPERGROUP' | 'BASIC_GROUP' | 'UNKNOWN';
  photoStatus?: string;
  metadataObservedAt?: string | null;
  metadataState?: string;
  accessState?: string;
};

type TelegramChannelSubscription = {
  id: string;
  mtAccountId?: string | null;
  accountCurrency?: string | null;
  isSelectedContext?: boolean;
  channelId: string;
  channelTitle?: string;
  channelUsername?: string;
  photoUrl?: string;
  participantsCount?: number;
  performance?: {
    value?: number;
    returnPercent?: number | null;
    trend?: 'up' | 'down' | 'flat';
    currency?: string;
  };
  enabled?: boolean;
  allowedSymbols?: string[];
  symbolPolicy?: ChannelSymbolPolicy;
  riskPerTrade?: number;
  riskPercentage?: number;
  riskMode?: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_LOT';
  fixedLotSize?: number | null;
  maxLots?: number;
  maxSlPips?: number | null;
  rejectIfTp1PipsLessThanSlPips?: boolean;
  minLotsOverride?: boolean;
  lotRoundingMode?: 'FLOOR' | 'ROUND' | 'CEIL';
  maxDailyTrades?: number | null;
  maxActiveOrders?: number | null;
  duplicateSignalTimeoutMinutes?: number;
  spreadAdjustment?: number;
  breakEvenEnabled?: boolean;
  breakEvenMode?: 'FIXED_PIPS' | 'TP_HIT';
  breakEvenTrigger?: number;
  breakEvenTpTarget?: number;
  breakEvenProfitLockPips?: number;
  trailingStopEnabled?: boolean;
  trailingStopMode?: 'STEP_PIPS' | 'TP_LEVELS';
  trailingStopStepTriggerPips?: number;
  trailingStopStepMovePips?: number;
  signalPendingOrderHandlingEnabled?: boolean;
  limitOrderExpirationMinutes?: number | null;
  tpExecutionMode?: 'ALL' | 'SPECIFIC';
  tpExecutionTarget?: string;
  tpExecutionTargets?: string[];
  customTpPercentages?: Record<string, number>;
  allowExecutionWithoutSlTp?: boolean;
  allowProviderSlWidening?: boolean;
  allowForwardedSignals?: boolean;
  marketEntryToleranceMode?: 'EXACT' | 'PIPS';
  marketEntryTolerancePips?: number | null;
  missingSlConfig?: {
    pips: number;
    overrides?: Record<string, { pips: number }>;
  } | null;
  subscribedAt?: string;
  lastSyncAt?: string;
  subscriptionPaused?: boolean;
  subscriptionPauseReason?: SubscriptionReadStatus['subscriptionPauseReason'] | null;
  subscriptionPauseMessage?: string | null;
  registrationState?: 'PENDING_ACCESS' | 'ACTIVE' | 'REJECTED' | 'MIGRATED';
  accessRequestId?: string | null;
  accessState?: string;
  metadataState?: string;
  metadataObservedAt?: string | null;
  photoStatus?: string;
  peerNamespace?: 'CHANNEL' | 'CHAT';
  kind?: 'BROADCAST' | 'SUPERGROUP' | 'BASIC_GROUP' | 'UNKNOWN';
};

type TelegramChannelRegistrationState = {
  isRegistered: boolean;
  state?: 'PENDING_ACCESS' | 'ACTIVE' | 'REJECTED' | 'MIGRATED';
  accessRequestId?: string | null;
  subscriptionId?: string | null;
  mtAccountId?: string | null;
  enabled?: boolean | null;
  subscribedAt?: string | null;
  subscriptionPaused?: boolean;
  subscriptionPauseReason?: string | null;
  subscriptionPauseMessage?: string | null;
  entitlementRestrictionReason?: string | null;
};

type TelegramChannelCatalogItem = TelegramChannel & {
  registrationState: TelegramChannelRegistrationState;
  performance?: TelegramChannelSubscription['performance'];
};

export type TelegramCatalogRefresh = {
  requestId: string | null;
  status: 'QUEUED' | 'RUNNING' | 'WAITING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'IDLE';
  complete: boolean;
  observedItems: number;
  lastCompletedAt: string | null;
  nextAttemptAt: string | null;
  reasonCode: string | null;
  catalogVersion: string;
};

export type TelegramChannelSubscriptionHealth = TelegramChannelSubscriptionHealthResponse['data'];

type DeleteChannelSubscriptionResponse = {
  success: boolean;
  message: string;
  deletedSubscriptionId: string;
  telegramChannelId: string;
  mtAccountId?: string | null;
  channelTitle?: string | null;
};

type RequestCodeResponse = TelegramRequestCodeResponse;
type VerifyCodeResponse = TelegramVerifyResponse;

type ApiListResponse<T> = {
  success?: boolean;
  message?: string;
  channels?: T[];
};

type ChannelLists = {
  available: TelegramChannelCatalogItem[];
  registered: TelegramChannelSubscription[];
};

export type ChannelCatalogWithStatus = {
  channels: TelegramChannelCatalogItem[];
  status: NormalizedSubscriptionReadStatus;
  refresh: TelegramCatalogRefresh | null;
  pagination?: {
    mode?: string;
    limit?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
    previousCursor?: string | null;
  };
};

const mapCatalogItemToSubscription = (
  channel: TelegramChannelCatalogItem
): TelegramChannelSubscription | null => {
  const subscriptionId = channel.registrationState.subscriptionId;
  if (!subscriptionId) {
    return null;
  }

  return {
    id: subscriptionId,
    mtAccountId: channel.registrationState.mtAccountId ?? null,
    isSelectedContext: true,
    channelId: channel.id ?? '',
    channelTitle: channel.title,
    channelUsername: channel.username,
    photoUrl: channel.photoUrl,
    participantsCount: channel.participantsCount,
    performance: channel.performance,
    enabled: channel.registrationState.enabled ?? undefined,
    registrationState: channel.registrationState.state,
    accessRequestId: channel.registrationState.accessRequestId ?? null,
    accessState: channel.accessState,
    metadataState: channel.metadataState,
    metadataObservedAt: channel.metadataObservedAt,
    photoStatus: channel.photoStatus,
    peerNamespace: channel.peerNamespace,
    kind: channel.kind,
    subscribedAt: channel.registrationState.subscribedAt ?? undefined,
    ...(channel.registrationState.subscriptionPaused !== undefined
      ? { subscriptionPaused: channel.registrationState.subscriptionPaused }
      : {}),
    ...(channel.registrationState.subscriptionPauseReason !== undefined
      ? { subscriptionPauseReason: channel.registrationState.subscriptionPauseReason as TelegramChannelSubscription['subscriptionPauseReason'] }
      : {}),
    ...(channel.registrationState.subscriptionPauseMessage !== undefined
      ? { subscriptionPauseMessage: channel.registrationState.subscriptionPauseMessage }
      : {}),
  };
};

type ChannelSummary = {
  channel: {
    id: string;
    channelId: string;
    title?: string | null;
    username?: string | null;
    members?: number | null;
    photoUrl?: string | null;
  };
  performance: {
    value?: number;
    financialResult: number;
    returnPercent: number | null;
    currency: string;
    trend: 'up' | 'down' | 'flat';
  };
  stats?: ChannelStatsV2 | null;
};

type ChannelStatsBreakdownEntry = {
  count: number;
  netProfit: number;
};

type ChannelStatsV2 = {
  schemaVersion: 2;
  status: 'READY' | 'STALE' | 'REBUILDING' | 'FAILED';
  calculatedAt: string | Date | null;
  staleAfter: string | Date | null;
  signals: {
    observed: number;
    executedFinal: number;
    superseded: number;
    cancelled: number;
    failed: number;
  };
  executions: {
    total: number;
    executed: number;
    rejectedPolicy: number;
    rejectedBroker: number;
    failed: number;
    cancelled: number;
  };
  trades: {
    opened: number;
    open: number;
    closed: number;
    cancelled: number;
    pendingExpired: number;
  };
  realized: {
    total: number;
    wins: number;
    losses: number;
    breakeven: number;
    grossProfit: number;
    grossLoss: number;
    netProfit: number;
    profitFactor: number | null;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    byCloseReason: Record<string, ChannelStatsBreakdownEntry>;
    bySource: Record<string, ChannelStatsBreakdownEntry>;
  };
  executionDelay: {
    avgMs: number;
    samples: number;
    lastMs: number | null;
  };
};

type ChannelChartPoint = {
  date: string;
  value: number;
};

type ChannelChartResponse = {
  range: string;
  points: ChannelChartPoint[];
  totalProfit: number;
  minValue?: number | null;
  maxValue?: number | null;
  previousPeriod?: {
    totalProfit: number;
    from: string;
    to: string;
  } | null;
};

type ChannelOrdersResponse = {
  status: string;
  counts: {
    open: number;
    pending: number;
    closed: number;
  };
  orders: Array<Record<string, unknown>>;
  symbolPrices?: Record<string, unknown>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const resolveOrderIdentity = (order: Record<string, unknown>): string | null => {
  const id = typeof order.id === 'string' && order.id.trim().length > 0 ? order.id.trim() : null;
  const orderId =
    typeof order.orderId === 'string' && order.orderId.trim().length > 0
      ? order.orderId.trim()
      : null;
  const ticketId =
    typeof order.ticketId === 'string' && order.ticketId.trim().length > 0
      ? order.ticketId.trim()
      : null;
  return id ?? orderId ?? ticketId;
};

export const mergeChannelOrdersMarketHours = (
  current: ChannelOrdersResponse | null | undefined,
  next: ChannelOrdersResponse
): ChannelOrdersResponse => {
  if (!current || current.orders.length === 0 || next.orders.length === 0) {
    return next;
  }

  const previousByIdentity = new Map<string, Record<string, unknown>>();
  current.orders.forEach((order) => {
    const identity = resolveOrderIdentity(order);
    if (identity) {
      previousByIdentity.set(identity, order);
    }
  });

  if (previousByIdentity.size === 0) {
    return next;
  }

  return {
    ...next,
    orders: next.orders.map((order) => {
      if ('marketHours' in order) {
        return order;
      }

      const identity = resolveOrderIdentity(order);
      const previous = identity ? previousByIdentity.get(identity) : null;
      if (!previous || !('marketHours' in previous)) {
        return order;
      }

      return {
        ...order,
        marketHours: previous.marketHours,
      };
    }),
  };
};

type ChannelOrdersPayloadFallback = {
  status: string;
  page: number;
  limit: number;
};

type ChannelSymbol = {
  symbol: string;
  base: string | null;
  quote: string | null;
  display: string;
  baseCountry: string | null;
  quoteCountry: string | null;
};

type SymbolsCatalogResponse = {
  symbols: ChannelSymbol[];
  source?:
    | 'CONNECTED_ACCOUNT'
    | 'ACTIVE_ACCOUNT_FALLBACK'
    | 'REQUESTED_ACCOUNT'
    | 'SELECTED_ACCOUNT'
    | 'NONE'
    | string;
  message?: string;
};

type ChannelSettingsMetaResponse = {
  subscription: TelegramChannelSubscription;
  options: {
    riskModes: Array<'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_LOT'>;
    lotRoundingModes: Array<'FLOOR' | 'ROUND' | 'CEIL'>;
    marketEntryToleranceModes?: Array<'EXACT' | 'PIPS'>;
    breakEvenModes: Array<'TP_HIT' | 'FIXED_PIPS'>;
    trailingStopModes?: Array<'STEP_PIPS' | 'TP_LEVELS'>;
    tpExecutionModes: Array<'ALL' | 'SPECIFIC'>;
    tpTargets: string[];
    customTpPercentTotal: number;
    constraints?: {
      maxActiveOrders?: { min: number; max: number | null; step?: number };
      maxDailyTrades?: { min: number; max: number | null; step?: number };
      duplicateSignalTimeoutMinutes?: { min: number; max: number | null; step?: number };
      riskPerTrade?: { min: number; max: number | null; step?: number };
      fixedLotSize?: { min: number; max: number | null; step?: number };
      riskPercentage?: { min: number; max: number | null; step?: number };
      maxLots?: { min: number; max: number | null; step?: number };
      maxSlPips?: { min: number; max: number | null; step?: number };
      limitOrderExpirationMinutes?: { min: number; max: number | null; step?: number };
      marketEntryTolerancePips?: { min: number; max: number | null; step?: number };
      missingSlPips?: { min: number; max: number | null; step?: number };
    };
  };
  subscriptionPaused?: boolean;
  subscriptionPauseReason?: SubscriptionReadStatus['subscriptionPauseReason'] | null;
  subscriptionPauseMessage?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const extractItems = (payload: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(payload)) return [];
  if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
    return payload.data.items as Array<Record<string, unknown>>;
  }
  return [];
};

const extractPagination = (
  payload: unknown,
  fallback: { page: number; limit: number; itemCount: number }
): ChannelOrdersResponse['pagination'] => {
  const pagination =
    isRecord(payload) && isRecord(payload.data) && isRecord(payload.data.pagination)
      ? payload.data.pagination
      : null;
  const limit = asNumber(pagination?.limit) ?? fallback.limit;
  const total = asNumber(pagination?.total) ?? fallback.itemCount;
  return {
    page: asNumber(pagination?.page) ?? fallback.page,
    limit,
    total,
    totalPages: asNumber(pagination?.totalPages) ?? Math.ceil(total / limit),
    hasMore:
      typeof pagination?.hasMore === 'boolean' ? pagination.hasMore : total > fallback.page * limit,
  };
};

const normalizeChannelOrdersStatusQuery = (status: string): 'open' | 'pending' | 'closed' => {
  const normalized = status.trim();
  if (normalized === 'open' || normalized === 'pending' || normalized === 'closed') {
    return normalized;
  }
  return 'open';
};

export const normalizeChannelOrdersPayload = (
  payload: unknown,
  fallback: ChannelOrdersPayloadFallback
): ChannelOrdersResponse => {
  const orders = extractItems(payload);
  const payloadRecord = isRecord(payload) ? payload : {};
  return {
    status: typeof payloadRecord.status === 'string' ? payloadRecord.status : fallback.status,
    counts: {
      open: asNumber(isRecord(payloadRecord.counts) ? payloadRecord.counts.open : undefined) ?? 0,
      pending:
        asNumber(isRecord(payloadRecord.counts) ? payloadRecord.counts.pending : undefined) ?? 0,
      closed:
        asNumber(isRecord(payloadRecord.counts) ? payloadRecord.counts.closed : undefined) ?? 0,
    },
    orders,
    ...(isRecord(payloadRecord.symbolPrices) ? { symbolPrices: payloadRecord.symbolPrices } : {}),
    pagination: extractPagination(payload, {
      page: fallback.page,
      limit: fallback.limit,
      itemCount: orders.length,
    }),
  };
};

export const channelsService = {
  getAvailableChannels: async (): Promise<TelegramChannel[]> => {
    return channelsService.getChannelCatalog(null, 'available');
  },
  getChannelCatalogWithStatus: async (
    mtAccountId?: string | null,
    state: 'all' | 'available' | 'registered' = 'all',
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<ChannelCatalogWithStatus> => {
    const query = {
      state,
      format: '2' as const,
      ...(typeof mtAccountId === 'string' && mtAccountId.trim().length > 0
        ? { mtAccountId: mtAccountId.trim() }
        : {}),
      ...(Number.isInteger(options.limit) ? { limit: options.limit } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
    };
    const response = await getApiTelegramChannelsCatalog({
      query,
      throwOnError: true,
    });
    const responseData = response.data as ApiListResponse<TelegramChannelCatalogItem> &
      Partial<SubscriptionReadStatus> & {
        refresh?: TelegramCatalogRefresh;
        pagination?: ChannelCatalogWithStatus['pagination'];
        data?: {
          items?: TelegramChannelCatalogItem[];
          pagination?: ChannelCatalogWithStatus['pagination'];
          refresh?: TelegramCatalogRefresh;
        };
      };
    const data = (responseData.data ?? responseData) as {
      items?: TelegramChannelCatalogItem[];
      channels?: TelegramChannelCatalogItem[];
      pagination?: ChannelCatalogWithStatus['pagination'];
      refresh?: TelegramCatalogRefresh;
    };
    const channels = data.items ?? responseData.channels ?? [];
    const refresh = data.refresh ?? responseData.refresh ?? null;
    const pagination = data.pagination ?? responseData.pagination;
    if (
      refresh &&
      !refresh.complete &&
      (refresh.status === 'IDLE' || refresh.status === 'FAILED' || refresh.status === 'CANCELLED')
    ) {
      void postApiTelegramChannelsRefresh({
        body: { scope: 'DISCOVER' },
        throwOnError: true,
      }).catch(() => undefined);
    }
    return {
      channels,
      status: normalizeSubscriptionReadStatus(responseData),
      refresh,
      ...(pagination ? { pagination } : {}),
    };
  },
  getChannelCatalog: async (
    mtAccountId?: string | null,
    state: 'all' | 'available' | 'registered' = 'all',
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<TelegramChannelCatalogItem[]> => {
    return (await channelsService.getChannelCatalogWithStatus(mtAccountId, state, options)).channels;
  },
  getRegisteredChannelsWithStatus: async (
    mtAccountId?: string | null
  ): Promise<{
    channels: TelegramChannelSubscription[];
    status: NormalizedSubscriptionReadStatus;
    refresh: TelegramCatalogRefresh | null;
  }> => {
    const catalog = await channelsService.getChannelCatalogWithStatus(mtAccountId, 'registered');
    return {
      channels: catalog.channels
        .map(mapCatalogItemToSubscription)
        .filter((channel): channel is TelegramChannelSubscription => channel !== null),
      status: catalog.status,
      refresh: catalog.refresh,
    };
  },
  getRegisteredChannels: async (
    mtAccountId?: string | null
  ): Promise<TelegramChannelSubscription[]> => {
    return (await channelsService.getRegisteredChannelsWithStatus(mtAccountId)).channels;
  },
  getChannelLists: async (mtAccountId?: string | null): Promise<ChannelLists> => {
    const channels = await channelsService.getChannelCatalog(mtAccountId, 'all');
    const available: TelegramChannelCatalogItem[] = [];
    const registered: TelegramChannelSubscription[] = [];

    for (const channel of channels) {
      if (channel.registrationState.isRegistered) {
        const subscription = mapCatalogItemToSubscription(channel);
        if (subscription) {
          registered.push(subscription);
        }
        continue;
      }

      available.push(channel);
    }

    return { available, registered };
  },
  getChannelSummary: async (subscriptionId: string): Promise<ChannelSummary> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdSummary({
      path: { subscriptionId },
      throwOnError: true,
    });
    return response.data as ChannelSummary;
  },
  getChannelSubscriptionHealth: async (
    subscriptionId: string
  ): Promise<TelegramChannelSubscriptionHealth> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdHealth({
      path: { subscriptionId },
      throwOnError: true,
    });
    return (response.data as TelegramChannelSubscriptionHealthResponse).data;
  },
  acceptChannelMigration: async (
    subscriptionId: string,
    targetPeerId?: string | null,
    idempotencyKey?: string | null,
  ): Promise<Record<string, unknown>> => {
    const response = await postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigration({
      path: { subscriptionId },
      body: targetPeerId ? { targetPeerId } : undefined,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      throwOnError: true,
    });
    return response.data as Record<string, unknown>;
  },
  requestChannelAccessRefresh: async (
    subscriptionId: string,
    idempotencyKey?: string | null,
  ): Promise<Record<string, unknown>> => {
    const response = await postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccess({
      path: { subscriptionId },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      throwOnError: true,
    });
    return response.data as Record<string, unknown>;
  },
  requestChannelHistoryRefresh: async (
    subscriptionId: string,
    fromMessageId?: number | string,
    idempotencyKey?: string | null,
  ): Promise<Record<string, unknown>> => {
    const response = await postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistory({
      path: { subscriptionId },
      body: fromMessageId === undefined ? undefined : { fromMessageId },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      throwOnError: true,
    });
    return response.data as Record<string, unknown>;
  },
  getChannelChart: async (
    subscriptionId: string,
    range?: string
  ): Promise<ChannelChartResponse> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdChart({
      path: { subscriptionId },
      query: range ? { range: range as 'Week' | 'Month' | '3Month' | 'Year' | 'All' } : undefined,
      throwOnError: true,
    });
    return response.data as ChannelChartResponse;
  },
  getChannelOrders: async (
    subscriptionId: string,
    status: string,
    page = 1,
    limit = 10
  ): Promise<ChannelOrdersResponse> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdOrders({
      path: { subscriptionId },
      query: {
        status: normalizeChannelOrdersStatusQuery(status),
        page,
        limit,
      },
      throwOnError: true,
    });
    return normalizeChannelOrdersPayload(response.data as unknown, { status, page, limit });
  },
  getSymbolsCatalog: async (mtAccountId?: string | null): Promise<SymbolsCatalogResponse> => {
    const response = await getApiTelegramChannelsSymbols({
      query:
        typeof mtAccountId === 'string' && mtAccountId.trim().length > 0
          ? { mtAccountId: mtAccountId.trim() }
          : undefined,
      throwOnError: true,
    });
    const data = response.data as {
      symbols?: ChannelSymbol[];
      source?: SymbolsCatalogResponse['source'];
      message?: string;
    };
    return {
      symbols: data.symbols ?? [],
      source: data.source,
      message: data.message,
    };
  },
  getChannelSymbolCatalog: async (
    subscriptionId: string
  ): Promise<ChannelSymbolCatalogResponse> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdSymbols({
      path: { subscriptionId },
      throwOnError: true,
    });
    return response.data as ChannelSymbolCatalogResponse;
  },
  getChannelSettingsMeta: async (subscriptionId: string): Promise<ChannelSettingsMetaResponse> => {
    const response = await getApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMeta({
      path: { subscriptionId },
      throwOnError: true,
    });
    return response.data as ChannelSettingsMetaResponse;
  },
  requestCatalogRefresh: async (
    scope: 'DISCOVER' | 'REGISTERED_METADATA' = 'DISCOVER',
    idempotencyKey?: string | null,
  ): Promise<Record<string, unknown>> => {
    const response = await postApiTelegramChannelsRefresh({
      throwOnError: true,
      body: { scope },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data as Record<string, unknown>;
  },
  getCatalogRefresh: async (requestId: string): Promise<Record<string, unknown>> => {
    const response = await getApiTelegramChannelsRequestsByRequestId({
      throwOnError: true,
      path: { requestId },
    });
    return response.data as Record<string, unknown>;
  },
  registerChannels: async (
    channelIds: string[],
    mtAccountId?: string | null,
    idempotencyKey?: string | null,
  ): Promise<void> => {
    await postApiTelegramChannelsRegister({
      throwOnError: true,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: {
        channelIds,
        ...(typeof mtAccountId === 'string' && mtAccountId.trim().length > 0
          ? { mtAccountId: mtAccountId.trim() }
          : {}),
      },
    });
  },
  registerCatalogPeers: async (
    peerIds: string[],
    mtAccountId?: string | null,
    idempotencyKey?: string | null,
  ): Promise<void> => {
    await postApiTelegramChannelsRegister({
      throwOnError: true,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: {
        format: 2,
        peerIds,
        ...(typeof mtAccountId === 'string' && mtAccountId.trim().length > 0
          ? { mtAccountId: mtAccountId.trim() }
          : {}),
      },
    });
  },
  toggleChannel: async (subscriptionId: string): Promise<void> => {
    await patchApiTelegramChannelsSubscriptionsBySubscriptionIdToggle({
      throwOnError: true,
      path: { subscriptionId },
    });
  },
  deleteSubscription: async (
    subscriptionId: string
  ): Promise<DeleteChannelSubscriptionResponse> => {
    const response = await deleteApiTelegramChannelsSubscriptionsBySubscriptionId({
      throwOnError: true,
      path: { subscriptionId },
    });
    return response.data as DeleteChannelSubscriptionResponse;
  },
  updateSettings: async (
    subscriptionId: string,
    settings: Record<string, unknown>
  ): Promise<void> => {
    await patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettings({
      throwOnError: true,
      path: { subscriptionId },
      body: settings,
    });
  },
  requestCode: async (phoneNumber: string): Promise<RequestCodeResponse> => {
    const response = await postApiTelegramAuthRequestCode({
      throwOnError: true,
      body: { phoneNumber },
    });
    return response.data;
  },
  verifyCode: async (
    phoneNumber: string,
    phoneCode: string,
    phoneCodeHash: string
  ): Promise<VerifyCodeResponse> => {
    const response = await postApiTelegramAuthVerifyCode({
      throwOnError: true,
      body: { phoneNumber, phoneCode, phoneCodeHash },
    });
    return response.data;
  },
  verifyPassword: async (password: string): Promise<void> => {
    await postApiTelegramAuthVerifyPassword({
      body: { password },
      throwOnError: true,
    });
  },
  disconnect: async (): Promise<void> => {
    await postApiTelegramAuthDisconnect({ throwOnError: true });
  },
};

export type {
  DeleteChannelSubscriptionResponse,
  TelegramChannel,
  TelegramChannelCatalogItem,
  TelegramChannelRegistrationState,
  TelegramChannelSubscription,
};
