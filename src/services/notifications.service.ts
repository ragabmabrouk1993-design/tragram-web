import {
  getApiNotificationsGroups,
  getApiNotificationsGroupsByGroupIdEvents,
  getApiNotificationsGroupsUnreadCount,
  getApiV2NotificationsSettings,
  getApiNotificationsSettings,
  patchApiNotificationsSettings,
  patchApiV2NotificationsSettings,
  putApiNotificationsGroupsByGroupIdRead,
  putApiNotificationsGroupsReadAll,
} from '@/lib/api-client';
import { initApiClient } from '@/lib/api-client-setup';
import type {
  DashboardNotification,
  DashboardNotificationThread,
} from '@/components/dashboard/notifications-modal';

type RawNotification = {
  id?: string;
  threadId?: string;
  signalId?: string | null;
  groupSignalId?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  signalText?: string | null;
  symbol?: string | null;
  avatarUrl?: string | null;
  mtAccountId?: string | null;
  title?: string;
  message?: string;
  sentAt?: string | Date | null;
  createdAt?: string | Date | null;
  type?: string;
  data?: unknown;
  read?: boolean;
};

type RawNotificationGroup = {
  groupId?: string;
  groupKey?: string;
  groupKind?: string;
  scopeKind?: 'MT_ACCOUNT' | 'GLOBAL' | string;
  scopeKey?: string;
  mtAccountId?: string | null;
  signalId?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  signalText?: string | null;
  symbol?: string | null;
  title?: string;
  message?: string;
  sentAt?: string | Date | null;
  read?: boolean;
  avatarUrl?: string | null;
  channel?: {
    id?: string;
    channelId?: string;
    title?: string | null;
    username?: string | null;
    photoUrl?: string | null;
  } | null;
  signal?: {
    id?: string;
    channelId?: string;
    symbol?: string | null;
    side?: string | null;
    type?: string | null;
  } | null;
  mtAccountIds?: string[];
  hasGlobalNotifications?: boolean;
  updatedAt?: string | Date | null;
  unreadCount?: number;
  hasUnread?: boolean;
  latest?: RawNotification;
  latestNotification?: RawNotification;
  notifications?: RawNotification[];
};

type RawNotificationEvent = RawNotification & {
  groupId?: string;
  groupKey?: string;
  scopeKind?: 'MT_ACCOUNT' | 'GLOBAL' | string;
  scopeKey?: string;
  mtAccountId?: string | null;
};

type PaginatedThreads = {
  items: DashboardNotificationThread[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type V2NotificationSettings = {
  notificationsEnabled: boolean;
  pushNotifications: boolean;
  tradeExecutionAlerts: boolean;
  performanceReports: boolean;
  categories: AccountNotificationSettings & {
    signalReceived: boolean;
    signalCancelled: boolean;
    serviceAlerts: boolean;
  };
};

export type V2NotificationSettingsResponse = {
  revision: string;
  settings: V2NotificationSettings;
};

export type PaginatedNotificationEvents = {
  items: DashboardNotification[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type AccountNotificationSettings = {
  orderExecuted: boolean;
  orderClosed: boolean;
  breakeven: boolean;
  tpHit: boolean;
  stopLossHit: boolean;
  signalRejection: boolean;
  duplicated: boolean;
  outOfMarketPrice: boolean;
  outOfTolerance: boolean;
  excludedSymbol: boolean;
  insufficientBalance: boolean;
  allowTradesWithoutSlTp: boolean;
  allowForwardedSignals: boolean;
  useBrokerMinimumLot: boolean;
  limitOrderPlaced: boolean;
  limitOrderExecuted: boolean;
  limitOrderExpiration: boolean;
};

export type AccountNotificationSettingsResponse = {
  mtAccountId?: string;
  settings: AccountNotificationSettings;
};
type NotificationScope = 'selected' | 'all';
const DEFAULT_NOTIFICATION_SCOPE: NotificationScope = 'selected';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatNumber = (value: number): string => value.toFixed(5).replace(/\.?0+$/, '');

const formatTypeLabel = (type?: string): string =>
  type ? type.replace(/_/g, ' ').trim() : 'SYSTEM';

const formatTradeSide = (value?: string): string | undefined => {
  const normalized = asString(value)?.toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'BUY') {
    return 'Buy';
  }
  if (normalized === 'SELL') {
    return 'Sell';
  }
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
};

const FORBIDDEN_INTERNAL_PATTERNS: RegExp[] = [
  /\bparser\b/i,
  /\bservice health\b/i,
  /\bservice\b/i,
  /\bbroker\b/i,
  /\bmt\b/i,
  /\bsymbol mapping\b/i,
  /\breconciliation\b/i,
  /\bbackend-service\b/i,
  /\btrade-executor\b/i,
  /\bsignal-parser\b/i,
];

const hasForbiddenInternalTerm = (value: string): boolean =>
  FORBIDDEN_INTERNAL_PATTERNS.some((pattern) => pattern.test(value));

const sanitizeVisibleText = (value: unknown, fallback = ''): string => {
  const text = asString(value);
  if (!text) {
    return fallback;
  }
  return hasForbiddenInternalTerm(text) ? fallback : text;
};

const isGenericOrderIssueTitle = (value: unknown): boolean =>
  /^order\s+issue$/iu.test(asString(value) ?? '');

const sanitizeSource = (value: unknown): string | undefined => {
  const source = asString(value);
  if (!source || hasForbiddenInternalTerm(source)) {
    return undefined;
  }
  return source;
};

const buildReferenceLabel = (
  data: Record<string, unknown>,
  source?: string
): string | undefined => {
  const explicit =
    sanitizeVisibleText(data.referenceLabel) ||
    sanitizeVisibleText(data.signalText);
  if (explicit) {
    if (source && explicit === source) {
      return undefined;
    }
    return explicit;
  }

  const symbol = asString(data.symbol)?.toUpperCase();
  const side = formatTradeSide(asString(data.side));
  const setupLabel = side && symbol ? `${side} ${symbol}` : symbol || side;

  if (source && setupLabel) {
    return `${source} • ${setupLabel}`;
  }

  return setupLabel;
};

const buildEventLabel = (
  type: string | undefined,
  title: string | undefined,
  data: Record<string, unknown>
): string => {
  const explicit = sanitizeVisibleText(data.eventLabel);
  if (explicit && !isGenericOrderIssueTitle(explicit)) {
    return explicit;
  }

  const sanitizedTitle = sanitizeVisibleText(title);
  if (sanitizedTitle && !isGenericOrderIssueTitle(sanitizedTitle)) {
    return sanitizedTitle;
  }

  // If an older producer supplied only the generic compatibility title, do
  // not fall through to a raw/technical event type such as UNKNOWN_EVENT.
  if (isGenericOrderIssueTitle(explicit) || isGenericOrderIssueTitle(title)) {
    return 'Trading update';
  }

  switch (type) {
    case 'TRADE_EXECUTED':
      return 'Order placed';
    case 'TRADE_CLOSED':
      return 'Trade closed';
    case 'SIGNAL_RECEIVED':
      return 'Signal received';
    case 'SIGNAL_CANCELLED':
      return 'Signal cancelled';
    case 'TELEGRAM_DISCONNECTED':
      return 'Reconnect needed';
    case 'ERROR_ALERT':
      return 'Trading update';
    default:
      // Unknown/legacy rows must not expose a raw enum as user-facing copy.
      // The server's canonical projector uses this same neutral fallback.
      return 'Trading update';
  }
};

const normalizeDateIso = (value?: string | Date | null): string => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
};

const buildTradeExecutedMessage = (data: Record<string, unknown>): string | undefined => {
  const orderId = asString(data.orderId);
  const symbol = asString(data.symbol)?.toUpperCase();
  const side = formatTradeSide(asString(data.side));
  const volume = asFiniteNumber(data.volume);
  const entryPrice = asFiniteNumber(data.entryPrice);
  if (!symbol || !side || volume === undefined || entryPrice === undefined) {
    return undefined;
  }

  const orderSegment = orderId ? ` #${orderId}` : '';
  return `Your ${side} ${symbol} order${orderSegment} was placed at ${formatNumber(entryPrice)} for ${formatNumber(volume)} lot(s).`;
};

export const mapNotification = (item: RawNotification): DashboardNotification => {
  const baseData = isRecord(item.data) ? item.data : {};
  const data: Record<string, unknown> = {
    ...baseData,
    ...(item.channelName ? { channelName: item.channelName } : {}),
    ...(item.signalText ? { signalText: item.signalText } : {}),
    ...(item.symbol ? { symbol: item.symbol } : {}),
  };
  const type = asString(item.type)?.toUpperCase();
  const source =
    sanitizeSource(item.channelName) ??
    sanitizeSource(data.channelName) ??
    sanitizeSource(data.source) ??
    formatTypeLabel(type);
  const avatarUrl =
    asString(item.avatarUrl) ??
    asString(data.avatarUrl) ??
    asString(data.channelAvatarUrl) ??
    asString(data.photoUrl);
  const createdAt = normalizeDateIso(item.sentAt ?? item.createdAt);

  const isTradeExecuted = type === 'TRADE_EXECUTED';
  const mappedTitle = buildEventLabel(type, asString(item.title), data);
  const mappedMessage =
    sanitizeVisibleText(item.message) ||
    sanitizeVisibleText(isTradeExecuted ? buildTradeExecutedMessage(data) : undefined) ||
    'An update is available.';
  const referenceLabel = buildReferenceLabel(data, source);

  return {
    id:
      asString(item.id) ??
      `${type ?? 'notification'}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    threadId: asString(item.threadId),
    signalId: asString(item.signalId ?? data.signalId),
    mtAccountId: asString(item.mtAccountId ?? data.mtAccountId) ?? null,
    title: mappedTitle,
    message: mappedMessage,
    createdAt,
    source,
    avatarUrl,
    referenceLabel,
    eventLabel: buildEventLabel(type, asString(item.title), data),
    what: sanitizeVisibleText(data.what),
    why: sanitizeVisibleText(data.why),
    possibleIssue: sanitizeVisibleText(data.possibleIssue),
    read: item.read ?? false,
    type,
  };
};

const mapThreadNotification = (
  item: RawNotification,
  params: { threadId: string; signalId?: string | null; avatarUrl?: string }
): DashboardNotification => {
  const mapped = mapNotification({
    ...item,
    threadId: asString(item.threadId) ?? params.threadId,
    signalId: item.signalId ?? params.signalId,
  });
  const timelineNotification = {
    ...mapped,
    referenceLabel: undefined,
  };

  return params.avatarUrl
    ? {
        ...timelineNotification,
        avatarUrl: params.avatarUrl,
      }
    : timelineNotification;
};

const extractGroupItems = (payload: unknown): RawNotificationGroup[] => {
  if (!isRecord(payload)) {
    return [];
  }
  if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
    return payload.data.items as RawNotificationGroup[];
  }
  return [];
};

const extractEventItems = (payload: unknown): RawNotificationEvent[] => {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.items)) {
    return [];
  }
  return payload.data.items as RawNotificationEvent[];
};

const extractPagination = (payload: unknown): Record<string, unknown> | null =>
  isRecord(payload) && isRecord(payload.data) && isRecord(payload.data.pagination)
    ? payload.data.pagination
    : null;

/**
 * Canonical rows already contain the server's user-facing copy. Keep that copy
 * intact instead of re-inferring a title from the legacy notification type.
 */
export const mapCanonicalNotification = (
  item: RawNotificationEvent,
  context?: { threadId?: string; signalId?: string | null; avatarUrl?: string; source?: string },
): DashboardNotification => {
  const baseData = isRecord(item.data) ? item.data : {};
  const data: Record<string, unknown> = {
    ...baseData,
    ...(item.channelName ? { channelName: item.channelName } : {}),
    ...(item.signalText ? { signalText: item.signalText } : {}),
    ...(item.symbol ? { symbol: item.symbol } : {}),
  };
  const type = asString(item.type)?.toUpperCase();
  // Canonical copy is persisted by the server's event catalog. Do not
  // reinterpret known event copy here; an UNKNOWN compatibility row still
  // gets the neutral fallback so internal diagnostics cannot leak.
  const isUnknownCanonical = !type || type === 'UNKNOWN';
  const rawTitle = isUnknownCanonical
    ? sanitizeVisibleText(item.title, 'Trading update')
    : asString(item.title) ?? 'Trading update';
  const title = isGenericOrderIssueTitle(rawTitle) ? 'Trading update' : rawTitle;
  const message = isUnknownCanonical
    ? sanitizeVisibleText(item.message, 'An update is available.')
    : asString(item.message) ?? 'An update is available.';
  const source =
    sanitizeSource(item.channelName) ??
    sanitizeSource(data.channelName) ??
    sanitizeSource(data.source) ??
    sanitizeSource(context?.source) ??
    formatTypeLabel(type);
  const avatarUrl =
    asString(context?.avatarUrl) ??
    asString(item.avatarUrl) ??
    asString(data.avatarUrl) ??
    asString(data.channelAvatarUrl) ??
    asString(data.photoUrl);
  const createdAt = normalizeDateIso(item.sentAt ?? item.createdAt);
  const referenceLabel = buildReferenceLabel(data, source);

  return {
    id:
      asString(item.id) ??
      `${type ?? 'notification'}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    threadId: asString(item.threadId ?? item.groupId ?? context?.threadId),
    signalId: asString(item.signalId ?? data.signalId ?? context?.signalId),
    mtAccountId: asString(item.mtAccountId ?? data.mtAccountId) ?? null,
    title,
    message,
    createdAt,
    source,
    avatarUrl,
    referenceLabel,
    // The canonical title is the authoritative event label. This preserves
    // distinctions such as “Signal rejected” and “Order opened”.
    eventLabel: title,
    what: sanitizeVisibleText(data.what),
    why: sanitizeVisibleText(data.why),
    possibleIssue: sanitizeVisibleText(data.possibleIssue),
    read: item.read ?? false,
    type,
  };
};

const mapGroupSummary = (item: RawNotificationGroup): DashboardNotificationThread | null => {
  const groupId = asString(item.groupId);
  if (!groupId) {
    return null;
  }

  const channel = isRecord(item.channel) ? item.channel : null;
  const channelPhotoUrl = asString(item.avatarUrl) ?? asString(channel?.photoUrl);
  const compactLatestNotification: RawNotification = {
    id: `${groupId}:latest`,
    title: item.title,
    message: item.message,
    sentAt: item.sentAt ?? item.updatedAt,
    read: item.read,
    signalId: item.signalId,
    channelId: item.channelId,
    channelName: item.channelName,
    signalText: item.signalText,
    symbol: item.symbol,
    avatarUrl: channelPhotoUrl,
  };
  const canonical = item.scopeKind === 'MT_ACCOUNT' || item.scopeKind === 'GLOBAL' || item.latest;
  const latestSource =
    sanitizeSource(item.channelName) ??
    sanitizeSource(channel?.title) ??
    sanitizeSource(channel?.username);
  const latestNotification = canonical
    ? mapCanonicalNotification(
        {
          ...(item.latest ?? item.latestNotification ?? compactLatestNotification),
          groupId,
          threadId: groupId,
          signalId: item.signalId,
          mtAccountId: item.mtAccountId,
          channelId: item.channelId,
          channelName: item.channelName,
          signalText: item.signalText,
          symbol: item.symbol,
          avatarUrl: channelPhotoUrl,
        },
        { threadId: groupId, signalId: item.signalId, avatarUrl: channelPhotoUrl, source: latestSource },
      )
    : mapNotification({
        ...(item.latestNotification ?? compactLatestNotification),
        threadId: groupId,
        signalId: item.signalId,
        channelId: item.channelId,
        channelName: item.channelName,
        signalText: item.signalText,
        symbol: item.symbol,
        avatarUrl: channelPhotoUrl,
      });

  const mappedNotifications = canonical
    ? []
    : Array.isArray(item.notifications)
    ? item.notifications.map((notification) =>
        mapThreadNotification(
          {
            ...notification,
            channelId: notification.channelId ?? item.channelId,
            channelName: notification.channelName ?? item.channelName,
            symbol: notification.symbol ?? item.symbol,
          },
          {
            threadId: groupId,
            signalId: notification.signalId ?? item.signalId,
            avatarUrl: channelPhotoUrl,
          }
        )
      )
    : [];
  const fallbackUnreadCount =
    mappedNotifications.length > 0
      ? mappedNotifications.filter((notification) => !notification.read).length
      : item.read === false
        ? 1
        : 0;
  const unreadCount = asFiniteNumber(item.unreadCount) ?? fallbackUnreadCount;
  const hasUnread =
    typeof item.hasUnread === 'boolean'
      ? item.hasUnread
      : typeof item.read === 'boolean'
        ? !item.read
        : unreadCount > 0;
  const sourceLabel =
    sanitizeSource(item.channelName) ??
    sanitizeSource(channel?.title) ??
    sanitizeSource(channel?.username) ??
    latestNotification.source;
  const mappedLatestNotification = channelPhotoUrl
    ? {
        ...latestNotification,
        avatarUrl: channelPhotoUrl,
      }
    : latestNotification;

  return {
    threadId: groupId,
    ...(asString(item.groupKey) ? { groupKey: asString(item.groupKey) } : {}),
    threadKind: asString(item.groupKind) ?? 'SYSTEM',
    ...(item.scopeKind === 'MT_ACCOUNT' || item.scopeKind === 'GLOBAL'
      ? { scopeKind: item.scopeKind, scopeKey: asString(item.scopeKey) }
      : {}),
    signalId: asString(item.signalId),
    mtAccountId:
      asString(item.mtAccountId) ??
      latestNotification.mtAccountId ??
      (item.scopeKind === 'GLOBAL' ? null : undefined),
    updatedAt: normalizeDateIso(item.updatedAt ?? latestNotification.createdAt),
    unreadCount,
    hasUnread,
    sourceLabel,
    journeyLabel:
      mappedLatestNotification.referenceLabel ??
      sourceLabel ??
      mappedLatestNotification.title,
    previewText: mappedLatestNotification.message,
    latestNotification: mappedLatestNotification,
    notifications: mappedNotifications,
  };
};

initApiClient();

export const notificationsService = {
  getUserNotificationSettingsV2: async (): Promise<V2NotificationSettingsResponse> => {
    initApiClient();
    const response = await getApiV2NotificationsSettings({ throwOnError: true });
    const envelope = isRecord(response.data) && isRecord(response.data.data) ? response.data.data : null;
    const settings = envelope && isRecord(envelope.settings) ? envelope.settings : null;
    const categories = settings && isRecord(settings.categories) ? settings.categories : null;
    if (!envelope || !settings || !categories || typeof envelope.revision !== 'string') {
      throw new Error('NOTIFICATION_SETTINGS_V2_INVALID_RESPONSE');
    }
    const keys = [
      'orderExecuted', 'orderClosed', 'breakeven', 'tpHit', 'stopLossHit', 'signalRejection',
      'duplicated', 'outOfMarketPrice', 'outOfTolerance', 'excludedSymbol', 'insufficientBalance',
      'allowTradesWithoutSlTp', 'allowForwardedSignals', 'useBrokerMinimumLot', 'limitOrderPlaced',
      'limitOrderExecuted', 'limitOrderExpiration', 'signalReceived', 'signalCancelled', 'serviceAlerts',
    ];
    return {
      revision: envelope.revision,
      settings: {
        notificationsEnabled: Boolean(settings.notificationsEnabled),
        pushNotifications: Boolean(settings.pushNotifications),
        tradeExecutionAlerts: Boolean(settings.tradeExecutionAlerts),
        performanceReports: Boolean(settings.performanceReports),
        categories: Object.fromEntries(keys.map((key) => [key, Boolean(categories[key])])) as V2NotificationSettings['categories'],
      },
    };
  },
  updateUserNotificationSettingsV2: async (
    revision: string,
    settings: Partial<Omit<V2NotificationSettings, 'categories'>> & { categories?: Partial<V2NotificationSettings['categories']> },
  ): Promise<V2NotificationSettingsResponse> => {
    initApiClient();
    const response = await patchApiV2NotificationsSettings({
      body: { revision, settings },
      throwOnError: true,
    });
    const envelope = isRecord(response.data) && isRecord(response.data.data) ? response.data.data : null;
    const result = envelope && isRecord(envelope.settings) ? envelope.settings : null;
    const categories = result && isRecord(result.categories) ? result.categories : null;
    if (!envelope || !result || !categories || typeof envelope.revision !== 'string') {
      throw new Error('NOTIFICATION_SETTINGS_V2_INVALID_RESPONSE');
    }
    return {
      revision: envelope.revision,
      settings: {
        notificationsEnabled: Boolean(result.notificationsEnabled),
        pushNotifications: Boolean(result.pushNotifications),
        tradeExecutionAlerts: Boolean(result.tradeExecutionAlerts),
        performanceReports: Boolean(result.performanceReports),
        categories: categories as V2NotificationSettings['categories'],
      },
    };
  },
  getNotificationThreads: async (params?: {
    limit?: number;
    cursor?: string | null;
    scope?: NotificationScope;
  }): Promise<PaginatedThreads> => {
    const limit = params?.limit ?? 20;
    const response = await getApiNotificationsGroups({
      query: {
        limit,
        scope: params?.scope ?? DEFAULT_NOTIFICATION_SCOPE,
        ...(params?.cursor ? { cursor: params.cursor } : {}),
      },
      throwOnError: true,
    });

    const payload: unknown = response.data;
    const items = extractGroupItems(payload)
      .map(mapGroupSummary)
      .filter((item): item is DashboardNotificationThread => item !== null);

    const pagination = extractPagination(payload);
    return {
      items,
      limit: asFiniteNumber(pagination?.limit) ?? limit,
      hasMore: Boolean(pagination?.hasMore),
      nextCursor: asString(pagination?.nextCursor) ?? null,
    };
  },
  getNotificationThreadEvents: async (params: {
    threadId: string;
    limit?: number;
    cursor?: string | null;
    scope?: NotificationScope;
  }): Promise<PaginatedNotificationEvents> => {
    const limit = params.limit ?? 20;
    const response = await getApiNotificationsGroupsByGroupIdEvents({
      path: { groupId: params.threadId },
      query: {
        limit,
        scope: params.scope ?? DEFAULT_NOTIFICATION_SCOPE,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
      throwOnError: true,
    });
    const payload: unknown = response.data;
    const items = extractEventItems(payload)
      .map((item) => mapCanonicalNotification(item, { threadId: params.threadId }))
      .filter((item) => Boolean(item.id));
    const pagination = extractPagination(payload);
    return {
      items,
      limit: asFiniteNumber(pagination?.limit) ?? limit,
      hasMore: Boolean(pagination?.hasMore),
      nextCursor: asString(pagination?.nextCursor) ?? null,
    };
  },
  getAccountNotificationSettings: async (
    mtAccountId?: string
  ): Promise<AccountNotificationSettingsResponse> => {
    const response = await getApiNotificationsSettings({
      query: mtAccountId ? { mtAccountId } : undefined,
      throwOnError: true,
    });
    const payload = isRecord(response.data) && isRecord(response.data.data) ? response.data.data : null;
    return {
      ...(asString(payload?.mtAccountId)
        ? { mtAccountId: asString(payload?.mtAccountId) }
        : {}),
      settings: {
        orderExecuted: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.orderExecuted : true),
        orderClosed: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.orderClosed : true),
        breakeven: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.breakeven : true),
        tpHit: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.tpHit : true),
        stopLossHit: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.stopLossHit : true),
        signalRejection: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.signalRejection : true),
        duplicated: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.duplicated : true),
        outOfMarketPrice: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.outOfMarketPrice : true),
        outOfTolerance: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.outOfTolerance : true),
        excludedSymbol: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.excludedSymbol : true),
        insufficientBalance: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.insufficientBalance : true),
        allowTradesWithoutSlTp: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.allowTradesWithoutSlTp : true),
        allowForwardedSignals: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.allowForwardedSignals : true),
        useBrokerMinimumLot: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.useBrokerMinimumLot : true),
        limitOrderPlaced: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderPlaced : true),
        limitOrderExecuted: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderExecuted : true),
        limitOrderExpiration: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderExpiration : true),
      },
    };
  },
  updateAccountNotificationSettings: async (params: {
    mtAccountId?: string;
    updates: Partial<AccountNotificationSettings>;
  }): Promise<AccountNotificationSettingsResponse> => {
    const response = await patchApiNotificationsSettings({
      body: {
        ...(params.mtAccountId ? { mtAccountId: params.mtAccountId } : {}),
        ...params.updates,
      },
      throwOnError: true,
    });
    const payload = isRecord(response.data) && isRecord(response.data.data) ? response.data.data : null;
    return {
      ...(asString(payload?.mtAccountId) || params.mtAccountId
        ? { mtAccountId: asString(payload?.mtAccountId) ?? params.mtAccountId }
        : {}),
      settings: {
        orderExecuted: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.orderExecuted : true),
        orderClosed: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.orderClosed : true),
        breakeven: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.breakeven : true),
        tpHit: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.tpHit : true),
        stopLossHit: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.stopLossHit : true),
        signalRejection: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.signalRejection : true),
        duplicated: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.duplicated : true),
        outOfMarketPrice: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.outOfMarketPrice : true),
        outOfTolerance: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.outOfTolerance : true),
        excludedSymbol: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.excludedSymbol : true),
        insufficientBalance: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.insufficientBalance : true),
        allowTradesWithoutSlTp: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.allowTradesWithoutSlTp : true),
        allowForwardedSignals: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.allowForwardedSignals : true),
        useBrokerMinimumLot: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.useBrokerMinimumLot : true),
        limitOrderPlaced: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderPlaced : true),
        limitOrderExecuted: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderExecuted : true),
        limitOrderExpiration: Boolean(payload?.settings && isRecord(payload.settings) ? payload.settings.limitOrderExpiration : true),
      },
    };
  },
  markThreadAsRead: async (threadId: string, scope: NotificationScope = DEFAULT_NOTIFICATION_SCOPE) => {
    await putApiNotificationsGroupsByGroupIdRead({
      path: { groupId: threadId },
      query: { scope },
      throwOnError: true,
    });
  },
  getUnreadCount: async (scope: NotificationScope = DEFAULT_NOTIFICATION_SCOPE): Promise<number> => {
    const response = await getApiNotificationsGroupsUnreadCount({
      query: { scope },
      throwOnError: true,
    });
    return asFiniteNumber(response.data.data?.count) ?? 0;
  },
  markAllAsRead: async (scope: NotificationScope = DEFAULT_NOTIFICATION_SCOPE) => {
    await putApiNotificationsGroupsReadAll({ query: { scope }, throwOnError: true });
  },
};
