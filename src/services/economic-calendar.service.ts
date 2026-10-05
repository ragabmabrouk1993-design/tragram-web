import {
  deleteApiEconomicCalendarSettingsRulesByRuleId,
  getApiEconomicCalendarBootstrap,
  getApiEconomicCalendarEvents,
  getApiEconomicCalendarGuard,
  getApiEconomicCalendarSettings,
  patchApiEconomicCalendarSettingsAccountsBatch,
  patchApiEconomicCalendarSettingsDefault,
  patchApiEconomicCalendarSettingsAccountsByAccountId,
  patchApiEconomicCalendarSettingsRulesByRuleId,
  postApiEconomicCalendarSettingsAccountsByAccountIdReset,
  postApiEconomicCalendarSettingsAccountsByAccountIdRules,
  postApiEconomicCalendarSettingsRules,
  putApiEconomicCalendarSettingsAccountsByAccountIdEventOverrides,
  putApiEconomicCalendarSettingsEventOverrides,
} from '@/lib/api-client';
import type {
  EconomicCalendarEvent as ApiEconomicCalendarEvent,
  EconomicNewsAccount as ApiEconomicNewsAccount,
  EconomicNewsEventOverrideInput,
  EconomicNewsExpectedVersion,
  EconomicNewsPolicy as ApiEconomicNewsPolicy,
  EconomicNewsPolicyPatch,
  EconomicNewsRuleInput,
  EconomicNewsSettingsSnapshot as ApiEconomicNewsSettingsSnapshot,
  GetApiEconomicCalendarEventsData,
} from '@/lib/api-client';
import type { EconomicCalendarEvent, EconomicNewsAccount, EconomicNewsPolicy, EconomicNewsRule } from '@/features/economic-calendar/types';
import { initApiClient } from '@/lib/api-client-setup';

initApiClient();

export type CalendarMeta = {
  provider: string;
  health: string;
  lastSuccessfulFetchAt: string | null;
  dataDelayed: boolean;
};

export type CalendarData = { items: EconomicCalendarEvent[]; meta: CalendarMeta; pagination?: unknown; revision?: string };
export type GuardData = { enabled: boolean; newSignalsBlocked: boolean; policyVersion?: number; blockedUntilUtc?: string | null; code?: string | null; accounts?: Array<{ mtAccountId: string; enabled: boolean; newSignalsBlocked: boolean; policyVersion: number; blockedUntilUtc?: string | null; code?: string | null }>; revision?: string };
export type SettingsData = { defaultPolicy: EconomicNewsPolicy | null; accounts: EconomicNewsAccount[]; revision?: string };
export type EconomicNewsBootstrapState = { calendar: CalendarData; guard: GuardData; settings: SettingsData };
export type EconomicNewsMutationResult<T> = { value: T; settings: SettingsData | null };

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const toCalendarEvent = (event: ApiEconomicCalendarEvent): EconomicCalendarEvent => ({
  id: event.id,
  name: event.name,
  currency: event.currency ?? null,
  country: event.country ?? null,
  impact: event.impact,
  eventAt: iso(event.eventAt) ?? new Date(0).toISOString(),
  actualText: event.actualText ?? null,
  forecastText: event.forecastText ?? null,
  previousText: event.previousText ?? null,
  isInForexScope: event.isInForexScope,
  releaseStatus: event.releaseStatus ?? null,
});

const toRule = (rule: NonNullable<ApiEconomicNewsPolicy['rules']>[number]): EconomicNewsRule => ({
  id: rule.id,
  policyId: (rule as NonNullable<ApiEconomicNewsPolicy['rules']>[number] & { policyId?: string }).policyId,
  currency: rule.currency ?? null,
  impact: rule.impact ?? null,
  decision: rule.decision,
  preEventMinutes: rule.preEventMinutes ?? null,
  postEventMinutes: rule.postEventMinutes ?? null,
  enabled: rule.enabled ?? true,
  priority: rule.priority ?? 0,
});

const toPolicy = (policy: ApiEconomicNewsPolicy | null | undefined): EconomicNewsPolicy | null => {
  if (!policy) return null;
  return {
    id: policy.id,
    mtAccountId: policy.mtAccountId ?? null,
    enabled: policy.enabled,
    blockedImpacts: [...policy.blockedImpacts],
    forexCurrencies: [...policy.forexCurrencies],
    defaultPreEventMinutes: policy.defaultPreEventMinutes,
    defaultPostEventMinutes: policy.defaultPostEventMinutes,
    version: policy.version,
    staleAction: policy.staleAction,
    rules: policy.rules?.map(toRule),
    eventOverrides: policy.eventOverrides?.map((override) => ({
      eventId: override.eventId,
      decision: override.decision,
      reason: override.reason,
      preEventMinutes: override.preEventMinutes ?? null,
      postEventMinutes: override.postEventMinutes ?? null,
    })),
  };
};

const toAccount = (account: ApiEconomicNewsAccount): EconomicNewsAccount => ({
  id: account.id,
  accountName: account.accountName ?? null,
  accountNumber: account.accountNumber ?? null,
  platform: account.platform,
  connectionStatus: account.connectionStatus ?? undefined,
  override: toPolicy(account.override),
});

const toSettings = (data: { defaultPolicy?: ApiEconomicNewsPolicy | null; accounts?: ApiEconomicNewsAccount[]; revision?: string } | null | undefined): SettingsData => ({
  defaultPolicy: toPolicy(data?.defaultPolicy),
  accounts: data?.accounts?.map(toAccount) ?? [],
  revision: data?.revision,
});

const toGuard = (data: { enabled?: boolean; newSignalsBlocked?: boolean; policyVersion?: number; blockedUntilUtc?: Date | string | null; code?: string | null; accounts?: Array<{ mtAccountId: string; enabled: boolean; newSignalsBlocked: boolean; policyVersion: number; blockedUntilUtc?: Date | string | null; code?: string | null }>; revision?: string } | null | undefined): GuardData => ({
  enabled: data?.enabled ?? false,
  newSignalsBlocked: data?.newSignalsBlocked ?? false,
  policyVersion: data?.policyVersion ?? 0,
  blockedUntilUtc: iso(data?.blockedUntilUtc),
  code: data?.code ?? null,
  accounts: data?.accounts?.map((account) => ({ ...account, blockedUntilUtc: iso(account.blockedUntilUtc) })) ?? [],
  revision: data?.revision,
});

const toCalendar = (data: { items?: ApiEconomicCalendarEvent[]; pagination?: unknown; meta?: { provider?: string; health?: string; lastSuccessfulFetchAt?: Date | string | null; dataDelayed?: boolean }; revision?: string } | null | undefined): CalendarData => ({
  items: data?.items?.map(toCalendarEvent) ?? [],
  pagination: data?.pagination,
  revision: data?.revision,
  meta: {
    provider: data?.meta?.provider ?? 'forex-factory',
    health: data?.meta?.health ?? 'STALE',
    lastSuccessfulFetchAt: iso(data?.meta?.lastSuccessfulFetchAt),
    dataDelayed: data?.meta?.dataDelayed ?? true,
  },
});

export async function fetchEconomicCalendar(query?: GetApiEconomicCalendarEventsData['query']): Promise<CalendarData> {
  const response = await getApiEconomicCalendarEvents({ query });
  return toCalendar(response.data?.data);
}

export async function fetchEconomicCalendarGuard(): Promise<GuardData> {
  const response = await getApiEconomicCalendarGuard();
  return toGuard(response.data?.data);
}

export async function fetchEconomicNewsSettings(): Promise<SettingsData> {
  const response = await getApiEconomicCalendarSettings();
  return toSettings(response.data?.data);
}

export async function fetchEconomicNewsBootstrap(query: NonNullable<Parameters<typeof getApiEconomicCalendarBootstrap>[0]>['query']): Promise<EconomicNewsBootstrapState> {
  const response = await getApiEconomicCalendarBootstrap({ query });
  const data = response.data?.data;
  return { calendar: toCalendar(data?.calendar), guard: toGuard(data?.guard), settings: toSettings(data?.settings as ApiEconomicNewsSettingsSnapshot | undefined) };
}

export async function updateEconomicNewsDefault(input: EconomicNewsPolicyPatch): Promise<EconomicNewsMutationResult<EconomicNewsPolicy | null>> {
  const response = await patchApiEconomicCalendarSettingsDefault({ body: input });
  return { value: toPolicy(response.data?.data), settings: toSettings(response.data?.settings) };
}

export async function updateEconomicNewsAccount(accountId: string, input: EconomicNewsPolicyPatch): Promise<EconomicNewsMutationResult<EconomicNewsPolicy | null>> {
  const response = await patchApiEconomicCalendarSettingsAccountsByAccountId({ path: { accountId }, body: input });
  return { value: toPolicy(response.data?.data), settings: toSettings(response.data?.settings) };
}

export async function updateEconomicNewsAccountsBatch(accountIds: string[], expectedVersions: Record<string, number>, patch: Omit<EconomicNewsPolicyPatch, 'expectedVersion'>) {
  const response = await patchApiEconomicCalendarSettingsAccountsBatch({ body: { accountIds, expectedVersions, patch } });
  return { accounts: response.data?.data?.accounts?.map(toPolicy).filter((policy): policy is EconomicNewsPolicy => Boolean(policy)) ?? [], settings: toSettings(response.data?.settings) };
}

export async function resetEconomicNewsAccount(accountId: string, expectedVersion: number): Promise<EconomicNewsMutationResult<{ inherited: boolean }>> {
  const body: EconomicNewsExpectedVersion = { expectedVersion };
  const response = await postApiEconomicCalendarSettingsAccountsByAccountIdReset({ path: { accountId }, body });
  return { value: response.data?.data ?? { inherited: true }, settings: toSettings(response.data?.settings) };
}

export async function createEconomicNewsRule(input: EconomicNewsRuleInput, accountId?: string): Promise<EconomicNewsMutationResult<EconomicNewsRule | null>> {
  const response = accountId
    ? await postApiEconomicCalendarSettingsAccountsByAccountIdRules({ path: { accountId }, body: input })
    : await postApiEconomicCalendarSettingsRules({ body: input });
  const rule = response.data?.data;
  return { value: rule ? toRule(rule) : null, settings: toSettings(response.data?.settings) };
}

export async function archiveEconomicNewsRule(ruleId: string, expectedVersion: number) {
  const response = await deleteApiEconomicCalendarSettingsRulesByRuleId({ path: { ruleId }, body: { expectedVersion } });
  return { value: response.data?.data ?? { archived: true }, settings: toSettings(response.data?.settings) };
}

export async function updateEconomicNewsRule(ruleId: string, input: EconomicNewsRuleInput): Promise<EconomicNewsMutationResult<EconomicNewsRule | null>> {
  const response = await patchApiEconomicCalendarSettingsRulesByRuleId({ path: { ruleId }, body: input });
  const rule = response.data?.data;
  return { value: rule ? toRule(rule) : null, settings: toSettings(response.data?.settings) };
}

export async function saveEconomicNewsEventOverride(input: EconomicNewsEventOverrideInput, accountId?: string) {
  const response = accountId
    ? await putApiEconomicCalendarSettingsAccountsByAccountIdEventOverrides({ path: { accountId }, body: input })
    : await putApiEconomicCalendarSettingsEventOverrides({ body: input });
  return { value: response.data?.data ?? null, settings: toSettings(response.data?.settings) };
}
