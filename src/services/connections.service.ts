import {
  deleteApiMtAccountsByAccountId,
  getApiMtAccounts,
  getApiMtPublicKey,
  getApiMtBrokersSearch,
  getApiTelegramAuthStatus,
  patchApiMtAccountsByAccountId,
  postApiMtAccountsByAccountIdDisconnect,
  postApiMtConnect,
  postApiTelegramAuthDisconnect,
  postApiTelegramAuthRequestCode,
  postApiTelegramAuthVerifyCode,
  postApiTelegramAuthVerifyPassword,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import type {
  GetApiMtBrokersSearchResponse,
  MtAccount,
  TelegramRequestCodeResponse,
  TelegramStatusResponse,
  TelegramVerifyResponse,
} from "@/lib/api-client";
import { encryptMtCredentials, type MtPlainCredentials } from "@/lib/mt-encryption";
import { normalizeSubscriptionReadStatus, type NormalizedSubscriptionReadStatus } from "@/lib/subscription-read-status";

initApiClient();

type MtBrokerSearchParams = {
  server: string;
  platform?: "MT4" | "MT5";
};

type MtBrokerSearchResponse = GetApiMtBrokersSearchResponse;
type TelegramGenericResponse = TelegramVerifyResponse;

type ConnectMtParams = MtPlainCredentials;

export const connectionsService = {
    getTelegramStatus: async (): Promise<TelegramStatusResponse> => {
        const response = await getApiTelegramAuthStatus({
            throwOnError: true,
        });
        return response.data as unknown as TelegramStatusResponse;
    },
    requestTelegramCode: async (phoneNumber: string): Promise<TelegramRequestCodeResponse> => {
        const response = await postApiTelegramAuthRequestCode({
            body: { phoneNumber },
            throwOnError: true,
        });
        return response.data;
    },
    verifyTelegramCode: async (params: { phoneNumber: string; phoneCode: string; phoneCodeHash: string }): Promise<TelegramGenericResponse> => {
        const response = await postApiTelegramAuthVerifyCode({
            body: params,
            throwOnError: true,
        });
        return response.data;
    },
    verifyTelegramPassword: async (password: string): Promise<TelegramGenericResponse> => {
        const response = await postApiTelegramAuthVerifyPassword({
            body: { password },
            throwOnError: true,
        });
        return response.data;
    },
    disconnectTelegram: async (): Promise<TelegramGenericResponse> => {
        const response = await postApiTelegramAuthDisconnect({
            throwOnError: true,
        });
        return response.data;
    },
    searchMtBrokers: async ({ server, platform }: MtBrokerSearchParams, signal?: AbortSignal): Promise<MtBrokerSearchResponse> => {
        const response = await getApiMtBrokersSearch({
            query: { server, platform },
            throwOnError: true,
            signal,
        });
        return response.data;
    },
    getMtAccounts: async (): Promise<MtAccount[]> => {
        const response = await getApiMtAccounts({
            throwOnError: true,
        });
        return response.data.data ?? [];
    },
    getMtAccountsWithStatus: async (): Promise<{
        accounts: MtAccount[];
        status: NormalizedSubscriptionReadStatus;
    }> => {
        const response = await getApiMtAccounts({
            throwOnError: true,
        });
        return {
            accounts: response.data.data ?? [],
            status: normalizeSubscriptionReadStatus(response.data),
        };
    },
    connectMt: async (credentials: ConnectMtParams) => {
        const publicKeyResponse = await getApiMtPublicKey({
            throwOnError: true,
        });
        const encrypted = await encryptMtCredentials(credentials, publicKeyResponse.data.publicKey);
        const response = await postApiMtConnect({
            body: { encrypted },
            throwOnError: true,
        });
        return response.data;
    },
    deleteMtAccount: async (accountId: string, confirmationAccountNumber: string) => {
        const response = await deleteApiMtAccountsByAccountId({
            path: { accountId },
            body: { confirmationAccountNumber },
            throwOnError: true,
        });
        return response.data;
    },
    disconnectMtAccount: async (accountId: string) => {
        const response = await postApiMtAccountsByAccountIdDisconnect({
            path: { accountId },
            throwOnError: true,
        });
        return response.data;
    },
    setMtAccountActive: async (accountId: string, isActive: boolean) => {
        const response = await patchApiMtAccountsByAccountId({
            path: { accountId },
            body: { isActive },
            throwOnError: true,
        });
        return response.data;
    },
    setSelectedMtAccount: async (accountId: string) => {
        const response = await patchApiMtAccountsByAccountId({
            path: { accountId },
            body: { isSelected: true, isActive: true },
            throwOnError: true,
        });
        return response.data;
    },
    setPrimaryMtAccount: async (accountId: string) => {
        return connectionsService.setSelectedMtAccount(accountId);
    },
};
