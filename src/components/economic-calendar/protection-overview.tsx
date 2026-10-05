"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EconomicNewsPolicyPatch, EconomicNewsRuleInput } from "@/lib/api-client";
import styles from "./economic-calendar.module.css";
import type { EconomicImpact, EconomicNewsAccount, EconomicNewsPolicy, EconomicNewsPolicyDraft, EconomicNewsRule } from "@/features/economic-calendar/types";

type ProtectionOverviewProps = {
  policy: EconomicNewsPolicy | null;
  defaultDraft: EconomicNewsPolicyDraft | null;
  accounts: EconomicNewsAccount[];
  selectedAccountIds: string[];
  saving: string | null;
  labels: Record<string, string>;
  onDefaultDraftChange: (patch: Partial<EconomicNewsPolicyDraft>) => void;
  onSaveDefault: (patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => void;
  onSaveAccount: (account: EconomicNewsAccount, patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => void;
  onSaveBatch: (accountIds: string[], patch: Omit<EconomicNewsPolicyPatch, "expectedVersion">) => void;
  onSelectAccount: (accountId: string) => void;
  onResetAccount: (account: EconomicNewsAccount) => void;
  onCreateRule: (input: Omit<EconomicNewsRuleInput, "expectedVersion">, accountId?: string) => void;
  onArchiveRule: (rule: EconomicNewsRule, accountId?: string) => void;
};

const impacts: EconomicImpact[] = ["MEDIUM", "HIGH"];
const parseCurrencies = (value: string) => [...new Set(value.split(",").map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z]{3}$/.test(item)))];
const draftFromPolicy = (policy: EconomicNewsPolicy): EconomicNewsPolicyDraft => ({
  enabled: policy.enabled,
  blockedImpacts: [...policy.blockedImpacts],
  defaultPreEventMinutes: policy.defaultPreEventMinutes,
  defaultPostEventMinutes: policy.defaultPostEventMinutes,
  forexCurrencies: [...policy.forexCurrencies],
  staleAction: policy.staleAction,
});

export function ProtectionOverview(props: ProtectionOverviewProps) {
  const { policy, defaultDraft, accounts, selectedAccountIds, saving, labels, onDefaultDraftChange, onSaveDefault, onSaveAccount, onSaveBatch, onSelectAccount, onResetAccount, onCreateRule, onArchiveRule } = props;
  const [accountDrafts, setAccountDrafts] = useState<Record<string, EconomicNewsPolicyDraft>>({});
  const [batchDraft, setBatchDraft] = useState<EconomicNewsPolicyDraft | null>(null);
  const [ruleDraft, setRuleDraft] = useState<Omit<EconomicNewsRuleInput, "expectedVersion">>({ currency: "", impact: "HIGH", decision: "BLOCK", preEventMinutes: 10, postEventMinutes: 20, priority: 0 });
  const [ruleAccountId, setRuleAccountId] = useState("");
  const accountDraftVersions = useRef<Record<string, number>>({});
  const batchDraftVersion = useRef<number | null>(null);

  useEffect(() => {
    const syncDrafts = window.setTimeout(() => setAccountDrafts((current) => Object.fromEntries(accounts.map((account) => {
        const active = account.override ?? policy;
        const sourceVersion = active?.version ?? 0;
        const shouldRefresh = !current[account.id] || accountDraftVersions.current[account.id] !== sourceVersion;
        if (!shouldRefresh) return [account.id, current[account.id]];
        accountDraftVersions.current[account.id] = sourceVersion;
        return [account.id, active ? draftFromPolicy(active) : { enabled: false, blockedImpacts: [], defaultPreEventMinutes: 10, defaultPostEventMinutes: 20, forexCurrencies: [], staleAction: "BLOCK" as const }];
      }))), 0);
    return () => window.clearTimeout(syncDrafts);
  }, [accounts, policy]);

  useEffect(() => {
    if (!defaultDraft) return undefined;
    const sourceVersion = policy?.version ?? 0;
    if (batchDraftVersion.current === sourceVersion) return undefined;
    batchDraftVersion.current = sourceVersion;
    const syncBatchDraft = window.setTimeout(() => setBatchDraft({ ...defaultDraft, staleAction: policy?.staleAction ?? "BLOCK" }), 0);
    return () => window.clearTimeout(syncBatchDraft);
  }, [defaultDraft, policy?.staleAction, policy?.version]);

  const selectedAccounts = useMemo(() => accounts.filter((account) => selectedAccountIds.includes(account.id)), [accounts, selectedAccountIds]);
  const scopedRules = useMemo(() => [
    ...(policy?.rules ?? []).map((rule) => ({ rule, accountId: undefined as string | undefined, scopeLabel: labels.ruleDefaultScope })),
    ...accounts.flatMap((account) => (account.override?.rules ?? []).map((rule) => ({ rule, accountId: account.id, scopeLabel: account.accountName || account.accountNumber || account.id }))),
  ], [accounts, labels.ruleDefaultScope, policy?.rules]);
  if (!policy || !defaultDraft) return <div className={`${styles.panel} ${styles.emptyState}`}>{labels.loading}</div>;

  const updateAccountDraft = (accountId: string, patch: Partial<EconomicNewsPolicyDraft>) => setAccountDrafts((current) => ({ ...current, [accountId]: { ...current[accountId], ...patch } }));
  const toggleImpact = (selected: EconomicImpact[], impact: EconomicImpact): EconomicImpact[] => selected.includes(impact) ? selected.filter((item) => item !== impact) : [...selected, impact];
  const saveDefault = () => onSaveDefault(defaultDraft);
  const applyBatch = () => { if (batchDraft && selectedAccountIds.length > 0) onSaveBatch(selectedAccountIds, batchDraft); };

  return <div className="grid gap-5">
    <section className={styles.panel} aria-labelledby="economic-default-protection">
      <div className={styles.sectionHeader}>
        <div><h2 id="economic-default-protection" className="font-semibold">{labels.defaultProtection}</h2><p className={`${styles.muted} ${styles.small} mt-1`}>{labels.defaultProtectionDescription}</p></div>
        <button type="button" disabled={saving === "default"} className={`${styles.button} ${policy.enabled ? styles.buttonSecondary : styles.buttonPrimary}`} onClick={() => onSaveDefault({ enabled: !policy.enabled })}>{saving === "default" ? labels.saving : policy.enabled ? labels.disableProtection : labels.enableProtection}</button>
      </div>
      <div className={styles.formGrid}>
        <label className={styles.field}>{labels.preEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={defaultDraft.defaultPreEventMinutes} onChange={(event) => onDefaultDraftChange({ defaultPreEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label>
        <label className={styles.field}>{labels.postEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={defaultDraft.defaultPostEventMinutes} onChange={(event) => onDefaultDraftChange({ defaultPostEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label>
        <fieldset className={styles.field}><legend>{labels.blockImpact}</legend><div className="flex flex-wrap gap-2">{impacts.map((impact) => <button type="button" key={impact} className={`${styles.chip} ${defaultDraft.blockedImpacts.includes(impact) ? styles.chipActive : ""}`} aria-pressed={defaultDraft.blockedImpacts.includes(impact)} onClick={() => onDefaultDraftChange({ blockedImpacts: toggleImpact(defaultDraft.blockedImpacts, impact) })}>{impact}</button>)}</div></fieldset>
        <label className={styles.field}>{labels.forexCurrencies}<input className={styles.control} value={defaultDraft.forexCurrencies.join(", ")} placeholder={labels.forexCurrenciesPlaceholder} onChange={(event) => onDefaultDraftChange({ forexCurrencies: parseCurrencies(event.target.value) })} /><span className={styles.fieldHint}>{labels.currencyHint}</span></label>
        <label className={styles.field}>{labels.staleAction}<select className={styles.control} value={defaultDraft.staleAction} onChange={(event) => onDefaultDraftChange({ staleAction: event.target.value as EconomicNewsPolicyDraft["staleAction"] })}><option value="BLOCK">{labels.staleBlock}</option><option value="ALLOW">{labels.staleAllow}</option></select></label>
      </div>
      <div className={styles.formFooter}><span className={`${styles.muted} ${styles.small} me-auto`}>{labels.saveHint}</span><button type="button" disabled={saving === "default"} className={`${styles.button} ${styles.buttonPrimary}`} onClick={saveDefault}>{saving === "default" ? labels.saving : labels.saveChanges}</button></div>
    </section>

    <section className={styles.panel} aria-labelledby="economic-account-scope">
      <div className={styles.sectionHeader}><div><h2 id="economic-account-scope" className="font-semibold">{labels.accountOverrides}</h2><p className={`${styles.muted} ${styles.small} mt-1`}>{labels.accountOverridesDescription}</p></div></div>
      {accounts.length === 0 ? <p className={styles.emptyState}>{labels.noAccounts}</p> : <>
        <div className={styles.accountGrid}>
          {accounts.map((account) => <div key={account.id} className={`${styles.accountCard} ${selectedAccountIds.includes(account.id) ? "ring-1 ring-primary" : ""}`}><div className={styles.accountCardHeader}><span className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={selectedAccountIds.includes(account.id)} onChange={() => onSelectAccount(account.id)} aria-label={`${labels.selectAccount}: ${account.accountName || account.accountNumber || account.id}`} className="mt-1 size-4 accent-primary" /><span className="min-w-0"><span className="block truncate font-semibold">{account.accountName || account.accountNumber || account.id}</span><span className={`${styles.muted} ${styles.small}`}>{account.platform ?? "MT"} · {account.connectionStatus ?? labels.unknown} · {account.override ? labels.override : labels.inherited}</span></span></span><span className={account.override ? "text-status-info" : styles.muted}>{account.override ? labels.custom : labels.defaultLabel}</span></div>
            {accountDrafts[account.id] && <div className={styles.accountFields} onClick={(event) => event.preventDefault()}><label className={`${styles.field} col-span-full`}><span className="flex items-center justify-between gap-2"><span>{labels.accountEnabled}</span><input type="checkbox" checked={accountDrafts[account.id].enabled} onChange={(event) => updateAccountDraft(account.id, { enabled: event.target.checked })} className="size-4 accent-primary" /></span></label><label className={styles.field}>{labels.preEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={accountDrafts[account.id].defaultPreEventMinutes} onChange={(event) => updateAccountDraft(account.id, { defaultPreEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label><label className={styles.field}>{labels.postEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={accountDrafts[account.id].defaultPostEventMinutes} onChange={(event) => updateAccountDraft(account.id, { defaultPostEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label><fieldset className={styles.field}><legend>{labels.impacts}</legend><div className="flex flex-wrap gap-1">{impacts.map((impact) => <button type="button" key={impact} className={`${styles.chip} ${accountDrafts[account.id].blockedImpacts.includes(impact) ? styles.chipActive : ""}`} aria-pressed={accountDrafts[account.id].blockedImpacts.includes(impact)} onClick={() => updateAccountDraft(account.id, { blockedImpacts: toggleImpact(accountDrafts[account.id].blockedImpacts, impact) })}>{impact}</button>)}</div></fieldset><label className={styles.field}>{labels.accountCurrencies}<input className={styles.control} value={accountDrafts[account.id].forexCurrencies.join(", ")} placeholder={labels.forexCurrenciesPlaceholder} onChange={(event) => updateAccountDraft(account.id, { forexCurrencies: parseCurrencies(event.target.value) })} /></label><label className={styles.field}>{labels.staleAction}<select className={styles.control} value={accountDrafts[account.id].staleAction} onChange={(event) => updateAccountDraft(account.id, { staleAction: event.target.value as EconomicNewsPolicyDraft["staleAction"] })}><option value="BLOCK">{labels.staleBlock}</option><option value="ALLOW">{labels.staleAllow}</option></select></label><div className={`${styles.accountActions} col-span-full justify-end`}><button type="button" disabled={saving === account.id} className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => onSaveAccount(account, accountDrafts[account.id])}>{saving === account.id ? labels.saving : labels.saveChanges}</button>{account.override && <button type="button" disabled={saving === account.id} className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => onResetAccount(account)}>{labels.reset}</button>}</div></div>}
            </div>)}
        </div>
        <div className="border-t border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{labels.selectedAccounts}</h3><p className={`${styles.muted} ${styles.small} mt-1`}>{selectedAccounts.length ? labels.selectedCount.replace("{count}", String(selectedAccounts.length)) : labels.selectAccountsHint}</p></div><button type="button" disabled={!batchDraft || selectedAccountIds.length === 0 || saving === "batch"} className={`${styles.button} ${styles.buttonPrimary}`} onClick={applyBatch}>{saving === "batch" ? labels.saving : labels.applyToSelected}</button></div>{batchDraft && selectedAccountIds.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={`${styles.field} col-span-full`}><span className="flex items-center justify-between gap-2"><span>{labels.accountEnabled}</span><input type="checkbox" checked={batchDraft.enabled} onChange={(event) => setBatchDraft({ ...batchDraft, enabled: event.target.checked })} className="size-4 accent-primary" /></span></label><label className={styles.field}>{labels.preEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={batchDraft.defaultPreEventMinutes} onChange={(event) => setBatchDraft({ ...batchDraft, defaultPreEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label><label className={styles.field}>{labels.postEventMinutes}<input className={styles.control} type="number" min={0} max={360} value={batchDraft.defaultPostEventMinutes} onChange={(event) => setBatchDraft({ ...batchDraft, defaultPostEventMinutes: Math.min(360, Math.max(0, Number(event.target.value))) })} /></label><fieldset className={styles.field}><legend>{labels.blockImpact}</legend><div className="flex flex-wrap gap-1">{impacts.map((impact) => <button type="button" key={impact} className={`${styles.chip} ${batchDraft.blockedImpacts.includes(impact) ? styles.chipActive : ""}`} aria-pressed={batchDraft.blockedImpacts.includes(impact)} onClick={() => setBatchDraft({ ...batchDraft, blockedImpacts: toggleImpact(batchDraft.blockedImpacts, impact) })}>{impact}</button>)}</div></fieldset><label className={styles.field}>{labels.accountCurrencies}<input className={styles.control} value={batchDraft.forexCurrencies.join(", ")} placeholder={labels.forexCurrenciesPlaceholder} onChange={(event) => setBatchDraft({ ...batchDraft, forexCurrencies: parseCurrencies(event.target.value) })} /></label><label className={styles.field}>{labels.staleAction}<select className={styles.control} value={batchDraft.staleAction} onChange={(event) => setBatchDraft({ ...batchDraft, staleAction: event.target.value as EconomicNewsPolicyDraft["staleAction"] })}><option value="BLOCK">{labels.staleBlock}</option><option value="ALLOW">{labels.staleAllow}</option></select></label></div>}</div>
      </>}
    </section>

    <section className={styles.panel} aria-labelledby="economic-policy-rules"><div className={styles.sectionHeader}><div><h2 id="economic-policy-rules" className="font-semibold">{labels.policyRules}</h2><p className={`${styles.muted} ${styles.small} mt-1`}>{labels.policyRulesDescription}</p></div></div><div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-7"><select aria-label={labels.ruleScope} value={ruleAccountId} onChange={(event) => setRuleAccountId(event.target.value)} className={styles.control}><option value="">{labels.ruleDefaultScope}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{labels.ruleAccountScope}: {account.accountName || account.accountNumber || account.id}</option>)}</select><input aria-label={labels.ruleCurrency} value={ruleDraft.currency ?? ""} onChange={(event) => setRuleDraft({ ...ruleDraft, currency: event.target.value.toUpperCase() })} placeholder={labels.currencyPlaceholder} maxLength={3} className={styles.control} /><select aria-label={labels.ruleImpact} value={ruleDraft.impact ?? "HIGH"} onChange={(event) => setRuleDraft({ ...ruleDraft, impact: event.target.value as EconomicNewsRuleInput["impact"] })} className={styles.control}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><select aria-label={labels.ruleDecision} value={ruleDraft.decision} onChange={(event) => setRuleDraft({ ...ruleDraft, decision: event.target.value as EconomicNewsRuleInput["decision"] })} className={styles.control}><option>BLOCK</option><option>ALLOW</option></select><input aria-label={labels.preEventMinutes} type="number" min={0} max={360} value={ruleDraft.preEventMinutes ?? 0} onChange={(event) => setRuleDraft({ ...ruleDraft, preEventMinutes: Number(event.target.value) })} className={styles.control} /><input aria-label={labels.postEventMinutes} type="number" min={0} max={360} value={ruleDraft.postEventMinutes ?? 0} onChange={(event) => setRuleDraft({ ...ruleDraft, postEventMinutes: Number(event.target.value) })} className={styles.control} /><button type="button" disabled={saving === "rule" || !ruleDraft.currency} onClick={() => { onCreateRule({ ...ruleDraft, currency: ruleDraft.currency || null }, ruleAccountId || undefined); setRuleDraft({ ...ruleDraft, currency: "" }); }} className={`${styles.button} ${styles.buttonPrimary}`}>{labels.addRule}</button></div><div className={styles.ruleList}>{scopedRules.map(({ rule, accountId, scopeLabel }) => <div key={`${accountId ?? "default"}:${rule.id}`} className={styles.ruleRow}><span>{scopeLabel} · {rule.currency ?? labels.anyCurrency} · {rule.impact ?? labels.anyImpact} · {rule.decision} · {rule.preEventMinutes ?? labels.defaultValue}/{rule.postEventMinutes ?? labels.defaultValue} {labels.minutesShort}</span><button type="button" disabled={saving === `rule:${rule.id}`} onClick={() => onArchiveRule(rule, accountId)} className="text-xs font-semibold text-status-danger disabled:opacity-50">{labels.archive}</button></div>)}</div></section>
  </div>;
}
