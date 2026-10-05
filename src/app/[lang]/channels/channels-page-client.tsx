'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CountryCode } from 'libphonenumber-js';
import type { Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import {
  channelsService,
  type TelegramChannel,
  type TelegramChannelCatalogItem,
  type TelegramChannelSubscription,
  type TelegramCatalogRefresh,
} from '@/services/channels.service';
import { loadTelegramCatalogPages } from '@/services/telegram-catalog-pagination';
import { registerTelegramCatalogPeersInBatches } from '@/services/telegram-catalog-registration';
import { connectionsService } from '@/services/connections.service';
import { paymentService } from '@/services/payment.service';
import {
  ChannelsHeader,
  ChannelsEmptyState,
  ChannelRow,
  ChannelAvatar,
} from '@/components/channels';
import { TelegramConnectSheet } from '@/components/dashboard';
import { localizePath, type Dictionary } from '@/lib/i18n';
import { getErrorMessage, getLocalizedErrorMessage } from '@/lib/error-utils';
import { createRealtimeSocket } from '@/lib/realtime-socket';
import { decodeRealtimeTransportEvent } from '@/lib/dashboard-realtime-payload';
import { asRecord, parseFiniteNumber, parseSnapshotTimestamp } from '@/lib/socket-payload';
import { postApiAuthRefresh, type AuthTokens } from '@/lib/api-client';
import { hasConnectedMtAccount } from './mt-connection';
import Home2Image from '../marketing/components/marketing-image';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import {
  clearChannelActionKey,
  getOrCreateChannelActionKey,
} from '@/lib/channel-action-idempotency';
import {
  normalizeSubscriptionReadStatus,
  subscriptionPauseFallbackMessage,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { SubscriptionPausedNotice } from '@/components/subscription/subscription-paused-notice';
import { beginChannelsLoad } from './channels-page-state';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

type MtAccountSelectionSnapshot = {
  id?: string | null;
  isPrimary?: boolean | null;
  isSelected?: boolean | null;
  isActive?: boolean;
  connectionStatus?: string;
};

const resolveSelectedMtAccountId = (accounts: MtAccountSelectionSnapshot[]): string | null => {
  const selected =
    accounts.find((account) => account.isSelected === true) ??
    accounts.find((account) => account.isPrimary === true) ??
    accounts.find(
      (account) => account.isActive === true && account.connectionStatus === 'CONNECTED'
    ) ??
    accounts[0];

  return typeof selected?.id === 'string' && selected.id.trim().length > 0 ? selected.id : null;
};

const formatMembers = (value?: number, copy?: Dictionary['channelsPage']) => {
  if (!value || !copy) return '';
  if (value >= 1_000_000)
    return copy.members.millions.replace('{value}', (value / 1_000_000).toFixed(1));
  if (value >= 1_000) return copy.members.thousands.replace('{value}', (value / 1_000).toFixed(1));
  return `${value} ${copy.members.unit}`;
};

const formatCurrency = (value: number, currency = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const formatSignedPercent = (value: number | null | undefined, signReference = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  const signSource = value === 0 ? signReference : value;
  const sign = signSource > 0 ? '+' : signSource < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
};

const normalizeTrend = (value: unknown): 'up' | 'down' | 'flat' | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'up' || normalized === 'down' || normalized === 'flat') {
    return normalized;
  }
  return undefined;
};

const compareCatalogVersions = (left: string, right: string): number => {
  if (/^\d+$/u.test(left) && /^\d+$/u.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    return a === b ? 0 : a > b ? 1 : -1;
  }
  return left === right ? 0 : left > right ? 1 : -1;
};

const parseCatalogUpdatedEvent = (payload: unknown): { catalogVersion: string } | null => {
  const record = asRecord(payload);
  const catalogVersion = record?.catalogVersion;
  return typeof catalogVersion === 'string' && catalogVersion.trim().length > 0
    ? { catalogVersion: catalogVersion.trim() }
    : null;
};

const ChannelsPageSkeleton = () => (
  <div className="channels-shell">
    <div className="dashboard-grid channels-grid">
      <div className="dashboard-area">
        <div className="channels-container channels-page-skeleton" aria-hidden="true">
          <div className="channels-header channels-page-skeleton-header">
            <span className="channels-page-skeleton-line channels-page-skeleton-title" />
            <span className="channels-page-skeleton-circle" />
          </div>

          <div className="channels-list channels-page-skeleton-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`channels-page-skeleton-${index}`}
                className="channels-row channels-page-skeleton-row"
              >
                <div className="channels-row-info">
                  <span className="channels-page-skeleton-avatar" />
                  <div className="channels-page-skeleton-copy">
                    <span className="channels-page-skeleton-line channels-page-skeleton-line-main" />
                    <span className="channels-page-skeleton-line channels-page-skeleton-line-sub" />
                    <span className="channels-page-skeleton-pill" />
                  </div>
                </div>
                <span className="channels-page-skeleton-toggle" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AvailableChannelsSkeleton = ({ label }: { label: string }) => (
  <div className="channels-sheet-skeleton" aria-label={label}>
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={`available-channel-skeleton-${index}`} className="channels-sheet-skeleton-row">
        <span className="channels-page-skeleton-avatar" />
        <div className="channels-sheet-skeleton-copy">
          <span className="channels-page-skeleton-line channels-sheet-skeleton-title" />
          <span className="channels-page-skeleton-line channels-sheet-skeleton-subtitle" />
        </div>
        <span className="channels-sheet-skeleton-check" />
      </div>
    ))}
  </div>
);

type ChannelsPageClientProps = {
  defaultCountry?: CountryCode;
};

export default function ChannelsPageClient({ defaultCountry }: ChannelsPageClientProps) {
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const t = intlMessages.channelsPage;
  const router = useRouter();
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const [status, setStatus] = useState({
    loading: true,
    error: false,
    subscriptionRequired: false,
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<NormalizedSubscriptionReadStatus>(
    normalizeSubscriptionReadStatus(null)
  );
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [hasConnectedMt, setHasConnectedMt] = useState(false);
  const [selectedMtAccountId, setSelectedMtAccountId] = useState<string | null>(null);
  const [availableChannels, setAvailableChannels] = useState<TelegramChannelCatalogItem[]>([]);
  const [availableRefresh, setAvailableRefresh] = useState<TelegramCatalogRefresh | null>(null);
  const [availableStatus, setAvailableStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    'idle'
  );
  const [registeredChannels, setRegisteredChannels] = useState<TelegramChannelSubscription[]>([]);
  const [selectSheetOpen, setSelectSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TelegramChannelSubscription | null>(null);
  const [telegramConnectOpen, setTelegramConnectOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [channelActionId, setChannelActionId] = useState<string | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const hasLoadedChannelsRef = useRef(false);
  const registeredBrowseTrackedRef = useRef(false);
  const availableBrowseTrackedRef = useRef(false);
  const subscribedChannelIdsRef = useRef<Set<string>>(new Set());
  const registeredChannelIdsRef = useRef<string[]>([]);
  const channelSummarySnapshotMsRef = useRef<Map<string, number>>(new Map());
  const catalogVersionRef = useRef<string | null>(null);
  const availableLoadedCatalogVersionRef = useRef<string | null>(null);
  const availableLoadInFlightRef = useRef<Promise<void> | null>(null);
  const availableLoadQueuedRef = useRef(false);
  const availableLoadQueuedAccountRef = useRef<string | null>(null);
  const catalogReloadInFlightRef = useRef(false);
  const catalogReloadQueuedRef = useRef(false);
  const channelActionKeysRef = useRef<Map<string, string>>(new Map());

  const channelMetaMap = useMemo(() => {
    return new Map(availableChannels.map((channel) => [channel.id ?? '', channel]));
  }, [availableChannels]);

  const buildSubtitle = useCallback(
    (subscription: TelegramChannelSubscription, meta?: TelegramChannel) => {
      if (meta?.participantsCount) {
        return formatMembers(meta.participantsCount, t);
      }
      if (subscription.participantsCount) {
        return formatMembers(subscription.participantsCount, t);
      }
      if (subscription.channelUsername) {
        return `@${subscription.channelUsername}`;
      }
      return '';
    },
    [t]
  );

  const formatLastVerified = useCallback(
    (value?: string | null): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      try {
        return new Intl.DateTimeFormat(lang, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
      } catch {
        return date.toISOString();
      }
    },
    [lang]
  );

  const buildHealthSubtitle = useCallback(
    (subscription: TelegramChannelSubscription, meta?: TelegramChannel) => {
      const base = buildSubtitle(subscription, meta);
      const registrationState = String(subscription.registrationState ?? '').toUpperCase();
      const accessState = String(subscription.accessState ?? '').toUpperCase();
      const metadataState = String(subscription.metadataState ?? '').toUpperCase();
      const statusLabel = registrationState === 'PENDING_ACCESS' || accessState === 'VERIFYING'
        ? t.health.verifying
        : registrationState === 'MIGRATED'
          ? t.health.migration
          : ['FORBIDDEN', 'ACCESS_LOST', 'UNAVAILABLE'].includes(accessState)
            ? t.health.needsAction
            : metadataState && metadataState !== 'CURRENT'
              ? t.health.refreshDelayed
              : t.health.active;
      const lastVerified = formatLastVerified(subscription.metadataObservedAt);
      const lastVerifiedLabel = lastVerified
        ? t.health.lastVerified.replace('{date}', lastVerified)
        : null;
      return [base, statusLabel, lastVerifiedLabel].filter(Boolean).join(' • ');
    },
    [buildSubtitle, formatLastVerified, t.health],
  );

  const loadChannels = useCallback(async () => {
    // Keep the last saved projection rendered while connection/account status
    // is refreshed. The API never needs Telegram for this read, so a stale
    // row is more useful than a blank loading state.
    setStatus((current) => beginChannelsLoad(current, hasLoadedChannelsRef.current));
    try {
      const [telegramStatus, mtAccountsResult] = await Promise.all([
        connectionsService.getTelegramStatus(),
        connectionsService.getMtAccountsWithStatus(),
        paymentService.getContext().catch(() => null),
      ]);
      const mtAccounts = mtAccountsResult.accounts;
      setSubscriptionStatus(normalizeSubscriptionReadStatus(mtAccountsResult.status));
      const isConnected = Boolean(telegramStatus?.isConnected);
      setTelegramConnected(isConnected);

      if (!isConnected) {
        setHasConnectedMt(false);
        // A Telegram disconnect changes live availability, not the user's
        // saved subscriptions. Keep the indexed registration projection on
        // screen so the page remains useful while the connection is restored.
        const retained = await channelsService.getRegisteredChannelsWithStatus();
        setSubscriptionStatus(retained.status);
        setRegisteredChannels(retained.channels);
        hasLoadedChannelsRef.current = true;
        if (!registeredBrowseTrackedRef.current) {
          registeredBrowseTrackedRef.current = true;
          trackAnalyticsEvent('channels_browsed', {
            state: 'registered',
            channels_count: retained.channels.length,
          });
        }
        if (retained.refresh?.catalogVersion) {
          catalogVersionRef.current = retained.refresh.catalogVersion;
        }
        setStatus({ loading: false, error: false, subscriptionRequired: false });
        return;
      }

      const selectedAccountId = resolveSelectedMtAccountId(
        mtAccounts as unknown as MtAccountSelectionSnapshot[]
      );
      const registeredResult = await channelsService.getRegisteredChannelsWithStatus(selectedAccountId);
      const nextSubscriptionStatus = registeredResult.status.subscriptionPaused
        ? registeredResult.status
        : normalizeSubscriptionReadStatus(mtAccountsResult.status);
      setSubscriptionStatus(nextSubscriptionStatus);
      const registered = registeredResult.channels;
      const connectedMt = hasConnectedMtAccount(mtAccounts);
      setHasConnectedMt(connectedMt);
      setSelectedMtAccountId(selectedAccountId);
      setRegisteredChannels(registered);
      hasLoadedChannelsRef.current = true;
      if (!registeredBrowseTrackedRef.current) {
        registeredBrowseTrackedRef.current = true;
        trackAnalyticsEvent('channels_browsed', {
          state: 'registered',
          channels_count: registered.length,
        });
      }
      if (registeredResult.refresh?.catalogVersion) {
        catalogVersionRef.current = registeredResult.refresh.catalogVersion;
      }
      setStatus({ loading: false, error: false, subscriptionRequired: false });
    } catch {
      setStatus({ loading: false, error: true, subscriptionRequired: false });
    }
  }, []);

  const refreshRegisteredProjection = useCallback(
    async (mtAccountId = selectedMtAccountId) => {
      const result = await channelsService.getRegisteredChannelsWithStatus(mtAccountId);
      setRegisteredChannels(result.channels);
      setSubscriptionStatus((current) =>
        result.status.subscriptionPaused ? result.status : current
      );
      if (result.refresh?.catalogVersion) {
        catalogVersionRef.current = result.refresh.catalogVersion;
      }
      return result;
    },
    [selectedMtAccountId]
  );

  const hasPendingChannelAccess = useMemo(
    () => registeredChannels.some((channel) =>
      channel.registrationState === 'PENDING_ACCESS' ||
      String(channel.accessState ?? '').toUpperCase() === 'VERIFYING'
    ),
    [registeredChannels]
  );

  const loadAvailableChannels = useCallback(
    async (mtAccountId = selectedMtAccountId) => {
      const running = availableLoadInFlightRef.current;
      if (running) {
        availableLoadQueuedRef.current = true;
        availableLoadQueuedAccountRef.current = mtAccountId;
        await running;
        return;
      }

      const load = (async () => {
        setAvailableStatus('loading');
        try {
          const result = await loadTelegramCatalogPages(
            ({ limit, cursor }) =>
              channelsService.getChannelCatalogWithStatus(mtAccountId, 'available', {
                limit,
                cursor,
              }),
            {
              limit: 100,
              maxPages: 100,
              restartOnCursorError: true,
              onPage: ({ page, channels }) => {
                setSubscriptionStatus((current) =>
                  page.status.subscriptionPaused ? page.status : current
                );
                setAvailableChannels(channels);
                setAvailableRefresh(page.refresh);
                if (page.refresh?.catalogVersion) {
                  catalogVersionRef.current = page.refresh.catalogVersion;
                }
                setAvailableStatus('loaded');
              },
            },
          );
          if (!result.lastPage) setAvailableStatus('loaded');
          if (!availableBrowseTrackedRef.current) {
            availableBrowseTrackedRef.current = true;
            trackAnalyticsEvent('channels_browsed', {
              state: 'available',
              channels_count: result.channels.length,
            });
          }
          if (!result.truncated) {
            availableLoadedCatalogVersionRef.current =
              result.lastPage?.refresh?.catalogVersion ?? catalogVersionRef.current;
          }
        } catch (error: unknown) {
          setAvailableStatus('error');
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              getErrorMessage(error) ||
              t.errors.register
          );
        }
      })();
      availableLoadInFlightRef.current = load;
      try {
        await load;
      } finally {
        if (availableLoadInFlightRef.current === load) {
          availableLoadInFlightRef.current = null;
        }
        if (availableLoadQueuedRef.current) {
          const queuedAccount = availableLoadQueuedAccountRef.current;
          availableLoadQueuedRef.current = false;
          availableLoadQueuedAccountRef.current = null;
          void loadAvailableChannels(queuedAccount ?? mtAccountId);
        }
      }
    },
    [intlMessages, selectedMtAccountId, t.errors.register]
  );

  const reloadCatalogProjection = useCallback(async () => {
    if (catalogReloadInFlightRef.current) {
      catalogReloadQueuedRef.current = true;
      return;
    }

    catalogReloadInFlightRef.current = true;
    try {
      await loadChannels();
      if (selectSheetOpen) await loadAvailableChannels(selectedMtAccountId);
    } finally {
      catalogReloadInFlightRef.current = false;
      if (catalogReloadQueuedRef.current) {
        catalogReloadQueuedRef.current = false;
        void reloadCatalogProjection();
      }
    }
  }, [loadAvailableChannels, loadChannels, selectSheetOpen, selectedMtAccountId]);

  useEffect(() => {
    if (!selectSheetOpen || !availableRefresh || availableRefresh.complete) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const result = await channelsService.getChannelCatalogWithStatus(
          selectedMtAccountId,
          'available'
        );
        if (cancelled) return;
        setAvailableChannels((current) => {
          const merged = new Map(
            current
              .map((channel) => [channel.peerId ?? channel.id ?? channel.peerKey ?? '', channel] as const)
              .filter(([key]) => key.length > 0)
          );
          result.channels.forEach((channel) => {
            const key = channel.peerId ?? channel.id ?? channel.peerKey;
            if (key) merged.set(key, channel);
          });
          return Array.from(merged.values()).filter((channel) => channel.id || channel.peerId);
        });
        setAvailableRefresh(result.refresh);
        if (result.refresh?.catalogVersion) {
          catalogVersionRef.current = result.refresh.catalogVersion;
          const loadedVersion = availableLoadedCatalogVersionRef.current;
          if (
            loadedVersion &&
            compareCatalogVersions(result.refresh.catalogVersion, loadedVersion) > 0
          ) {
            // The first-page status read is deliberately cheap. Once it sees a
            // newer catalog version, run the cursor sweep so rows discovered
            // after page one are admitted without requiring the sheet to close.
            void loadAvailableChannels(selectedMtAccountId);
          }
        }
        setAvailableStatus('loaded');
      } catch {
        // The saved catalog remains visible; the next interval retries the status read.
      }
    };
    const interval = window.setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [availableRefresh, loadAvailableChannels, selectSheetOpen, selectedMtAccountId]);

  // Registration is intentionally asynchronous. Poll the saved projection
  // while a row is pending so the UI converges even when a websocket event is
  // delayed or lost. Hidden tabs back off and never issue per-channel health
  // requests: one account-scoped catalog read updates every row.
  useEffect(() => {
    if (!telegramConnected || !hasPendingChannelAccess) return;

    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;
    const startedAt = Date.now();

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        void poll();
      }, delayMs);
    };

    const poll = async () => {
      if (cancelled || inFlight) return;
      if (document.visibilityState === 'hidden') {
        schedule(10_000);
        return;
      }
      inFlight = true;
      try {
        const result = await refreshRegisteredProjection(selectedMtAccountId);
        if (cancelled) return;
        const stillPending = result.channels.some((channel) =>
          channel.registrationState === 'PENDING_ACCESS' ||
          String(channel.accessState ?? '').toUpperCase() === 'VERIFYING'
        );
        if (!stillPending) return;
      } catch {
        // Keep the saved row visible and retry on the next backoff interval.
      } finally {
        inFlight = false;
      }
      schedule(Date.now() - startedAt < 30_000 ? 2_000 : 10_000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && timer === null) {
        void poll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    schedule(2_000);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasPendingChannelAccess, refreshRegisteredProjection, selectedMtAccountId, telegramConnected]);

  // A websocket invalidation is the fast path. This inexpensive indexed read
  // recovers when Redis delivery or a browser connection is interrupted.
  useEffect(() => {
    if (!telegramConnected) return;
    let cancelled = false;
    const checkCatalogVersion = async () => {
      try {
        const result = await channelsService.getChannelCatalogWithStatus(
          selectedMtAccountId,
          'registered',
          { limit: 1 },
        );
        if (cancelled || !result.refresh?.catalogVersion) return;
        const next = result.refresh.catalogVersion;
        const previous = catalogVersionRef.current;
        if (!previous) {
          catalogVersionRef.current = next;
          return;
        }
        if (compareCatalogVersions(next, previous) <= 0) return;
        catalogVersionRef.current = next;
        void reloadCatalogProjection();
      } catch {
        // The next interval or websocket reconnect will retry the read.
      }
    };
    const interval = window.setInterval(() => {
      void checkCatalogVersion();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadAvailableChannels, loadChannels, reloadCatalogProjection, selectSheetOpen, selectedMtAccountId, telegramConnected]);

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

  const reconcileChannelSubscriptions = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    const nextIds = new Set(registeredChannelIdsRef.current);
    const subscribedIds = subscribedChannelIdsRef.current;

    subscribedIds.forEach((subscriptionId) => {
      if (!nextIds.has(subscriptionId)) {
        socket.emit('channel:unsubscribe', subscriptionId);
        subscribedIds.delete(subscriptionId);
      }
    });

    nextIds.forEach((subscriptionId) => {
      if (subscribedIds.has(subscriptionId)) {
        return;
      }
      socket.emit('channel:subscribe', {
        rt: 3,
        id: subscriptionId,
        r: 'All',
        ch: 0,
      });
      subscribedIds.add(subscriptionId);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadChannels();
    });
  }, [loadChannels]);

  useEffect(() => {
    registeredChannelIdsRef.current = registeredChannels
      .map((channel) => channel.id)
      .filter((id): id is string => Boolean(id));
    const activeSubscriptionIds = new Set(registeredChannelIdsRef.current);
    channelSummarySnapshotMsRef.current.forEach((_, subscriptionId) => {
      if (!activeSubscriptionIds.has(subscriptionId)) {
        channelSummarySnapshotMsRef.current.delete(subscriptionId);
      }
    });
    reconcileChannelSubscriptions();
  }, [registeredChannels, reconcileChannelSubscriptions]);

  useEffect(() => {
    if (typeof window === 'undefined' || !telegramConnected) {
      if (socketRef.current) {
        const socket = socketRef.current;
        subscribedChannelIdsRef.current.forEach((subscriptionId) => {
          socket.emit('channel:unsubscribe', subscriptionId);
        });
        subscribedChannelIdsRef.current.clear();
        socket.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let authRetryUsed = false;

    const socket: Socket = createRealtimeSocket();

    socketRef.current = socket;

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

    const handleChannelSummary = (payload: unknown) => {
      const payloadRecord = asRecord(payload);
      if (!payloadRecord) {
        return;
      }

      const subscriptionId =
        typeof payloadRecord.subscriptionId === 'string' ? payloadRecord.subscriptionId : undefined;
      if (!subscriptionId) {
        return;
      }

      const snapshotTimestamp = parseSnapshotTimestamp(payloadRecord.snapshotAt);
      if (snapshotTimestamp !== null) {
        const previousSnapshot = channelSummarySnapshotMsRef.current.get(subscriptionId) ?? 0;
        if (snapshotTimestamp < previousSnapshot) {
          return;
        }
        channelSummarySnapshotMsRef.current.set(subscriptionId, snapshotTimestamp);
      }

      const livePerformance = asRecord(payloadRecord.performance);
      const liveChannel = asRecord(payloadRecord.channel);
      const liveValue =
        parseFiniteNumber(livePerformance?.value) ??
        parseFiniteNumber(livePerformance?.financialResult);
      const liveReturnPercent = parseFiniteNumber(livePerformance?.returnPercent);
      const liveTrend = normalizeTrend(livePerformance?.trend);
      const liveCurrency =
        typeof livePerformance?.currency === 'string' && livePerformance.currency.trim().length > 0
          ? livePerformance.currency
          : undefined;
      const liveMembers = parseFiniteNumber(liveChannel?.members);

      setRegisteredChannels((current) =>
        current.map((channel) => {
          if (channel.id !== subscriptionId) {
            return channel;
          }

          const nextValue = liveValue ?? channel.performance?.value ?? 0;
          const nextReturnPercent = liveReturnPercent ?? channel.performance?.returnPercent ?? 0;
          const nextTrend = liveTrend ?? (nextValue > 0 ? 'up' : nextValue < 0 ? 'down' : 'flat');
          const nextCurrency = liveCurrency ?? channel.performance?.currency ?? 'USD';

          return {
            ...channel,
            participantsCount:
              liveMembers !== undefined
                ? Math.max(0, Math.trunc(liveMembers))
                : channel.participantsCount,
            performance: {
              value: nextValue,
              returnPercent: nextReturnPercent,
              trend: nextTrend,
              currency: nextCurrency,
            },
          };
        })
      );
    };

    const handleRealtimeTransport = (payload: unknown) => {
      const decoded = decodeRealtimeTransportEvent(payload);
      if (!decoded || decoded.event !== 'channel:summary') {
        return;
      }
      handleChannelSummary(decoded.payload);
    };
    const handleCompactChannelSummary = (payload: unknown) => {
      handleRealtimeTransport({ e: 'cs', d: payload });
    };
    const handleCatalogUpdated = (payload: unknown) => {
      const event = parseCatalogUpdatedEvent(payload);
      if (!event) return;
      const previous = catalogVersionRef.current;
      if (previous && compareCatalogVersions(event.catalogVersion, previous) <= 0) return;
      catalogVersionRef.current = event.catalogVersion;
      void reloadCatalogProjection();
    };

    socket.on('connect', () => {
      authRetryUsed = false;
      reconcileChannelSubscriptions();
    });

    socket.on('cs', handleCompactChannelSummary);
    socket.on('telegram:catalog-updated', handleCatalogUpdated);

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

    const subscribedChannelIds = subscribedChannelIdsRef.current;

    void connectSocket();

    return () => {
      cancelled = true;
      subscribedChannelIds.forEach((subscriptionId) => {
        socket.emit('channel:unsubscribe', subscriptionId);
      });
      subscribedChannelIds.clear();
      socket.off('cs', handleCompactChannelSummary);
      socket.off('telegram:catalog-updated', handleCatalogUpdated);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    loadAvailableChannels,
    loadChannels,
    reconcileChannelSubscriptions,
    reloadCatalogProjection,
    refreshSocketAccessToken,
    selectSheetOpen,
    selectedMtAccountId,
    telegramConnected,
  ]);

  useEffect(() => {
    if (!selectSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectSheetOpen]);

  useEffect(() => {
    if (!deleteTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [deleteTarget]);

  const handleToggle = async (subscription: TelegramChannelSubscription) => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    if (!subscription.enabled && !hasConnectedMt) {
      toast.error(t.errors.enableRequiresMt);
      return;
    }

    const next = registeredChannels.map((item) =>
      item.id === subscription.id ? { ...item, enabled: !item.enabled } : item
    );
    setRegisteredChannels(next);
    try {
      await channelsService.toggleChannel(subscription.id);
      trackAnalyticsEvent('channel_subscription_toggled', {
        channel_id: subscription.channelId,
        subscription_id: subscription.id,
        enabled: !subscription.enabled,
      });
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) || getErrorMessage(error) || t.errors.toggle
      );
      setRegisteredChannels(registeredChannels);
    }
  };

  const handleRefreshAccess = async (subscription: TelegramChannelSubscription) => {
    setChannelActionId(subscription.id);
    try {
      await channelsService.requestChannelAccessRefresh(
        subscription.id,
        getOrCreateChannelActionKey(
          channelActionKeysRef.current,
          'access-refresh',
          subscription.id,
        ),
      );
      toast.success(t.health.refreshQueued);
      await refreshRegisteredProjection(selectedMtAccountId);
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) ||
          getErrorMessage(error) ||
          t.errors.refreshAccess
      );
    } finally {
      setChannelActionId(null);
    }
  };

  const handleAcceptMigration = async (subscription: TelegramChannelSubscription) => {
    setChannelActionId(subscription.id);
    try {
      await channelsService.acceptChannelMigration(
        subscription.id,
        undefined,
        getOrCreateChannelActionKey(
          channelActionKeysRef.current,
          'migration-accept',
          subscription.id,
        ),
      );
      clearChannelActionKey(channelActionKeysRef.current, 'migration-accept', subscription.id);
      toast.success(t.health.refreshQueued);
      await loadChannels();
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) ||
          getErrorMessage(error) ||
          t.errors.acceptMigration
      );
    } finally {
      setChannelActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await channelsService.deleteSubscription(deleteTarget.id);
      trackAnalyticsEvent('channel_subscription_deleted', {
        channel_id: deleteTarget.channelId,
        subscription_id: deleteTarget.id,
      });
      await loadChannels();
      setDeleteTarget(null);
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) || getErrorMessage(error) || t.errors.delete
      );
    } finally {
      setPending(false);
    }
  };

  const handleOpenSelect = () => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    setSelectedChannelIds([]);
    availableBrowseTrackedRef.current = false;
    setSelectSheetOpen(true);
    setAvailableRefresh(null);
    availableLoadedCatalogVersionRef.current = null;
    void loadAvailableChannels();
  };

  const handleRegister = async () => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    if (selectedChannelIds.length === 0) return;
    setPending(true);
    try {
      const selectedPeers = availableChannels.filter((channel) =>
        selectedChannelIds.includes(channel.peerId ?? channel.id ?? '')
      );
      const catalogPeerIds = selectedPeers.map((channel) => channel.peerId).filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      const registrationScope = selectedChannelIds.slice().sort().join(',') || 'empty';
      if (catalogPeerIds.length === selectedChannelIds.length) {
        const completedBatchScopes: string[] = [];
        await registerTelegramCatalogPeersInBatches(
          catalogPeerIds,
          async (batch, index) => {
            const batchScope = `${registrationScope}:batch:${index}`;
            const registrationKey = getOrCreateChannelActionKey(
              channelActionKeysRef.current,
              'register',
              batchScope,
            );
            await channelsService.registerCatalogPeers(
              batch,
              selectedMtAccountId,
              registrationKey,
            );
            completedBatchScopes.push(batchScope);
          },
        );
        completedBatchScopes.forEach((batchScope) => {
          clearChannelActionKey(channelActionKeysRef.current, 'register', batchScope);
        });
      } else {
        // Compatibility for rows produced by an older API during rollout.
        const registrationKey = getOrCreateChannelActionKey(
          channelActionKeysRef.current,
          'register',
          registrationScope,
        );
        await channelsService.registerChannels(selectedChannelIds, selectedMtAccountId, registrationKey);
        clearChannelActionKey(channelActionKeysRef.current, 'register', registrationScope);
      }
      if (selectedMtAccountId) {
        trackAnalyticsEvent('channels_registered', {
          channel_ids: selectedChannelIds,
          channels_count: selectedChannelIds.length,
          mt_account_id: selectedMtAccountId,
        });
      }
      await loadChannels();
      setAvailableChannels([]);
      setAvailableRefresh(null);
      setAvailableStatus('idle');
      setSelectSheetOpen(false);
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) || getErrorMessage(error) || t.errors.register
      );
    } finally {
      setPending(false);
    }
  };

  const toggleSelected = (id: string) => {
    if (!selectedChannelIds.includes(id)) {
      const selected = availableChannels.find((channel) =>
        (channel.peerId ?? channel.id ?? channel.peerKey) === id
      );
      if (selected && selected.title?.trim() && typeof selected.participantsCount === 'number') {
        trackAnalyticsEvent('channel_selected', {
          channel_id: selected.peerId ?? selected.id ?? id,
          channel_title: selected.title,
          participants_count: selected.participantsCount,
        });
      }
    }
    setSelectedChannelIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const hasChannels = registeredChannels.length > 0;
  const isEmptyState = telegramConnected && !status.loading && !hasChannels;
  const selectedCount = selectedChannelIds.length;

  if (status.loading) {
    return <ChannelsPageSkeleton />;
  }

  return (
    <div className="channels-shell">
      <div className="dashboard-grid channels-grid">
        <div className="dashboard-area">
          <div className="channels-container">
            <ChannelsHeader
              title={t.title}
              onAdd={
                telegramConnected && !subscriptionStatus.subscriptionPaused
                  ? handleOpenSelect
                  : undefined
              }
              addAriaLabel={t.actions.addChannelsAria}
            />

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

            {!status.loading && !status.error && status.subscriptionRequired && (
              <ChannelsEmptyState
                title={billingDisabled ? t.error : t.subscriptionRequired.title}
                subtitle={billingDisabled ? t.error : t.subscriptionRequired.subtitle}
                ctaLabel={billingDisabled ? t.addSheet.retry : t.subscriptionRequired.cta}
                onCta={
                  billingDisabled
                    ? () => void loadChannels()
                    : () => router.push(localizePath(lang, '/profile/subscription'))
                }
              />
            )}

            {!status.loading &&
              !status.error &&
              !status.subscriptionRequired &&
              !telegramConnected && (
                <ChannelsEmptyState
                  variant="telegram"
                  title={t.notConnected.title}
                  subtitle={t.notConnected.subtitle}
                  ctaLabel={t.notConnected.cta}
                  onCta={() => setTelegramConnectOpen(true)}
                />
              )}

            {!status.loading &&
              !status.error &&
              !status.subscriptionRequired &&
              telegramConnected &&
              !hasConnectedMt && (
                <div className="channels-mt-required-note">
                  <p>{t.mtRequired.subtitle}</p>
                  <button
                    type="button"
                    className="channels-mt-required-cta"
                    onClick={() => router.push(localizePath(lang, '/dashboard'))}
                  >
                    {t.mtRequired.cta}
                  </button>
                </div>
              )}

            {isEmptyState && !status.subscriptionRequired && !subscriptionStatus.subscriptionPaused && (
              <ChannelsEmptyState
                title={t.empty.title}
                subtitle={t.empty.subtitle}
                ctaLabel={t.empty.cta}
                onCta={handleOpenSelect}
              />
            )}

            {!status.loading && !status.error && !status.subscriptionRequired && hasChannels && (
              <div className="channels-list">
                {registeredChannels.map((channel) => {
                  const meta = channelMetaMap.get(channel.channelId);
                  const isVerifyingAccess = channel.registrationState === 'PENDING_ACCESS';
                  const isMigrated = channel.registrationState === 'MIGRATED';
                  const accessState = String(channel.accessState ?? '').toUpperCase();
                  const needsAccessRefresh =
                    !isVerifyingAccess &&
                    !isMigrated &&
                    ['FORBIDDEN', 'ACCESS_LOST', 'UNAVAILABLE'].includes(accessState);
                  const actionBusy = channelActionId === channel.id;
                  const performance = channel.performance;
                  const performanceValue =
                    typeof performance?.value === 'number' ? performance.value : 0;
                  const performancePercent =
                    typeof performance?.returnPercent === 'number' ? performance.returnPercent : 0;
                  const performancePercentLabel = formatSignedPercent(
                    performancePercent,
                    performanceValue
                  );
                  const performanceLabel =
                    typeof performance?.value === 'number'
                      ? `${performance.value >= 0 ? '+' : '-'}${formatCurrency(
                          Math.abs(performance.value),
                          performance.currency ?? 'USD',
                          lang
                        )} (${performancePercentLabel})`
                      : undefined;
                  return (
                    <ChannelRow
                      key={channel.id}
                      title={channel.channelTitle ?? t.channelFallback}
                      subtitle={
                        <span aria-live="polite">{buildHealthSubtitle(channel, meta)}</span>
                      }
                      imageUrl={channel.photoUrl}
                      enabled={channel.enabled}
                      trend={performance?.trend}
                      performanceLabel={performanceLabel}
                      deleteLabel={t.actions.delete}
                      deleteAriaLabel={t.actions.deleteChannelAria}
                      enableAriaLabel={t.actions.enableChannelAria}
                      disableAriaLabel={t.actions.disableChannelAria}
                      toggleDisabledAriaLabel={t.actions.toggleLockedAria}
                      toggleDisabled={
                        isVerifyingAccess ||
                        isMigrated ||
                        subscriptionStatus.subscriptionPaused ||
                        (!hasConnectedMt && !channel.enabled)
                      }
                      statusAction={
                        isMigrated
                          ? {
                              label: actionBusy ? t.connect.verifying : t.health.acceptMigration,
                              ariaLabel: t.health.acceptMigration,
                              onClick: () => void handleAcceptMigration(channel),
                              disabled: actionBusy,
                            }
                          : needsAccessRefresh
                            ? {
                                label: actionBusy ? t.connect.verifying : t.health.refreshAccess,
                                ariaLabel: t.health.refreshAccess,
                                onClick: () => void handleRefreshAccess(channel),
                                disabled: actionBusy,
                              }
                            : undefined
                      }
                      onToggle={() => handleToggle(channel)}
                      onDelete={() => setDeleteTarget(channel)}
                      href={localizePath(lang, `/channels/${channel.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectSheetOpen && (
        <div
          className="dashboard-sheet-backdrop channels-modal-backdrop"
          onClick={() => setSelectSheetOpen(false)}
        >
          <div
            className="channels-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.addSheet.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="channels-sheet-header">
              <h2>{t.addSheet.title}</h2>
              <button type="button" onClick={() => setSelectSheetOpen(false)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="channels-sheet-list">
              {availableStatus === 'loading' && availableChannels.length === 0 && (
                <AvailableChannelsSkeleton label={t.loading} />
              )}

              {availableStatus === 'error' && (
                <div className="channels-sheet-state">
                  <p className="channels-sheet-empty">{t.error}</p>
                  <button
                    type="button"
                    className="channels-secondary channels-sheet-retry"
                    onClick={() => loadAvailableChannels()}
                  >
                    {t.addSheet.retry}
                  </button>
                </div>
              )}

              {availableStatus === 'loaded' && availableChannels.length === 0 && (
                <p className="channels-sheet-empty">
                  {availableRefresh && !availableRefresh.complete ? t.loading : t.addSheet.empty}
                </p>
              )}
              {(availableStatus === 'loaded' ||
                (availableStatus === 'loading' && availableChannels.length > 0)) &&
                availableChannels.map((channel) => {
                  const channelId = channel.peerId ?? channel.id;
                  if (!channelId) {
                    return null;
                  }
                  const isChecked = selectedChannelIds.includes(channelId);
                  return (
                    <button
                      key={channelId}
                      type="button"
                      className={cn('channels-sheet-row', isChecked && 'is-active')}
                      onClick={() => toggleSelected(channelId)}
                    >
                      <div className="channels-row-info">
                        <ChannelAvatar imageUrl={channel.photoUrl} />
                        <div>
                          <p className="channels-row-title">{channel.title ?? 'Untitled'}</p>
                          <p className="channels-row-subtitle">
                            {channel.username ? `@${channel.username}` : ''}
                            {channel.participantsCount
                              ? ` • ${formatMembers(channel.participantsCount, t)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <span className={cn('channels-check', isChecked && 'is-active')}>
                        <i className="fa-solid fa-check" aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className="channels-sheet-footer">
              <button
                type="button"
                className="channels-primary"
                onClick={handleRegister}
                disabled={
                  pending || selectedChannelIds.length === 0 || subscriptionStatus.subscriptionPaused
                }
              >
                {pending ? t.connect.sending : t.addSheet.submit}
              </button>
              <span className="channels-selected-badge">
                {t.addSheet.selectedCount.replace('{count}', String(selectedCount))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* More menu handled by DashboardBaseLayout */}

      {deleteTarget && (
        <div
          className="dashboard-sheet-backdrop channels-modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="channels-confirm"
            role="dialog"
            aria-modal="true"
            aria-label={t.deleteConfirm.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="channels-confirm-illustration" aria-hidden="true">
              <Home2Image src="/assets/delete-channel-icon.svg" alt="Delete Channel" />
            </div>
            <h2>{t.deleteConfirm.title}</h2>
            <div className="channels-confirm-actions">
              <button
                type="button"
                className="channels-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                {t.deleteConfirm.no}
              </button>
              <button
                type="button"
                className="channels-danger"
                onClick={handleDelete}
                disabled={pending}
              >
                {pending ? t.deleteConfirm.pending : t.deleteConfirm.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      <TelegramConnectSheet
        open={telegramConnectOpen}
        onClose={() => setTelegramConnectOpen(false)}
        defaultCountry={defaultCountry}
        onConnected={async (connected) => {
          if (!connected) return;
          await loadChannels();
        }}
      />
    </div>
  );
}
