export type EconomicImpact = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export type EconomicCalendarEvent = {
  id: string;
  name: string;
  currency: string | null;
  country?: string | null;
  impact: EconomicImpact;
  eventAt: string;
  actualText: string | null;
  forecastText: string | null;
  previousText: string | null;
  isInForexScope: boolean;
  releaseStatus?: string | null;
};

export type EconomicNewsRule = {
  id: string;
  policyId?: string;
  currency: string | null;
  impact: string | null;
  decision: 'ALLOW' | 'BLOCK';
  preEventMinutes: number | null;
  postEventMinutes: number | null;
  enabled: boolean;
  priority: number;
};

export type EconomicNewsPolicy = {
  id: string;
  mtAccountId?: string | null;
  enabled: boolean;
  blockedImpacts: EconomicImpact[];
  forexCurrencies: string[];
  defaultPreEventMinutes: number;
  defaultPostEventMinutes: number;
  version: number;
  staleAction: 'ALLOW' | 'BLOCK';
  rules?: EconomicNewsRule[];
  eventOverrides?: Array<{ eventId: string; decision: 'ALLOW' | 'BLOCK'; reason: string; preEventMinutes?: number | null; postEventMinutes?: number | null }>;
};

export type EconomicNewsAccount = {
  id: string;
  accountName?: string | null;
  accountNumber?: string | null;
  platform?: string;
  connectionStatus?: string;
  override: EconomicNewsPolicy | null;
};

export type EconomicCalendarFilters = {
  search: string;
  currencies: string[];
  impacts: string[];
};

export type EconomicNewsPolicyDraft = {
  enabled: boolean;
  blockedImpacts: EconomicImpact[];
  defaultPreEventMinutes: number;
  defaultPostEventMinutes: number;
  forexCurrencies: string[];
  staleAction: 'ALLOW' | 'BLOCK';
};
