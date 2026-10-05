import type { DeletionFlowState } from './account-deletion-flow';

export type AccountDeletionJourneyKey = 'review' | 'verify' | 'confirm' | 'complete';

export type AccountDeletionJourney = {
  number: 1 | 2 | 3;
  key: AccountDeletionJourneyKey;
};

export const getAccountDeletionJourney = (
  state: DeletionFlowState
): AccountDeletionJourney => {
  const step = state.step === 'ERROR' ? state.recoverTo : state.step;

  if (step === 'CREDENTIALS') {
    return { number: 2, key: 'verify' };
  }
  if (step === 'OTP' || step === 'CONFIRM') {
    return { number: 3, key: 'confirm' };
  }
  if (step === 'RECEIPT' || step === 'STATUS' || step === 'RECOVERY_PENDING' || step === 'CANCEL') {
    return { number: 3, key: 'complete' };
  }
  return { number: 1, key: 'review' };
};
