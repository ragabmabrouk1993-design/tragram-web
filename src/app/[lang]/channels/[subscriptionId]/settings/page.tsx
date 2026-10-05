'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import { getErrorCode } from '@/lib/error-utils';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { toast } from 'react-hot-toast';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { channelsService } from '@/services/channels.service';
import {
  normalizeSubscriptionReadStatus,
  subscriptionPauseFallbackMessage,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { SubscriptionPausedNotice } from '@/components/subscription/subscription-paused-notice';
import { getCurrencySymbol } from '@/lib/currency-format';
import { localizePath } from '@/lib/i18n';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { mapApiFormErrors } from '@/lib/auth-form-errors';
import { ChannelAvatar } from '@/components/channels';
import { SymbolPairBadge } from '@/components/symbols';
import type { ChannelSymbolCatalogItem } from '@/lib/api-client';
import {
  alignCustomPercentagesToTargets,
  updateTpPercentageDraft,
} from '../tp-percentages';

type ChannelSettingsPageProps = {
  params: Promise<{ subscriptionId: string }>;
};

type SymbolCatalogItem = {
  symbol: string;
  base: string | null;
  quote: string | null;
  display: string;
  baseCountry: string | null;
  quoteCountry: string | null;
  brokerSymbol: string;
  brokerSymbolKey: string;
  canonicalSymbol: string;
  canonicalSymbolKey: string;
  displayName: string;
  tradeMode: ChannelSymbolCatalogItem['tradeMode'];
  tradeEnabled: boolean | null;
  selectable: boolean;
  unselectableReason: ChannelSymbolCatalogItem['unselectableReason'];
  allowedSides: Array<'BUY' | 'SELL'>;
};

type SymbolPolicyMode = 'ALL_TRADABLE' | 'SELECTED_ONLY';

type ChannelSettingsField =
  | 'allowedSymbols'
  | 'maxActiveOrders'
  | 'maxDailyTrades'
  | 'duplicateSignalTimeoutMinutes'
  | 'riskPerTrade'
  | 'fixedLotSize'
  | 'riskPercentage'
  | 'maxLots'
  | 'maxSlPips'
  | 'rejectIfTp1PipsLessThanSlPips'
  | 'minLotsOverride'
  | 'lotRoundingMode'
  | 'allowExecutionWithoutSlTp'
  | 'allowProviderSlWidening'
  | 'allowForwardedSignals'
  | 'signalPendingOrderHandlingEnabled'
  | 'limitOrderExpirationMinutes'
  | 'missingSlConfig'
  | 'breakEvenTrigger'
  | 'breakEvenTpTarget'
  | 'breakEvenProfitLockPips'
  | 'trailingStopMode'
  | 'trailingStopStepTriggerPips'
  | 'trailingStopStepMovePips'
  | 'tpExecutionTargets'
  | 'customTpPercentages'
  | 'marketEntryToleranceMode'
  | 'marketEntryTolerancePips';

type ChannelSettingsFieldErrors = Partial<Record<ChannelSettingsField, string>>;
type PlanValidationMessages = {
  planMaxActiveOrders: string;
  planMaxDailyTrades: string;
  planAllowExecutionWithoutSlTp: string;
};

const channelSettingsFieldAliases: Record<ChannelSettingsField, readonly string[]> = {
  allowedSymbols: ['allowedSymbols', 'allowed symbols'],
  maxActiveOrders: ['maxActiveOrders', 'max active orders'],
  maxDailyTrades: ['maxDailyTrades', 'max daily trades'],
  duplicateSignalTimeoutMinutes: [
    'duplicateSignalTimeoutMinutes',
    'duplicate signal timeout minutes',
    'duplicate signal timeout',
  ],
  riskPerTrade: ['riskPerTrade', 'risk per trade'],
  fixedLotSize: ['fixedLotSize', 'fixed lot size', 'fixed lot'],
  riskPercentage: ['riskPercentage', 'risk percentage'],
  maxLots: ['maxLots', 'max lots'],
  maxSlPips: ['maxSlPips', 'max sl pips', 'max stop loss pips'],
  rejectIfTp1PipsLessThanSlPips: [
    'rejectIfTp1PipsLessThanSlPips',
    'reject if tp1 pips less than sl pips',
    'tp1 pips less than sl pips',
  ],
  minLotsOverride: ['minLotsOverride', 'min lots override'],
  lotRoundingMode: ['lotRoundingMode', 'lot rounding mode'],
  allowExecutionWithoutSlTp: ['allowExecutionWithoutSlTp', 'allow execution without sl tp'],
  allowProviderSlWidening: ['allowProviderSlWidening', 'allow provider sl widening'],
  allowForwardedSignals: ['allowForwardedSignals', 'allow forwarded signals'],
  signalPendingOrderHandlingEnabled: [
    'signalPendingOrderHandlingEnabled',
    'signal pending order handling enabled',
  ],
  limitOrderExpirationMinutes: ['limitOrderExpirationMinutes', 'limit order expiration minutes'],
  marketEntryToleranceMode: ['marketEntryToleranceMode', 'market entry tolerance mode'],
  marketEntryTolerancePips: ['marketEntryTolerancePips', 'market entry tolerance pips'],
  missingSlConfig: ['missingSlConfig', 'missing sl config', 'missing sl pips'],
  breakEvenTrigger: ['breakEvenTrigger', 'break even trigger'],
  breakEvenTpTarget: ['breakEvenTpTarget', 'break even tp target'],
  breakEvenProfitLockPips: ['breakEvenProfitLockPips', 'break even profit lock pips'],
  trailingStopMode: ['trailingStopMode', 'trailing stop mode'],
  trailingStopStepTriggerPips: ['trailingStopStepTriggerPips', 'trailing stop step trigger pips'],
  trailingStopStepMovePips: ['trailingStopStepMovePips', 'trailing stop step move pips'],
  tpExecutionTargets: [
    'tpExecutionTargets',
    'tp execution targets',
    'tpExecutionTarget',
    'tp execution target',
  ],
  customTpPercentages: ['customTpPercentages', 'custom tp percentages'],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getPlanViolationMessages = (error: unknown): string[] => {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) {
    return [];
  }
  const violations = error.response.data.violations;
  if (!Array.isArray(violations)) {
    return [];
  }
  return violations.filter((item): item is string => typeof item === 'string');
};

const mapPlanViolationsToFieldErrors = (
  violations: string[],
  messages: PlanValidationMessages
): ChannelSettingsFieldErrors => {
  const mapped: ChannelSettingsFieldErrors = {};

  for (const violation of violations) {
    const normalized = violation.toLowerCase().replace(/\s+/g, '');
    const limitMatch = violation.match(/\(([^)]+)\)/)?.[1];

    if (normalized.includes('maxactiveorders')) {
      mapped.maxActiveOrders =
        limitMatch && messages.planMaxActiveOrders.includes('{limit}')
          ? messages.planMaxActiveOrders.replace('{limit}', limitMatch)
          : messages.planMaxActiveOrders;
      continue;
    }

    if (normalized.includes('maxdailytrades')) {
      mapped.maxDailyTrades =
        limitMatch && messages.planMaxDailyTrades.includes('{limit}')
          ? messages.planMaxDailyTrades.replace('{limit}', limitMatch)
          : messages.planMaxDailyTrades;
      continue;
    }

    if (normalized.includes('allowexecutionwithoutsltp')) {
      mapped.allowExecutionWithoutSlTp = messages.planAllowExecutionWithoutSlTp;
    }
  }

  return mapped;
};

const getFirstFieldError = (errors: ChannelSettingsFieldErrors): string | undefined =>
  Object.values(errors).find(
    (message): message is string => typeof message === 'string' && message.length > 0
  );

// Broker identity is exact: punctuation and suffixes are part of the symbol
// key (for example XAUUSD.a and XAUUSDa must not collide in the picker).
const normalizeSymbolKey = (value: string) => value.normalize('NFKC').trim().toUpperCase();

const normalizeStoredSymbol = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
const TP_TARGET_PATTERN = /^(TP(10|[1-9])|OPEN)$/i;
const TP_LEVEL_PATTERN = /^TP(10|[1-9])$/i;
const MISSING_SL_SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,31}$/;

type MarketEntryToleranceMode = 'EXACT' | 'PIPS';
type TrailingStopMode = 'STEP_PIPS' | 'TP_LEVELS';

type MissingSlOverrideInput = {
  symbol: string;
  pips: string;
};

const parseTpLevel = (value: string): number | null => {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^TP(\d+)$/);
  if (!match) return null;
  const level = Number(match[1]);
  return Number.isFinite(level) ? level : null;
};

const normalizeCustomPercentagesRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(record)) {
    const key = rawKey.trim().toUpperCase();
    if (!TP_LEVEL_PATTERN.test(key)) continue;
    const num = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(num)) continue;
    normalized[key] = String(num);
  }
  return normalized;
};

const normalizeTpExecutionTargets = (targets: unknown, fallbackTarget?: unknown): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  if (Array.isArray(targets)) {
    for (const item of targets) {
      if (typeof item !== 'string') continue;
      const candidate = item.trim().toUpperCase();
      if (!candidate || !TP_TARGET_PATTERN.test(candidate) || seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      normalized.push(candidate);
    }
  }

  if (normalized.length > 0) {
    return normalized;
  }

  if (typeof fallbackTarget === 'string') {
    const candidate = fallbackTarget.trim().toUpperCase();
    if (candidate && TP_TARGET_PATTERN.test(candidate)) {
      return [candidate];
    }
  }

  return [];
};

const normalizeMissingSlOverrideRows = (value: unknown): MissingSlOverrideInput[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const rows: MissingSlOverrideInput[] = [];
  for (const [rawSymbol, rawRule] of Object.entries(value as Record<string, unknown>)) {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!MISSING_SL_SYMBOL_PATTERN.test(symbol)) {
      continue;
    }
    if (!rawRule || typeof rawRule !== 'object' || Array.isArray(rawRule)) {
      continue;
    }
    const record = rawRule as Record<string, unknown>;
    const numericValue = typeof record.pips === 'number' ? record.pips : Number(record.pips);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      continue;
    }
    rows.push({
      symbol,
      pips: String(numericValue),
    });
  }
  return rows;
};

const buildMissingSlConfigPayload = (pipsValue: string, overrides: MissingSlOverrideInput[]) => {
  const pips = Number(pipsValue);
  if (!Number.isFinite(pips) || pips <= 0) {
    return null;
  }

  const normalizedOverrides: Record<string, { pips: number }> = {};
  for (const row of overrides) {
    const symbol = row.symbol.trim().toUpperCase();
    if (!MISSING_SL_SYMBOL_PATTERN.test(symbol)) {
      continue;
    }
    const overridePips = Number(row.pips);
    if (!Number.isFinite(overridePips) || overridePips <= 0) {
      continue;
    }
    normalizedOverrides[symbol] = { pips: overridePips };
  }

  return {
    pips,
    ...(Object.keys(normalizedOverrides).length > 0 ? { overrides: normalizedOverrides } : {}),
  };
};

const normalizeAllowedSymbols = (symbols: string[], catalog: SymbolCatalogItem[]): string[] => {
  const catalogByKey = new Map(
    catalog.map((item) => [normalizeSymbolKey(item.symbol), item.symbol])
  );
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const symbol of symbols) {
    if (typeof symbol !== 'string') continue;
    const compact = normalizeStoredSymbol(symbol);
    const key = normalizeSymbolKey(compact);
    if (!compact || !key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(catalogByKey.get(key) ?? compact);
  }

  return normalized;
};

const ChannelSettingsSkeleton = () => (
  <div className="channels-settings-skeleton" aria-hidden="true">
    <div className="channels-settings-skeleton-header">
      <div className="channels-detail-header-skeleton-circle" />
      <div className="channels-settings-skeleton-title">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        <div className="channels-settings-skeleton-channel">
          <div className="channels-detail-header-skeleton-circle channels-settings-skeleton-channel-avatar" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
        </div>
      </div>
      <div className="channels-detail-header-skeleton-circle is-transparent" />
    </div>
    <div className="channels-settings-grid">
      <div className="channels-settings-section channels-settings-section-skeleton is-full">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        <div className="channels-settings-skeleton-subsection">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-settings-skeleton-pills">
            {Array.from({ length: 6 }).map((_, idx) => (
              <span
                key={`channel-settings-symbol-${idx}`}
                className="channels-detail-skeleton-pill"
              />
            ))}
          </div>
        </div>
        <div className="channels-settings-skeleton-subsection">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-settings-skeleton-stepper" />
          <div className="channels-settings-skeleton-stepper" />
        </div>
      </div>

      <div className="channels-settings-section channels-settings-section-skeleton channels-settings-section-skeleton-half">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        <div className="channels-settings-skeleton-subsection">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
          <div className="channels-settings-skeleton-input" />
        </div>
        <div className="channels-settings-skeleton-subsection">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
          <div className="channels-settings-skeleton-input" />
        </div>
        <div className="channels-settings-skeleton-input" />
        <div className="channels-settings-skeleton-pills">
          {Array.from({ length: 3 }).map((_, idx) => (
            <span
              key={`channel-settings-risk-pill-${idx}`}
              className="channels-detail-skeleton-pill"
            />
          ))}
        </div>
      </div>

      <div className="channels-settings-section channels-settings-section-skeleton channels-settings-section-skeleton-half">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        <div className="channels-settings-skeleton-pills">
          {Array.from({ length: 3 }).map((_, idx) => (
            <span
              key={`channel-settings-tolerance-pill-${idx}`}
              className="channels-detail-skeleton-pill"
            />
          ))}
        </div>
        <div className="channels-settings-skeleton-input" />
        <div className="channels-settings-skeleton-pills">
          {Array.from({ length: 2 }).map((_, idx) => (
            <span
              key={`channel-settings-policy-pill-${idx}`}
              className="channels-detail-skeleton-pill"
            />
          ))}
        </div>
        <div className="channels-settings-skeleton-input" />
        <div className="channels-settings-skeleton-stepper" />
      </div>

      <div className="channels-settings-section channels-settings-section-skeleton is-full">
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`channel-settings-management-${idx}`}
            className="channels-settings-skeleton-subsection"
          >
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
            <div className="channels-settings-skeleton-pills">
              {Array.from({ length: idx === 2 ? 4 : 3 }).map((__, pillIdx) => (
                <span
                  key={`channel-settings-management-${idx}-pill-${pillIdx}`}
                  className="channels-detail-skeleton-pill"
                />
              ))}
            </div>
            <div className="channels-settings-skeleton-input" />
          </div>
        ))}
      </div>
    </div>
    <div className="channels-settings-skeleton-footer">
      <div className="channels-settings-skeleton-save" />
    </div>
  </div>
);

export default function ChannelSettingsPage({ params }: ChannelSettingsPageProps) {
  const { subscriptionId } = use(params);
  const router = useRouter();
  const lang = useLocale();
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const intlMessages = useRouteMessages();
  const t = intlMessages.channelSettingsPage;
  const [allowedSymbols, setAllowedSymbols] = useState<string[]>([]);
  const [symbolPolicyMode, setSymbolPolicyMode] = useState<SymbolPolicyMode>('ALL_TRADABLE');
  const [symbolCatalogRevision, setSymbolCatalogRevision] = useState<string | null>(null);
  const [symbolCatalogStatus, setSymbolCatalogStatus] = useState<
    'READY' | 'ACCOUNT_REQUIRED' | 'UNAVAILABLE'
  >('UNAVAILABLE');
  const [symbolsCatalog, setSymbolsCatalog] = useState<SymbolCatalogItem[]>([]);
  const [symbolsCatalogHint, setSymbolsCatalogHint] = useState<string | null>(null);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [settingsMeta, setSettingsMeta] = useState<Awaited<
    ReturnType<typeof channelsService.getChannelSettingsMeta>
  > | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<NormalizedSubscriptionReadStatus>(
    normalizeSubscriptionReadStatus(null)
  );
  const [loading, setLoading] = useState(true);
  const [symbolsSheetOpen, setSymbolsSheetOpen] = useState(false);
  const [symbolsDraft, setSymbolsDraft] = useState<string[]>(allowedSymbols);
  const [maxActiveOrders, setMaxActiveOrders] = useState(0);
  const [maxDailyTrades, setMaxDailyTrades] = useState(0);
  const [duplicateSignalTimeoutMinutes, setDuplicateSignalTimeoutMinutes] = useState(5);
  const [riskMode, setRiskMode] = useState<'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_LOT'>(
    'FIXED_AMOUNT'
  );
  const [riskPerTrade, setRiskPerTrade] = useState('0');
  const [fixedLotSize, setFixedLotSize] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('0');
  const [maxLots, setMaxLots] = useState('');
  const [maxSlPips, setMaxSlPips] = useState('');
  const [rejectIfTp1PipsLessThanSlPips, setRejectIfTp1PipsLessThanSlPips] = useState(false);
  const [minLotsOverride, setMinLotsOverride] = useState(false);
  const [lotRoundingMode, setLotRoundingMode] = useState<'FLOOR' | 'ROUND' | 'CEIL'>('FLOOR');
  const [allowExecutionWithoutSlTp, setAllowExecutionWithoutSlTp] = useState(false);
  const [allowProviderSlWidening, setAllowProviderSlWidening] = useState(false);
  const [allowForwardedSignals, setAllowForwardedSignals] = useState(false);
  const [signalPendingOrderHandlingEnabled, setSignalPendingOrderHandlingEnabled] = useState(false);
  const [limitOrderExpirationMinutes, setLimitOrderExpirationMinutes] = useState('');
  const [marketEntryToleranceMode, setMarketEntryToleranceMode] =
    useState<MarketEntryToleranceMode>('EXACT');
  const [marketEntryTolerancePips, setMarketEntryTolerancePips] = useState('');
  const [missingSlPips, setMissingSlPips] = useState('');
  const [missingSlOverrides, setMissingSlOverrides] = useState<MissingSlOverrideInput[]>([]);
  const [missingSlOverridesOpen, setMissingSlOverridesOpen] = useState(false);
  const [missingSlSymbolSearch, setMissingSlSymbolSearch] = useState('');
  const [breakEvenEnabled, setBreakEvenEnabled] = useState(false);
  const [breakEvenMode, setBreakEvenMode] = useState<'TP_HIT' | 'FIXED_PIPS'>('TP_HIT');
  const [breakEvenTrigger, setBreakEvenTrigger] = useState('0');
  const [breakEvenTpTarget, setBreakEvenTpTarget] = useState('TP1');
  const [breakEvenProfitLockPips, setBreakEvenProfitLockPips] = useState('0');
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingStopMode, setTrailingStopMode] = useState<TrailingStopMode>('STEP_PIPS');
  const [trailingStopStepTriggerPips, setTrailingStopStepTriggerPips] = useState('');
  const [trailingStopStepMovePips, setTrailingStopStepMovePips] = useState('');
  const [tpExecutionMode, setTpExecutionMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [tpExecutionTargets, setTpExecutionTargets] = useState<string[]>(['TP1']);
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({
    TP1: '100',
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ChannelSettingsFieldErrors>({});
  const maxActiveOrdersAllowsUnlimited =
    settingsMeta?.options.constraints?.maxActiveOrders?.max === null;
  const maxDailyTradesAllowsUnlimited =
    settingsMeta?.options.constraints?.maxDailyTrades?.max === null;
  const accountCurrency =
    typeof settingsMeta?.subscription.accountCurrency === 'string' &&
    settingsMeta.subscription.accountCurrency.trim().length > 0
      ? settingsMeta.subscription.accountCurrency.trim().toUpperCase()
      : 'USD';
  const accountCurrencySymbol = getCurrencySymbol(accountCurrency, lang);
  const [initialSettings, setInitialSettings] = useState<{
    allowedSymbols: string[];
    symbolPolicyMode: SymbolPolicyMode;
    maxActiveOrders: number;
    maxDailyTrades: number;
    duplicateSignalTimeoutMinutes: number;
    riskMode: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_LOT';
    riskPerTrade: string;
    fixedLotSize: string;
    riskPercentage: string;
    maxLots: string;
    maxSlPips: string;
    rejectIfTp1PipsLessThanSlPips: boolean;
    minLotsOverride: boolean;
    lotRoundingMode: 'FLOOR' | 'ROUND' | 'CEIL';
    allowExecutionWithoutSlTp: boolean;
    allowProviderSlWidening: boolean;
    allowForwardedSignals: boolean;
    signalPendingOrderHandlingEnabled: boolean;
    limitOrderExpirationMinutes: string;
    marketEntryToleranceMode: MarketEntryToleranceMode;
    marketEntryTolerancePips: string;
    missingSlPips: string;
    missingSlOverrides: MissingSlOverrideInput[];
    breakEvenEnabled: boolean;
    breakEvenMode: 'TP_HIT' | 'FIXED_PIPS';
    breakEvenTrigger: string;
    breakEvenTpTarget: string;
    breakEvenProfitLockPips: string;
    trailingStopEnabled: boolean;
    trailingStopMode: TrailingStopMode;
    trailingStopStepTriggerPips: string;
    trailingStopStepMovePips: string;
    tpExecutionMode: 'ALL' | 'SPECIFIC';
    tpExecutionTargets: string[];
    customPercentages: Record<string, string>;
  } | null>(null);
  const settingsViewed = useRef<string | null>(null);

  const clearFieldError = (field: ChannelSettingsField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const applyFieldErrors = (errors: ChannelSettingsFieldErrors) => {
    setFieldErrors(errors);
  };

  const customPercentTotal = useMemo(() => {
    return Object.entries(customPercentages).reduce((sum, [key, value]) => {
      if (!TP_LEVEL_PATTERN.test(key)) return sum;
      return sum + Number(value || 0);
    }, 0);
  }, [customPercentages]);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      try {
        const metaResponse = await channelsService.getChannelSettingsMeta(subscriptionId);
        const accountSymbolsResponse =
          await channelsService.getChannelSymbolCatalog(subscriptionId);
        if (cancelled) return;
        setSubscriptionStatus(normalizeSubscriptionReadStatus(metaResponse));
        const accountSymbols = accountSymbolsResponse.symbols.map(
          (item) =>
            ({
              symbol: item.brokerSymbol,
              brokerSymbol: item.brokerSymbol,
              brokerSymbolKey: item.brokerSymbolKey,
              canonicalSymbol: item.canonicalSymbol,
              canonicalSymbolKey: item.canonicalSymbolKey,
              displayName: item.displayName || item.display,
              display: item.displayName || item.display,
              base: item.base ?? null,
              quote: item.quote ?? null,
              baseCountry: null,
              quoteCountry: null,
              tradeMode: item.tradeMode,
              tradeEnabled: item.tradeEnabled ?? null,
              selectable: item.selectable,
              unselectableReason: item.unselectableReason,
              allowedSides: item.allowedSides,
            }) satisfies SymbolCatalogItem
        );
        const policySelections =
          metaResponse.subscription.symbolPolicy?.selections
            ?.map((selection) => selection.brokerSymbol)
            .filter(
              (symbol): symbol is string => typeof symbol === 'string' && symbol.length > 0
            ) ?? [];
        const normalizedAllowed = normalizeAllowedSymbols(
          policySelections.length > 0
            ? policySelections
            : (metaResponse.subscription.allowedSymbols ?? []),
          accountSymbols
        );
        const loadedPolicyMode: SymbolPolicyMode =
          metaResponse.subscription.symbolPolicy?.mode === 'SELECTED_ONLY'
            ? 'SELECTED_ONLY'
            : metaResponse.subscription.symbolPolicy?.mode === 'ALL_TRADABLE'
              ? 'ALL_TRADABLE'
              : normalizedAllowed.length > 0
                ? 'SELECTED_ONLY'
                : 'ALL_TRADABLE';
        setSettingsMeta(metaResponse);
        setSymbolsCatalog(accountSymbols);
        setSymbolPolicyMode(loadedPolicyMode);
        setSymbolCatalogRevision(accountSymbolsResponse.catalogRevision);
        setSymbolCatalogStatus(accountSymbolsResponse.catalogStatus);
        setSymbolsCatalogHint(
          accountSymbolsResponse.catalogStatus === 'ACCOUNT_REQUIRED'
            ? t.symbols.accountRequired
            : accountSymbolsResponse.catalogStatus !== 'READY' || accountSymbols.length === 0
              ? t.symbols.catalogEmpty
              : null
        );
        const subscription = metaResponse.subscription;
        const nextSignalPendingOrderHandlingEnabled = Boolean(
          subscription.signalPendingOrderHandlingEnabled
        );
        const nextLimitOrderExpirationMinutes =
          typeof subscription.limitOrderExpirationMinutes === 'number' &&
          Number.isFinite(subscription.limitOrderExpirationMinutes) &&
          subscription.limitOrderExpirationMinutes > 0
            ? String(subscription.limitOrderExpirationMinutes)
            : '';
        setAllowedSymbols(normalizedAllowed);
        setSymbolsDraft(normalizedAllowed);
        setMaxActiveOrders(subscription.maxActiveOrders ?? 0);
        setMaxDailyTrades(subscription.maxDailyTrades ?? 0);
        setDuplicateSignalTimeoutMinutes(subscription.duplicateSignalTimeoutMinutes ?? 5);
        setRiskMode(subscription.riskMode ?? 'FIXED_AMOUNT');
        setRiskPerTrade(String(subscription.riskPerTrade ?? 0));
        setFixedLotSize(
          typeof subscription.fixedLotSize === 'number' &&
            Number.isFinite(subscription.fixedLotSize)
            ? String(subscription.fixedLotSize)
            : ''
        );
        setRiskPercentage(String(subscription.riskPercentage ?? 0));
        setMaxLots(
          subscription.maxLots !== undefined && subscription.maxLots !== null
            ? String(subscription.maxLots)
            : ''
        );
        setMaxSlPips(
          typeof subscription.maxSlPips === 'number' &&
            Number.isFinite(subscription.maxSlPips) &&
            subscription.maxSlPips > 0
            ? String(subscription.maxSlPips)
            : ''
        );
        setRejectIfTp1PipsLessThanSlPips(Boolean(subscription.rejectIfTp1PipsLessThanSlPips));
        setMinLotsOverride(Boolean(subscription.minLotsOverride));
        setLotRoundingMode(subscription.lotRoundingMode ?? 'FLOOR');
        setAllowExecutionWithoutSlTp(Boolean(subscription.allowExecutionWithoutSlTp));
        setAllowProviderSlWidening(Boolean(subscription.allowProviderSlWidening));
        setAllowForwardedSignals(Boolean(subscription.allowForwardedSignals));
        setSignalPendingOrderHandlingEnabled(nextSignalPendingOrderHandlingEnabled);
        setLimitOrderExpirationMinutes(nextLimitOrderExpirationMinutes);
        const nextMarketEntryToleranceMode: MarketEntryToleranceMode =
          subscription.marketEntryToleranceMode === 'PIPS' ? 'PIPS' : 'EXACT';
        setMarketEntryToleranceMode(nextMarketEntryToleranceMode);
        setMarketEntryTolerancePips(
          typeof subscription.marketEntryTolerancePips === 'number' &&
            Number.isFinite(subscription.marketEntryTolerancePips) &&
            subscription.marketEntryTolerancePips > 0
            ? String(subscription.marketEntryTolerancePips)
            : ''
        );
        const rawMissingSlConfig =
          subscription.missingSlConfig &&
          typeof subscription.missingSlConfig === 'object' &&
          !Array.isArray(subscription.missingSlConfig)
            ? (subscription.missingSlConfig as Record<string, unknown>)
            : null;
        const nextMissingSlPips =
          typeof rawMissingSlConfig?.pips === 'number' &&
          Number.isFinite(rawMissingSlConfig.pips) &&
          rawMissingSlConfig.pips > 0
            ? String(rawMissingSlConfig.pips)
            : '';
        const nextMissingSlOverrides = normalizeMissingSlOverrideRows(
          rawMissingSlConfig?.overrides
        );
        setMissingSlPips(nextMissingSlPips);
        setMissingSlOverrides(nextMissingSlOverrides);
        setBreakEvenEnabled(Boolean(subscription.breakEvenEnabled));
        setBreakEvenMode(subscription.breakEvenMode ?? 'TP_HIT');
        setBreakEvenTrigger(String(subscription.breakEvenTrigger ?? 0));
        setBreakEvenTpTarget(
          subscription.breakEvenTpTarget ? `TP${subscription.breakEvenTpTarget}` : 'TP1'
        );
        setBreakEvenProfitLockPips(String(subscription.breakEvenProfitLockPips ?? 0));
        setTrailingStopEnabled(Boolean(subscription.trailingStopEnabled));
        const nextTrailingStopMode: TrailingStopMode =
          subscription.trailingStopMode === 'TP_LEVELS'
            ? subscription.trailingStopMode
            : 'STEP_PIPS';
        setTrailingStopMode(nextTrailingStopMode);
        setTrailingStopStepTriggerPips(
          typeof subscription.trailingStopStepTriggerPips === 'number' &&
            Number.isFinite(subscription.trailingStopStepTriggerPips) &&
            subscription.trailingStopStepTriggerPips > 0
            ? String(subscription.trailingStopStepTriggerPips)
            : ''
        );
        setTrailingStopStepMovePips(
          typeof subscription.trailingStopStepMovePips === 'number' &&
            Number.isFinite(subscription.trailingStopStepMovePips) &&
            subscription.trailingStopStepMovePips > 0
            ? String(subscription.trailingStopStepMovePips)
            : ''
        );
        setTpExecutionMode(subscription.tpExecutionMode ?? 'ALL');
        const normalizedTpTargets = normalizeTpExecutionTargets(
          subscription.tpExecutionTargets,
          subscription.tpExecutionTarget ?? 'TP1'
        );
        setTpExecutionTargets(normalizedTpTargets.length > 0 ? normalizedTpTargets : ['TP1']);
        const normalizedCustom = normalizeCustomPercentagesRecord(subscription.customTpPercentages);
        const nextCustom =
          (subscription.tpExecutionMode ?? 'ALL') === 'SPECIFIC'
            ? alignCustomPercentagesToTargets(normalizedCustom, normalizedTpTargets)
            : Object.keys(normalizedCustom).length > 0
              ? normalizedCustom
              : { TP1: '100' };
        setCustomPercentages(nextCustom);
        setInitialSettings({
          allowedSymbols: normalizedAllowed,
          symbolPolicyMode: loadedPolicyMode,
          maxActiveOrders: subscription.maxActiveOrders ?? 0,
          maxDailyTrades: subscription.maxDailyTrades ?? 0,
          duplicateSignalTimeoutMinutes: subscription.duplicateSignalTimeoutMinutes ?? 5,
          riskMode: subscription.riskMode ?? 'FIXED_AMOUNT',
          riskPerTrade: String(subscription.riskPerTrade ?? 0),
          fixedLotSize:
            typeof subscription.fixedLotSize === 'number' &&
            Number.isFinite(subscription.fixedLotSize)
              ? String(subscription.fixedLotSize)
              : '',
          riskPercentage: String(subscription.riskPercentage ?? 0),
          maxLots:
            subscription.maxLots !== undefined && subscription.maxLots !== null
              ? String(subscription.maxLots)
              : '',
          maxSlPips:
            typeof subscription.maxSlPips === 'number' &&
            Number.isFinite(subscription.maxSlPips) &&
            subscription.maxSlPips > 0
              ? String(subscription.maxSlPips)
              : '',
          rejectIfTp1PipsLessThanSlPips: Boolean(subscription.rejectIfTp1PipsLessThanSlPips),
          minLotsOverride: Boolean(subscription.minLotsOverride),
          lotRoundingMode: subscription.lotRoundingMode ?? 'FLOOR',
          allowExecutionWithoutSlTp: Boolean(subscription.allowExecutionWithoutSlTp),
          allowProviderSlWidening: Boolean(subscription.allowProviderSlWidening),
          allowForwardedSignals: Boolean(subscription.allowForwardedSignals),
          signalPendingOrderHandlingEnabled: nextSignalPendingOrderHandlingEnabled,
          limitOrderExpirationMinutes: nextLimitOrderExpirationMinutes,
          marketEntryToleranceMode: nextMarketEntryToleranceMode,
          marketEntryTolerancePips:
            typeof subscription.marketEntryTolerancePips === 'number' &&
            Number.isFinite(subscription.marketEntryTolerancePips) &&
            subscription.marketEntryTolerancePips > 0
              ? String(subscription.marketEntryTolerancePips)
              : '',
          missingSlPips: nextMissingSlPips,
          missingSlOverrides: nextMissingSlOverrides,
          breakEvenEnabled: Boolean(subscription.breakEvenEnabled),
          breakEvenMode: subscription.breakEvenMode ?? 'TP_HIT',
          breakEvenTrigger: String(subscription.breakEvenTrigger ?? 0),
          breakEvenTpTarget: subscription.breakEvenTpTarget
            ? `TP${subscription.breakEvenTpTarget}`
            : 'TP1',
          breakEvenProfitLockPips: String(subscription.breakEvenProfitLockPips ?? 0),
          trailingStopEnabled: Boolean(subscription.trailingStopEnabled),
          trailingStopMode: nextTrailingStopMode,
          trailingStopStepTriggerPips:
            typeof subscription.trailingStopStepTriggerPips === 'number' &&
            Number.isFinite(subscription.trailingStopStepTriggerPips) &&
            subscription.trailingStopStepTriggerPips > 0
              ? String(subscription.trailingStopStepTriggerPips)
              : '',
          trailingStopStepMovePips:
            typeof subscription.trailingStopStepMovePips === 'number' &&
            Number.isFinite(subscription.trailingStopStepMovePips) &&
            subscription.trailingStopStepMovePips > 0
              ? String(subscription.trailingStopStepMovePips)
              : '',
          tpExecutionMode: subscription.tpExecutionMode ?? 'ALL',
          tpExecutionTargets: normalizedTpTargets.length > 0 ? normalizedTpTargets : ['TP1'],
          customPercentages: nextCustom,
        });
        setFieldErrors({});
      } catch {
        if (!cancelled) {
          setSettingsMeta(null);
          setSymbolsCatalog([]);
          setSymbolCatalogRevision(null);
          setSymbolCatalogStatus('UNAVAILABLE');
          setSymbolsCatalogHint(t.symbols.loadError);
          setFieldErrors({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId, t.symbols.accountRequired, t.symbols.catalogEmpty, t.symbols.loadError]);

  useEffect(() => {
    const channelId = settingsMeta?.subscription.channelId;
    if (!channelId || settingsViewed.current === subscriptionId) return;
    settingsViewed.current = subscriptionId;
    trackAnalyticsEvent('channel_settings_viewed', {
      channel_id: channelId,
      subscription_id: subscriptionId,
    });
  }, [settingsMeta, subscriptionId]);

  useEffect(() => {
    if (!symbolsSheetOpen) {
      document.body.style.overflow = '';
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [symbolsSheetOpen]);

  const trailingTpLevelsSelected = trailingStopEnabled && trailingStopMode === 'TP_LEVELS';

  const handleOpenSymbols = () => {
    setSymbolsDraft(allowedSymbols);
    setSymbolSearch('');
    setSymbolsSheetOpen(true);
  };

  const toggleSymbol = (symbol: string) => {
    const key = normalizeSymbolKey(symbol);
    const catalogItem = symbolsCatalog.find((item) => normalizeSymbolKey(item.symbol) === key);
    setSymbolsDraft((current) => {
      const exists = current.some((item) => normalizeSymbolKey(item) === key);
      if (!exists && catalogItem && !catalogItem.selectable) {
        return current;
      }
      if (exists) {
        return current.filter((item) => normalizeSymbolKey(item) !== key);
      }
      return [...current, symbol];
    });
  };

  const applySymbols = () => {
    const normalizedDraft = normalizeAllowedSymbols(symbolsDraft, symbolsCatalog);
    setAllowedSymbols(normalizedDraft);
    setSymbolsDraft(normalizedDraft);
    if (normalizedDraft.length > 0) {
      setSymbolPolicyMode('SELECTED_ONLY');
    }
    setSymbolSearch('');
    setSymbolsSheetOpen(false);
    clearFieldError('allowedSymbols');
  };

  const updateMissingSlOverride = (index: number, patch: Partial<MissingSlOverrideInput>) => {
    setMissingSlOverrides((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  };

  const addMissingSlOverride = () => {
    setMissingSlOverrides((current) => [
      ...current,
      {
        symbol: '',
        pips: '',
      },
    ]);
  };

  const removeMissingSlOverride = (index: number) => {
    setMissingSlOverrides((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const validateSettings = (
    normalizedTpTargets: string[],
    percentTarget: number
  ): ChannelSettingsFieldErrors => {
    const nextErrors: ChannelSettingsFieldErrors = {};
    const tpLevelTargets = normalizedTpTargets.filter((key) => TP_LEVEL_PATTERN.test(key));

    if (
      symbolPolicyMode === 'SELECTED_ONLY' &&
      (symbolCatalogStatus !== 'READY' || !symbolCatalogRevision)
    ) {
      nextErrors.allowedSymbols = t.symbols.catalogEmpty;
    }

    if (
      !Number.isInteger(maxActiveOrders) ||
      maxActiveOrders < (maxActiveOrdersAllowsUnlimited ? 0 : 1)
    ) {
      nextErrors.maxActiveOrders = t.validation.maxActiveOrdersMin;
    }

    if (
      !Number.isInteger(maxDailyTrades) ||
      maxDailyTrades < (maxDailyTradesAllowsUnlimited ? 0 : 1)
    ) {
      nextErrors.maxDailyTrades = t.validation.maxDailyTradesMin;
    }

    if (!Number.isInteger(duplicateSignalTimeoutMinutes) || duplicateSignalTimeoutMinutes < 1) {
      nextErrors.duplicateSignalTimeoutMinutes = t.validation.duplicateSignalTimeoutMinutesMin;
    }

    if (riskMode === 'FIXED_AMOUNT') {
      const parsed = Number(riskPerTrade);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.riskPerTrade = t.validation.riskPerTradePositive;
      }
    }

    if (riskMode === 'FIXED_LOT') {
      const parsed = Number(fixedLotSize);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.fixedLotSize = t.validation.fixedLotSizePositive;
      }
    }

    if (riskMode === 'PERCENTAGE') {
      const parsed = Number(riskPercentage);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        nextErrors.riskPercentage = t.validation.riskPercentageRange;
      }
    }

    if (maxLots.trim().length > 0) {
      const parsed = Number(maxLots);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.maxLots = t.validation.maxLotsPositive;
      }
    }

    if (maxSlPips.trim().length > 0) {
      const parsed = Number(maxSlPips);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.maxSlPips = t.validation.maxSlPipsPositive;
      }
    }

    if (signalPendingOrderHandlingEnabled) {
      const parsedLimitTimeout = Number(limitOrderExpirationMinutes);
      if (!Number.isFinite(parsedLimitTimeout) || parsedLimitTimeout <= 0) {
        nextErrors.limitOrderExpirationMinutes = t.validation.limitOrderExpirationPositive;
      }
    }

    if (marketEntryToleranceMode === 'PIPS') {
      const parsed = Number(marketEntryTolerancePips);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.marketEntryTolerancePips = t.validation.marketEntryTolerancePipsPositive;
      }
    }

    if (allowExecutionWithoutSlTp) {
      const parsedMissingSlPips = Number(missingSlPips);
      if (!Number.isFinite(parsedMissingSlPips) || parsedMissingSlPips <= 0) {
        nextErrors.missingSlConfig = t.validation.missingSlPipsPositive;
      }

      for (const override of missingSlOverrides) {
        const symbol = override.symbol.trim().toUpperCase();
        const parsedValue = Number(override.pips);
        if (!MISSING_SL_SYMBOL_PATTERN.test(symbol)) {
          nextErrors.missingSlConfig = t.validation.missingSlSymbolInvalid;
          break;
        }
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
          nextErrors.missingSlConfig = t.validation.missingSlOverridePositive;
          break;
        }
      }
    }

    const parsedBreakEvenProfitLock = Number(breakEvenProfitLockPips);
    if (
      breakEvenEnabled &&
      !trailingTpLevelsSelected &&
      (!Number.isFinite(parsedBreakEvenProfitLock) || parsedBreakEvenProfitLock < 0)
    ) {
      nextErrors.breakEvenProfitLockPips = t.validation.breakEvenProfitLockRange;
    }

    const parsedTrailingStepTrigger = Number(trailingStopStepTriggerPips);
    const parsedTrailingStepMove = Number(trailingStopStepMovePips);
    if (trailingStopEnabled) {
      if (
        trailingStopMode === 'STEP_PIPS' &&
        (!Number.isFinite(parsedTrailingStepTrigger) || parsedTrailingStepTrigger <= 0)
      ) {
        nextErrors.trailingStopStepTriggerPips = t.validation.trailingStopStepTriggerPositive;
      }
      if (
        trailingStopMode === 'STEP_PIPS' &&
        (!Number.isFinite(parsedTrailingStepMove) || parsedTrailingStepMove <= 0)
      ) {
        nextErrors.trailingStopStepMovePips = t.validation.trailingStopStepMovePositive;
      }
    } else {
      if (trailingStopStepTriggerPips.trim().length > 0) {
        if (!Number.isFinite(parsedTrailingStepTrigger) || parsedTrailingStepTrigger <= 0) {
          nextErrors.trailingStopStepTriggerPips = t.validation.trailingStopStepTriggerPositive;
        }
      }
      if (trailingStopStepMovePips.trim().length > 0) {
        if (!Number.isFinite(parsedTrailingStepMove) || parsedTrailingStepMove <= 0) {
          nextErrors.trailingStopStepMovePips = t.validation.trailingStopStepMovePositive;
        }
      }
    }

    if (breakEvenEnabled && !trailingTpLevelsSelected) {
      if (
        breakEvenMode === 'TP_HIT' &&
        !TP_TARGET_PATTERN.test(breakEvenTpTarget.trim().toUpperCase())
      ) {
        nextErrors.breakEvenTpTarget = t.validation.breakEvenTpTargetRequired;
      }

      if (breakEvenMode === 'FIXED_PIPS') {
        const parsed = Number(breakEvenTrigger);
        if (!Number.isFinite(parsed) || parsed < 0) {
          nextErrors.breakEvenTrigger = t.validation.breakEvenTriggerRange;
        }
      }
    }

    if (tpExecutionMode === 'SPECIFIC' && tpLevelTargets.length === 0) {
      nextErrors.tpExecutionTargets = t.validation.tpTargetsRequired;
    }

    const normalizedKeys = Object.keys(customPercentages)
      .map((key) => key.trim().toUpperCase())
      .filter((key) => TP_LEVEL_PATTERN.test(key));
    const hasOutOfRangeCustom = normalizedKeys.some((key) => {
      const parsed = Number(customPercentages[key] ?? '');
      return !Number.isFinite(parsed) || parsed < 0 || parsed > 100;
    });
    if (hasOutOfRangeCustom) {
      nextErrors.customTpPercentages = t.validation.customPercentagesRange;
    } else if (tpExecutionMode === 'SPECIFIC' && customPercentTotal !== percentTarget) {
      nextErrors.customTpPercentages = t.validation.customPercentagesTotal.replace(
        '{target}',
        String(percentTarget)
      );
    }

    return nextErrors;
  };

  const handleSave = async () => {
    if (subscriptionStatus.subscriptionPaused) {
      toast.error(subscriptionStatus.subscriptionPauseMessage ?? subscriptionPauseFallbackMessage);
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const customPercentTarget = settingsMeta?.options?.customTpPercentTotal ?? 100;
      const normalizedAllowedSymbols = normalizeAllowedSymbols(allowedSymbols, symbolsCatalog);
      const normalizedTpTargets = normalizeTpExecutionTargets(tpExecutionTargets, 'TP1');
      const clientValidationErrors = validateSettings(
        normalizedTpTargets.length > 0 ? normalizedTpTargets : ['TP1'],
        customPercentTarget
      );
      if (Object.keys(clientValidationErrors).length > 0) {
        applyFieldErrors(clientValidationErrors);
        const firstError = getFirstFieldError(clientValidationErrors);
        toast.error(firstError ? `${t.toasts.validation} ${firstError}` : t.toasts.validation);
        return;
      }
      setAllowedSymbols(normalizedAllowedSymbols);
      setTpExecutionTargets(normalizedTpTargets.length > 0 ? normalizedTpTargets : ['TP1']);
      const normalizedCustomPercentages = Object.fromEntries(
        Object.entries(
          tpExecutionMode === 'SPECIFIC'
            ? Object.fromEntries(
                normalizedTpTargets
                  .filter((key) => TP_LEVEL_PATTERN.test(key))
                  .map((key) => [key, customPercentages[key] ?? '0'])
              )
            : customPercentages
        )
          .filter(([key]) => TP_LEVEL_PATTERN.test(key))
          .map(([key, value]) => [key, Number(value || 0)])
      );
      const normalizedCustomPercentagesSnapshot = Object.fromEntries(
        Object.entries(normalizedCustomPercentages).map(([key, value]) => [key, String(value)])
      );
      const missingSlConfigPayload = buildMissingSlConfigPayload(missingSlPips, missingSlOverrides);
      const effectiveBreakEvenEnabled = trailingTpLevelsSelected ? false : breakEvenEnabled;
      const maxActiveOrdersPayload =
        maxActiveOrdersAllowsUnlimited && maxActiveOrders === 0 ? null : maxActiveOrders;
      const maxDailyTradesPayload =
        maxDailyTradesAllowsUnlimited && maxDailyTrades === 0 ? null : maxDailyTrades;
      await channelsService.updateSettings(subscriptionId, {
        symbolPolicy: {
          mode: symbolPolicyMode,
          catalogRevision: symbolCatalogRevision ?? '',
          selections:
            symbolPolicyMode === 'SELECTED_ONLY'
              ? normalizedAllowedSymbols.map((brokerSymbol) => ({ brokerSymbol }))
              : [],
        },
        maxActiveOrders: maxActiveOrdersPayload,
        maxDailyTrades: maxDailyTradesPayload,
        duplicateSignalTimeoutMinutes,
        riskMode,
        riskPerTrade: riskMode === 'FIXED_AMOUNT' ? Number(riskPerTrade || 0) : undefined,
        fixedLotSize: riskMode === 'FIXED_LOT' ? Number(fixedLotSize || 0) : null,
        riskPercentage: riskMode === 'PERCENTAGE' ? Number(riskPercentage || 0) : undefined,
        maxLots: maxLots.trim().length > 0 ? Number(maxLots) : null,
        maxSlPips: maxSlPips.trim().length > 0 ? Number(maxSlPips) : null,
        rejectIfTp1PipsLessThanSlPips,
        minLotsOverride,
        lotRoundingMode,
        allowExecutionWithoutSlTp,
        allowProviderSlWidening,
        allowForwardedSignals,
        missingSlConfig: allowExecutionWithoutSlTp ? missingSlConfigPayload : null,
        signalPendingOrderHandlingEnabled,
        limitOrderExpirationMinutes:
          limitOrderExpirationMinutes.trim().length > 0
            ? Number(limitOrderExpirationMinutes)
            : null,
        marketEntryToleranceMode,
        marketEntryTolerancePips:
          marketEntryToleranceMode === 'PIPS' ? Number(marketEntryTolerancePips || 0) : null,
        breakEvenEnabled: effectiveBreakEvenEnabled,
        breakEvenMode,
        breakEvenTrigger:
          effectiveBreakEvenEnabled && breakEvenMode === 'FIXED_PIPS'
            ? Number(breakEvenTrigger || 0)
            : undefined,
        breakEvenTpTarget:
          effectiveBreakEvenEnabled && breakEvenMode === 'TP_HIT'
            ? Number(breakEvenTpTarget.replace('TP', ''))
            : undefined,
        breakEvenProfitLockPips: effectiveBreakEvenEnabled
          ? Number(breakEvenProfitLockPips || 0)
          : 0,
        trailingStopEnabled,
        trailingStopMode,
        trailingStopStepTriggerPips:
          trailingStopMode === 'STEP_PIPS' && trailingStopStepTriggerPips.trim().length > 0
            ? Number(trailingStopStepTriggerPips)
            : undefined,
        trailingStopStepMovePips:
          trailingStopMode === 'STEP_PIPS' && trailingStopStepMovePips.trim().length > 0
            ? Number(trailingStopStepMovePips)
            : undefined,
        tpExecutionMode,
        tpExecutionTarget:
          tpExecutionMode === 'SPECIFIC' ? (normalizedTpTargets[0] ?? 'TP1') : undefined,
        tpExecutionTargets: tpExecutionMode === 'SPECIFIC' ? normalizedTpTargets : undefined,
        customTpPercentages: normalizedCustomPercentages,
      });
      setCustomPercentages(normalizedCustomPercentagesSnapshot);
      setInitialSettings({
        allowedSymbols: normalizedAllowedSymbols,
        symbolPolicyMode,
        maxActiveOrders,
        maxDailyTrades,
        duplicateSignalTimeoutMinutes,
        riskMode,
        riskPerTrade,
        fixedLotSize,
        riskPercentage,
        maxLots,
        maxSlPips,
        rejectIfTp1PipsLessThanSlPips,
        minLotsOverride,
        lotRoundingMode,
        allowExecutionWithoutSlTp,
        allowProviderSlWidening,
        allowForwardedSignals,
        signalPendingOrderHandlingEnabled,
        limitOrderExpirationMinutes,
        marketEntryToleranceMode,
        marketEntryTolerancePips,
        missingSlPips,
        missingSlOverrides,
        breakEvenEnabled: effectiveBreakEvenEnabled,
        breakEvenMode,
        breakEvenTrigger,
        breakEvenTpTarget,
        breakEvenProfitLockPips,
        trailingStopEnabled,
        trailingStopMode,
        trailingStopStepTriggerPips,
        trailingStopStepMovePips,
        tpExecutionMode,
        tpExecutionTargets: normalizedTpTargets.length > 0 ? normalizedTpTargets : ['TP1'],
        customPercentages: normalizedCustomPercentagesSnapshot,
      });
      const initial = initialSettings;
      const changedFields: string[] = [];
      if (initial) {
        if (initial.symbolPolicyMode !== symbolPolicyMode || initial.allowedSymbols.join('|') !== normalizedAllowedSymbols.join('|')) changedFields.push('allowed_symbols');
        if (initial.riskMode !== riskMode) changedFields.push('risk_mode');
        if (initial.maxActiveOrders !== maxActiveOrders) changedFields.push('max_active_orders');
        if (initial.maxDailyTrades !== maxDailyTrades) changedFields.push('max_daily_trades');
        if (initial.allowExecutionWithoutSlTp !== allowExecutionWithoutSlTp) changedFields.push('allow_execution_without_sl_tp');
        if (initial.allowForwardedSignals !== allowForwardedSignals) changedFields.push('allow_forwarded_signals');
        if (initial.breakEvenEnabled !== effectiveBreakEvenEnabled || initial.breakEvenMode !== breakEvenMode) changedFields.push('break_even');
        if (initial.trailingStopEnabled !== trailingStopEnabled || initial.trailingStopMode !== trailingStopMode) changedFields.push('trailing_stop');
        if (initial.tpExecutionMode !== tpExecutionMode) changedFields.push('tp_execution_mode');
      }
      const channelId = settingsMeta?.subscription.channelId;
      if (channelId) {
        if (initial) {
          const previousSymbols = new Set(initial.allowedSymbols);
          const nextSymbols = new Set(normalizedAllowedSymbols);
          for (const symbol of normalizedAllowedSymbols) {
            if (!previousSymbols.has(symbol)) {
              trackAnalyticsEvent('symbol_added', { channel_id: channelId, symbol });
            }
          }
          for (const symbol of initial.allowedSymbols) {
            if (!nextSymbols.has(symbol)) {
              trackAnalyticsEvent('symbol_removed', { channel_id: channelId, symbol });
            }
          }
        }
        trackAnalyticsEvent('channel_settings_saved', {
          channel_id: channelId,
          subscription_id: subscriptionId,
          risk_mode: riskMode,
          lot_rounding_mode: lotRoundingMode,
          break_even_enabled: effectiveBreakEvenEnabled,
          break_even_mode: breakEvenMode,
          trailing_stop_enabled: trailingStopEnabled,
          trailing_stop_mode: trailingStopMode,
          tp_execution_mode: tpExecutionMode,
          allow_execution_without_sl_tp: allowExecutionWithoutSlTp,
          allow_forwarded_signals: allowForwardedSignals,
          max_active_orders: maxActiveOrders,
          max_daily_trades: maxDailyTrades,
          allowed_symbols_count: normalizedAllowedSymbols.length,
          changed_fields: changedFields,
        });
      }
      toast.success(t.toasts.saveSuccess);
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);
      const channelId = settingsMeta?.subscription.channelId;
      if (channelId) {
        trackAnalyticsEvent('channel_settings_save_failed', {
          channel_id: channelId,
          subscription_id: subscriptionId,
          ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
        });
      }
      const mappedApi = mapApiFormErrors<ChannelSettingsField>({
        error,
        dict: intlMessages,
        fieldAliases: channelSettingsFieldAliases,
      });
      const planViolationErrors = mapPlanViolationsToFieldErrors(getPlanViolationMessages(error), {
        planMaxActiveOrders: t.validation.planMaxActiveOrders,
        planMaxDailyTrades: t.validation.planMaxDailyTrades,
        planAllowExecutionWithoutSlTp: t.validation.planAllowExecutionWithoutSlTp,
      });
      const mergedErrors: ChannelSettingsFieldErrors = {
        ...mappedApi.fieldErrors,
        ...planViolationErrors,
      };

      if (Object.keys(mergedErrors).length > 0) {
        applyFieldErrors(mergedErrors);
      }

      const firstError = getFirstFieldError(mergedErrors);
      const toastMessage = mappedApi.toastMessage || firstError || t.toasts.saveError;

      toast.error(
        firstError && toastMessage !== firstError ? `${toastMessage} ${firstError}` : toastMessage
      );
    } finally {
      setSaving(false);
    }
  };

  const symbolMetaMap = useMemo(() => {
    return new Map(symbolsCatalog.map((item) => [normalizeSymbolKey(item.symbol), item]));
  }, [symbolsCatalog]);
  const selectedSymbolKeys = useMemo(
    () => new Set(symbolsDraft.map((symbol) => normalizeSymbolKey(symbol))),
    [symbolsDraft]
  );
  const filteredSymbols = useMemo(() => {
    if (!symbolSearch.trim()) return symbolsCatalog;
    const term = symbolSearch.trim().toLowerCase();
    const termKey = normalizeSymbolKey(symbolSearch.trim());
    return symbolsCatalog.filter(
      (item) =>
        item.symbol.toLowerCase().includes(term) ||
        (item.display && item.display.toLowerCase().includes(term)) ||
        Boolean(termKey && normalizeSymbolKey(item.symbol).includes(termKey)) ||
        Boolean(termKey && normalizeSymbolKey(item.display).includes(termKey))
    );
  }, [symbolsCatalog, symbolSearch]);
  const filteredMissingSlSymbols = useMemo(() => {
    if (!missingSlSymbolSearch.trim()) return symbolsCatalog;
    const term = missingSlSymbolSearch.trim().toLowerCase();
    const termKey = normalizeSymbolKey(missingSlSymbolSearch.trim());
    return symbolsCatalog.filter(
      (item) =>
        item.symbol.toLowerCase().includes(term) ||
        (item.display && item.display.toLowerCase().includes(term)) ||
        Boolean(termKey && normalizeSymbolKey(item.symbol).includes(termKey)) ||
        Boolean(termKey && normalizeSymbolKey(item.display).includes(termKey))
    );
  }, [symbolsCatalog, missingSlSymbolSearch]);
  const isDirty = useMemo(() => {
    const initial = initialSettings;
    if (!initial) return false;
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((val, idx) => val === b[idx]);
    const recordsEqual = (a: Record<string, string>, b: Record<string, string>) => {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => a[key] === b[key]);
    };
    const targetSetsEqual = (a: string[], b: string[]) => {
      const normalizedA = normalizeTpExecutionTargets(a);
      const normalizedB = normalizeTpExecutionTargets(b);
      if (normalizedA.length !== normalizedB.length) return false;
      const setA = new Set(normalizedA);
      return normalizedB.every((item) => setA.has(item));
    };
    const overridesEqual = (a: MissingSlOverrideInput[], b: MissingSlOverrideInput[]) => {
      const normalizeRows = (rows: MissingSlOverrideInput[]) =>
        rows
          .map((row) => ({
            symbol: row.symbol.trim().toUpperCase(),
            pips: row.pips.trim(),
          }))
          .sort((x, y) => x.symbol.localeCompare(y.symbol));
      const normalizedA = normalizeRows(a);
      const normalizedB = normalizeRows(b);
      if (normalizedA.length !== normalizedB.length) {
        return false;
      }
      return normalizedA.every(
        (row, idx) => row.symbol === normalizedB[idx].symbol && row.pips === normalizedB[idx].pips
      );
    };

    return !(
      arraysEqual(initial.allowedSymbols, allowedSymbols) &&
      initial.symbolPolicyMode === symbolPolicyMode &&
      initial.maxActiveOrders === maxActiveOrders &&
      initial.maxDailyTrades === maxDailyTrades &&
      initial.duplicateSignalTimeoutMinutes === duplicateSignalTimeoutMinutes &&
      initial.riskMode === riskMode &&
      initial.riskPerTrade === riskPerTrade &&
      initial.fixedLotSize === fixedLotSize &&
      initial.riskPercentage === riskPercentage &&
      initial.maxLots === maxLots &&
      initial.maxSlPips === maxSlPips &&
      initial.rejectIfTp1PipsLessThanSlPips === rejectIfTp1PipsLessThanSlPips &&
      initial.minLotsOverride === minLotsOverride &&
      initial.lotRoundingMode === lotRoundingMode &&
      initial.allowExecutionWithoutSlTp === allowExecutionWithoutSlTp &&
      initial.allowProviderSlWidening === allowProviderSlWidening &&
      initial.allowForwardedSignals === allowForwardedSignals &&
      initial.signalPendingOrderHandlingEnabled === signalPendingOrderHandlingEnabled &&
      initial.limitOrderExpirationMinutes === limitOrderExpirationMinutes &&
      initial.marketEntryToleranceMode === marketEntryToleranceMode &&
      initial.marketEntryTolerancePips === marketEntryTolerancePips &&
      initial.missingSlPips === missingSlPips &&
      overridesEqual(initial.missingSlOverrides, missingSlOverrides) &&
      initial.breakEvenEnabled === breakEvenEnabled &&
      initial.breakEvenMode === breakEvenMode &&
      initial.breakEvenTrigger === breakEvenTrigger &&
      initial.breakEvenTpTarget === breakEvenTpTarget &&
      initial.breakEvenProfitLockPips === breakEvenProfitLockPips &&
      initial.trailingStopEnabled === trailingStopEnabled &&
      initial.trailingStopMode === trailingStopMode &&
      initial.trailingStopStepTriggerPips === trailingStopStepTriggerPips &&
      initial.trailingStopStepMovePips === trailingStopStepMovePips &&
      initial.tpExecutionMode === tpExecutionMode &&
      targetSetsEqual(initial.tpExecutionTargets, tpExecutionTargets) &&
      recordsEqual(initial.customPercentages, customPercentages)
    );
  }, [
    allowedSymbols,
    symbolPolicyMode,
    maxActiveOrders,
    maxDailyTrades,
    duplicateSignalTimeoutMinutes,
    riskMode,
    riskPerTrade,
    fixedLotSize,
    riskPercentage,
    maxLots,
    maxSlPips,
    rejectIfTp1PipsLessThanSlPips,
    minLotsOverride,
    lotRoundingMode,
    allowExecutionWithoutSlTp,
    allowProviderSlWidening,
    allowForwardedSignals,
    signalPendingOrderHandlingEnabled,
    limitOrderExpirationMinutes,
    marketEntryToleranceMode,
    marketEntryTolerancePips,
    missingSlPips,
    missingSlOverrides,
    breakEvenEnabled,
    breakEvenMode,
    breakEvenTrigger,
    breakEvenTpTarget,
    breakEvenProfitLockPips,
    trailingStopEnabled,
    trailingStopMode,
    trailingStopStepTriggerPips,
    trailingStopStepMovePips,
    tpExecutionMode,
    tpExecutionTargets,
    customPercentages,
    initialSettings,
  ]);
  const tpTargets = settingsMeta?.options?.tpTargets ?? [];
  const maxLotsConstraint = settingsMeta?.options?.constraints?.maxLots;
  const maxSlPipsConstraint = settingsMeta?.options?.constraints?.maxSlPips;
  const fixedLotSizeConstraint = settingsMeta?.options?.constraints?.fixedLotSize;
  const marketEntryTolerancePipsConstraint =
    settingsMeta?.options?.constraints?.marketEntryTolerancePips;
  const limitOrderExpirationConstraint =
    settingsMeta?.options?.constraints?.limitOrderExpirationMinutes;
  const lotRoundingModes: Array<'FLOOR' | 'ROUND' | 'CEIL'> = settingsMeta?.options
    ?.lotRoundingModes ?? ['FLOOR', 'ROUND', 'CEIL'];
  const marketEntryToleranceModes: MarketEntryToleranceMode[] = settingsMeta?.options
    ?.marketEntryToleranceModes ?? ['EXACT', 'PIPS'];
  const customPercentTarget = settingsMeta?.options?.customTpPercentTotal ?? 100;
  const customPercentValid = customPercentTotal === customPercentTarget;
  const customPercentageKeys = useMemo(() => {
    return Object.keys(customPercentages)
      .map((key) => key.trim().toUpperCase())
      .filter((key) => TP_LEVEL_PATTERN.test(key))
      .sort((a, b) => (parseTpLevel(a) ?? 0) - (parseTpLevel(b) ?? 0));
  }, [customPercentages]);
  const selectedTpTargets = useMemo(
    () => new Set(normalizeTpExecutionTargets(tpExecutionTargets, 'TP1')),
    [tpExecutionTargets]
  );
  const toggleTpExecutionTarget = (target: string) => {
    const normalizedTarget = target.trim().toUpperCase();
    const normalizedCurrent = normalizeTpExecutionTargets(tpExecutionTargets, 'TP1');
    const currentSet = new Set(normalizedCurrent);
    const nextTargets = currentSet.has(normalizedTarget)
      ? normalizedCurrent.filter((item) => item !== normalizedTarget)
      : [...normalizedCurrent, normalizedTarget];

    clearFieldError('tpExecutionTargets');
    clearFieldError('customTpPercentages');
    setTpExecutionTargets(nextTargets);
    setCustomPercentages((current) =>
      alignCustomPercentagesToTargets(current, nextTargets)
    );
  };
  const channelDisplayName = useMemo(() => {
    const channelTitle = settingsMeta?.subscription.channelTitle?.trim();
    if (channelTitle) return channelTitle;

    const channelUsername = settingsMeta?.subscription.channelUsername?.trim();
    if (!channelUsername) return '';
    return channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
  }, [settingsMeta?.subscription.channelTitle, settingsMeta?.subscription.channelUsername]);

  return (
    <div className="channels-detail-shell">
      <div className="channels-detail-layout">
        <div className="channels-detail">
          <div className="channels-detail-header is-centered is-settings">
            <BackButton className="channels-detail-back" onClick={() => router.back()} />
            <div className="channels-detail-meta">
              <div className="channels-detail-text">
                <h1>{t.title}</h1>
                {channelDisplayName && (
                  <div className="channels-settings-channel-line">
                    <ChannelAvatar
                      imageUrl={settingsMeta?.subscription.photoUrl ?? null}
                      className="channels-settings-channel-avatar"
                      imgClassName="channels-settings-channel-avatar-img"
                    />
                    <span className="channels-settings-channel-name">{channelDisplayName}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="channels-detail-spacer" aria-hidden="true" />
          </div>
          <div className="channels-settings">
            <SubscriptionPausedNotice
              status={subscriptionStatus}
              href={localizePath(
                lang,
                billingDisabled ? '/auth/signup' : '/profile/subscription'
              )}
            />
            {loading && <ChannelSettingsSkeleton />}
            {!loading && (
              <div className="channels-settings-panel">
                <div className="channels-settings-grid">
                  <section className="channels-settings-section is-full">
                    <h2>{t.groups.eligibility.title}</h2>
                    <p>{t.groups.eligibility.subtitle}</p>

                    <div className="channels-settings-subsection">
                      <h3>{t.symbols.title}</h3>
                      <p>{t.symbols.subtitle}</p>
                      <div
                        className="channels-pill-group"
                        role="radiogroup"
                        aria-label={t.symbols.title}
                      >
                        <button
                          type="button"
                          className={cn(
                            'channels-pill',
                            symbolPolicyMode === 'ALL_TRADABLE' && 'is-active'
                          )}
                          role="radio"
                          aria-checked={symbolPolicyMode === 'ALL_TRADABLE'}
                          onClick={() => {
                            setSymbolPolicyMode('ALL_TRADABLE');
                            setAllowedSymbols([]);
                            setSymbolsDraft([]);
                            clearFieldError('allowedSymbols');
                          }}
                        >
                          {t.symbols.allTradable}
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'channels-pill',
                            symbolPolicyMode === 'SELECTED_ONLY' && 'is-active'
                          )}
                          role="radio"
                          aria-checked={symbolPolicyMode === 'SELECTED_ONLY'}
                          onClick={() => {
                            setSymbolPolicyMode('SELECTED_ONLY');
                            clearFieldError('allowedSymbols');
                          }}
                        >
                          {t.symbols.selectedOnly}
                        </button>
                      </div>
                      <p className="channels-symbols-hint">
                        {symbolPolicyMode === 'ALL_TRADABLE'
                          ? t.symbols.modeDescriptionAll
                          : t.symbols.modeDescriptionSelected}
                      </p>
                      {symbolsCatalogHint && (
                        <p className="channels-symbols-hint" role="status">
                          {symbolsCatalogHint}
                        </p>
                      )}
                      {symbolPolicyMode === 'SELECTED_ONLY' && allowedSymbols.length === 0 && (
                        <p className="channels-symbols-hint">{t.symbols.noneSelected}</p>
                      )}
                      <div
                        className={cn('channels-symbols', fieldErrors.allowedSymbols && 'is-error')}
                      >
                        {symbolPolicyMode === 'SELECTED_ONLY' &&
                          allowedSymbols.map((symbol) => {
                            const symbolKey = normalizeSymbolKey(symbol);
                            const meta = symbolMetaMap.get(symbolKey);
                            return (
                              <span key={symbol} className="channels-symbol-chip">
                                <SymbolPairBadge
                                  symbol={meta?.symbol ?? symbol}
                                  base={meta?.base}
                                  quote={meta?.quote}
                                  baseCountry={meta?.baseCountry}
                                  quoteCountry={meta?.quoteCountry}
                                  size="sm"
                                />
                                <span className="channels-symbol-chip-label">
                                  {meta?.displayName ?? meta?.display ?? symbol}
                                  {meta && !meta.selectable && (
                                    <small>
                                      {meta.tradeMode === 'DISABLED'
                                        ? t.symbols.disabled
                                        : meta.tradeMode === 'CLOSE_ONLY'
                                          ? t.symbols.closeOnly
                                          : t.symbols.capabilityUnknown}
                                    </small>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearFieldError('allowedSymbols');
                                    setAllowedSymbols((current) =>
                                      current.filter(
                                        (item) => normalizeSymbolKey(item) !== symbolKey
                                      )
                                    );
                                  }}
                                  aria-label={`Remove ${symbol}`}
                                >
                                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                              </span>
                            );
                          })}
                        <button
                          type="button"
                          className="channels-symbol-add"
                          onClick={() => {
                            clearFieldError('allowedSymbols');
                            handleOpenSymbols();
                          }}
                        >
                          <i className="fa-solid fa-plus" aria-hidden="true" />
                        </button>
                      </div>
                      {fieldErrors.allowedSymbols && (
                        <p className="channels-field-error">{fieldErrors.allowedSymbols}</p>
                      )}
                    </div>

                    <div className="channels-settings-subsection">
                      <h3>{t.limits.title}</h3>
                      <p>{t.limits.subtitle}</p>
                      <div
                        className={cn(
                          'channels-stepper',
                          fieldErrors.maxActiveOrders && 'is-error'
                        )}
                      >
                        <div>
                          <h3>{t.limits.active.title}</h3>
                          <span>{t.limits.active.description}</span>
                        </div>
                        <div className="channels-stepper-control tragram-ltr-content">
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('maxActiveOrders');
                              setMaxActiveOrders((value) => Math.max(0, value - 1));
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="channels-stepper-value channels-stepper-count channels-stepper-input"
                            value={maxActiveOrders}
                            onChange={(event) => {
                              clearFieldError('maxActiveOrders');
                              const parsed = Number.parseInt(event.target.value, 10);
                              setMaxActiveOrders(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                            }}
                            aria-label={t.limits.active.title}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('maxActiveOrders');
                              setMaxActiveOrders((value) => value + 1);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {fieldErrors.maxActiveOrders && (
                        <p className="channels-field-error">{fieldErrors.maxActiveOrders}</p>
                      )}
                      <div
                        className={cn('channels-stepper', fieldErrors.maxDailyTrades && 'is-error')}
                      >
                        <div>
                          <h3>{t.limits.daily.title}</h3>
                          <span>{t.limits.daily.description}</span>
                        </div>
                        <div className="channels-stepper-control tragram-ltr-content">
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('maxDailyTrades');
                              setMaxDailyTrades((value) => Math.max(0, value - 1));
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="channels-stepper-value channels-stepper-count channels-stepper-input"
                            value={maxDailyTrades}
                            onChange={(event) => {
                              clearFieldError('maxDailyTrades');
                              const parsed = Number.parseInt(event.target.value, 10);
                              setMaxDailyTrades(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                            }}
                            aria-label={t.limits.daily.title}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('maxDailyTrades');
                              setMaxDailyTrades((value) => value + 1);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {fieldErrors.maxDailyTrades && (
                        <p className="channels-field-error">{fieldErrors.maxDailyTrades}</p>
                      )}
                      <div
                        className={cn(
                          'channels-stepper',
                          fieldErrors.duplicateSignalTimeoutMinutes && 'is-error'
                        )}
                      >
                        <div>
                          <h3>{t.limits.duplicateTimeout.title}</h3>
                          <span>{t.limits.duplicateTimeout.description}</span>
                        </div>
                        <div className="channels-stepper-control tragram-ltr-content">
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('duplicateSignalTimeoutMinutes');
                              setDuplicateSignalTimeoutMinutes((value) => Math.max(1, value - 1));
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            className="channels-stepper-value channels-stepper-count channels-stepper-input"
                            value={duplicateSignalTimeoutMinutes}
                            onChange={(event) => {
                              clearFieldError('duplicateSignalTimeoutMinutes');
                              const parsed = Number.parseInt(event.target.value, 10);
                              setDuplicateSignalTimeoutMinutes(
                                Number.isFinite(parsed) ? Math.max(1, parsed) : 1
                              );
                            }}
                            aria-label={t.limits.duplicateTimeout.title}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              clearFieldError('duplicateSignalTimeoutMinutes');
                              setDuplicateSignalTimeoutMinutes((value) => value + 1);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {fieldErrors.duplicateSignalTimeoutMinutes && (
                        <p className="channels-field-error">
                          {fieldErrors.duplicateSignalTimeoutMinutes}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="channels-settings-section is-full">
                    <h2>{t.groups.risk.title}</h2>
                    <p>{t.groups.risk.subtitle}</p>
                    <label className="channels-radio">
                      <input
                        type="radio"
                        name="risk-mode"
                        checked={riskMode === 'FIXED_AMOUNT'}
                        onChange={() => {
                          clearFieldError('riskPerTrade');
                          clearFieldError('riskPercentage');
                          setRiskMode('FIXED_AMOUNT');
                        }}
                      />
                      <span>{t.risk.fixed.label}</span>
                      <em>{t.risk.fixed.description}</em>
                    </label>
                    {riskMode === 'FIXED_AMOUNT' && (
                      <div className="channels-percent-item">
                        <p className="channels-percent-label">{t.risk.fixed.valueLabel}</p>
                        <div
                          className={cn('channels-input', fieldErrors.riskPerTrade && 'is-error')}
                        >
                          <bdi
                            className="channels-input-label channels-input-currency"
                            title={accountCurrency}
                          >
                            {accountCurrencySymbol}
                          </bdi>
                          <input
                            type="number"
                            value={riskPerTrade}
                            aria-invalid={Boolean(fieldErrors.riskPerTrade)}
                            onChange={(event) => {
                              clearFieldError('riskPerTrade');
                              setRiskPerTrade(event.target.value);
                            }}
                            placeholder={t.risk.placeholderFixed}
                          />
                        </div>
                      </div>
                    )}
                    {riskMode === 'FIXED_AMOUNT' && fieldErrors.riskPerTrade && (
                      <p className="channels-field-error">{fieldErrors.riskPerTrade}</p>
                    )}
                    <label className="channels-radio">
                      <input
                        type="radio"
                        name="risk-mode"
                        checked={riskMode === 'PERCENTAGE'}
                        onChange={() => {
                          clearFieldError('riskPerTrade');
                          clearFieldError('riskPercentage');
                          setRiskMode('PERCENTAGE');
                        }}
                      />
                      <span>{t.risk.percentage.label}</span>
                      <em>{t.risk.percentage.description}</em>
                    </label>
                    {riskMode === 'PERCENTAGE' && (
                      <div className="channels-percent-item">
                        <p className="channels-percent-label">{t.risk.percentage.valueLabel}</p>
                        <div
                          className={cn('channels-input', fieldErrors.riskPercentage && 'is-error')}
                        >
                          <i className="fa-solid fa-percent" aria-hidden="true" />
                          <input
                            type="number"
                            value={riskPercentage}
                            aria-invalid={Boolean(fieldErrors.riskPercentage)}
                            onChange={(event) => {
                              clearFieldError('riskPercentage');
                              setRiskPercentage(event.target.value);
                            }}
                            placeholder={t.risk.placeholderPercent}
                          />
                        </div>
                      </div>
                    )}
                    {riskMode === 'PERCENTAGE' && fieldErrors.riskPercentage && (
                      <p className="channels-field-error">{fieldErrors.riskPercentage}</p>
                    )}
                    <label className="channels-radio">
                      <input
                        type="radio"
                        name="risk-mode"
                        checked={riskMode === 'FIXED_LOT'}
                        onChange={() => {
                          clearFieldError('fixedLotSize');
                          setRiskMode('FIXED_LOT');
                        }}
                      />
                      <span>{t.risk.fixedLot.label}</span>
                      <em>{t.risk.fixedLot.description}</em>
                    </label>
                    {riskMode === 'FIXED_LOT' && (
                      <div className="channels-percent-item">
                        <p className="channels-percent-label">{t.risk.fixedLot.valueLabel}</p>
                        <div
                          className={cn('channels-input', fieldErrors.fixedLotSize && 'is-error')}
                        >
                          <i className="fa-solid fa-layer-group" aria-hidden="true" />
                          <input
                            type="number"
                            value={fixedLotSize}
                            min={fixedLotSizeConstraint?.min}
                            max={fixedLotSizeConstraint?.max ?? undefined}
                            step={fixedLotSizeConstraint?.step ?? 0.01}
                            aria-invalid={Boolean(fieldErrors.fixedLotSize)}
                            onChange={(event) => {
                              clearFieldError('fixedLotSize');
                              setFixedLotSize(event.target.value);
                            }}
                            placeholder={t.risk.placeholderFixedLot}
                          />
                        </div>
                      </div>
                    )}
                    {riskMode === 'FIXED_LOT' && fieldErrors.fixedLotSize && (
                      <p className="channels-field-error">{fieldErrors.fixedLotSize}</p>
                    )}

                    <div className="channels-percent-item">
                      <p className="channels-percent-label">{t.risk.maxSlPips.label}</p>
                      <div className={cn('channels-input', fieldErrors.maxSlPips && 'is-error')}>
                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                        <input
                          type="number"
                          value={maxSlPips}
                          min={maxSlPipsConstraint?.min}
                          max={maxSlPipsConstraint?.max ?? undefined}
                          step={maxSlPipsConstraint?.step ?? 0.01}
                          aria-invalid={Boolean(fieldErrors.maxSlPips)}
                          onChange={(event) => {
                            clearFieldError('maxSlPips');
                            setMaxSlPips(event.target.value);
                          }}
                          placeholder={t.risk.maxSlPips.placeholder}
                        />
                      </div>
                      <p>{t.risk.maxSlPips.description}</p>
                      {fieldErrors.maxSlPips && (
                        <p className="channels-field-error">{fieldErrors.maxSlPips}</p>
                      )}
                    </div>

                    <label className="channels-radio">
                      <input
                        type="checkbox"
                        checked={rejectIfTp1PipsLessThanSlPips}
                        onChange={(event) => {
                          clearFieldError('rejectIfTp1PipsLessThanSlPips');
                          setRejectIfTp1PipsLessThanSlPips(event.target.checked);
                        }}
                      />
                      <span>{t.risk.tp1VsSlGuard.label}</span>
                      <em>{t.risk.tp1VsSlGuard.description}</em>
                    </label>
                    {fieldErrors.rejectIfTp1PipsLessThanSlPips && (
                      <p className="channels-field-error">
                        {fieldErrors.rejectIfTp1PipsLessThanSlPips}
                      </p>
                    )}

                    {riskMode !== 'FIXED_LOT' && (
                      <>
                        <div className="channels-percent-item">
                          <p className="channels-percent-label">{t.risk.maxLots.label}</p>
                          <div className={cn('channels-input', fieldErrors.maxLots && 'is-error')}>
                            <i className="fa-solid fa-layer-group" aria-hidden="true" />
                            <input
                              type="number"
                              value={maxLots}
                              min={maxLotsConstraint?.min}
                              max={maxLotsConstraint?.max ?? undefined}
                              step={maxLotsConstraint?.step ?? 0.01}
                              aria-invalid={Boolean(fieldErrors.maxLots)}
                              onChange={(event) => {
                                clearFieldError('maxLots');
                                setMaxLots(event.target.value);
                              }}
                              placeholder={t.risk.maxLots.placeholder}
                            />
                          </div>
                          <p>{t.risk.maxLots.description}</p>
                          {fieldErrors.maxLots && (
                            <p className="channels-field-error">{fieldErrors.maxLots}</p>
                          )}
                        </div>

                        <label className="channels-radio">
                          <input
                            type="checkbox"
                            checked={minLotsOverride}
                            onChange={(event) => {
                              clearFieldError('minLotsOverride');
                              setMinLotsOverride(event.target.checked);
                            }}
                          />
                          <span>{t.risk.minLotsOverride.label}</span>
                          <em>{t.risk.minLotsOverride.description}</em>
                        </label>
                        {fieldErrors.minLotsOverride && (
                          <p className="channels-field-error">{fieldErrors.minLotsOverride}</p>
                        )}

                        <div className="channels-percent-item">
                          <p className="channels-percent-label">{t.risk.lotRoundingMode.label}</p>
                          <div
                            className={cn(
                              'channels-pill-row',
                              fieldErrors.lotRoundingMode && 'is-error'
                            )}
                          >
                            {lotRoundingModes.map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                className={cn(
                                  'channels-pill',
                                  lotRoundingMode === mode && 'is-active'
                                )}
                                onClick={() => {
                                  clearFieldError('lotRoundingMode');
                                  setLotRoundingMode(mode);
                                }}
                              >
                                {t.risk.lotRoundingMode.options[mode]}
                              </button>
                            ))}
                          </div>
                          <p>{t.risk.lotRoundingMode.description}</p>
                          {fieldErrors.lotRoundingMode && (
                            <p className="channels-field-error">{fieldErrors.lotRoundingMode}</p>
                          )}
                        </div>
                      </>
                    )}
                  </section>

                  <section
                    className={cn(
                      'channels-settings-section is-full',
                      (fieldErrors.allowExecutionWithoutSlTp ||
                        fieldErrors.allowProviderSlWidening ||
                        fieldErrors.allowForwardedSignals ||
                        fieldErrors.missingSlConfig) &&
                        'is-error'
                    )}
                  >
                    <h2>{t.groups.incompleteSignal.title}</h2>
                    <p>{t.groups.incompleteSignal.subtitle}</p>
                    <label className="channels-radio">
                      <input
                        type="checkbox"
                        checked={allowForwardedSignals}
                        onChange={(event) => {
                          clearFieldError('allowForwardedSignals');
                          setAllowForwardedSignals(event.target.checked);
                        }}
                      />
                      <span>{t.executionFlex.allowForwardedSignals.label}</span>
                      <em>{t.executionFlex.allowForwardedSignals.description}</em>
                    </label>
                    {fieldErrors.allowForwardedSignals && (
                      <p className="channels-field-error">{fieldErrors.allowForwardedSignals}</p>
                    )}

                    <label className="channels-radio">
                      <input
                        type="checkbox"
                      checked={allowExecutionWithoutSlTp}
                        onChange={(event) => {
                          clearFieldError('allowExecutionWithoutSlTp');
                          clearFieldError('missingSlConfig');
                          setAllowExecutionWithoutSlTp(event.target.checked);
                        }}
                      />
                      <span>{t.executionFlex.allowWithoutSlTp.label}</span>
                      <em>{t.executionFlex.allowWithoutSlTp.description}</em>
                    </label>
                    {fieldErrors.allowExecutionWithoutSlTp && (
                      <p className="channels-field-error">
                        {fieldErrors.allowExecutionWithoutSlTp}
                      </p>
                    )}

                    <label className="channels-radio">
                      <input
                        type="checkbox"
                        checked={allowProviderSlWidening}
                        onChange={(event) => {
                          clearFieldError('allowProviderSlWidening');
                          setAllowProviderSlWidening(event.target.checked);
                        }}
                      />
                      <span>{t.executionFlex.allowProviderSlWidening.label}</span>
                      <em>{t.executionFlex.allowProviderSlWidening.description}</em>
                    </label>
                    {fieldErrors.allowProviderSlWidening && (
                      <p className="channels-field-error">{fieldErrors.allowProviderSlWidening}</p>
                    )}

                    {allowExecutionWithoutSlTp && (
                      <div
                        className={cn(
                          'channels-percent-item',
                          fieldErrors.missingSlConfig && 'is-error'
                        )}
                      >
                        <p className="channels-percent-label">
                          {t.executionFlex.missingSl.pipsLabel}
                        </p>
                        <div className="channels-input">
                          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                          <input
                            type="number"
                            value={missingSlPips}
                            min={settingsMeta?.options?.constraints?.missingSlPips?.min ?? 0.01}
                            max={
                              settingsMeta?.options?.constraints?.missingSlPips?.max ?? undefined
                            }
                            step={settingsMeta?.options?.constraints?.missingSlPips?.step ?? 0.01}
                            aria-invalid={Boolean(fieldErrors.missingSlConfig)}
                            onChange={(event) => {
                              clearFieldError('missingSlConfig');
                              setMissingSlPips(event.target.value);
                            }}
                            placeholder={t.executionFlex.missingSl.pipsPlaceholder}
                          />
                        </div>
                        <button
                          type="button"
                          className="channels-pill"
                          onClick={() => setMissingSlOverridesOpen(true)}
                        >
                          {t.executionFlex.missingSl.overridesButton}
                        </button>
                        <p>{t.executionFlex.missingSl.description}</p>
                        {fieldErrors.missingSlConfig && (
                          <p className="channels-field-error">{fieldErrors.missingSlConfig}</p>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="channels-settings-section is-full">
                    <h2>{t.executionFlex.limitOrderHandling.title}</h2>
                    <p>{t.executionFlex.limitOrderHandling.subtitle}</p>
                    <div className="channels-settings-subsection">
                      <label className="channels-radio">
                        <input
                          type="checkbox"
                          checked={signalPendingOrderHandlingEnabled}
                          onChange={(event) => {
                            clearFieldError('signalPendingOrderHandlingEnabled');
                            clearFieldError('limitOrderExpirationMinutes');
                            setSignalPendingOrderHandlingEnabled(event.target.checked);
                          }}
                        />
                        <span>{t.executionFlex.limitOrderHandling.enabled.label}</span>
                        <em>{t.executionFlex.limitOrderHandling.enabled.description}</em>
                      </label>
                      {fieldErrors.signalPendingOrderHandlingEnabled && (
                        <p className="channels-field-error">
                          {fieldErrors.signalPendingOrderHandlingEnabled}
                        </p>
                      )}

                      {signalPendingOrderHandlingEnabled && (
                        <div className="channels-percent-item">
                          <p className="channels-percent-label">
                            {t.executionFlex.limitOrderHandling.limitExpirationLabel}
                          </p>
                          <div
                            className={cn(
                              'channels-input',
                              fieldErrors.limitOrderExpirationMinutes && 'is-error'
                            )}
                          >
                            <i className="fa-regular fa-clock" aria-hidden="true" />
                            <input
                              type="number"
                              value={limitOrderExpirationMinutes}
                              min={limitOrderExpirationConstraint?.min ?? 1}
                              max={limitOrderExpirationConstraint?.max ?? undefined}
                              step={limitOrderExpirationConstraint?.step ?? 1}
                              aria-invalid={Boolean(fieldErrors.limitOrderExpirationMinutes)}
                              onChange={(event) => {
                                clearFieldError('limitOrderExpirationMinutes');
                                setLimitOrderExpirationMinutes(event.target.value);
                              }}
                              placeholder={t.executionFlex.limitOrderHandling.expirationPlaceholder}
                            />
                          </div>
                          <p>{t.executionFlex.limitOrderHandling.expirationDescription}</p>
                          {fieldErrors.limitOrderExpirationMinutes && (
                            <p className="channels-field-error">
                              {fieldErrors.limitOrderExpirationMinutes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="channels-settings-subsection">
                      <h3>{t.executionFlex.marketEntryTolerance.sectionTitle}</h3>
                      <div className="channels-percent-item">
                        <p className="channels-percent-label">
                          {t.executionFlex.marketEntryTolerance.modeLabel}
                        </p>
                        <div
                          className={cn(
                            'channels-pill-row',
                            fieldErrors.marketEntryToleranceMode && 'is-error'
                          )}
                        >
                          {marketEntryToleranceModes.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className={cn(
                                'channels-pill',
                                marketEntryToleranceMode === mode && 'is-active'
                              )}
                              onClick={() => {
                                clearFieldError('marketEntryToleranceMode');
                                clearFieldError('marketEntryTolerancePips');
                                setMarketEntryToleranceMode(mode);
                              }}
                            >
                              {t.executionFlex.marketEntryTolerance.options[mode]}
                            </button>
                          ))}
                        </div>
                        <p>{t.executionFlex.marketEntryTolerance.description}</p>
                        {fieldErrors.marketEntryToleranceMode && (
                          <p className="channels-field-error">
                            {fieldErrors.marketEntryToleranceMode}
                          </p>
                        )}

                        {marketEntryToleranceMode === 'PIPS' && (
                          <div className="channels-percent-item">
                            <p className="channels-percent-label">
                              {t.executionFlex.marketEntryTolerance.pipsLabel}
                            </p>
                            <div
                              className={cn(
                                'channels-input',
                                fieldErrors.marketEntryTolerancePips && 'is-error'
                              )}
                            >
                              <i className="fa-solid fa-ruler-horizontal" aria-hidden="true" />
                              <input
                                type="number"
                                value={marketEntryTolerancePips}
                                min={marketEntryTolerancePipsConstraint?.min}
                                max={marketEntryTolerancePipsConstraint?.max ?? undefined}
                                step={marketEntryTolerancePipsConstraint?.step ?? 0.01}
                                onChange={(event) => {
                                  clearFieldError('marketEntryTolerancePips');
                                  setMarketEntryTolerancePips(event.target.value);
                                }}
                                placeholder={t.executionFlex.marketEntryTolerance.pipsPlaceholder}
                              />
                            </div>
                          </div>
                        )}
                        {marketEntryToleranceMode === 'PIPS' &&
                          fieldErrors.marketEntryTolerancePips && (
                            <p className="channels-field-error">
                              {fieldErrors.marketEntryTolerancePips}
                            </p>
                          )}
                      </div>
                    </div>
                  </section>

                  <section className="channels-settings-section is-full">
                    <h2>{t.groups.management.title}</h2>
                    <p>{t.groups.management.subtitle}</p>

                    <div className="channels-settings-subsection">
                      <h3>{t.breakEven.title}</h3>
                      <p>{t.breakEven.subtitle}</p>
                      <label className="channels-radio">
                        <input
                          type="checkbox"
                          name="break-even"
                          checked={breakEvenEnabled}
                          disabled={trailingTpLevelsSelected}
                          onChange={(event) => {
                            clearFieldError('breakEvenTrigger');
                            clearFieldError('breakEvenTpTarget');
                            clearFieldError('breakEvenProfitLockPips');
                            setBreakEvenEnabled(event.target.checked);
                          }}
                        />
                        <span>{t.breakEven.enabled.label}</span>
                        <em>{t.breakEven.enabled.description}</em>
                      </label>
                      {trailingTpLevelsSelected ? (
                        <p>{t.breakEven.disabledForTrailingLevels}</p>
                      ) : breakEvenEnabled ? (
                        <>
                          <p className="channels-percent-label">{t.breakEven.offset.label}</p>
                          <p className="channels-percent-label">{t.breakEven.offset.valueLabel}</p>
                          <div
                            className={cn(
                              'channels-input',
                              fieldErrors.breakEvenProfitLockPips && 'is-error'
                            )}
                          >
                            <i className="fa-solid fa-arrows-left-right" aria-hidden="true" />
                            <input
                              type="number"
                              value={breakEvenProfitLockPips}
                              min={0}
                              step={0.1}
                              aria-invalid={Boolean(fieldErrors.breakEvenProfitLockPips)}
                              onChange={(event) => {
                                clearFieldError('breakEvenProfitLockPips');
                                setBreakEvenProfitLockPips(event.target.value);
                              }}
                              placeholder={t.breakEven.offset.placeholder}
                            />
                          </div>
                          <p>{t.breakEven.offset.description}</p>
                          {fieldErrors.breakEvenProfitLockPips && (
                            <p className="channels-field-error">
                              {fieldErrors.breakEvenProfitLockPips}
                            </p>
                          )}
                          <label className="channels-radio">
                            <input
                              type="radio"
                              name="break-even-mode"
                              checked={breakEvenMode === 'TP_HIT'}
                              onChange={() => {
                                clearFieldError('breakEvenTrigger');
                                clearFieldError('breakEvenTpTarget');
                                setBreakEvenMode('TP_HIT');
                              }}
                            />
                            <span>{t.breakEven.tpHit.label}</span>
                            <em>{t.breakEven.tpHit.description}</em>
                          </label>
                          {breakEvenMode === 'TP_HIT' && (
                            <>
                              <p className="channels-percent-label">
                                {t.breakEven.tpHit.targetLabel}
                              </p>
                              <div
                                className={cn(
                                  'channels-pill-row',
                                  fieldErrors.breakEvenTpTarget && 'is-error'
                                )}
                              >
                                {tpTargets.slice(0, 6).map((target) => (
                                  <button
                                    key={target}
                                    type="button"
                                    className={cn(
                                      'channels-pill',
                                      breakEvenTpTarget === target && 'is-active'
                                    )}
                                    onClick={() => {
                                      clearFieldError('breakEvenTpTarget');
                                      setBreakEvenTpTarget(target);
                                    }}
                                  >
                                    {target}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                          {breakEvenMode === 'TP_HIT' && fieldErrors.breakEvenTpTarget && (
                            <p className="channels-field-error">{fieldErrors.breakEvenTpTarget}</p>
                          )}
                          <label className="channels-radio">
                            <input
                              type="radio"
                              name="break-even-mode"
                              checked={breakEvenMode === 'FIXED_PIPS'}
                              onChange={() => {
                                clearFieldError('breakEvenTrigger');
                                clearFieldError('breakEvenTpTarget');
                                setBreakEvenMode('FIXED_PIPS');
                              }}
                            />
                            <span>{t.breakEven.fixedPips.label}</span>
                            <em>{t.breakEven.fixedPips.description}</em>
                          </label>
                          {breakEvenMode === 'FIXED_PIPS' && (
                            <div className="channels-percent-item">
                              <p className="channels-percent-label">
                                {t.breakEven.fixedPips.valueLabel}
                              </p>
                              <div
                                className={cn(
                                  'channels-input',
                                  fieldErrors.breakEvenTrigger && 'is-error'
                                )}
                              >
                                <i className="fa-solid fa-dot-circle" aria-hidden="true" />
                                <input
                                  type="number"
                                  value={breakEvenTrigger}
                                  aria-invalid={Boolean(fieldErrors.breakEvenTrigger)}
                                  onChange={(event) => {
                                    clearFieldError('breakEvenTrigger');
                                    setBreakEvenTrigger(event.target.value);
                                  }}
                                  placeholder={t.breakEven.fixedPips.placeholder}
                                />
                              </div>
                            </div>
                          )}
                          {breakEvenMode === 'FIXED_PIPS' && fieldErrors.breakEvenTrigger && (
                            <p className="channels-field-error">{fieldErrors.breakEvenTrigger}</p>
                          )}
                        </>
                      ) : (
                        <p>{t.breakEven.disabledHint}</p>
                      )}
                    </div>

                    <div className="channels-settings-subsection">
                      <h3>{t.trailing.title}</h3>
                      <p>{t.trailing.subtitle}</p>
                      <label className="channels-radio">
                        <input
                          type="checkbox"
                          name="trailing-stop"
                          checked={trailingStopEnabled}
                          onChange={(event) => {
                            clearFieldError('trailingStopStepTriggerPips');
                            clearFieldError('trailingStopStepMovePips');
                            const nextEnabled = event.target.checked;
                            setTrailingStopEnabled(nextEnabled);
                            if (nextEnabled && trailingStopMode === 'TP_LEVELS') {
                              clearFieldError('breakEvenTrigger');
                              clearFieldError('breakEvenTpTarget');
                              setBreakEvenEnabled(false);
                            }
                          }}
                        />
                        <span>{t.trailing.enabled.label}</span>
                        <em>{t.trailing.enabled.description}</em>
                      </label>
                      {trailingStopEnabled ? (
                        <>
                          <label className="channels-radio">
                            <input
                              type="radio"
                              name="trailing-stop-mode"
                              checked={trailingStopMode === 'STEP_PIPS'}
                              onChange={() => {
                                clearFieldError('trailingStopMode');
                                clearFieldError('trailingStopStepTriggerPips');
                                clearFieldError('trailingStopStepMovePips');
                                setTrailingStopMode('STEP_PIPS');
                              }}
                            />
                            <span>{t.trailing.modes.step.label}</span>
                            <em>{t.trailing.modes.step.description}</em>
                          </label>
                          <label className="channels-radio">
                            <input
                              type="radio"
                              name="trailing-stop-mode"
                              checked={trailingStopMode === 'TP_LEVELS'}
                              onChange={() => {
                                clearFieldError('trailingStopMode');
                                clearFieldError('trailingStopStepTriggerPips');
                                clearFieldError('trailingStopStepMovePips');
                                clearFieldError('breakEvenTrigger');
                                clearFieldError('breakEvenTpTarget');
                                setTrailingStopMode('TP_LEVELS');
                                setBreakEvenEnabled(false);
                              }}
                            />
                            <span>{t.trailing.modes.tpLevels.label}</span>
                            <em>{t.trailing.modes.tpLevels.description}</em>
                          </label>
                          {trailingStopMode === 'TP_LEVELS' ? (
                            <p>{t.trailing.modes.tpLevels.hint}</p>
                          ) : (
                            <>
                              <p className="channels-percent-label">
                                {t.trailing.step.triggerLabel}
                              </p>
                              <div
                                className={cn(
                                  'channels-input',
                                  fieldErrors.trailingStopStepTriggerPips && 'is-error'
                                )}
                              >
                                <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
                                <input
                                  type="number"
                                  value={trailingStopStepTriggerPips}
                                  min={0}
                                  step={0.1}
                                  aria-invalid={Boolean(fieldErrors.trailingStopStepTriggerPips)}
                                  onChange={(event) => {
                                    clearFieldError('trailingStopStepTriggerPips');
                                    setTrailingStopStepTriggerPips(event.target.value);
                                  }}
                                  placeholder={t.trailing.step.triggerPlaceholder}
                                />
                              </div>
                              {fieldErrors.trailingStopStepTriggerPips && (
                                <p className="channels-field-error">
                                  {fieldErrors.trailingStopStepTriggerPips}
                                </p>
                              )}
                              <p className="channels-percent-label">{t.trailing.step.moveLabel}</p>
                              <div
                                className={cn(
                                  'channels-input',
                                  fieldErrors.trailingStopStepMovePips && 'is-error'
                                )}
                              >
                                <i className="fa-solid fa-route" aria-hidden="true" />
                                <input
                                  type="number"
                                  value={trailingStopStepMovePips}
                                  min={0}
                                  step={0.1}
                                  aria-invalid={Boolean(fieldErrors.trailingStopStepMovePips)}
                                  onChange={(event) => {
                                    clearFieldError('trailingStopStepMovePips');
                                    setTrailingStopStepMovePips(event.target.value);
                                  }}
                                  placeholder={t.trailing.step.movePlaceholder}
                                />
                              </div>
                              {fieldErrors.trailingStopStepMovePips && (
                                <p className="channels-field-error">
                                  {fieldErrors.trailingStopStepMovePips}
                                </p>
                              )}
                            </>
                          )}
                          <p>{t.trailing.enabledHint}</p>
                        </>
                      ) : (
                        <p>{t.trailing.disabledHint}</p>
                      )}
                    </div>

                    <div className="channels-settings-subsection">
                      <h3>{t.tpExecution.title}</h3>
                      <p>{t.tpExecution.subtitle}</p>
                      <label className="channels-radio">
                        <input
                          type="radio"
                          name="tp-mode"
                          checked={tpExecutionMode === 'ALL'}
                          onChange={() => {
                            clearFieldError('tpExecutionTargets');
                            clearFieldError('customTpPercentages');
                            setTpExecutionMode('ALL');
                          }}
                        />
                        <span>{t.tpExecution.all}</span>
                        <em>{t.tpExecution.allDescription}</em>
                      </label>
                      <label className="channels-radio">
                        <input
                          type="radio"
                          name="tp-mode"
                          checked={tpExecutionMode === 'SPECIFIC'}
                          onChange={() => {
                            clearFieldError('tpExecutionTargets');
                            clearFieldError('customTpPercentages');
                            setTpExecutionMode('SPECIFIC');
                            setCustomPercentages((current) =>
                              alignCustomPercentagesToTargets(current, tpExecutionTargets)
                            );
                          }}
                        />
                        <span>{t.tpExecution.specific}</span>
                        <em>{t.tpExecution.specificDescription}</em>
                      </label>
                      {tpExecutionMode === 'SPECIFIC' && (
                        <>
                          <p className="channels-percent-label">{t.tpExecution.targetsLabel}</p>
                          <div
                            className={cn(
                              'channels-pill-row',
                              fieldErrors.tpExecutionTargets && 'is-error'
                            )}
                          >
                            {tpTargets.map((target) => (
                              <button
                                key={target}
                                type="button"
                                className={cn(
                                  'channels-pill',
                                  selectedTpTargets.has(target.trim().toUpperCase()) && 'is-active'
                                )}
                                onClick={() => toggleTpExecutionTarget(target)}
                              >
                                {target}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {tpExecutionMode === 'SPECIFIC' && fieldErrors.tpExecutionTargets && (
                        <p className="channels-field-error">{fieldErrors.tpExecutionTargets}</p>
                      )}
                    </div>

                    <div className="channels-settings-subsection">
                      <h3>{t.customPercentages.title}</h3>
                      {tpExecutionMode === 'SPECIFIC' ? (
                        <>
                          <p className={cn('channels-percent-total', 'is-warning')}>
                            {t.customPercentages.note.replace(
                              '{target}',
                              String(customPercentTarget)
                            )}
                          </p>
                          {customPercentageKeys.map((key) => (
                            <div key={key} className="channels-percent-item">
                              <p className="channels-percent-label">{key}</p>
                              <div
                                className={cn(
                                  'channels-input channels-input--percent',
                                  fieldErrors.customTpPercentages && 'is-error'
                                )}
                              >
                                <i className="fa-solid fa-percent" aria-hidden="true" />
                                <input
                                  type="number"
                                  value={customPercentages[key] ?? ''}
                                  aria-invalid={Boolean(fieldErrors.customTpPercentages)}
                                  onChange={(event) => {
                                    clearFieldError('customTpPercentages');
                                    setCustomPercentages((current) =>
                                      updateTpPercentageDraft(current, key, event.target.value)
                                    );
                                  }}
                                />
                                <span className="channels-input-suffix">%</span>
                              </div>
                            </div>
                          ))}
                          {!customPercentValid && (
                            <p className={cn('channels-percent-total', 'is-warning')}>
                              {t.customPercentages.total.replace(
                                '{total}',
                                String(customPercentTotal)
                              )}
                            </p>
                          )}
                          {fieldErrors.customTpPercentages && (
                            <p className="channels-field-error">
                              {fieldErrors.customTpPercentages}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>{t.customPercentages.disabledHint}</p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="channels-settings-footer">
                  <button
                    type="button"
                    className="channels-primary"
                    onClick={handleSave}
                    disabled={saving || !isDirty || subscriptionStatus.subscriptionPaused}
                  >
                    {saving ? t.buttons.saving : t.buttons.save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {missingSlOverridesOpen && (
        <div
          className="dashboard-sheet-backdrop channels-modal-backdrop"
          onClick={() => setMissingSlOverridesOpen(false)}
        >
          <div className="channels-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="channels-sheet-header">
              <h2>{t.executionFlex.missingSl.overridesTitle}</h2>
              <button type="button" onClick={() => setMissingSlOverridesOpen(false)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="dashboard-search-box">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                className="dashboard-search-input"
                placeholder={t.symbols.searchPlaceholder}
                value={missingSlSymbolSearch}
                onChange={(event) => setMissingSlSymbolSearch(event.target.value)}
              />
            </div>
            <div className="channels-settings-block">
              {missingSlOverrides.map((override, index) => {
                const selected = symbolMetaMap.get(normalizeSymbolKey(override.symbol));
                return (
                  <div key={`missing-sl-override-${index}`} className="channels-stepper-row">
                    <div className="channels-stepper-label">
                      <div className="channels-sheet-list">
                        {filteredMissingSlSymbols.map((symbol) => (
                          <button
                            key={`${index}-${symbol.symbol}`}
                            type="button"
                            className={cn(
                              'channels-sheet-row',
                              normalizeSymbolKey(override.symbol) ===
                                normalizeSymbolKey(symbol.symbol) && 'is-active'
                            )}
                            onClick={() => {
                              clearFieldError('missingSlConfig');
                              updateMissingSlOverride(index, { symbol: symbol.symbol });
                            }}
                          >
                            <div className="channels-row-info">
                              <SymbolPairBadge
                                symbol={symbol.symbol}
                                base={symbol.base}
                                quote={symbol.quote}
                                baseCountry={symbol.baseCountry}
                                quoteCountry={symbol.quoteCountry}
                                size="sm"
                                className="channels-sheet-symbol-badge"
                              />
                              <div>
                                <p className="channels-row-title">{symbol.display}</p>
                                <p className="channels-row-subtitle">{symbol.symbol}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      {selected && (
                        <span className="channels-symbol-chip">
                          <SymbolPairBadge
                            symbol={selected.symbol}
                            base={selected.base}
                            quote={selected.quote}
                            baseCountry={selected.baseCountry}
                            quoteCountry={selected.quoteCountry}
                            size="sm"
                          />
                          <span className="channels-symbol-chip-label">{selected.display}</span>
                        </span>
                      )}
                    </div>
                    <div className="channels-stepper-control tragram-ltr-content">
                      <input
                        type="number"
                        value={override.pips}
                        min={settingsMeta?.options?.constraints?.missingSlPips?.min ?? 0.01}
                        step={settingsMeta?.options?.constraints?.missingSlPips?.step ?? 0.01}
                        onChange={(event) => {
                          clearFieldError('missingSlConfig');
                          updateMissingSlOverride(index, { pips: event.target.value });
                        }}
                        placeholder={t.executionFlex.missingSl.overridePlaceholder}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          clearFieldError('missingSlConfig');
                          removeMissingSlOverride(index);
                        }}
                      >
                        -
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="channels-pill"
              onClick={() => {
                clearFieldError('missingSlConfig');
                addMissingSlOverride();
              }}
            >
              {t.executionFlex.missingSl.addOverride}
            </button>
            <button
              type="button"
              className="channels-primary"
              onClick={() => setMissingSlOverridesOpen(false)}
            >
              {t.buttons.select}
            </button>
          </div>
        </div>
      )}

      {symbolsSheetOpen && (
        <div
          className="dashboard-sheet-backdrop channels-modal-backdrop"
          onClick={() => setSymbolsSheetOpen(false)}
        >
          <div className="channels-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-sheet-handle" aria-hidden="true" />
            <div className="channels-sheet-header">
              <h2>{t.symbols.selectTitle}</h2>
              <button type="button" onClick={() => setSymbolsSheetOpen(false)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="dashboard-search-box">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                className="dashboard-search-input"
                placeholder={t.symbols.searchPlaceholder}
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
              />
            </div>
            <div className="channels-sheet-list">
              {filteredSymbols.length === 0 && (
                <p className="channels-sheet-empty">
                  {symbolsCatalog.length === 0
                    ? (symbolsCatalogHint ?? t.symbols.catalogEmpty)
                    : t.symbols.empty}
                </p>
              )}
              {filteredSymbols.map((symbol) => {
                const isChecked = selectedSymbolKeys.has(normalizeSymbolKey(symbol.symbol));
                const isSelectable = symbol.selectable || isChecked;
                return (
                  <button
                    key={symbol.symbol}
                    type="button"
                    className={cn(
                      'channels-sheet-row',
                      isChecked && 'is-active',
                      !isSelectable && 'is-disabled'
                    )}
                    disabled={!isSelectable}
                    onClick={() => toggleSymbol(symbol.symbol)}
                  >
                    <div className="channels-row-info">
                      <div className="channels-sheet-flags" aria-hidden="true">
                        <SymbolPairBadge
                          symbol={symbol.symbol}
                          base={symbol.base}
                          quote={symbol.quote}
                          baseCountry={symbol.baseCountry}
                          quoteCountry={symbol.quoteCountry}
                          size="sm"
                          className="channels-sheet-symbol-badge"
                        />
                      </div>
                      <div>
                        <p className="channels-row-title">
                          {symbol.displayName || symbol.display}
                          {!symbol.selectable && (
                            <small>
                              {symbol.tradeMode === 'DISABLED'
                                ? t.symbols.disabled
                                : symbol.tradeMode === 'CLOSE_ONLY'
                                  ? t.symbols.closeOnly
                                  : t.symbols.capabilityUnknown}
                            </small>
                          )}
                        </p>
                        <p className="channels-row-subtitle">{symbol.symbol}</p>
                      </div>
                    </div>
                    <span className={cn('channels-check', isChecked && 'is-active')}>
                      <i className="fa-solid fa-check" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="channels-primary" onClick={applySymbols}>
              {t.buttons.select}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
