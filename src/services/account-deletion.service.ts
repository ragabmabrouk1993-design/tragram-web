import {
  getApiPublicAccountDeletionRequestsByRequestId,
  postApiPublicAccountDeletionConfirm,
  postApiPublicAccountDeletionRequestsByRequestIdCancel,
  postApiPublicAccountDeletionResend,
  postApiPublicAccountDeletionVerification,
  type PublicAccountDeletionDelivery,
  type PublicAccountDeletionDeliveryResponse,
  type PublicAccountDeletionStatusResponse,
  type PublicAccountDeletionVerificationResponse,
} from '@/lib/api-client';
import { initApiClient } from '@/lib/api-client-setup';

initApiClient();

export type AccountDeletionMode = 'IMMEDIATE' | 'SCHEDULED';

export type AccountDeletionDelivery = {
  channel: 'telegram_gateway';
  status: 'otp_sent' | 'delivery_pending';
  expiresIn: number;
};

type DateLike = Date | string | null | undefined;

const toIso = (value: DateLike): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeDelivery = (
  delivery: PublicAccountDeletionDelivery
): AccountDeletionDelivery => {
  return {
    channel: 'telegram_gateway',
    status: delivery.status,
    expiresIn: delivery.expiresIn,
  };
};

export type AccountDeletionVerificationResponse = {
  success: boolean;
  verificationSessionToken: string;
  expiresAt: string;
  delivery: AccountDeletionDelivery;
};

export type AccountDeletionConfirmationResponse = {
  success: boolean;
  requestId: string;
  status: 'SCHEDULED' | 'EXECUTING' | 'CONFIRMATION_RECOVERY_PENDING';
  mode?: AccountDeletionMode;
  scheduledFor?: string | null;
  receiptToken?: string;
  receiptExpiresAt?: string;
  supportPath?: string;
};

export type AccountDeletionStatus = {
  requestId: string;
  mode: AccountDeletionMode;
  status: 'SCHEDULED' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  policyVersion: string;
  requestedAt: string;
  confirmedAt: string;
  scheduledFor: string;
  executedAt: string | null;
  cancelledAt: string | null;
  supportRequired: boolean;
};

const withHeader = <TName extends string>(name: TName, value: string): Record<TName, string> => ({
  [name]: value,
} as Record<TName, string>);

export const accountDeletionService = {
  async startVerification(phoneNumber: string, password: string): Promise<AccountDeletionVerificationResponse> {
    const response = await postApiPublicAccountDeletionVerification({
      body: { phoneNumber, password },
      throwOnError: true,
    });
    const data = response.data as unknown as PublicAccountDeletionVerificationResponse;
    return {
      success: data.success,
      verificationSessionToken: data.verificationSessionToken,
      expiresAt: toIso(data.expiresAt) ?? '',
      delivery: normalizeDelivery(data.delivery),
    };
  },

  async resend(verificationSessionToken: string): Promise<AccountDeletionDelivery> {
    const response = await postApiPublicAccountDeletionResend({
      body: { verificationSessionToken },
      throwOnError: true,
    });
    return normalizeDelivery(response.data as unknown as PublicAccountDeletionDeliveryResponse);
  },

  async confirm(input: {
    verificationSessionToken: string;
    otp: string;
    mode: AccountDeletionMode;
    acknowledgements: {
      brokerControlUnderstood: true;
      retentionUnderstood: true;
      prepaidAccessUnderstood: true;
      immediateIrreversibilityUnderstood?: true;
    };
    idempotencyKey: string;
  }): Promise<AccountDeletionConfirmationResponse> {
    const response = await postApiPublicAccountDeletionConfirm({
      body: {
        verificationSessionToken: input.verificationSessionToken,
        otp: input.otp,
        mode: input.mode,
        acknowledgements: input.acknowledgements,
      },
      headers: withHeader('Idempotency-Key', input.idempotencyKey),
      throwOnError: true,
    });
    const data = response.data as unknown as {
      success: boolean;
      requestId: string;
      status: AccountDeletionConfirmationResponse['status'];
      mode: AccountDeletionMode;
      scheduledFor?: DateLike;
      receiptToken?: string;
      receiptExpiresAt?: DateLike;
      policyVersion?: string;
      supportPath?: string;
    };
    return {
      success: data.success,
      requestId: data.requestId,
      status: data.status,
      mode: data.mode,
      scheduledFor: toIso(data.scheduledFor),
      receiptToken: data.receiptToken,
      receiptExpiresAt: toIso(data.receiptExpiresAt) ?? undefined,
      supportPath: data.supportPath,
    };
  },

  async getStatus(requestId: string, receiptToken: string): Promise<AccountDeletionStatus> {
    const response = await getApiPublicAccountDeletionRequestsByRequestId({
      path: { requestId },
      headers: withHeader('X-Account-Deletion-Receipt', receiptToken),
      throwOnError: true,
    });
    const data = response.data as unknown as PublicAccountDeletionStatusResponse;
    return {
      requestId: data.requestId,
      mode: data.mode,
      status: data.status,
      policyVersion: data.policyVersion,
      requestedAt: toIso(data.requestedAt) ?? '',
      confirmedAt: toIso(data.confirmedAt) ?? '',
      scheduledFor: toIso(data.scheduledFor) ?? '',
      executedAt: toIso(data.executedAt),
      cancelledAt: toIso(data.cancelledAt),
      supportRequired: data.supportRequired,
    };
  },

  async cancel(requestId: string, receiptToken: string, password: string): Promise<Record<string, unknown>> {
    const response = await postApiPublicAccountDeletionRequestsByRequestIdCancel({
      path: { requestId },
      body: { password },
      headers: withHeader('X-Account-Deletion-Receipt', receiptToken),
      throwOnError: true,
    });
    return response.data as unknown as Record<string, unknown>;
  },
};
