import type { AccountDeletionMode, AccountDeletionStatus } from '@/services/account-deletion.service';
import type { AccountDeletionDelivery } from '@/services/account-deletion.service';

export type AccountDeletionChallenge = AccountDeletionDelivery;

export type LocalDeletionReceipt = {
  requestId: string;
  receiptToken: string;
  receiptExpiresAt: string;
};

export type DeletionFlowState =
  | { step: 'DISCLOSURE' }
  | { step: 'CREDENTIALS'; phone: string }
  | { step: 'OTP'; sessionToken: string; expiresAt: string; deliveryStatus?: 'otp_sent' | 'delivery_pending' }
  | { step: 'CONFIRM'; sessionToken: string; mode: AccountDeletionMode; deliveryStatus?: 'otp_sent' | 'delivery_pending' }
  | { step: 'RECOVERY_PENDING'; requestId: string; retryAfterSeconds: number }
  | { step: 'RECEIPT'; receipt: LocalDeletionReceipt }
  | { step: 'STATUS'; receipt: LocalDeletionReceipt; status: AccountDeletionStatus }
  | { step: 'CANCEL'; receipt: LocalDeletionReceipt }
  | { step: 'ERROR'; recoverTo: DeletionFlowState['step']; code: string };

export type DeletionFlowAction =
  | { type: 'START_CREDENTIALS'; phone: string }
  | { type: 'DELIVERY'; sessionToken: string; delivery: AccountDeletionChallenge; expiresAt: string }
  | { type: 'CONFIRM_MODE'; mode: AccountDeletionMode }
  | { type: 'RECOVERY_PENDING'; requestId: string; retryAfterSeconds?: number }
  | { type: 'RECEIPT'; receipt: LocalDeletionReceipt }
  | { type: 'STATUS'; receipt: LocalDeletionReceipt; status: AccountDeletionStatus }
  | { type: 'CANCEL' }
  | { type: 'ERROR'; recoverTo: DeletionFlowState['step']; code: string };

export const RECEIPT_STORAGE_KEY = 'tragram:account-deletion:receipt:v1';

export const reduceDeletionFlow = (
  state: DeletionFlowState,
  action: DeletionFlowAction
): DeletionFlowState => {
  switch (action.type) {
    case 'START_CREDENTIALS':
      return { step: 'CREDENTIALS', phone: action.phone };
    case 'DELIVERY':
      return {
        step: 'OTP',
        sessionToken: action.sessionToken,
        expiresAt: action.expiresAt,
        deliveryStatus: action.delivery.status,
      };
    case 'CONFIRM_MODE':
      if (state.step !== 'OTP' && state.step !== 'CONFIRM') return state;
      return {
        step: 'CONFIRM',
        sessionToken: state.sessionToken,
        mode: action.mode,
        deliveryStatus: state.deliveryStatus,
      };
    case 'RECOVERY_PENDING':
      return {
        step: 'RECOVERY_PENDING',
        requestId: action.requestId,
        retryAfterSeconds: Math.max(1, action.retryAfterSeconds ?? 5),
      };
    case 'RECEIPT':
      return { step: 'RECEIPT', receipt: action.receipt };
    case 'STATUS':
      return { step: 'STATUS', receipt: action.receipt, status: action.status };
    case 'CANCEL':
      return { step: 'CANCEL', receipt: state.step === 'RECEIPT' || state.step === 'STATUS' ? state.receipt : { requestId: '', receiptToken: '', receiptExpiresAt: '' } };
    case 'ERROR':
      return { step: 'ERROR', recoverTo: action.recoverTo, code: action.code };
    default:
      return state;
  }
};

export const saveLocalReceipt = (receipt: LocalDeletionReceipt): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
};

export const loadLocalReceipt = (): LocalDeletionReceipt | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(RECEIPT_STORAGE_KEY) ?? 'null');
    if (
      value &&
      typeof value.requestId === 'string' &&
      typeof value.receiptToken === 'string' &&
      typeof value.receiptExpiresAt === 'string' &&
      Date.parse(value.receiptExpiresAt) > Date.now()
    ) {
      return value;
    }
  } catch {
    // Treat malformed local state as absent.
  }
  window.sessionStorage.removeItem(RECEIPT_STORAGE_KEY);
  return null;
};

export const clearLocalReceipt = (): void => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(RECEIPT_STORAGE_KEY);
};
