"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { EconomicCalendarTabs } from "@/components/economic-calendar/economic-calendar-tabs";
import { CalendarEventCard } from "@/components/economic-calendar/calendar-event-card";
import { CalendarEventTable } from "@/components/economic-calendar/calendar-event-table";
import { CalendarSummary } from "@/components/economic-calendar/calendar-summary";
import { CalendarToolbar, type CalendarRange } from "@/components/economic-calendar/calendar-toolbar";
import { ProtectionOverview } from "@/components/economic-calendar/protection-overview";
import styles from "@/components/economic-calendar/economic-calendar.module.css";
import { filterCalendarEvents, findCurrentAndNext, resolveCalendarState } from "@/features/economic-calendar/calendar-state";
import type { CalendarFilters } from "@/features/economic-calendar/calendar-state";
import { buildEconomicCalendarBootstrapQuery, toEconomicNewsRealtimeQuery } from "@/features/economic-calendar/bootstrap-window";
import { shouldApplyRevision } from "@/features/economic-calendar/realtime-snapshots";
import type { EconomicCalendarEvent, EconomicNewsAccount, EconomicNewsPolicy, EconomicNewsPolicyDraft, EconomicNewsRule } from "@/features/economic-calendar/types";
import type { EconomicNewsPolicyPatch, EconomicNewsRuleInput } from "@/lib/api-client";
import { createRealtimeSocket } from "@/lib/realtime-socket";
import {
  archiveEconomicNewsRule,
  createEconomicNewsRule,
  fetchEconomicNewsBootstrap,
  resetEconomicNewsAccount,
  saveEconomicNewsEventOverride,
  updateEconomicNewsAccount,
  updateEconomicNewsAccountsBatch,
  updateEconomicNewsDefault,
} from "@/services/economic-calendar.service";

type CalendarResponse = { items?: EconomicCalendarEvent[]; pagination?: unknown; revision?: string; meta?: { provider?: string; health?: string; lastSuccessfulFetchAt?: string | null; dataDelayed?: boolean } };
type GuardResponse = { enabled: boolean; newSignalsBlocked: boolean; policyVersion?: number; blockedUntilUtc?: string | null; code?: string | null; accounts?: Array<{ mtAccountId: string; enabled: boolean; newSignalsBlocked: boolean; policyVersion: number; blockedUntilUtc?: string | null; code?: string | null }>; revision?: string };
type SettingsResponse = { defaultPolicy: EconomicNewsPolicy | null; accounts: EconomicNewsAccount[]; revision?: string };

const copyDraft = (policy: EconomicNewsPolicy): EconomicNewsPolicyDraft => ({
  enabled: policy.enabled,
  blockedImpacts: [...policy.blockedImpacts],
  defaultPreEventMinutes: policy.defaultPreEventMinutes,
  defaultPostEventMinutes: policy.defaultPostEventMinutes,
  forexCurrencies: [...policy.forexCurrencies],
  staleAction: policy.staleAction,
});

const getRangeBounds = (range: CalendarRange, now: Date): { from?: number; to?: number } => {
  if (range === "all") return {};
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "tomorrow") start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === "week" ? 7 : 1));
  return { from: start.getTime(), to: end.getTime() };
};

export default function EconomicCalendarPage() {
  const locale = useLocale();
  const messages = useRouteMessages();
  const copy = messages.dashboardPage.economicCalendar;
  const [events, setEvents] = useState<EconomicCalendarEvent[]>([]);
  const [providerMeta, setProviderMeta] = useState<CalendarResponse["meta"] | null>(null);
  const [guard, setGuard] = useState<{ enabled: boolean; newSignalsBlocked: boolean; blockedUntilUtc?: string | null } | null>(null);
  const [settings, setSettings] = useState<SettingsResponse>({ defaultPolicy: null, accounts: [] });
  const [defaultDraft, setDefaultDraft] = useState<EconomicNewsPolicyDraft | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>({ search: "", currencies: [], impacts: [] });
  const [range, setRange] = useState<CalendarRange>("all");
  const [activeTab, setActiveTab] = useState<"calendar" | "protection">("calendar");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarLoadFailed, setCalendarLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overrideEvent, setOverrideEvent] = useState<EconomicCalendarEvent | null>(null);
  const [overrideAccountId, setOverrideAccountId] = useState<string>("");
  const [overrideDecision, setOverrideDecision] = useState<"ALLOW" | "BLOCK">("BLOCK");
  const [overridePreEventMinutes, setOverridePreEventMinutes] = useState(10);
  const [overridePostEventMinutes, setOverridePostEventMinutes] = useState(20);
  const [now, setNow] = useState(() => Date.now());
  const [realtimeState, setRealtimeState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const draftInitialized = useRef(false);
  const defaultDraftDirty = useRef(false);
  const calendarRevision = useRef<string | null>(null);
  const guardRevision = useRef<string | null>(null);
  const settingsRevision = useRef<string | null>(null);
  const bootstrapPromise = useRef<Promise<{ calendar: CalendarResponse; guard: GuardResponse; settings: SettingsResponse }> | null>(null);

  const applySettings = useCallback((value: SettingsResponse) => {
    setSettings(value);
    settingsRevision.current = value.revision ?? null;
    if (value.defaultPolicy && (!draftInitialized.current || !defaultDraftDirty.current)) {
      setDefaultDraft(copyDraft(value.defaultPolicy));
      draftInitialized.current = true;
      defaultDraftDirty.current = false;
    }
  }, []);

  useEffect(() => {
    // This timer only advances the local countdown/current-event display; it never performs a network request.
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      const noTokenTimer = window.setTimeout(() => setRealtimeState("disconnected"), 0);
      return () => window.clearTimeout(noTokenTimer);
    }
    let cancelled = false;
    const query = buildEconomicCalendarBootstrapQuery(new Date());
    const realtimeQuery = toEconomicNewsRealtimeQuery(query);
    const applyCalendarSnapshot = (value: CalendarResponse) => {
      if (value.revision && !shouldApplyRevision(calendarRevision.current, value.revision)) return;
      setEvents(value.items ?? []);
      setProviderMeta(value.meta ?? null);
      setCalendarLoadFailed(false);
      calendarRevision.current = value.revision ?? null;
    };
    const applyGuardSnapshot = (value: GuardResponse) => {
      if (value.revision && !shouldApplyRevision(guardRevision.current, value.revision)) return;
      setGuard(value);
      guardRevision.current = value.revision ?? null;
    };
    const onCalendarSnapshot = (value: CalendarResponse) => applyCalendarSnapshot(value);
    const onGuardSnapshot = (value: GuardResponse) => applyGuardSnapshot(value);
    const onSettingsSnapshot = (value: SettingsResponse) => {
      if (value.revision && !shouldApplyRevision(settingsRevision.current, value.revision)) return;
      applySettings(value);
    };
    const socket = createRealtimeSocket();
    socket.auth = { token };
    const onConnect = () => {
      setRealtimeState("connected");
      socket.emit("economic-news:subscribe", {
        calendarRevision: calendarRevision.current,
        guardRevision: guardRevision.current,
        settingsRevision: settingsRevision.current,
        calendarQuery: realtimeQuery,
      });
    };
    const onDisconnect = () => setRealtimeState("disconnected");
    const onConnectError = () => setRealtimeState("connecting");
    socket.on("economic-calendar:snapshot", onCalendarSnapshot);
    socket.on("economic-news-guard:snapshot", onGuardSnapshot);
    socket.on("economic-news-settings:snapshot", onSettingsSnapshot);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    const loadBootstrap = bootstrapPromise.current ?? (bootstrapPromise.current = fetchEconomicNewsBootstrap({ page: query.page, pageSize: query.pageSize, from: query.from, to: query.to }).then((value) => value));
    void loadBootstrap.then((value) => {
      if (cancelled) return;
      applyCalendarSnapshot(value.calendar);
      applyGuardSnapshot(value.guard);
      applySettings(value.settings);
      setError(null);
      setLoading(false);
      socket.connect();
    }).catch(() => {
      if (cancelled) return;
      setCalendarLoadFailed(true);
      setError(copy.calendarRefreshError);
      setLoading(false);
      setRealtimeState("disconnected");
    });
    return () => {
      cancelled = true;
      socket.off("economic-calendar:snapshot", onCalendarSnapshot);
      socket.off("economic-news-guard:snapshot", onGuardSnapshot);
      socket.off("economic-news-settings:snapshot", onSettingsSnapshot);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      if (socket.connected) socket.emit("economic-news:unsubscribe");
      socket.disconnect();
    };
  }, [applySettings, copy]);

  const forexEvents = useMemo(() => events.filter((event) => event.isInForexScope).sort((a, b) => Date.parse(a.eventAt) - Date.parse(b.eventAt)), [events]);
  const timedEvents = useMemo(() => forexEvents.filter((event) => event.releaseStatus !== "tentative" && event.releaseStatus !== "all-day"), [forexEvents]);
  const { current, next } = useMemo(() => findCurrentAndNext(timedEvents, new Date(now)), [now, timedEvents]);
  const currencies = useMemo(() => [...new Set(forexEvents.map((event) => event.currency).filter((value): value is string => Boolean(value)))].sort(), [forexEvents]);
  const visibleEvents = useMemo(() => {
    const bounds = getRangeBounds(range, new Date(now));
    return filterCalendarEvents(forexEvents, filters).filter((event) => (bounds.from === undefined || Date.parse(event.eventAt) >= bounds.from) && (bounds.to === undefined || Date.parse(event.eventAt) < bounds.to));
  }, [filters, forexEvents, now, range]);
  const calendarState = resolveCalendarState({ loading, items: forexEvents, health: providerMeta?.health ?? "STALE", filtersActive: Boolean(filters.search || filters.currencies.length || filters.impacts.length || range !== "all"), error: calendarLoadFailed });
  const emptyEventsLabel = calendarState === "UNAVAILABLE" || providerMeta?.dataDelayed ? copy.noCalendarData : filters.search || filters.currencies.length || filters.impacts.length || range !== "all" ? copy.noFilteredEvents : copy.noUpcomingEvents;
  const policy = settings.defaultPolicy;
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const statusText = guard?.newSignalsBlocked ? copy.statusNewSignalsPaused : policy?.enabled ? copy.statusProtectionEnabled : copy.statusProtectionDisabled;

  const updateDefaultDraft = (patch: Partial<EconomicNewsPolicyDraft>) => {
    defaultDraftDirty.current = true;
    setDefaultDraft((current) => current ? { ...current, ...patch } : current);
  };

  const saveDefault = async (patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => {
    if (!policy) return;
    setSaving("default"); setError(null);
    try {
      const result = await updateEconomicNewsDefault({ ...patch, expectedVersion: policy.version });
      if (result.settings) applySettings(result.settings);
      const updated = result.value;
      if (updated) { setDefaultDraft(copyDraft(updated)); defaultDraftDirty.current = false; }
    } catch { setError(copy.settingsConflict); } finally { setSaving(null); }
  };

  const saveAccount = async (account: EconomicNewsAccount, patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => {
    const base = account.override ?? policy;
    if (!base) return;
    setSaving(account.id); setError(null);
    try {
      const result = await updateEconomicNewsAccount(account.id, { ...patch, expectedVersion: account.override?.version ?? policy?.version ?? 0 });
      if (result.settings) applySettings(result.settings);
    } catch { setError(copy.accountSettingsConflict); } finally { setSaving(null); }
  };

  const saveBatch = async (accountIds: string[], patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => {
    setSaving("batch"); setError(null);
    try {
      const expectedVersions = Object.fromEntries(accountIds.map((id) => [id, settings.accounts.find((account) => account.id === id)?.override?.version ?? policy?.version ?? 0]));
      const result = await updateEconomicNewsAccountsBatch(accountIds, expectedVersions, patch);
      if (result.settings) applySettings(result.settings);
    } catch { setError(copy.accountSettingsConflict); } finally { setSaving(null); }
  };

  const resetAccount = async (account: EconomicNewsAccount) => {
    if (!account.override) return;
    setSaving(account.id); setError(null);
    try { const result = await resetEconomicNewsAccount(account.id, account.override.version); if (result.settings) applySettings(result.settings); } catch { setError(copy.overrideConflict); } finally { setSaving(null); }
  };

  const saveRule = async (input: Omit<EconomicNewsRuleInput, "expectedVersion">, accountId?: string) => {
    if (!policy) return;
    setSaving("rule"); setError(null);
    const account = accountId ? settings.accounts.find((item) => item.id === accountId) : null;
    try { const result = await createEconomicNewsRule({ ...input, expectedVersion: account?.override?.version ?? policy.version }, accountId); if (result.settings) applySettings(result.settings); } catch { setError(copy.ruleSaveError); } finally { setSaving(null); }
  };

  const archiveRule = async (rule: EconomicNewsRule, accountId?: string) => {
    if (!policy || !window.confirm(copy.archiveConfirm)) return;
    setSaving(`rule:${rule.id}`); setError(null);
    const account = accountId ? settings.accounts.find((item) => item.id === accountId) : null;
    try { const result = await archiveEconomicNewsRule(rule.id, account?.override?.version ?? policy.version); if (result.settings) applySettings(result.settings); } catch { setError(copy.ruleConflict); } finally { setSaving(null); }
  };

  const openEventOverride = (event: EconomicCalendarEvent) => {
    if (!policy) return;
    const existing = policy.eventOverrides?.find((item) => item.eventId === event.id);
    setOverrideEvent(event);
    setOverrideAccountId("");
    setOverrideDecision(existing?.decision ?? "BLOCK");
    setOverridePreEventMinutes(existing?.preEventMinutes ?? policy.defaultPreEventMinutes);
    setOverridePostEventMinutes(existing?.postEventMinutes ?? policy.defaultPostEventMinutes);
  };

  const changeOverrideScope = (accountId: string) => {
    if (!policy || !overrideEvent) return;
    const scopedPolicy = accountId ? settings.accounts.find((account) => account.id === accountId)?.override ?? policy : policy;
    const existing = scopedPolicy.eventOverrides?.find((item) => item.eventId === overrideEvent.id);
    setOverrideAccountId(accountId);
    setOverrideDecision(existing?.decision ?? "BLOCK");
    setOverridePreEventMinutes(existing?.preEventMinutes ?? scopedPolicy.defaultPreEventMinutes);
    setOverridePostEventMinutes(existing?.postEventMinutes ?? scopedPolicy.defaultPostEventMinutes);
  };

  const saveEventOverrideDialog = async () => {
    if (!policy || !overrideEvent) return;
    const account = settings.accounts.find((item) => item.id === overrideAccountId);
    setSaving(`event:${overrideEvent.id}`); setError(null);
    try {
      const result = await saveEconomicNewsEventOverride({ eventId: overrideEvent.id, decision: overrideDecision, preEventMinutes: overridePreEventMinutes, postEventMinutes: overridePostEventMinutes, reason: copy.userEventOverride, expectedVersion: account?.override?.version ?? policy.version }, overrideAccountId || undefined);
      setOverrideEvent(null);
      if (result.settings) applySettings(result.settings);
    } catch { setError(copy.eventOverrideError); } finally { setSaving(null); }
  };

  return <main className={styles.workspace}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><p className="text-sm font-semibold text-primary">{copy.eyebrow}</p><h1 className={styles.heroTitle}>{copy.title}</h1><p className={styles.heroDescription}>{copy.description}</p></div>
      <div className={`${styles.statusPill} ${guard?.newSignalsBlocked ? styles.statusPillActive : ""}`} role="status">{statusText}</div>
    </header>

    {providerMeta && <div className={`${styles.providerBanner} ${providerMeta.dataDelayed ? styles.providerBannerWarning : ""}`} role="status"><span>{providerMeta.provider ?? "forex-factory"} · {providerMeta.health ?? "STALE"}</span><span>{providerMeta.dataDelayed ? copy.providerDelayed : providerMeta.lastSuccessfulFetchAt ? `${copy.updated} ${new Date(providerMeta.lastSuccessfulFetchAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}` : copy.providerWaiting}</span></div>}
    {realtimeState !== "connected" && <div className={styles.providerBanner} role="status" aria-live="polite">{realtimeState === "connecting" ? copy.realtimeReconnecting : copy.realtimeDisconnected}</div>}
    {error && <div role="alert" className={`${styles.providerBanner} ${styles.statusPillActive}`}>{error}</div>}

    <EconomicCalendarTabs active={activeTab} onChange={setActiveTab} labels={{ calendar: copy.calendarTab, protection: copy.protectionTab, listLabel: copy.tabsLabel }} />

    <section id="economic-calendar-panel-calendar" role="tabpanel" aria-labelledby="economic-calendar-tab-calendar" hidden={activeTab !== "calendar"}>
      <CalendarSummary current={current} next={next} locale={locale} labels={{ current: copy.currentEvent, next: copy.nextEvent, actual: copy.actual, forecast: copy.forecast, previous: copy.previous, none: copy.noEventWindow, tentative: copy.tentative }} />
      <section className={styles.panel} aria-labelledby="economic-upcoming-events">
        <div className={styles.sectionHeader}><div><h2 id="economic-upcoming-events" className="font-semibold">{copy.upcomingEvents}</h2><p className={`${styles.muted} ${styles.small} mt-1`}>{copy.refreshHint}</p></div><span className={`${styles.muted} ${styles.small}`}>{copy.eventCount.replace("{count}", String(visibleEvents.length))}</span></div>
        <CalendarToolbar filters={filters} range={range} currencies={currencies} labels={{ search: copy.search, searchPlaceholder: copy.searchPlaceholder, range: copy.range, all: copy.rangeAll, today: copy.rangeToday, tomorrow: copy.rangeTomorrow, week: copy.rangeWeek, impacts: copy.impacts, currencies: copy.currency, clear: copy.clearFilters }} onFiltersChange={setFilters} onRangeChange={setRange} />
        {calendarState === "LOADING" ? <div className={styles.loadingState} role="status" aria-live="polite"><span className={styles.loadingBar} /><span>{copy.calendarLoading}</span></div> : <><CalendarEventTable events={visibleEvents} locale={locale} timeZone={timeZone} labels={{ event: copy.event, currency: copy.currency, impact: copy.impact, time: copy.time, values: copy.values, block: copy.block, noEvents: emptyEventsLabel }} onBlock={(event) => openEventOverride(event)} savingId={saving} /><div className={styles.mobileList}>{visibleEvents.map((event) => <CalendarEventCard key={event.id} event={event} locale={locale} labels={{ actual: copy.actual, forecast: copy.forecast, previous: copy.previous, block: copy.block }} onBlock={() => openEventOverride(event)} disabled={saving === `event:${event.id}`} />)}{visibleEvents.length === 0 && <p className={styles.emptyState}>{emptyEventsLabel}</p>}</div></>}
      </section>
    </section>

    <section id="economic-calendar-panel-protection" role="tabpanel" aria-labelledby="economic-calendar-tab-protection" hidden={activeTab !== "protection"}>
      <ProtectionOverview policy={policy} defaultDraft={defaultDraft} accounts={settings.accounts} selectedAccountIds={selectedAccountIds} saving={saving} labels={{ loading: copy.loading, defaultProtection: copy.defaultProtection, defaultProtectionDescription: copy.defaultProtectionDescription, saving: copy.saving, disableProtection: copy.disableProtection, enableProtection: copy.enableProtection, preEventMinutes: copy.preEventMinutes, postEventMinutes: copy.postEventMinutes, blockImpact: copy.blockImpact, forexCurrencies: copy.forexCurrencies, forexCurrenciesPlaceholder: copy.forexCurrenciesPlaceholder, currencyHint: copy.currencyHint, staleAction: copy.staleAction, staleAllow: copy.staleAllow, staleBlock: copy.staleBlock, accountEnabled: copy.accountEnabled, accountCurrencies: copy.accountCurrencies, saveHint: copy.saveHint, saveChanges: copy.saveChanges, accountOverrides: copy.accountOverrides, accountOverridesDescription: copy.accountOverridesDescription, noAccounts: copy.noAccounts, selectAccount: copy.selectAccount, custom: copy.custom, defaultLabel: copy.defaultLabel, unknown: copy.unknown, override: copy.override, inherited: copy.inherited, selectedAccounts: copy.selectedAccounts, selectedCount: copy.selectedCount, selectAccountsHint: copy.selectAccountsHint, applyToSelected: copy.applyToSelected, impacts: copy.impacts, reset: copy.reset, policyRules: copy.policyRules, policyRulesDescription: copy.policyRulesDescription, ruleCurrency: copy.ruleCurrency, ruleImpact: copy.ruleImpact, ruleDecision: copy.ruleDecision, ruleScope: copy.ruleScope, ruleDefaultScope: copy.ruleDefaultScope, ruleAccountScope: copy.ruleAccountScope, currencyPlaceholder: copy.currencyPlaceholder, addRule: copy.addRule, anyCurrency: copy.anyCurrency, anyImpact: copy.anyImpact, defaultValue: copy.defaultValue, minutesShort: copy.minutesShort, archive: copy.archive }} onDefaultDraftChange={updateDefaultDraft} onSaveDefault={(patch) => void saveDefault(patch)} onSaveAccount={(account, patch) => void saveAccount(account, patch)} onSaveBatch={(accountIds, patch) => void saveBatch(accountIds, patch)} onSelectAccount={(accountId) => setSelectedAccountIds((current) => current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId])} onResetAccount={(account) => void resetAccount(account)} onCreateRule={(input, accountId) => void saveRule(input, accountId)} onArchiveRule={(rule, accountId) => void archiveRule(rule, accountId)} />
    </section>
    {overrideEvent && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOverrideEvent(null); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="economic-event-override-title"><div className={styles.modalHeader}><div><p className={styles.eyebrow}>{copy.userEventOverride}</p><h2 id="economic-event-override-title" className="text-lg font-semibold">{copy.eventOverrideTitle}</h2><p className={`${styles.muted} ${styles.small} mt-1`}>{copy.eventOverrideDescription}</p></div><button type="button" className={styles.iconButton} onClick={() => setOverrideEvent(null)} aria-label={copy.cancel}>×</button></div><div className={styles.modalEvent}><strong>{overrideEvent.name}</strong><span>{overrideEvent.currency ?? "—"} · {new Date(overrideEvent.eventAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</span></div><div className={styles.modalGrid}><label className={styles.field}>{copy.overrideScope}<select className={styles.control} value={overrideAccountId} onChange={(event) => changeOverrideScope(event.target.value)}><option value="">{copy.defaultScope}</option>{settings.accounts.map((account) => <option key={account.id} value={account.id}>{account.accountName || account.accountNumber || account.id}</option>)}</select></label><label className={styles.field}>{copy.eventOverrideDecision}<select className={styles.control} value={overrideDecision} onChange={(event) => setOverrideDecision(event.target.value as "ALLOW" | "BLOCK")}><option value="BLOCK">{copy.blockEvent}</option><option value="ALLOW">{copy.allowEvent}</option></select></label><label className={styles.field}>{copy.preEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={overridePreEventMinutes} onChange={(event) => setOverridePreEventMinutes(Math.min(360, Math.max(0, Number(event.target.value))))} /></label><label className={styles.field}>{copy.postEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={overridePostEventMinutes} onChange={(event) => setOverridePostEventMinutes(Math.min(360, Math.max(0, Number(event.target.value))))} /></label></div><div className={styles.modalFooter}><button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setOverrideEvent(null)}>{copy.cancel}</button><button type="button" disabled={saving === `event:${overrideEvent.id}`} className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void saveEventOverrideDialog()}>{saving === `event:${overrideEvent.id}` ? copy.saving : copy.saveOverride}</button></div></section></div>}
  </main>;
}
