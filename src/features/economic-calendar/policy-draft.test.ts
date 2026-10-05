import { commonValue, isPolicyDraftDirty, toPolicyDraft } from './policy-draft';

it('returns mixed values for selected accounts', () => {
  expect(commonValue([10, 10])).toEqual({ kind: 'VALUE', value: 10 });
  expect(commonValue([10, 20])).toEqual({ kind: 'MIXED' });
});

it('creates a clean draft from the server policy', () => {
  const policy = { enabled: false, blockedImpacts: ['HIGH'], defaultPreEventMinutes: 10, defaultPostEventMinutes: 20, forexCurrencies: [], staleAction: 'BLOCK' as const };
  expect(isPolicyDraftDirty(policy, toPolicyDraft(policy))).toBe(false);
});
