import {
  getApiAnalyticsChannelsTop,
  getApiAnalyticsPerformance,
  getApiAnalyticsPerformanceSeries,
  getApiAnalyticsReports,
  getApiAnalyticsTradesCompare,
  getApiAnalyticsTradesHistory,
  getApiTradesById,
  postApiAnalyticsReportsGenerate,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import type { PublicTradeRecord } from "@/lib/api-client";
import type { SubscriptionReadStatus } from "@/lib/api-client";
import { normalizeSubscriptionReadStatus, type NormalizedSubscriptionReadStatus } from "@/lib/subscription-read-status";

initApiClient();

export type AnalyticsMetricsScope = "SELECTED_ACCOUNT" | "PRIMARY_ONLY";

export type AnalyticsScopeMeta = {
  metricsScope: AnalyticsMetricsScope;
  metricsAccountId: string | null;
};

type ScopedApiResponse<T> = {
  data: T;
  scope: AnalyticsScopeMeta;
  readStatus?: NormalizedSubscriptionReadStatus;
};

export type PerformanceSummary = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
  profitFactor: number;
};

type MetricsScopedPayload = {
  metricsScope?: AnalyticsMetricsScope;
  metricsAccountId?: string | null;
  subscriptionPaused?: boolean;
  subscriptionPauseReason?: SubscriptionReadStatus['subscriptionPauseReason'] | null;
  subscriptionPauseMessage?: string | null;
};

const readStatusFromPayload = (
  payload: MetricsScopedPayload
): NormalizedSubscriptionReadStatus | undefined => {
  if (
    !Object.prototype.hasOwnProperty.call(payload, 'subscriptionPaused') &&
    !Object.prototype.hasOwnProperty.call(payload, 'subscriptionPauseReason') &&
    !Object.prototype.hasOwnProperty.call(payload, 'subscriptionPauseMessage')
  ) {
    return undefined;
  }
  return normalizeSubscriptionReadStatus(payload);
};

type PerformanceResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: PerformanceSummary;
};

export type PerformanceSeriesPoint = {
  date: string;
  value: number;
};

export type PerformanceSeries = {
  startDate: string;
  endDate: string;
  points: PerformanceSeriesPoint[];
};

type PerformanceSeriesResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: PerformanceSeries;
};

export type PerformanceReport = {
  id: string;
  mtAccountId?: string | null;
  reportType: string;
  generatedAt?: string;
  startDate?: string;
  endDate?: string;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  totalProfit?: number;
  totalLoss?: number;
  netProfit?: number;
  winRate?: number;
  profitFactor?: number;
  data?: Record<string, unknown>;
};

type ReportsResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: PerformanceReport[];
};

export type TradeHistoryItem = {
  id: string;
  symbol: string;
  side: string;
  volume: number;
  entryPrice: number;
  priceDigits?: number | null;
  closeTime?: string | null;
  netProfit: number;
  channelId?: string | null;
  channelTitle?: string | null;
};

type TradeHistoryResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: TradeHistoryItem[];
};

export type TradeComparisonSegment = {
  id: string;
  label: string;
  count: number;
  wins: number;
  losses: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
  averageNetProfit: number;
};

export type TradeComparisonSummary = {
  symbols: TradeComparisonSegment[];
  channels: TradeComparisonSegment[];
  directions: TradeComparisonSegment[];
};

type TradeComparisonResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: Partial<Record<keyof TradeComparisonSummary, Array<Partial<TradeComparisonSegment>>>>;
};

type ChannelStats = {
  totalSignals?: number;
  executedSignals?: number;
  totalTrades?: number;
  winRate?: number;
  totalProfit?: number;
  totalLoss?: number;
};

export type TopChannelSummary = {
  id?: string;
  channelId?: string;
  channelTitle?: string | null;
  channelUsername?: string | null;
  stats?: ChannelStats | null;
  _analytics?: { netProfit?: number } | null;
  netProfit?: number;
};

type TopChannelsResponse = MetricsScopedPayload & {
  success?: boolean;
  data?: TopChannelSummary[];
};

const defaultScope: AnalyticsScopeMeta = {
  metricsScope: "SELECTED_ACCOUNT",
  metricsAccountId: null,
};

const normalizeScope = (value: MetricsScopedPayload | null | undefined): AnalyticsScopeMeta => {
  const rawScope = value?.metricsScope;
  const metricsScope: AnalyticsMetricsScope =
    rawScope === "PRIMARY_ONLY" || rawScope === "SELECTED_ACCOUNT"
      ? rawScope
      : defaultScope.metricsScope;

  return {
    metricsScope,
    metricsAccountId: value?.metricsAccountId ?? null,
  };
};

const normalizeMtAccountId = (value?: string | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toTradeResult = (value?: string): "WIN" | "LOSS" | undefined => {
  const normalized = value?.toUpperCase();
  if (normalized === "WIN" || normalized === "LOSS") {
    return normalized;
  }
  return undefined;
};

const toTradeSide = (value?: string): "BUY" | "SELL" | undefined => {
  const normalized = value?.toUpperCase();
  if (normalized === "BUY" || normalized === "SELL") {
    return normalized;
  }
  return undefined;
};

const normalizeComparisonSegment = (value: Partial<TradeComparisonSegment>): TradeComparisonSegment => ({
  id: String(value.id ?? ""),
  label: String(value.label ?? ""),
  count: Number(value.count ?? 0),
  wins: Number(value.wins ?? 0),
  losses: Number(value.losses ?? 0),
  totalProfit: Number(value.totalProfit ?? 0),
  totalLoss: Number(value.totalLoss ?? 0),
  netProfit: Number(value.netProfit ?? 0),
  winRate: Number(value.winRate ?? 0),
  averageNetProfit: Number(value.averageNetProfit ?? 0),
});

export const reportsService = {
  getTradeDetails: async (tradeId: string): Promise<PublicTradeRecord | null> => {
    const response = await getApiTradesById({
      path: { id: tradeId },
      throwOnError: true,
    });

    return response.data.data ?? null;
  },

  generateReport: async (params: {
    reportType: "DAILY" | "WEEKLY" | "MONTHLY";
    mtAccountId?: string | null;
  }): Promise<AnalyticsScopeMeta> => {
    const scopedMtAccountId = normalizeMtAccountId(params.mtAccountId);
    const response = await postApiAnalyticsReportsGenerate({
      body: {
        reportType: params.reportType,
        ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
      },
      throwOnError: true,
    });
    const payload = response.data as MetricsScopedPayload;

    return normalizeScope(payload);
  },

  getPerformance: async (params?: {
    startDate?: string;
    endDate?: string;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<PerformanceSummary | null>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      startDate: toDate(params?.startDate),
      endDate: toDate(params?.endDate),
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsPerformance({
      query: query as unknown as { startDate?: Date; endDate?: Date },
      throwOnError: true,
    });
    const payload = response.data as PerformanceResponse;

    return {
      data: payload.data ?? null,
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },

  getReports: async (params?: {
    reportType?: string;
    limit?: number;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<PerformanceReport[]>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      reportType: params?.reportType,
      limit: params?.limit,
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsReports({
      query: query as unknown as { reportType?: string; limit?: number },
      throwOnError: true,
    });
    const payload = response.data as ReportsResponse;

    return {
      data: payload.data ?? [],
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },

  getPerformanceSeries: async (params?: {
    startDate?: string;
    endDate?: string;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<PerformanceSeries | null>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      startDate: toDate(params?.startDate),
      endDate: toDate(params?.endDate),
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsPerformanceSeries({
      query: query as unknown as { startDate?: Date; endDate?: Date },
      throwOnError: true,
    });
    const payload = response.data as PerformanceSeriesResponse;

    return {
      data: payload.data ?? null,
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },

  getTradeHistory: async (params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    symbols?: string;
    channelIds?: string;
    side?: string;
    result?: string;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<TradeHistoryItem[]>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      limit: params?.limit,
      startDate: toDate(params?.startDate),
      endDate: toDate(params?.endDate),
      symbols: params?.symbols,
      channelIds: params?.channelIds,
      side: params?.side,
      result: toTradeResult(params?.result),
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsTradesHistory({
      query: query as unknown as {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        symbols?: string;
        channelIds?: string;
        side?: string;
        result?: "WIN" | "LOSS";
      },
      throwOnError: true,
    });
    const payload = response.data as TradeHistoryResponse;

    return {
      data: payload.data ?? [],
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },

  getTradeComparison: async (params?: {
    startDate?: string;
    endDate?: string;
    symbols?: string;
    channelIds?: string;
    side?: string;
    result?: string;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<TradeComparisonSummary>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      startDate: toDate(params?.startDate),
      endDate: toDate(params?.endDate),
      symbols: params?.symbols,
      channelIds: params?.channelIds,
      side: toTradeSide(params?.side),
      result: toTradeResult(params?.result),
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsTradesCompare({
      query,
      throwOnError: true,
    });
    const payload = response.data as TradeComparisonResponse;

    return {
      data: {
        symbols: (payload.data?.symbols ?? []).map(normalizeComparisonSegment),
        channels: (payload.data?.channels ?? []).map(normalizeComparisonSegment),
        directions: (payload.data?.directions ?? []).map(normalizeComparisonSegment),
      },
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },

  getTopChannels: async (params?: {
    limit?: number;
    mtAccountId?: string | null;
  }): Promise<ScopedApiResponse<TopChannelSummary[]>> => {
    const scopedMtAccountId = normalizeMtAccountId(params?.mtAccountId);
    const query = {
      limit: params?.limit,
      ...(scopedMtAccountId ? { mtAccountId: scopedMtAccountId } : {}),
    };

    const response = await getApiAnalyticsChannelsTop({
      query: query as unknown as { limit?: number },
      throwOnError: true,
    });
    const payload = response.data as TopChannelsResponse;
    const rows = payload.data ?? [];

    return {
      data: rows.map((row) => ({
        ...row,
        netProfit: row._analytics?.netProfit ?? 0,
      })),
      scope: normalizeScope(payload),
      ...(readStatusFromPayload(payload) ? { readStatus: readStatusFromPayload(payload) } : {}),
    };
  },
};

export type TopChannelRow = ReturnType<(typeof reportsService)["getTopChannels"]> extends Promise<
  ScopedApiResponse<Array<infer R>>
>
  ? R
  : never;
