import type { DeletionFlowState } from './account-deletion-flow';
import { getAccountDeletionJourney } from './account-deletion-journey';

describe('account deletion journey mapping', () => {
  it.each([
    [{ step: 'DISCLOSURE' }, 1, 'review'],
    [{ step: 'CREDENTIALS', phone: '' }, 2, 'verify'],
    [{ step: 'OTP', sessionToken: 'session', expiresAt: '2026-08-15T12:15:00.000Z' }, 3, 'confirm'],
    [{ step: 'CONFIRM', sessionToken: 'session', mode: 'IMMEDIATE' }, 3, 'confirm'],
    [{ step: 'RECEIPT', receipt: { requestId: 'request', receiptToken: 'receipt', receiptExpiresAt: '2026-08-15T12:15:00.000Z' } }, 3, 'complete'],
    [{ step: 'RECOVERY_PENDING', requestId: 'request', retryAfterSeconds: 5 }, 3, 'complete'],
    [{ step: 'CANCEL', receipt: { requestId: 'request', receiptToken: 'receipt', receiptExpiresAt: '2026-08-15T12:15:00.000Z' } }, 3, 'complete'],
    [{ step: 'ERROR', recoverTo: 'CREDENTIALS', code: 'ACCOUNT_DELETION_ERROR' }, 2, 'verify'],
    [{ step: 'ERROR', recoverTo: 'CONFIRM', code: 'ACCOUNT_DELETION_ERROR' }, 3, 'confirm'],
  ] as const)('maps %s to step %s/%s', (state, number, key) => {
    expect(getAccountDeletionJourney(state as DeletionFlowState)).toEqual({ number, key });
  });
});
