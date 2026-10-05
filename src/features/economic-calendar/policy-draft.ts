export type PolicyDraft = { enabled: boolean; blockedImpacts: string[]; defaultPreEventMinutes: number; defaultPostEventMinutes: number; forexCurrencies: string[]; staleAction: 'ALLOW' | 'BLOCK' };

export const commonValue = <T>(values: T[]): { kind: 'VALUE'; value: T } | { kind: 'MIXED' } => values.length > 0 && values.every((value) => Object.is(value, values[0])) ? { kind: 'VALUE', value: values[0] } : { kind: 'MIXED' };

export const toPolicyDraft = (policy: PolicyDraft): PolicyDraft => ({ ...policy, blockedImpacts: [...policy.blockedImpacts], forexCurrencies: [...policy.forexCurrencies] });

export const isPolicyDraftDirty = (server: PolicyDraft, draft: PolicyDraft) => JSON.stringify(toPolicyDraft(server)) !== JSON.stringify(toPolicyDraft(draft));
