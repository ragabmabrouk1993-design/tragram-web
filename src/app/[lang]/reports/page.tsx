'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  formatCurrencyAmount as formatCurrency,
  normalizeCurrencyCode,
} from '@/lib/currency-format';
import { formatTradePrice } from '@/lib/trade-price-format';
import {
  GlassCard,
  OrderDetailsSheet,
  OrdersListRow,
  type OrderDetailsSheetRecord,
} from '@/components/dashboard';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { channelsService } from '@/services/channels.service';
import { connectionsService } from '@/services/connections.service';
import type { PublicTradeRecord } from '@/lib/api-client';
import {
  reportsService,
  type PerformanceReport,
  type PerformanceSeries,
  type PerformanceSummary,
  type TopChannelSummary,
  type TradeComparisonSummary,
  type TradeHistoryItem,
} from '@/services/reports.service';
import { BackButton } from '@/components/ui/back-button';
import { SymbolPairBadge } from '@/components/symbols';
import { useAdaptiveDropdownPosition } from '@/components/ui/use-adaptive-dropdown-position';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import {
  normalizeSubscriptionReadStatus,
  subscriptionPauseFallbackMessage,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { SubscriptionPausedNotice } from '@/components/subscription/subscription-paused-notice';
import {
  defaultReportsUrlFilterState,
  parseReportsUrlState,
  serializeReportsUrlState,
  type ReportsFilterChoice as FilterChoice,
  type ReportsFilterOption as FilterOption,
  type ReportsGeneratedReportType as ReportType,
  type ReportsResultChoice as ResultChoice,
  type ReportsTabId as TabId,
} from './reports-url-state';

type LoadIssueKind =
  | 'subscription'
  | 'plan'
  | 'account'
  | 'performance'
  | 'series'
  | 'reports'
  | 'channels'
  | 'symbols'
  | 'history';

type LoadIssue = {
  kind: LoadIssueKind;
  message: string;
};

type MtAccountSelectionSnapshot = {
  id?: string | null;
  accountNumber?: string | null;
  company?: string | null;
  server?: string | null;
  accountType?: string | null;
  platform?: string | null;
  isPrimary?: boolean | null;
  isSelected?: boolean | null;
  isActive?: boolean;
  connectionStatus?: string;
  currency?: string | null;
};

const resolveSelectedMtAccountId = (
  accounts: MtAccountSelectionSnapshot[],
  preferredId?: string | null
): string | null => {
  const preferred = preferredId ? accounts.find((account) => account.id === preferredId) : null;
  const selected =
    preferred ??
    accounts.find((account) => account.isSelected === true) ??
    accounts.find((account) => account.isPrimary === true) ??
    accounts.find(
      (account) => account.isActive === true && account.connectionStatus === 'CONNECTED'
    ) ??
    accounts[0];

  return typeof selected?.id === 'string' && selected.id.trim().length > 0 ? selected.id : null;
};

type MtAccountFilterItem = {
  id: string;
  name: string;
  brokerAccountId: string;
  platform: string;
  server: string | null;
  summary: string;
  meta: string;
  status: string;
  currency: string;
};

const formatMtAccountOption = (
  account: MtAccountSelectionSnapshot,
  fallback: string
): MtAccountFilterItem | null => {
  if (typeof account.id !== 'string' || account.id.trim().length === 0) {
    return null;
  }
  const platform = account.platform ?? account.accountType ?? 'MT';
  const accountNumber = account.accountNumber ?? fallback;
  const company = account.company ?? fallback;
  const server = account.server ?? '';
  const accountSummary = `${platform} ${accountNumber}`;
  return {
    id: account.id,
    name: company,
    brokerAccountId: accountNumber,
    platform,
    server: server || null,
    summary: `${company} · ${accountSummary}`,
    meta: server ? `${accountSummary} · ${server}` : accountSummary,
    status: account.connectionStatus ?? (account.isActive ? 'CONNECTED' : 'DISCONNECTED'),
    currency: normalizeCurrencyCode(account.currency),
  };
};

const formatChannelName = (
  title: string | null | undefined,
  username: string | null | undefined,
  fallback: string
) => {
  const cleanTitle = title?.trim();
  if (cleanTitle) {
    return cleanTitle;
  }
  const cleanUsername = username?.trim();
  return cleanUsername || fallback;
};

const formatChannelHandle = (username: string | null | undefined, fallback: string) => {
  const cleanUsername = username?.trim();
  return cleanUsername ? `@${cleanUsername}` : fallback;
};

type ChannelItem = {
  id: string;
  name: string;
  handle: string;
  members: string;
};

type SymbolItem = {
  id: string;
  label: string;
  symbol: string;
  base: string | null;
  quote: string | null;
  baseCountry: string | null;
  quoteCountry: string | null;
};

type HistoryItem = {
  id: string;
  trade: TradeHistoryItem;
  symbol: string;
  channel: string | null;
  side: FilterChoice;
  lot: string;
  price: string;
  closeTime: string;
  result: ResultChoice;
  pnl: string;
  pnlTrend: 'up' | 'down';
  amount: string;
};

type ReportsFilterState = {
  mtAccountId: string | null;
  selectedChannels: string[];
  selectedSymbols: string[];
  timeRange: FilterOption;
  tradeType: FilterChoice | null;
  resultType: ResultChoice | null;
  reportType: ReportType | null;
  customStartDate: string;
  customEndDate: string;
};

type CompareSegmentRow = {
  id: string;
  label: string;
  count: number;
  wins: number;
  profit: number;
  winRate: number | null;
  averageProfit: number;
  impact: number;
};

const createInitialReportsFilters = (): ReportsFilterState => defaultReportsUrlFilterState();
const HISTORY_PAGE_SIZE = 25;

const reportTypes: ReportType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

const emptyTradeComparison: TradeComparisonSummary = {
  symbols: [],
  channels: [],
  directions: [],
};

const resolveErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const response =
    'response' in error ? (error as { response?: { status?: unknown } }).response : null;
  return typeof response?.status === 'number' ? response.status : null;
};

const resolveLoadIssue = (kind: LoadIssueKind, error: unknown): LoadIssue => {
  const status = resolveErrorStatus(error);
  if (status === 402) {
    return { kind: 'subscription', message: 'subscription' };
  }
  if (status === 403) {
    return { kind: 'plan', message: 'plan' };
  }
  return { kind, message: kind };
};

const formatProfit = (value: number, currency: string, locale: string) =>
  formatCurrency(value, currency, locale);

const formatChartDate = (value: string, locale: string, options: Intl.DateTimeFormatOptions) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(locale, options);
};

const ReportsPageSkeleton = () => (
  <div className="reports-page reports-page-skeleton" aria-hidden="true">
    <div className="reports-hero reports-hero-skeleton">
      <span className="reports-page-skeleton-circle is-muted" />
      <span className="reports-page-skeleton-line reports-page-skeleton-title" />
      <span className="reports-page-skeleton-circle" />
    </div>

    <div className="reports-tabs reports-tabs-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <span key={`reports-tab-skeleton-${index}`} className="reports-page-skeleton-tab" />
      ))}
    </div>

    <div className="reports-stack">
      <GlassCard className="reports-card reports-page-skeleton-card">
        <div className="reports-card-header">
          <div className="reports-page-skeleton-copy">
            <span className="reports-page-skeleton-line reports-page-skeleton-line-short" />
            <span className="reports-page-skeleton-line reports-page-skeleton-line-medium" />
          </div>
          <div className="reports-card-actions">
            <span className="reports-page-skeleton-circle reports-page-skeleton-circle-sm" />
            <span className="reports-page-skeleton-circle reports-page-skeleton-circle-sm" />
          </div>
        </div>

        <div className="reports-profit-row">
          <span className="reports-page-skeleton-pill" />
          <span className="reports-page-skeleton-pill reports-page-skeleton-pill-short" />
        </div>
        <span className="reports-page-skeleton-line reports-page-skeleton-amount" />
        <div className="reports-line-chart">
          <div className="reports-chart-skeleton">
            <div className="reports-skeleton-line" />
            <div className="reports-skeleton-line short" />
          </div>
        </div>
      </GlassCard>

      <div className="reports-compare-grid">
        <GlassCard className="reports-card reports-page-skeleton-card">
          <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
          <div className="reports-page-skeleton-bars">
            <div className="reports-bars-skeleton">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`reports-bars-skeleton-${index}`} className="reports-bar-skeleton" />
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="reports-card reports-page-skeleton-card">
          <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
          <div className="reports-table-skeleton">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`reports-table-skeleton-${index}`} className="reports-table-row-skeleton" />
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="reports-card reports-page-skeleton-card">
        <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
        <div className="reports-history-skeleton">
          <div className="reports-history-date-skeleton" />
          <div className="reports-history-card-skeleton" />
          <div className="reports-history-card-skeleton" />
          <div className="reports-history-card-skeleton is-desktop" />
        </div>
      </GlassCard>
    </div>
  </div>
);

export default function ReportsPage() {
  const lang = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intlMessages = useRouteMessages();
  const t = intlMessages.reportsPage;
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const orderDetailsLabels = intlMessages.dashboardPage.orders;
  const [initialUrlState] = useState(() =>
    parseReportsUrlState(new URLSearchParams(searchParams.toString()))
  );
  const hasHandledInitialMtAccount = useRef(false);
  const tabs = useMemo(
    () => [
      { id: 'Performance', label: t.tabs.performance },
      { id: 'Compare', label: t.tabs.compare },
      { id: 'History', label: t.tabs.history },
    ],
    [t.tabs]
  );
  const [activeTab, setActiveTab] = useState<TabId>(initialUrlState.activeTab);
  const [filterOpen, setFilterOpen] = useState(false);
  const [channelSheetOpen, setChannelSheetOpen] = useState(false);
  const [symbolSheetOpen, setSymbolSheetOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedMtAccountId, setSelectedMtAccountId] = useState<string | null>(null);
  const [defaultMtAccountId, setDefaultMtAccountId] = useState<string | null>(null);
  const [draftMtAccountId, setDraftMtAccountId] = useState<string | null>(
    initialUrlState.filters.mtAccountId
  );
  const [mtAccountOptions, setMtAccountOptions] = useState<MtAccountFilterItem[]>([]);
  const [selectedMtAccountResolved, setSelectedMtAccountResolved] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    initialUrlState.filters.selectedChannels
  );
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    initialUrlState.filters.selectedSymbols
  );
  const [timeRange, setTimeRange] = useState<FilterOption>(
    initialUrlState.filters.timeRange
  );
  const [tradeType, setTradeType] = useState<FilterChoice | null>(
    initialUrlState.filters.tradeType
  );
  const [resultType, setResultType] = useState<ResultChoice | null>(
    initialUrlState.filters.resultType
  );
  const [reportType, setReportType] = useState<ReportType | null>(
    initialUrlState.filters.reportType
  );
  const [customStartDate, setCustomStartDate] = useState(
    initialUrlState.filters.customStartDate
  );
  const [customEndDate, setCustomEndDate] = useState(initialUrlState.filters.customEndDate);
  const [appliedFilters, setAppliedFilters] = useState<ReportsFilterState>(
    () => initialUrlState.filters
  );
  const appliedFiltersRef = useRef(initialUrlState.filters);
  const [customDateError, setCustomDateError] = useState('');
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
  const rangeMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const rangeMenuPopoverRef = useRef<HTMLDivElement | null>(null);
  const [reportsStatus, setReportsStatus] = useState<{
    loading: boolean;
    error: boolean;
    refreshing: boolean;
  }>({ loading: true, error: false, refreshing: false });
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [performanceSeries, setPerformanceSeries] = useState<PerformanceSeries | null>(null);
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [tradeComparison, setTradeComparison] =
    useState<TradeComparisonSummary>(emptyTradeComparison);
  const [topChannels, setTopChannels] = useState<TopChannelSummary[]>([]);
  const [analyticsAllowed] = useState(true);
  const [entitlementsResolved] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<NormalizedSubscriptionReadStatus>(
    normalizeSubscriptionReadStatus(null)
  );
  const [channelOptions, setChannelOptions] = useState<ChannelItem[]>([]);
  const [symbolOptions, setSymbolOptions] = useState<SymbolItem[]>([]);
  const [loadIssues, setLoadIssues] = useState<LoadIssue[]>([]);
  const [generateStatus, setGenerateStatus] = useState<{
    type: ReportType | null;
    state: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: null, state: 'idle', message: '' });
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [selectedHistoryTradeId, setSelectedHistoryTradeId] = useState<string | null>(null);
  const [selectedHistoryTrade, setSelectedHistoryTrade] = useState<PublicTradeRecord | null>(null);
  const [tradeDetailsStatus, setTradeDetailsStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  );

  const {
    loading: reportsLoading,
    error: reportsError,
    refreshing: reportsRefreshing,
  } = reportsStatus;
  const { style: rangeMenuStyle, placement: rangeMenuPlacement } = useAdaptiveDropdownPosition({
    open: rangeMenuOpen,
    triggerRef: rangeMenuTriggerRef,
    align: 'end',
    gap: 8,
    minWidth: 140,
    preferredHeight: 220,
    minHeight: 120,
  });

  const anyModalOpen =
    filterOpen || channelSheetOpen || symbolSheetOpen || Boolean(selectedHistoryTradeId);

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    const query = serializeReportsUrlState(activeTab, appliedFilters);
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== current) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [activeTab, appliedFilters, router]);

  useEffect(() => {
    let isActive = true;

    const loadSelectedMtAccount = async () => {
      try {
        const mtAccounts = await connectionsService.getMtAccounts();
        if (!isActive) {
          return;
        }
        const accountSnapshots = mtAccounts as unknown as MtAccountSelectionSnapshot[];
        const resolvedDefault = resolveSelectedMtAccountId(accountSnapshots);
        const preferredAccountId =
          appliedFiltersRef.current.mtAccountId ?? initialUrlState.filters.mtAccountId;
        const resolvedSelected = resolveSelectedMtAccountId(accountSnapshots, preferredAccountId);
        setMtAccountOptions(
          accountSnapshots
            .map((account) => formatMtAccountOption(account, t.filters.accountFallback))
            .filter((account): account is MtAccountFilterItem => Boolean(account))
        );
        setDefaultMtAccountId(resolvedDefault);
        setSelectedMtAccountId(resolvedSelected);
        setDraftMtAccountId(resolvedSelected);
        if (resolvedSelected !== appliedFiltersRef.current.mtAccountId) {
          setAppliedFilters((current) => ({
            ...current,
            mtAccountId: resolvedSelected,
          }));
        }
      } catch {
        if (!isActive) {
          return;
        }
        setSelectedMtAccountId(null);
        setDefaultMtAccountId(null);
        setDraftMtAccountId(null);
        setMtAccountOptions([]);
      } finally {
        if (isActive) {
          setSelectedMtAccountResolved(true);
        }
      }
    };

    void loadSelectedMtAccount();

    const handleWindowFocus = () => {
      void loadSelectedMtAccount();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      isActive = false;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [initialUrlState.filters.mtAccountId, t.filters.accountFallback]);

  useEffect(() => {
    if (!anyModalOpen) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [anyModalOpen]);

  useEffect(() => {
    if (!selectedHistoryTradeId) {
      return undefined;
    }

    let isActive = true;
    const resetTimeout = window.setTimeout(() => {
      if (!isActive) return;
      setTradeDetailsStatus('loading');
      setSelectedHistoryTrade(null);
    }, 0);

    reportsService
      .getTradeDetails(selectedHistoryTradeId)
      .then((trade) => {
        if (!isActive) return;
        setSelectedHistoryTrade(trade);
        setTradeDetailsStatus('idle');
      })
      .catch(() => {
        if (!isActive) return;
        setSelectedHistoryTrade(null);
        setTradeDetailsStatus('error');
      });

    return () => {
      isActive = false;
      window.clearTimeout(resetTimeout);
    };
  }, [selectedHistoryTradeId]);

  useEffect(() => {
    if (!selectedHistoryTradeId) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedHistoryTradeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryTradeId]);

  useEffect(() => {
    if (!selectedMtAccountResolved) {
      return;
    }
    if (!hasHandledInitialMtAccount.current) {
      hasHandledInitialMtAccount.current = true;
      return;
    }
    setSelectedChannels([]);
    setSelectedSymbols([]);
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setSelectedHistoryTradeId(null);
    setSelectedHistoryTrade(null);
    setTradeDetailsStatus('idle');
    setAppliedFilters((current) => ({
      ...current,
      selectedChannels: [],
      selectedSymbols: [],
    }));
  }, [selectedMtAccountId, selectedMtAccountResolved]);

  useEffect(() => {
    if (!rangeMenuOpen) return undefined;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rangeMenuRef.current &&
        !rangeMenuRef.current.contains(target) &&
        !rangeMenuPopoverRef.current?.contains(target)
      ) {
        setRangeMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRangeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [rangeMenuOpen]);

  const resolveDateRange = useCallback(
    (range: FilterOption, startDateValue = '', endDateValue = '') => {
      const end = new Date();
      if (range === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      if (range === 'week') {
        const start = new Date();
        start.setDate(end.getDate() - 6);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      if (range === 'month') {
        const start = new Date();
        start.setDate(end.getDate() - 29);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      if (range === 'all') {
        return {};
      }
      if (range === 'custom') {
        if (!startDateValue || !endDateValue) return {};
        const start = new Date(startDateValue);
        const customEnd = new Date(endDateValue);
        if (Number.isNaN(start.getTime()) || Number.isNaN(customEnd.getTime())) return {};
        if (start > customEnd) return {};
        start.setHours(0, 0, 0, 0);
        customEnd.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: customEnd.toISOString() };
      }
      return {};
    },
    []
  );

  const isCustomRange = timeRange === 'custom';
  const isCustomMissing = isCustomRange && (!customStartDate || !customEndDate);
  const isCustomInvalid =
    isCustomRange && customStartDate && customEndDate
      ? new Date(customStartDate) > new Date(customEndDate)
      : false;

  const loadReports = useCallback(
    async (filters: ReportsFilterState = appliedFilters) => {
      if (!selectedMtAccountResolved) {
        return;
      }
      if (!entitlementsResolved) {
        return;
      }

      const isInitialLoad =
        reports.length === 0 && tradeHistory.length === 0 && topChannels.length === 0;
      setReportsStatus({ loading: isInitialLoad, refreshing: !isInitialLoad, error: false });

      const dateRange = resolveDateRange(
        filters.timeRange,
        filters.customStartDate,
        filters.customEndDate
      );
      const symbolsParam = filters.selectedSymbols.length
        ? filters.selectedSymbols.join(',')
        : undefined;
      const channelsParam = filters.selectedChannels.length
        ? filters.selectedChannels.join(',')
        : undefined;
      const sideParam = filters.tradeType ? filters.tradeType.toUpperCase() : undefined;
      const resultParam = filters.resultType ? filters.resultType.toUpperCase() : undefined;
      const metricsAccountId = filters.mtAccountId ?? selectedMtAccountId;

      const requests = await Promise.allSettled([
        analyticsAllowed ? reportsService.getPerformance({
          ...dateRange,
          mtAccountId: metricsAccountId,
        }) : Promise.resolve(null),
        analyticsAllowed ? reportsService.getPerformanceSeries({
          ...dateRange,
          mtAccountId: metricsAccountId,
        }) : Promise.resolve(null),
        reportsService.getReports({
          limit: 8,
          mtAccountId: metricsAccountId,
          reportType: filters.reportType ?? undefined,
        }),
        channelsService.getRegisteredChannels(metricsAccountId),
        channelsService.getSymbolsCatalog(metricsAccountId),
        analyticsAllowed
          ? reportsService.getTopChannels({ limit: 8, mtAccountId: metricsAccountId })
          : Promise.resolve(null),
        reportsService.getTradeHistory({
          limit: historyLimit,
          ...dateRange,
          symbols: symbolsParam,
          channelIds: channelsParam,
          side: sideParam,
          result: resultParam,
          mtAccountId: metricsAccountId,
        }),
        reportsService.getTradeComparison({
          ...dateRange,
          symbols: symbolsParam,
          channelIds: channelsParam,
          side: sideParam,
          result: resultParam,
          mtAccountId: metricsAccountId,
        }),
      ]);

      const nextIssues: LoadIssue[] = [];
      const [
        summaryResult,
        seriesResult,
        reportListResult,
        channelListResult,
        symbolsCatalogResult,
        topChannelsResult,
        historyResult,
        comparisonResult,
      ] = requests;

      const readStatuses: NormalizedSubscriptionReadStatus[] = [];
      for (const result of [summaryResult, seriesResult, reportListResult, historyResult, comparisonResult]) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const readStatus = (result.value as { readStatus?: NormalizedSubscriptionReadStatus }).readStatus;
        if (readStatus) readStatuses.push(readStatus);
      }
      const pausedReadStatus = readStatuses.find((value) => value.subscriptionPaused);
      setSubscriptionStatus(pausedReadStatus ?? readStatuses[0] ?? normalizeSubscriptionReadStatus(null));

      if (analyticsAllowed) {
        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          setPerformanceSummary(summaryResult.value.data);
          const resolvedMetricsAccountId = summaryResult.value.scope.metricsAccountId;
          if (resolvedMetricsAccountId && resolvedMetricsAccountId !== selectedMtAccountId) {
            setSelectedMtAccountId(resolvedMetricsAccountId);
            setDraftMtAccountId(resolvedMetricsAccountId);
          }
        } else {
          nextIssues.push(resolveLoadIssue('performance', summaryResult.status === 'rejected' ? summaryResult.reason : null));
        }

        if (seriesResult.status === 'fulfilled' && seriesResult.value) {
          setPerformanceSeries(seriesResult.value.data);
        } else {
          nextIssues.push(resolveLoadIssue('series', seriesResult.status === 'rejected' ? seriesResult.reason : null));
        }
      }

      if (reportListResult.status === 'fulfilled') {
        setReports(reportListResult.value.data);
      } else {
        nextIssues.push(resolveLoadIssue('reports', reportListResult.reason));
      }

      if (channelListResult.status === 'fulfilled') {
        const channelItems: ChannelItem[] = channelListResult.value.map((channel) => ({
          id: channel.id,
          name: formatChannelName(channel.channelTitle, channel.channelUsername, t.channelFallback),
          handle: formatChannelHandle(channel.channelUsername, t.channelPrivateFallback),
          members: channel.participantsCount
            ? `${channel.participantsCount.toLocaleString(lang)}${t.membersSuffix}`
            : t.membersHidden,
        }));
        setChannelOptions(channelItems);
      } else {
        nextIssues.push(resolveLoadIssue('channels', channelListResult.reason));
      }

      if (symbolsCatalogResult.status === 'fulfilled') {
        const symbolItems: SymbolItem[] = symbolsCatalogResult.value.symbols.map((symbol) => ({
          id: symbol.symbol,
          label: symbol.display || symbol.symbol,
          symbol: symbol.symbol,
          base: symbol.base ?? null,
          quote: symbol.quote ?? null,
          baseCountry: symbol.baseCountry ?? null,
          quoteCountry: symbol.quoteCountry ?? null,
        }));
        setSymbolOptions(symbolItems);
      } else {
        nextIssues.push(resolveLoadIssue('symbols', symbolsCatalogResult.reason));
      }

      if (analyticsAllowed) {
        if (topChannelsResult.status === 'fulfilled' && topChannelsResult.value) {
          setTopChannels(topChannelsResult.value.data);
        } else {
          nextIssues.push(resolveLoadIssue('channels', topChannelsResult.status === 'rejected' ? topChannelsResult.reason : null));
        }
      }

      if (historyResult.status === 'fulfilled') {
        setTradeHistory(historyResult.value.data);
      } else {
        nextIssues.push(resolveLoadIssue('history', historyResult.reason));
      }

      if (comparisonResult.status === 'fulfilled') {
        setTradeComparison(comparisonResult.value.data);
      } else {
        nextIssues.push(resolveLoadIssue('history', comparisonResult.reason));
      }

      setLoadIssues(nextIssues);
      setReportsStatus({
        loading: false,
        refreshing: false,
        error: nextIssues.length === requests.length,
      });
    },
    [
      resolveDateRange,
      appliedFilters,
      selectedMtAccountId,
      selectedMtAccountResolved,
      entitlementsResolved,
      analyticsAllowed,
      historyLimit,
      reports.length,
      tradeHistory.length,
      topChannels.length,
      lang,
      t.channelFallback,
      t.channelPrivateFallback,
      t.membersHidden,
      t.membersSuffix,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReports(appliedFilters);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [appliedFilters, loadReports]);

  const openFilterSheet = () => {
    setDraftMtAccountId(appliedFilters.mtAccountId ?? selectedMtAccountId);
    setSelectedChannels(appliedFilters.selectedChannels);
    setSelectedSymbols(appliedFilters.selectedSymbols);
    setTimeRange(appliedFilters.timeRange);
    setTradeType(appliedFilters.tradeType);
    setResultType(appliedFilters.resultType);
    setReportType(appliedFilters.reportType);
    setCustomStartDate(appliedFilters.customStartDate);
    setCustomEndDate(appliedFilters.customEndDate);
    setCustomDateError('');
    setFilterOpen(true);
  };

  const latestReport = reports[0];
  const reportBySymbol = useMemo(() => {
    const raw =
      latestReport?.data && typeof latestReport.data === 'object'
        ? (latestReport.data as {
            bySymbol?: Record<string, { totalTrades?: number; profit?: number }>;
          })
        : null;
    return raw?.bySymbol ?? null;
  }, [latestReport]);

  const symbolPerformance = useMemo(() => {
    if (!reportBySymbol) return [];
    return Object.entries(reportBySymbol)
      .map(([label, value]) => ({
        label,
        value: Number(value?.profit ?? 0),
        trades: Number(value?.totalTrades ?? 0),
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [reportBySymbol]);

  const channelFilterOptions = useMemo(() => {
    const items = new Map<string, ChannelItem>();
    channelOptions.forEach((item) => items.set(item.id, item));
    topChannels.forEach((channel) => {
      const id = channel.id ?? channel.channelId;
      if (!id || items.has(id)) {
        return;
      }
      const name = formatChannelName(
        channel.channelTitle,
        channel.channelUsername,
        t.channelFallback
      );
      const handle = formatChannelHandle(channel.channelUsername, t.channelPrivateFallback);
      const trades = Number(channel.stats?.totalTrades ?? 0);
      items.set(id, {
        id,
        name,
        handle,
        members: `${trades.toLocaleString(lang)} ${t.compare.headers.orders.toLowerCase()}`,
      });
    });
    return Array.from(items.values());
  }, [
    channelOptions,
    topChannels,
    lang,
    t.channelFallback,
    t.channelPrivateFallback,
    t.compare.headers.orders,
  ]);

  const symbolFilterOptions = useMemo(() => {
    const items = new Map<string, SymbolItem>();
    symbolOptions.forEach((item) => items.set(item.id, item));
    symbolPerformance.forEach((symbol) => {
      if (items.has(symbol.label)) {
        return;
      }
      items.set(symbol.label, {
        id: symbol.label,
        label: symbol.label,
        symbol: symbol.label,
        base: null,
        quote: null,
        baseCountry: null,
        quoteCountry: null,
      });
    });
    tradeHistory.forEach((trade) => {
      if (!trade.symbol || items.has(trade.symbol)) {
        return;
      }
      items.set(trade.symbol, {
        id: trade.symbol,
        label: trade.symbol,
        symbol: trade.symbol,
        base: null,
        quote: null,
        baseCountry: null,
        quoteCountry: null,
      });
    });
    return Array.from(items.values());
  }, [symbolOptions, symbolPerformance, tradeHistory]);

  const selectedChannelItems = useMemo(
    () => channelFilterOptions.filter((item) => selectedChannels.includes(item.id)),
    [channelFilterOptions, selectedChannels]
  );

  const selectedSymbolItems = useMemo(
    () => symbolFilterOptions.filter((item) => selectedSymbols.includes(item.id)),
    [symbolFilterOptions, selectedSymbols]
  );

  const appliedChannelItems = useMemo(
    () => channelFilterOptions.filter((item) => appliedFilters.selectedChannels.includes(item.id)),
    [channelFilterOptions, appliedFilters.selectedChannels]
  );

  const appliedSymbolItems = useMemo(
    () => symbolFilterOptions.filter((item) => appliedFilters.selectedSymbols.includes(item.id)),
    [symbolFilterOptions, appliedFilters.selectedSymbols]
  );

  const selectedMtAccountOption = useMemo(
    () => mtAccountOptions.find((item) => item.id === selectedMtAccountId) ?? null,
    [mtAccountOptions, selectedMtAccountId]
  );
  const displayCurrency = selectedMtAccountOption?.currency ?? 'USD';

  const draftMtAccountOption = useMemo(
    () => mtAccountOptions.find((item) => item.id === draftMtAccountId) ?? null,
    [mtAccountOptions, draftMtAccountId]
  );

  const activeFilterCount =
    appliedFilters.selectedChannels.length +
    appliedFilters.selectedSymbols.length +
    (appliedFilters.timeRange !== 'today' ? 1 : 0) +
    (appliedFilters.tradeType ? 1 : 0) +
    (appliedFilters.resultType ? 1 : 0) +
    (appliedFilters.reportType ? 1 : 0);

  const historyFilterCount =
    appliedFilters.selectedChannels.length +
    appliedFilters.selectedSymbols.length +
    (appliedFilters.timeRange !== 'today' ? 1 : 0) +
    (appliedFilters.tradeType ? 1 : 0) +
    (appliedFilters.resultType ? 1 : 0);

  const draftFilterCount =
    selectedChannels.length +
    selectedSymbols.length +
    (timeRange !== 'today' ? 1 : 0) +
    (tradeType ? 1 : 0) +
    (resultType ? 1 : 0) +
    (reportType ? 1 : 0);

  const filteredChannelOptions = useMemo(() => {
    const query = channelSearch.trim().toLowerCase();
    if (!query) return channelFilterOptions;
    return channelFilterOptions.filter((item) =>
      `${item.name} ${item.handle}`.toLowerCase().includes(query)
    );
  }, [channelFilterOptions, channelSearch]);

  const filteredSymbolOptions = useMemo(() => {
    const query = symbolSearch.trim().toLowerCase();
    if (!query) return symbolFilterOptions;
    return symbolFilterOptions.filter((item) =>
      `${item.label} ${item.symbol} ${item.base ?? ''} ${item.quote ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [symbolFilterOptions, symbolSearch]);

  const performanceProfitValue = performanceSummary?.netProfit ?? latestReport?.netProfit ?? 0;
  const symbolsProfitValue = symbolPerformance.reduce((sum, item) => sum + item.value, 0);
  const isPerformanceProfitNegative = performanceProfitValue < 0;
  const isSymbolsProfitNegative = symbolsProfitValue < 0;

  const lineChartValues = useMemo(() => {
    return performanceSeries?.points?.map((point) => Number(point.value ?? 0)) ?? [];
  }, [performanceSeries]);

  const lineChartData = useMemo(() => {
    const basePoints =
      performanceSeries?.points?.map((point, index) => ({
        index,
        label: point.date,
        date: point.date,
        value: Number(point.value ?? 0),
      })) ?? [];

    if (basePoints.length === 0) {
      return [];
    }

    const segmentedPoints = [basePoints[0]];
    for (let index = 1; index < basePoints.length; index += 1) {
      const previous = basePoints[index - 1];
      const current = basePoints[index];
      const signChanged =
        previous.value !== 0 &&
        current.value !== 0 &&
        Math.sign(previous.value) !== Math.sign(current.value);

      if (signChanged) {
        const crossingRatio =
          Math.abs(previous.value) / (Math.abs(previous.value) + Math.abs(current.value));
        segmentedPoints.push({
          index: previous.index + (current.index - previous.index) * crossingRatio,
          label: '',
          date: current.date,
          value: 0,
        });
      }

      segmentedPoints.push(current);
    }

    return segmentedPoints;
  }, [performanceSeries]);

  const lineChartTicks = useMemo(() => {
    return performanceSeries?.points?.map((_, index) => index) ?? [];
  }, [performanceSeries]);

  const lineChartBounds = useMemo(() => {
    if (!lineChartValues.length) {
      return { min: 0, max: 0, first: 0, last: 0, delta: 0 };
    }
    const first = lineChartValues[0] ?? 0;
    const last = lineChartValues[lineChartValues.length - 1] ?? 0;
    return {
      min: Math.min(...lineChartValues),
      max: Math.max(...lineChartValues),
      first,
      last,
      delta: last - first,
    };
  }, [lineChartValues]);

  const lineChartDomain = useMemo(() => {
    if (!lineChartData.length) return undefined;
    const values = lineChartData.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.18 || Math.max(Math.abs(max), 1) * 0.12;
    return [min - padding, max + padding];
  }, [lineChartData]);

  const lineChartLineGradientStops = useMemo(() => {
    if (!lineChartData.length) {
      return [];
    }

    const maxX = lineChartData[lineChartData.length - 1]?.index ?? 0;
    const resolveColor = (value: number) => (value >= 0 ? '#00be68' : '#ff5b33');

    if (maxX <= 0) {
      return [{ offset: '0%', color: resolveColor(lineChartData[0]?.value ?? 0) }];
    }

    const blendWindowPercent = 1.8;
    const stops: Array<{ offset: string; color: string }> = [
      { offset: '0%', color: resolveColor(lineChartData[0]?.value ?? 0) },
    ];

    for (let index = 1; index < lineChartData.length - 1; index += 1) {
      const point = lineChartData[index];
      if (point.value !== 0) {
        continue;
      }

      const previous = lineChartData[index - 1];
      const next = lineChartData[index + 1];
      if (!previous || !next || previous.value === 0 || next.value === 0) {
        continue;
      }

      const crossingPercent = (point.index / maxX) * 100;
      const beforeOffset = `${Math.max(0, crossingPercent - blendWindowPercent)}%`;
      const afterOffset = `${Math.min(100, crossingPercent + blendWindowPercent)}%`;

      stops.push({ offset: beforeOffset, color: resolveColor(previous.value) });
      stops.push({ offset: afterOffset, color: resolveColor(next.value) });
    }

    stops.push({
      offset: '100%',
      color: resolveColor(lineChartData[lineChartData.length - 1]?.value ?? 0),
    });

    return stops;
  }, [lineChartData]);

  const lineChartFillGradientStops = useMemo(() => {
    if (!lineChartDomain || lineChartDomain.length !== 2) {
      return [
        { offset: '0%', color: 'rgba(0, 190, 104, 0.24)' },
        { offset: '100%', color: 'rgba(0, 190, 104, 0.035)' },
      ];
    }

    if (lineChartBounds.min >= 0) {
      return [
        { offset: '0%', color: 'rgba(0, 190, 104, 0.24)' },
        { offset: '100%', color: 'rgba(0, 190, 104, 0.035)' },
      ];
    }

    if (lineChartBounds.max <= 0) {
      return [
        { offset: '0%', color: 'rgba(255, 91, 51, 0.24)' },
        { offset: '100%', color: 'rgba(255, 91, 51, 0.035)' },
      ];
    }

    const [minValue, maxValue] = lineChartDomain;
    const zeroOffsetPercent = (maxValue / (maxValue - minValue)) * 100;
    const blendWindowPercent = 4.5;

    return [
      { offset: '0%', color: 'rgba(0, 190, 104, 0.24)' },
      {
        offset: `${Math.max(0, zeroOffsetPercent - blendWindowPercent)}%`,
        color: 'rgba(0, 190, 104, 0.045)',
      },
      {
        offset: `${Math.min(100, zeroOffsetPercent + blendWindowPercent)}%`,
        color: 'rgba(255, 91, 51, 0.045)',
      },
      { offset: '100%', color: 'rgba(255, 91, 51, 0.035)' },
    ];
  }, [lineChartBounds.max, lineChartBounds.min, lineChartDomain]);

  const performanceRangeSummary = useMemo(() => {
    if (!performanceSummary) {
      return lineChartValues.length > 1
        ? t.performance.trendSummary
            .replace('{start}', formatCurrency(lineChartBounds.first, displayCurrency, lang))
            .replace('{end}', formatCurrency(lineChartBounds.last, displayCurrency, lang))
            .replace('{delta}', formatCurrency(lineChartBounds.delta, displayCurrency, lang))
        : t.performance.dataEmpty;
    }

    const rangeLabel = t.performance.rangeOptions[appliedFilters.timeRange];
    if (performanceSummary.totalTrades <= 0) {
      return t.performance.rangeSummaryEmpty.replace('{range}', rangeLabel);
    }

    return t.performance.rangeSummary
      .replace('{range}', rangeLabel)
      .replace('{net}', formatCurrency(performanceSummary.netProfit, displayCurrency, lang))
      .replace('{trades}', performanceSummary.totalTrades.toLocaleString(lang))
      .replace('{profit}', formatCurrency(performanceSummary.totalProfit, displayCurrency, lang))
      .replace('{loss}', formatCurrency(performanceSummary.totalLoss, displayCurrency, lang));
  }, [
    appliedFilters.timeRange,
    displayCurrency,
    lang,
    lineChartBounds.delta,
    lineChartBounds.first,
    lineChartBounds.last,
    lineChartValues.length,
    performanceSummary,
    t.performance.dataEmpty,
    t.performance.rangeOptions,
    t.performance.rangeSummary,
    t.performance.rangeSummaryEmpty,
    t.performance.trendSummary,
  ]);

  const symbolChartData = useMemo(() => symbolPerformance.slice(0, 6), [symbolPerformance]);

  const compareSymbolRows = useMemo<CompareSegmentRow[]>(() => {
    const totalImpact = tradeComparison.symbols.reduce(
      (sum, row) => sum + Math.abs(row.netProfit),
      0
    );

    return tradeComparison.symbols
      .map((row) => ({
        id: row.id || row.label || t.compare.symbolFallback,
        label: row.label || t.compare.symbolFallback,
        count: row.count,
        wins: row.wins,
        profit: row.netProfit,
        winRate: row.winRate,
        averageProfit: row.averageNetProfit,
        impact: totalImpact > 0 ? Math.abs(row.netProfit) / totalImpact : 0,
      }))
      .sort((left, right) => Math.abs(right.profit) - Math.abs(left.profit))
      .slice(0, 8);
  }, [tradeComparison.symbols, t.compare.symbolFallback]);

  const compareChannelRows = useMemo<CompareSegmentRow[]>(() => {
    const totalImpact = tradeComparison.channels.reduce(
      (sum, row) => sum + Math.abs(row.netProfit),
      0
    );

    return tradeComparison.channels
      .map((row) => ({
        id: row.id || row.label || t.compare.channelFallback,
        label: row.label || t.compare.channelFallback,
        count: row.count,
        wins: row.wins,
        profit: row.netProfit,
        winRate: row.winRate,
        averageProfit: row.averageNetProfit,
        impact: totalImpact > 0 ? Math.abs(row.netProfit) / totalImpact : 0,
      }))
      .sort((left, right) => Math.abs(right.profit) - Math.abs(left.profit))
      .slice(0, 8);
  }, [tradeComparison.channels, t.compare.channelFallback]);

  const compareDirectionRows = useMemo<CompareSegmentRow[]>(() => {
    const totalImpact = tradeComparison.directions.reduce(
      (sum, row) => sum + Math.abs(row.netProfit),
      0
    );

    return tradeComparison.directions
      .map((row) => ({
        id: row.id,
        label: row.id === 'SELL' ? t.history.sell : t.history.buy,
        count: row.count,
        wins: row.wins,
        profit: row.netProfit,
        winRate: row.winRate,
        averageProfit: row.averageNetProfit,
        impact: totalImpact > 0 ? Math.abs(row.netProfit) / totalImpact : 0,
      }))
      .sort((left, right) => right.profit - left.profit);
  }, [tradeComparison.directions, t.history.buy, t.history.sell]);

  const compareSummary = useMemo(() => {
    return {
      trades: tradeComparison.symbols.reduce((sum, row) => sum + row.count, 0),
      symbolLeader:
        [...compareSymbolRows].sort((left, right) => right.profit - left.profit)[0] ?? null,
      channelLeader:
        [...compareChannelRows].sort((left, right) => right.profit - left.profit)[0] ?? null,
      directionLeader:
        [...compareDirectionRows].sort((left, right) => right.profit - left.profit)[0] ?? null,
    };
  }, [compareChannelRows, compareDirectionRows, compareSymbolRows, tradeComparison.symbols]);

  const kpiItems = useMemo(
    () => [
      {
        label: t.kpis.netPnl,
        value: formatCurrency(performanceSummary?.netProfit ?? 0, displayCurrency, lang),
        trend: (performanceSummary?.netProfit ?? 0) >= 0 ? 'up' : 'down',
      },
      {
        label: t.kpis.trades,
        value: String(performanceSummary?.totalTrades ?? 0),
      },
      {
        label: t.kpis.winRate,
        value: `${Math.round(performanceSummary?.winRate ?? 0)}%`,
      },
      {
        label: t.kpis.profitFactor,
        value: Number.isFinite(performanceSummary?.profitFactor ?? NaN)
          ? (performanceSummary?.profitFactor ?? 0).toFixed(2)
          : '—',
      },
      {
        label: t.kpis.grossProfit,
        value: formatCurrency(performanceSummary?.totalProfit ?? 0, displayCurrency, lang),
        trend: 'up',
      },
      {
        label: t.kpis.grossLoss,
        value: formatCurrency(performanceSummary?.totalLoss ?? 0, displayCurrency, lang),
        trend: 'down',
      },
    ],
    [displayCurrency, performanceSummary, lang, t.kpis]
  );

  const reportRows = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      period:
        report.startDate && report.endDate
          ? `${new Date(report.startDate).toLocaleDateString(lang)} - ${new Date(
              report.endDate
            ).toLocaleDateString(lang)}`
          : t.generated.periodFallback,
      generated: report.generatedAt
        ? new Date(report.generatedAt).toLocaleString(lang, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : t.generated.pending,
      bySymbol:
        report.data && typeof report.data === 'object'
          ? (
              report.data as {
                bySymbol?: Record<string, { totalTrades?: number; profit?: number }>;
              }
            ).bySymbol
          : null,
    }));
  }, [reports, lang, t.generated]);

  const historyGroups = useMemo(() => {
    const groups = new Map<string, HistoryItem[]>();
    tradeHistory.forEach((trade) => {
      const dateLabel = trade.closeTime
        ? new Date(trade.closeTime).toLocaleDateString(lang, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : t.history.recent;
      const existing = groups.get(dateLabel) ?? [];
      const volume = Number(trade.volume ?? 0);
      const entryPrice = Number(trade.entryPrice ?? 0);
      const netProfit = Number(trade.netProfit ?? 0);
      const closeTimeLabel = trade.closeTime
        ? new Date(trade.closeTime).toLocaleTimeString(lang, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : t.history.recent;
      existing.push({
        id: trade.id,
        trade,
        symbol: trade.symbol,
        channel: trade.channelTitle ?? null,
        side: trade.side === 'SELL' ? 'sell' : 'buy',
        lot: `${volume.toFixed(2)} ${t.history.lotLabel}`,
        price: formatTradePrice(entryPrice || undefined, {
          locale: lang,
          priceDigits: trade.priceDigits,
        }),
        closeTime: closeTimeLabel,
        result: netProfit >= 0 ? 'win' : 'loss',
        pnl: formatProfit(netProfit, displayCurrency, lang),
        pnlTrend: netProfit >= 0 ? 'up' : 'down',
        amount: formatCurrency(netProfit, displayCurrency, lang),
      });
      groups.set(dateLabel, existing);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [displayCurrency, tradeHistory, lang, t.history.lotLabel, t.history.recent]);

  const selectedHistorySummary = useMemo(() => {
    if (!selectedHistoryTradeId) return null;
    return (
      historyGroups
        .flatMap((group) => group.items)
        .find((item) => item.id === selectedHistoryTradeId) ?? null
    );
  }, [historyGroups, selectedHistoryTradeId]);

  const selectedHistoryOrder = useMemo<OrderDetailsSheetRecord | null>(() => {
    if (selectedHistoryTrade) {
      return {
        ...selectedHistoryTrade,
        status: selectedHistoryTrade.status ?? 'closed',
        accountNumber:
          selectedHistoryTrade.accountNumber ?? selectedMtAccountOption?.brokerAccountId ?? null,
        accountPlatform:
          selectedHistoryTrade.accountPlatform ?? selectedMtAccountOption?.platform ?? null,
        channelTitle: selectedHistoryTrade.channelTitle ?? selectedHistorySummary?.channel ?? null,
      };
    }

    const fallbackTrade = selectedHistorySummary?.trade;
    if (!fallbackTrade) {
      return null;
    }

    return {
      id: fallbackTrade.id,
      symbol: fallbackTrade.symbol,
      side: fallbackTrade.side,
      status: 'closed',
      volume: fallbackTrade.volume,
      entryPrice: fallbackTrade.entryPrice,
      priceDigits: fallbackTrade.priceDigits ?? null,
      closeTime: fallbackTrade.closeTime ?? null,
      netProfit: fallbackTrade.netProfit,
      accountNumber: selectedMtAccountOption?.brokerAccountId ?? null,
      accountPlatform: selectedMtAccountOption?.platform ?? null,
      channelTitle: fallbackTrade.channelTitle ?? null,
    };
  }, [selectedHistorySummary, selectedHistoryTrade, selectedMtAccountOption]);

  const updateAppliedFilters = (next: ReportsFilterState) => {
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setSelectedHistoryTradeId(null);
    setSelectedHistoryTrade(null);
    setTradeDetailsStatus('idle');
    setAppliedFilters(next);
  };

  const clearFilters = () => {
    const next = createInitialReportsFilters();
    next.mtAccountId = defaultMtAccountId ?? selectedMtAccountId;
    setDraftMtAccountId(next.mtAccountId);
    setSelectedMtAccountId(next.mtAccountId);
    setSelectedChannels([]);
    setSelectedSymbols([]);
    setTimeRange(next.timeRange);
    setTradeType(null);
    setResultType(null);
    setReportType(null);
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomDateError('');
    updateAppliedFilters(next);
  };

  const resetDraftFilters = () => {
    const next = createInitialReportsFilters();
    next.mtAccountId = defaultMtAccountId ?? selectedMtAccountId;
    setDraftMtAccountId(next.mtAccountId);
    setSelectedChannels([]);
    setSelectedSymbols([]);
    setTimeRange(next.timeRange);
    setTradeType(null);
    setResultType(null);
    setReportType(null);
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomDateError('');
  };

  const removeFilter = (
    kind: 'channel' | 'symbol' | 'range' | 'side' | 'result' | 'reportType',
    id?: string
  ) => {
    updateAppliedFilters({
      ...appliedFilters,
      selectedChannels:
        kind === 'channel' && id
          ? appliedFilters.selectedChannels.filter((value) => value !== id)
          : appliedFilters.selectedChannels,
      selectedSymbols:
        kind === 'symbol' && id
          ? appliedFilters.selectedSymbols.filter((value) => value !== id)
          : appliedFilters.selectedSymbols,
      timeRange: kind === 'range' ? 'today' : appliedFilters.timeRange,
      customStartDate: kind === 'range' ? '' : appliedFilters.customStartDate,
      customEndDate: kind === 'range' ? '' : appliedFilters.customEndDate,
      tradeType: kind === 'side' ? null : appliedFilters.tradeType,
      resultType: kind === 'result' ? null : appliedFilters.resultType,
      reportType: kind === 'reportType' ? null : appliedFilters.reportType,
    });
  };

  const handleTabClick = (tabId: TabId) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
  };

  const refreshReports = () => {
    void loadReports(appliedFilters);
  };

  const generateReport = async (reportType: ReportType) => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    setGenerateStatus({ type: reportType, state: 'loading', message: '' });
    try {
      await reportsService.generateReport({ reportType, mtAccountId: selectedMtAccountId });
      setGenerateStatus({
        type: reportType,
        state: 'success',
        message: t.generated.queued.replace('{type}', t.generated.types[reportType]),
      });
      await loadReports(appliedFilters);
    } catch (error) {
      const issue = resolveLoadIssue('reports', error);
      setGenerateStatus({
        type: reportType,
        state: 'error',
        message:
          !billingDisabled && (issue.kind === 'subscription' || issue.kind === 'plan')
            ? t.states.subscriptionBody
            : t.generated.queueError,
      });
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Section', 'Name', 'Metric', 'Value'],
      ['Summary', t.kpis.netPnl, displayCurrency, String(performanceSummary?.netProfit ?? 0)],
      ['Summary', t.kpis.trades, 'Count', String(performanceSummary?.totalTrades ?? 0)],
      ['Summary', t.kpis.winRate, 'Percent', String(performanceSummary?.winRate ?? 0)],
      ...tradeHistory.map((trade) => [
        'History',
        trade.symbol,
        trade.channelTitle ?? '',
        String(trade.netProfit ?? 0),
      ]),
      ...reports.map((report) => [
        'Report',
        report.reportType,
        report.generatedAt ?? '',
        String(report.netProfit ?? 0),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tragram-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: (next: string[]) => void
  ) => {
    const next = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
    setSelected(next);
  };

  const hasSubscriptionIssue = loadIssues.some(
    (issue) => issue.kind === 'subscription' || issue.kind === 'plan'
  );
  const showSubscriptionIssue = hasSubscriptionIssue && !billingDisabled;
  const hasNoAccount = selectedMtAccountResolved && !selectedMtAccountId;
  const hasFilteredEmpty = historyFilterCount > 0 && tradeHistory.length === 0;
  const canLoadMoreHistory = tradeHistory.length >= historyLimit;
  const showPartialNotice = loadIssues.length > 0 && !reportsError && !showSubscriptionIssue;

  if (reportsStatus.loading) {
    return <ReportsPageSkeleton />;
  }

  return (
    <>
      <div className="reports-page">
        <div className="reports-command-center">
          <div className="reports-command-copy">
            <p className="reports-command-eyebrow">{t.commandCenter.eyebrow}</p>
            <h1 className="reports-hero-title">{t.title}</h1>
            <p className="reports-command-subtitle">
              {selectedMtAccountOption
                ? t.commandCenter.account
                    .replace('{name}', selectedMtAccountOption.name)
                    .replace('{account}', selectedMtAccountOption.brokerAccountId)
                    .replace('{platform}', selectedMtAccountOption.platform)
                : t.commandCenter.noAccount}
            </p>
          </div>
          <div className="reports-command-actions" aria-label={t.commandCenter.actionsAria}>
            <button
              type="button"
              className="reports-action-button"
              onClick={openFilterSheet}
              aria-label={t.hero.filterAria}
            >
              <i className="fa-solid fa-filter" aria-hidden="true" />
              <span>{t.commandCenter.filter}</span>
              {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
            </button>
            <button
              type="button"
              className={cn('reports-icon-button', reportsRefreshing && 'is-loading')}
              onClick={refreshReports}
              disabled={reportsRefreshing}
              aria-label={t.commandCenter.refresh}
              aria-busy={reportsRefreshing}
            >
              <i
                className={cn('fa-solid fa-arrows-rotate', reportsRefreshing && 'fa-spin')}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="reports-icon-button"
              onClick={exportCsv}
              aria-label={t.commandCenter.export}
            >
              <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="reports-filter-summary" aria-label={t.filters.activeAria}>
          <span className="reports-filter-summary-label">
            {t.performance.rangeOptions[appliedFilters.timeRange]}
          </span>
          {appliedChannelItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="reports-filter-chip"
              onClick={() => removeFilter('channel', item.id)}
            >
              {item.name}
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ))}
          {appliedSymbolItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="reports-filter-chip"
              onClick={() => removeFilter('symbol', item.id)}
            >
              {item.label}
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ))}
          {appliedFilters.tradeType && (
            <button
              type="button"
              className="reports-filter-chip"
              onClick={() => removeFilter('side')}
            >
              {appliedFilters.tradeType === 'buy' ? t.history.buy : t.history.sell}
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
          {appliedFilters.resultType && (
            <button
              type="button"
              className="reports-filter-chip"
              onClick={() => removeFilter('result')}
            >
              {appliedFilters.resultType === 'win' ? t.history.win : t.history.loss}
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
          {appliedFilters.reportType && (
            <button
              type="button"
              className="reports-filter-chip"
              onClick={() => removeFilter('reportType')}
            >
              {t.filters.reportTypeChip.replace(
                '{type}',
                t.generated.types[appliedFilters.reportType]
              )}
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
          {activeFilterCount > 0 && (
            <button type="button" className="reports-filter-clear" onClick={clearFilters}>
              {t.filters.clearAll}
            </button>
          )}
        </div>

        <SubscriptionPausedNotice
          status={subscriptionStatus}
          href={`/${lang}/profile/subscription`}
        />

        {(hasSubscriptionIssue || hasNoAccount || showPartialNotice) && (
          <GlassCard className={cn('reports-state-banner', showSubscriptionIssue && 'is-blocked')}>
            <div>
              <strong>
                {showSubscriptionIssue
                  ? t.states.subscriptionTitle
                  : hasNoAccount
                    ? t.states.noAccountTitle
                    : t.states.partialTitle}
              </strong>
              <p>
                {showSubscriptionIssue
                  ? t.states.subscriptionBody
                  : hasNoAccount
                    ? t.states.noAccountBody
                    : t.states.partialBody}
              </p>
            </div>
            <button
              type="button"
              className="reports-state-action"
              onClick={
                showSubscriptionIssue
                  ? () => router.push(`/${lang}/profile/subscription`)
                  : refreshReports
              }
            >
              {showSubscriptionIssue ? t.states.subscriptionAction : t.states.retry}
            </button>
          </GlassCard>
        )}

        <div className="reports-kpi-grid">
          {kpiItems.map((item) => (
            <GlassCard key={item.label} className="reports-kpi-card">
              <span>{item.label}</span>
              <strong
                className={cn(item.trend === 'up' && 'is-up', item.trend === 'down' && 'is-down')}
              >
                {item.value}
              </strong>
            </GlassCard>
          ))}
        </div>

        <div className="reports-tabs" role="tablist" aria-label={t.tabsAria}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn('reports-tab', tab.id === activeTab && 'is-active')}
              onClick={() => handleTabClick(tab.id as TabId)}
              role="tab"
              aria-selected={tab.id === activeTab}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'Performance' && (
          <div className="reports-stack">
            <GlassCard className="reports-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.performance.kicker}</p>
                  <p className="reports-card-subtitle">{t.performance.subtitle}</p>
                </div>
                <div className="reports-card-actions">
                  <button
                    type="button"
                    className="reports-icon-button"
                    aria-label={t.performance.exportAria}
                    onClick={exportCsv}
                  >
                    <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="reports-profit-row">
                <span className="reports-profit-pill">{t.performance.totalProfit}</span>
                <div className="reports-select-wrap" ref={rangeMenuRef}>
                  <button
                    ref={rangeMenuTriggerRef}
                    type="button"
                    className="reports-select"
                    onClick={() => setRangeMenuOpen((value) => !value)}
                    aria-expanded={rangeMenuOpen}
                    aria-haspopup="menu"
                  >
                    {t.performance.rangeOptions[appliedFilters.timeRange]}{' '}
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>
                  {rangeMenuOpen && rangeMenuStyle && typeof document !== 'undefined'
                    ? createPortal(
                        <div
                          ref={rangeMenuPopoverRef}
                          className="reports-select-menu"
                          role="menu"
                          data-placement={rangeMenuPlacement}
                          style={rangeMenuStyle}
                        >
                          {(['today', 'week', 'month', 'all', 'custom'] as FilterOption[]).map(
                            (option) => (
                              <button
                                key={option}
                                type="button"
                                className={cn(
                                  'reports-select-option',
                                  appliedFilters.timeRange === option && 'is-active'
                                )}
                                onClick={() => {
                                  setAppliedFilters((current) => ({
                                    ...current,
                                    timeRange: option,
                                    customStartDate:
                                      option === 'custom' ? current.customStartDate : '',
                                    customEndDate: option === 'custom' ? current.customEndDate : '',
                                  }));
                                  setTimeRange(option);
                                  setRangeMenuOpen(false);
                                }}
                                role="menuitem"
                              >
                                {t.performance.rangeOptions[option]}
                              </button>
                            )
                          )}
                        </div>,
                        document.body
                      )
                    : null}
                </div>
              </div>
              <div
                className={cn('reports-profit-amount', isPerformanceProfitNegative && 'is-down')}
              >
                {formatCurrency(performanceProfitValue, displayCurrency, lang)}
              </div>
              <div className="reports-line-chart">
                {reportsLoading ? (
                  <div className="reports-chart-skeleton" aria-hidden="true">
                    <div className="reports-skeleton-line" />
                    <div className="reports-skeleton-line short" />
                  </div>
                ) : reportsError ? (
                  <div className="reports-empty-state">{t.performance.dataError}</div>
                ) : lineChartData.length > 1 ? (
                  <AreaChart
                    data={lineChartData}
                    accessibilityLayer
                    responsive
                    role="img"
                    aria-label={t.performance.chartAria}
                    margin={{ top: 18, right: 18, left: 4, bottom: 8 }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <defs>
                      <linearGradient
                        id="reportsPerformanceFillByValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        {lineChartFillGradientStops.map((stop, index) => (
                          <stop
                            key={`reports-performance-fill-stop-${index}`}
                            offset={stop.offset}
                            stopColor={stop.color}
                            stopOpacity={1}
                          />
                        ))}
                      </linearGradient>
                      <linearGradient
                        id="reportsPerformanceLineGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        {lineChartLineGradientStops.map((stop, index) => (
                          <stop
                            key={`reports-performance-line-stop-${index}`}
                            offset={stop.offset}
                            stopColor={stop.color}
                          />
                        ))}
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(255, 255, 255, 0.09)"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="index"
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      ticks={lineChartTicks}
                      domain={
                        lineChartTicks.length
                          ? [lineChartTicks[0], lineChartTicks[lineChartTicks.length - 1]]
                          : undefined
                      }
                      minTickGap={22}
                      tick={{ fill: 'rgba(255, 255, 255, 0.58)', fontSize: 11 }}
                      tickFormatter={(value) => {
                        const point = performanceSeries?.points?.[Number(value)];
                        if (!point) return '';
                        return formatChartDate(String(point.date), lang, {
                          day: '2-digit',
                          month: 'short',
                        });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255, 255, 255, 0.58)', fontSize: 11 }}
                      tickFormatter={(value) => formatCurrency(Number(value), displayCurrency, lang)}
                      domain={lineChartDomain as [number, number] | undefined}
                      width={72}
                    />
                    <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.22)" strokeDasharray="4 4" />
                    <Tooltip
                      cursor={{ stroke: 'rgba(255, 255, 255, 0.22)', strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0]?.payload as { value: number; date: string };
                        const isDown = item.value < 0;
                        return (
                          <div className="reports-chart-tooltip">
                            <div className={cn('reports-tooltip-value', isDown && 'is-down')}>
                              {formatProfit(item.value, displayCurrency, lang)}
                            </div>
                            <div className="reports-tooltip-date">
                              {formatChartDate(item.date, lang, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="natural"
                      dataKey="value"
                      stroke="none"
                      fill="url(#reportsPerformanceFillByValue)"
                      fillOpacity={1}
                      baseValue={0}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="natural"
                      dataKey="value"
                      stroke="url(#reportsPerformanceLineGradient)"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: '#ffffff',
                        stroke: 'url(#reportsPerformanceLineGradient)',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                ) : (
                  <div className="reports-empty-state">{t.performance.dataEmpty}</div>
                )}
              </div>
              <p className="reports-chart-summary">{performanceRangeSummary}</p>
            </GlassCard>

            <GlassCard className="reports-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.symbols.kicker}</p>
                  <p className="reports-card-subtitle">{t.symbols.subtitle}</p>
                </div>
                <div className="reports-card-actions">
                  <button
                    type="button"
                    className="reports-icon-button"
                    aria-label={t.performance.exportAria}
                    onClick={exportCsv}
                  >
                    <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="reports-profit-row">
                <span className="reports-profit-pill">{t.symbols.totalProfit}</span>
                <button type="button" className="reports-select">
                  {t.symbols.all} <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                </button>
              </div>
              <div className={cn('reports-profit-amount', isSymbolsProfitNegative && 'is-down')}>
                {formatCurrency(symbolsProfitValue, displayCurrency, lang)}
              </div>
              <div className="reports-bar-chart">
                {reportsLoading ? (
                  <div className="reports-bars-skeleton" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`bar-skeleton-${index}`} className="reports-bar-skeleton" />
                    ))}
                  </div>
                ) : symbolChartData.length === 0 ? (
                  <div className="reports-empty-state">{t.symbols.empty}</div>
                ) : (
                  <BarChart
                    data={symbolChartData}
                    accessibilityLayer
                    responsive
                    margin={{ top: 12, right: 8, left: 0, bottom: 6 }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(255, 255, 255, 0.09)"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: 'rgba(255, 255, 255, 0.64)', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255, 255, 255, 0.58)', fontSize: 11 }}
                      tickFormatter={(value) => formatCurrency(Number(value), displayCurrency, lang)}
                      width={72}
                    />
                    <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.22)" strokeDasharray="4 4" />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0]?.payload as {
                          label: string;
                          value: number;
                          trades: number;
                        };
                        const isDown = item.value < 0;
                        return (
                          <div className="reports-chart-tooltip">
                            <div className="reports-tooltip-label">{item.label}</div>
                            <div className={cn('reports-tooltip-value', isDown && 'is-down')}>
                              {formatProfit(item.value, displayCurrency, lang)}
                            </div>
                            <div className="reports-tooltip-date">
                              {item.trades} {t.kpis.trades}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 4, 4]} isAnimationActive={false}>
                      {symbolChartData.map((item) => (
                        <Cell
                          key={`symbol-bar-${item.label}`}
                          fill={item.value < 0 ? '#f87171' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </div>
            </GlassCard>

            <GlassCard className="reports-card reports-generated-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.generated.title}</p>
                  <p className="reports-card-subtitle">{t.generated.subtitle}</p>
                </div>
                <div className="reports-card-actions reports-generate-actions">
                  {reportTypes.map((reportType) => (
                    <button
                      key={reportType}
                      type="button"
                      className="reports-small-button"
                      disabled={generateStatus.state === 'loading' || subscriptionStatus.subscriptionPaused}
                      onClick={() => void generateReport(reportType)}
                    >
                      {generateStatus.state === 'loading' && generateStatus.type === reportType
                        ? t.generated.generating
                        : t.generated.types[reportType]}
                    </button>
                  ))}
                </div>
              </div>
              {generateStatus.message && (
                <p
                  className={cn(
                    'reports-inline-status',
                    generateStatus.state === 'error' && 'is-error'
                  )}
                >
                  {generateStatus.message}
                </p>
              )}
              <div className="reports-generated-list">
                {reportRows.length === 0 ? (
                  <div className="reports-empty-state">{t.generated.empty}</div>
                ) : (
                  reportRows.map((report) => (
                    <details key={report.id} className="reports-generated-row">
                      <summary>
                        <span>
                          <strong>
                            {t.generated.types[report.reportType as ReportType] ??
                              report.reportType}
                          </strong>
                          <small>{report.period}</small>
                        </span>
                        <span className={cn((report.netProfit ?? 0) >= 0 ? 'is-up' : 'is-down')}>
                          {formatCurrency(report.netProfit ?? 0, displayCurrency, lang)}
                        </span>
                      </summary>
                      <div className="reports-generated-details">
                        <span>
                          {t.generated.generatedAt}: {report.generated}
                        </span>
                        <span>
                          {t.compare.headers.trades}: {report.totalTrades ?? 0}
                        </span>
                        <span>
                          {t.compare.headers.winRate}: {Math.round(report.winRate ?? 0)}%
                        </span>
                        <span>
                          {t.kpis.profitFactor}: {(report.profitFactor ?? 0).toFixed(2)}
                        </span>
                      </div>
                      {report.bySymbol && (
                        <div className="reports-generated-symbols">
                          {Object.entries(report.bySymbol)
                            .slice(0, 6)
                            .map(([symbol, value]) => (
                              <span key={symbol}>
                                {symbol}:{' '}
                                {formatCurrency(Number(value?.profit ?? 0), displayCurrency, lang)}
                              </span>
                            ))}
                        </div>
                      )}
                    </details>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'Compare' && (
          <div className="reports-stack reports-compare-grid">
            <GlassCard className="reports-card reports-compare-summary-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.compare.summaryKicker}</p>
                  <p className="reports-card-subtitle">{t.compare.summarySubtitle}</p>
                </div>
                <button
                  type="button"
                  className="reports-secondary-action"
                  onClick={() => handleTabClick('History')}
                >
                  {t.compare.reviewTrades}
                </button>
              </div>
              {reportsLoading ? (
                <div className="reports-table-skeleton" aria-hidden="true">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`compare-summary-skel-${index}`}
                      className="reports-table-row-skeleton"
                    />
                  ))}
                </div>
              ) : (
                <div className="reports-compare-summary-grid">
                  <div className="reports-compare-summary-item">
                    <span>{t.compare.summary.trades}</span>
                    <strong>{compareSummary.trades}</strong>
                    <small>{t.compare.closedTradesScope}</small>
                  </div>
                  <div className="reports-compare-summary-item">
                    <span>{t.compare.summary.symbolLeader}</span>
                    <strong>{compareSummary.symbolLeader?.label ?? t.compare.notAvailable}</strong>
                    <small
                      className={
                        compareSummary.symbolLeader
                          ? compareSummary.symbolLeader.profit >= 0
                            ? 'is-up'
                            : 'is-down'
                          : undefined
                      }
                    >
                      {compareSummary.symbolLeader
                        ? formatProfit(compareSummary.symbolLeader.profit, displayCurrency, lang)
                        : t.compare.notAvailable}
                    </small>
                  </div>
                  <div className="reports-compare-summary-item">
                    <span>{t.compare.summary.channelLeader}</span>
                    <strong>{compareSummary.channelLeader?.label ?? t.compare.notAvailable}</strong>
                    <small
                      className={
                        compareSummary.channelLeader
                          ? compareSummary.channelLeader.profit >= 0
                            ? 'is-up'
                            : 'is-down'
                          : undefined
                      }
                    >
                      {compareSummary.channelLeader
                        ? formatProfit(compareSummary.channelLeader.profit, displayCurrency, lang)
                        : t.compare.notAvailable}
                    </small>
                  </div>
                  <div className="reports-compare-summary-item">
                    <span>{t.compare.summary.directionLeader}</span>
                    <strong>
                      {compareSummary.directionLeader?.label ?? t.compare.notAvailable}
                    </strong>
                    <small
                      className={
                        compareSummary.directionLeader
                          ? compareSummary.directionLeader.profit >= 0
                            ? 'is-up'
                            : 'is-down'
                          : undefined
                      }
                    >
                      {compareSummary.directionLeader
                        ? formatProfit(compareSummary.directionLeader.profit, displayCurrency, lang)
                        : t.compare.notAvailable}
                    </small>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className="reports-card reports-compare-segment-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.compare.symbolsKicker}</p>
                  <p className="reports-card-subtitle">{t.compare.symbolsSubtitle}</p>
                </div>
              </div>
              <div className="reports-compare-list">
                {reportsLoading ? (
                  <div className="reports-table-skeleton" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`table-skel-${index}`} className="reports-table-row-skeleton" />
                    ))}
                  </div>
                ) : compareSymbolRows.length === 0 ? (
                  <div className="reports-empty-state">{t.compare.symbolsEmpty}</div>
                ) : (
                  compareSymbolRows.map((row, index) => (
                    <div
                      key={row.id}
                      className={cn(
                        'reports-compare-row',
                        row.profit >= 0 ? 'is-positive' : 'is-negative'
                      )}
                    >
                      <div
                        className="reports-compare-rank"
                        aria-label={t.compare.rankLabel.replace('{rank}', String(index + 1))}
                      >
                        {index + 1}
                      </div>
                      <div className="reports-compare-row-main">
                        <div className="reports-compare-row-title">
                          <strong>{row.label}</strong>
                          <span className={row.profit >= 0 ? 'is-up' : 'is-down'}>
                            {formatProfit(row.profit, displayCurrency, lang)}
                          </span>
                        </div>
                        <div className="reports-compare-row-meta">
                          <span>
                            {t.compare.metric.trades.replace('{count}', String(row.count))}
                          </span>
                          <span>
                            {t.compare.metric.winRate.replace(
                              '{value}',
                              row.winRate !== null ? `${Math.round(row.winRate)}%` : '—'
                            )}
                          </span>
                          <span>
                            {t.compare.metric.average.replace(
                              '{value}',
                              formatProfit(row.averageProfit, displayCurrency, lang)
                            )}
                          </span>
                        </div>
                        <div
                          className="reports-compare-impact"
                          aria-label={t.compare.metric.impact.replace(
                            '{value}',
                            `${Math.round(row.impact * 100)}%`
                          )}
                        >
                          <span
                            style={{ width: `${Math.max(6, Math.round(row.impact * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="reports-card reports-compare-segment-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.compare.channelsKicker}</p>
                  <p className="reports-card-subtitle">{t.compare.channelsSubtitle}</p>
                </div>
              </div>
              <div className="reports-compare-list">
                {reportsLoading ? (
                  <div className="reports-table-skeleton" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={`channel-skel-${index}`} className="reports-table-row-skeleton" />
                    ))}
                  </div>
                ) : compareChannelRows.length === 0 ? (
                  <div className="reports-empty-state">{t.compare.channelsEmpty}</div>
                ) : (
                  compareChannelRows.map((row, index) => (
                    <div
                      key={row.id}
                      className={cn(
                        'reports-compare-row',
                        row.profit >= 0 ? 'is-positive' : 'is-negative'
                      )}
                    >
                      <div
                        className="reports-compare-rank"
                        aria-label={t.compare.rankLabel.replace('{rank}', String(index + 1))}
                      >
                        {index + 1}
                      </div>
                      <div className="reports-compare-row-main">
                        <div className="reports-compare-row-title">
                          <strong>{row.label}</strong>
                          <span className={row.profit >= 0 ? 'is-up' : 'is-down'}>
                            {formatProfit(row.profit, displayCurrency, lang)}
                          </span>
                        </div>
                        <div className="reports-compare-row-meta">
                          <span>
                            {t.compare.metric.trades.replace('{count}', String(row.count))}
                          </span>
                          <span>
                            {t.compare.metric.winRate.replace(
                              '{value}',
                              row.winRate !== null ? `${Math.round(row.winRate)}%` : '—'
                            )}
                          </span>
                          <span>
                            {t.compare.metric.average.replace(
                              '{value}',
                              formatProfit(row.averageProfit, displayCurrency, lang)
                            )}
                          </span>
                        </div>
                        <div
                          className="reports-compare-impact"
                          aria-label={t.compare.metric.impact.replace(
                            '{value}',
                            `${Math.round(row.impact * 100)}%`
                          )}
                        >
                          <span
                            style={{ width: `${Math.max(6, Math.round(row.impact * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="reports-card reports-compare-segment-card reports-compare-direction-card">
              <div className="reports-card-header">
                <div>
                  <p className="reports-card-kicker">{t.compare.directionKicker}</p>
                  <p className="reports-card-subtitle">{t.compare.directionSubtitle}</p>
                </div>
              </div>
              <div className="reports-compare-list">
                {reportsLoading ? (
                  <div className="reports-table-skeleton" aria-hidden="true">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={`direction-skel-${index}`} className="reports-table-row-skeleton" />
                    ))}
                  </div>
                ) : compareDirectionRows.length === 0 ? (
                  <div className="reports-empty-state">{t.compare.directionEmpty}</div>
                ) : (
                  compareDirectionRows.map((row, index) => (
                    <div
                      key={row.id}
                      className={cn(
                        'reports-compare-row',
                        row.profit >= 0 ? 'is-positive' : 'is-negative'
                      )}
                    >
                      <div
                        className="reports-compare-rank"
                        aria-label={t.compare.rankLabel.replace('{rank}', String(index + 1))}
                      >
                        {index + 1}
                      </div>
                      <div className="reports-compare-row-main">
                        <div className="reports-compare-row-title">
                          <strong>{row.label}</strong>
                          <span className={row.profit >= 0 ? 'is-up' : 'is-down'}>
                            {formatProfit(row.profit, displayCurrency, lang)}
                          </span>
                        </div>
                        <div className="reports-compare-row-meta">
                          <span>
                            {t.compare.metric.trades.replace('{count}', String(row.count))}
                          </span>
                          <span>
                            {t.compare.metric.winRate.replace(
                              '{value}',
                              row.winRate !== null ? `${Math.round(row.winRate)}%` : '—'
                            )}
                          </span>
                          <span>
                            {t.compare.metric.average.replace(
                              '{value}',
                              formatProfit(row.averageProfit, displayCurrency, lang)
                            )}
                          </span>
                        </div>
                        <div
                          className="reports-compare-impact"
                          aria-label={t.compare.metric.impact.replace(
                            '{value}',
                            `${Math.round(row.impact * 100)}%`
                          )}
                        >
                          <span
                            style={{ width: `${Math.max(6, Math.round(row.impact * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'History' && (
          <div className="reports-stack reports-history-grid">
            <div className="reports-history-heading">
              <div>
                <h2 className="reports-section-title">{t.history.title}</h2>
                <p>{t.history.subtitle}</p>
              </div>
              <span>{t.history.showing.replace('{count}', String(tradeHistory.length))}</span>
            </div>
            {reportsLoading ? (
              <div className="reports-history-skeleton" aria-hidden="true">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`history-header-skel-${index}`}
                    className="reports-history-date-skeleton"
                  />
                ))}
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`history-skel-${index}`} className="reports-history-card-skeleton" />
                ))}
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`history-skel-desktop-${index}`}
                    className="reports-history-card-skeleton is-desktop"
                  />
                ))}
              </div>
            ) : historyGroups.length === 0 ? (
              <div className="reports-empty-state">
                {hasFilteredEmpty ? t.history.filteredEmpty : t.history.empty}
              </div>
            ) : (
              <>
                <div className="reports-history-table" aria-label={t.history.title}>
                  {historyGroups.map((group) => (
                    <div key={group.date} className="reports-history-group">
                      <p className="reports-history-date">{group.date}</p>
                      <div className="reports-history-list">
                        {group.items.map((item) => (
                          <OrdersListRow
                            key={item.id}
                            className="dashboard-home-order-card reports-history-order-card"
                            leading={
                              <SymbolPairBadge
                                symbol={item.symbol}
                                size="sm"
                                className="dashboard-order-flag"
                              />
                            }
                            title={item.symbol}
                            sideText={item.side === 'sell' ? t.history.sell : t.history.buy}
                            sideTone={item.side === 'sell' ? 'sell' : 'buy'}
                            entryText={`${item.lot} ${t.history.atLabel} ${item.price}`}
                            meta={item.channel ?? '—'}
                            status={item.result === 'win' ? t.history.win : t.history.loss}
                            amount={item.closeTime}
                            pnl={item.amount}
                            pnlTrend={item.pnlTrend}
                            action={<i className="fa-solid fa-chevron-right" aria-hidden="true" />}
                            onClick={() => setSelectedHistoryTradeId(item.id)}
                            aria-label={t.history.openDetails.replace('{symbol}', item.symbol)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {canLoadMoreHistory && (
                  <div className="reports-history-footer">
                    <button
                      type="button"
                      className="reports-secondary-button"
                      disabled={reportsRefreshing}
                      onClick={() => setHistoryLimit((current) => current + HISTORY_PAGE_SIZE)}
                    >
                      {reportsRefreshing ? t.history.loadingMore : t.history.loadMore}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selectedHistoryTradeId && selectedHistoryOrder && (
        <OrderDetailsSheet
          order={selectedHistoryOrder}
          labels={orderDetailsLabels}
          locale={lang}
          currency={displayCurrency}
          channelFallback={selectedHistorySummary?.channel ?? '—'}
          dialogLabel={t.history.details.title}
          backdropClassName="reports-modal-backdrop"
          sheetClassName="reports-trade-drawer"
          action={
            tradeDetailsStatus === 'loading' ? (
              <div className="reports-trade-drawer-state">{t.history.details.loading}</div>
            ) : tradeDetailsStatus === 'error' ? (
              <div className="reports-trade-drawer-state is-error">{t.history.details.error}</div>
            ) : null
          }
          onClose={() => setSelectedHistoryTradeId(null)}
        />
      )}

      {filterOpen && (
        <div
          className="dashboard-sheet-backdrop reports-modal-backdrop"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="reports-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.filters.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reports-filter-header">
              <BackButton
                className="reports-filter-back"
                ariaLabel={t.filters.closeAria}
                onClick={() => setFilterOpen(false)}
              />
              <h2>
                {t.filters.title} <span className="reports-filter-count">({draftFilterCount})</span>
              </h2>
              <button
                type="button"
                className="reports-filter-reset-inline"
                onClick={resetDraftFilters}
              >
                {t.filters.reset}
              </button>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.accountScope}</p>
                {draftMtAccountOption && <span>{draftMtAccountOption.status}</span>}
              </div>
              <div className="reports-account-list">
                {mtAccountOptions.length === 0 ? (
                  <div className="reports-filter-empty">{t.filters.noAccounts}</div>
                ) : (
                  mtAccountOptions.map((account) => {
                    const isActive = draftMtAccountId === account.id;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        className={cn('reports-account-option', isActive && 'is-active')}
                        onClick={() => {
                          setDraftMtAccountId(account.id);
                          if (account.id !== draftMtAccountId) {
                            setSelectedChannels([]);
                            setSelectedSymbols([]);
                          }
                        }}
                      >
                        <span>
                          <strong>{account.name}</strong>
                          <small>{account.meta}</small>
                        </span>
                        <i
                          className={cn('fa-solid', isActive ? 'fa-circle-check' : 'fa-circle')}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.time}</p>
                <span>{t.filters.appliesToAll}</span>
              </div>
              <div className="reports-pill-row reports-pill-row--range">
                {(['today', 'week', 'month', 'all', 'custom'] as FilterOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn('reports-pill', timeRange === option && 'is-active')}
                    onClick={() => setTimeRange(option)}
                  >
                    {t.performance.rangeOptions[option]}
                  </button>
                ))}
              </div>
              {timeRange === 'custom' && (
                <div className="reports-custom-range">
                  <label className="reports-date-field">
                    <span>{t.filters.from}</span>
                    <input
                      type="date"
                      className="reports-date-input"
                      value={customStartDate}
                      onChange={(event) => {
                        setCustomStartDate(event.target.value);
                        setCustomDateError('');
                      }}
                    />
                  </label>
                  <label className="reports-date-field">
                    <span>{t.filters.to}</span>
                    <input
                      type="date"
                      className="reports-date-input"
                      value={customEndDate}
                      onChange={(event) => {
                        setCustomEndDate(event.target.value);
                        setCustomDateError('');
                      }}
                    />
                  </label>
                </div>
              )}
              {isCustomRange && customDateError && (
                <p className="reports-date-error" role="alert">
                  {customDateError}
                </p>
              )}
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.selectChannels}</p>
                <span>{t.filters.optional}</span>
              </div>
              <div className="reports-chip-row">
                {selectedChannelItems.map((item) => (
                  <span key={item.id} className="reports-chip">
                    {item.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedChannels((prev) => prev.filter((value) => value !== item.id))
                      }
                      aria-label={t.filters.removeChannelAria.replace('{name}', item.name)}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                {selectedChannelItems.length === 0 && (
                  <span className="reports-chip-placeholder">{t.filters.anyChannel}</span>
                )}
                <button
                  type="button"
                  className="reports-chip-add"
                  onClick={() => {
                    setChannelSearch('');
                    setChannelSheetOpen(true);
                  }}
                  aria-label={t.filters.selectChannels}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.selectSymbols}</p>
                <span>{t.filters.optional}</span>
              </div>
              <div className="reports-chip-row">
                {selectedSymbolItems.map((item) => (
                  <span key={item.id} className="reports-chip">
                    <SymbolPairBadge
                      symbol={item.symbol}
                      base={item.base}
                      quote={item.quote}
                      baseCountry={item.baseCountry}
                      quoteCountry={item.quoteCountry}
                      size="sm"
                      className="reports-chip-symbol-icons"
                    />
                    {item.label}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSymbols((prev) => prev.filter((value) => value !== item.id))
                      }
                      aria-label={t.filters.removeSymbolAria.replace('{name}', item.label)}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                {selectedSymbolItems.length === 0 && (
                  <span className="reports-chip-placeholder">{t.filters.anySymbol}</span>
                )}
                <button
                  type="button"
                  className="reports-chip-add"
                  onClick={() => {
                    setSymbolSearch('');
                    setSymbolSheetOpen(true);
                  }}
                  aria-label={t.filters.selectSymbols}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.type}</p>
                <span>{t.filters.historyOnly}</span>
              </div>
              <div className="reports-pill-row reports-pill-row--three">
                <button
                  type="button"
                  className={cn('reports-pill', tradeType === null && 'is-active')}
                  onClick={() => setTradeType(null)}
                >
                  {t.filters.allSides}
                </button>
                {(['buy', 'sell'] as FilterChoice[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn('reports-pill', tradeType === option && 'is-active')}
                    onClick={() => setTradeType(option)}
                  >
                    {option === 'buy' ? t.history.buy : t.history.sell}
                  </button>
                ))}
              </div>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.result}</p>
                <span>{t.filters.historyOnly}</span>
              </div>
              <div className="reports-pill-row reports-pill-row--three">
                <button
                  type="button"
                  className={cn('reports-pill', resultType === null && 'is-active')}
                  onClick={() => setResultType(null)}
                >
                  {t.filters.allResults}
                </button>
                {(['win', 'loss'] as ResultChoice[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn('reports-pill', resultType === option && 'is-active')}
                    onClick={() => setResultType(option)}
                  >
                    {option === 'win' ? t.history.win : t.history.loss}
                  </button>
                ))}
              </div>
            </div>

            <div className="reports-filter-section">
              <div className="reports-filter-section-heading">
                <p className="reports-filter-label">{t.filters.reportType}</p>
                <span>{t.filters.generatedOnly}</span>
              </div>
              <div className="reports-pill-row reports-pill-row--three">
                <button
                  type="button"
                  className={cn('reports-pill', reportType === null && 'is-active')}
                  onClick={() => setReportType(null)}
                >
                  {t.filters.allReports}
                </button>
                {reportTypes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn('reports-pill', reportType === option && 'is-active')}
                    onClick={() => setReportType(option)}
                  >
                    {t.generated.types[option]}
                  </button>
                ))}
              </div>
            </div>

            <div className="reports-filter-footer">
              <button type="button" className="reports-filter-reset" onClick={resetDraftFilters}>
                {t.filters.reset}
              </button>
              <button
                type="button"
                className="reports-apply"
                disabled={isCustomMissing || isCustomInvalid}
                onClick={async () => {
                  if (isCustomMissing) {
                    setCustomDateError(t.filters.dateErrorMissing);
                    return;
                  }
                  if (isCustomInvalid) {
                    setCustomDateError(t.filters.dateErrorOrder);
                    return;
                  }
                  const nextMtAccountId = draftMtAccountId ?? selectedMtAccountId;
                  if (nextMtAccountId !== selectedMtAccountId) {
                    setSelectedMtAccountId(nextMtAccountId);
                  }
                  updateAppliedFilters({
                    mtAccountId: nextMtAccountId,
                    selectedChannels,
                    selectedSymbols,
                    timeRange,
                    tradeType,
                    resultType,
                    reportType,
                    customStartDate,
                    customEndDate,
                  });
                  setFilterOpen(false);
                }}
              >
                {t.filters.applyCount.replace('{count}', String(draftFilterCount))}
              </button>
            </div>
          </div>
        </div>
      )}

      {channelSheetOpen && (
        <div
          className="dashboard-sheet-backdrop reports-modal-backdrop"
          onClick={() => setChannelSheetOpen(false)}
        >
          <div
            className="reports-select-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.filters.selectChannels}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="reports-select-header">
              <h3>{t.filters.selectChannels}</h3>
              <button
                type="button"
                onClick={() => setChannelSheetOpen(false)}
                aria-label={t.filters.closeAria}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <label className="reports-select-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={channelSearch}
                onChange={(event) => setChannelSearch(event.target.value)}
                placeholder={t.filters.searchChannels}
              />
            </label>
            <div className="reports-select-list">
              {filteredChannelOptions.length === 0 && (
                <div className="reports-empty-state">{t.filters.noChannels}</div>
              )}
              {filteredChannelOptions.map((channel) => {
                const isActive = selectedChannels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    className={cn('reports-select-row', isActive && 'is-active')}
                    onClick={() =>
                      toggleSelection(channel.id, selectedChannels, setSelectedChannels)
                    }
                  >
                    <div>
                      <p className="reports-select-title">{channel.name}</p>
                      <p className="reports-select-subtitle">
                        {channel.handle} · {channel.members}
                      </p>
                    </div>
                    <span className={cn('reports-check', isActive && 'is-active')}>
                      <i className="fa-solid fa-check" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="reports-select-cta"
              onClick={() => setChannelSheetOpen(false)}
            >
              {t.buttons?.select ?? t.filters.apply}
            </button>
          </div>
        </div>
      )}

      {symbolSheetOpen && (
        <div
          className="dashboard-sheet-backdrop reports-modal-backdrop"
          onClick={() => setSymbolSheetOpen(false)}
        >
          <div
            className="reports-select-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.filters.selectSymbols}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="reports-select-header">
              <h3>{t.filters.selectSymbols}</h3>
              <button
                type="button"
                onClick={() => setSymbolSheetOpen(false)}
                aria-label={t.filters.closeAria}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <label className="reports-select-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={symbolSearch}
                onChange={(event) => setSymbolSearch(event.target.value)}
                placeholder={t.filters.searchSymbols}
              />
            </label>
            <div className="reports-select-list">
              {filteredSymbolOptions.length === 0 && (
                <div className="reports-empty-state">{t.filters.noSymbols}</div>
              )}
              {filteredSymbolOptions.map((symbol) => {
                const isActive = selectedSymbols.includes(symbol.id);
                return (
                  <button
                    key={symbol.id}
                    type="button"
                    className={cn('reports-select-row', isActive && 'is-active')}
                    onClick={() => toggleSelection(symbol.id, selectedSymbols, setSelectedSymbols)}
                  >
                    <div className="reports-symbol-row">
                      <SymbolPairBadge
                        symbol={symbol.symbol}
                        base={symbol.base}
                        quote={symbol.quote}
                        baseCountry={symbol.baseCountry}
                        quoteCountry={symbol.quoteCountry}
                        className="reports-symbol-icons"
                      />
                      <p className="reports-select-title">{symbol.label}</p>
                    </div>
                    <span className={cn('reports-check', isActive && 'is-active')}>
                      <i className="fa-solid fa-check" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="reports-select-cta"
              onClick={() => setSymbolSheetOpen(false)}
            >
              {t.buttons?.select ?? t.filters.apply}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
