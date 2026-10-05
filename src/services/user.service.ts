import {
    getApiTrades,
    getApiTradesDashboardSymbolSpecs,
    getApiTradesOrdersCounts,
    getApiUsersActivity,
    getApiUsersDashboardChecklist,
    getApiUsersDashboardSummary,
    getApiUsersPreferences,
    getApiUsersAccountDeletionStatus,
    patchApiUsersPreferences,
    patchApiUsersProfile,
    postApiUsersAccountDeletionCancel,
    postApiUsersAccountDeletionConfirm,
    postApiUsersAccountDeletionRequest,
} from "@/lib/api-client";
import type {
    GetApiTradesData,
    GetApiTradesOrdersCountsData,
    GetApiTradesOrdersCountsResponse,
    GetApiTradesDashboardSymbolSpecsResponse,
    GetApiTradesResponse,
    GetApiUsersDashboardChecklistResponse,
    GetApiUsersDashboardSummaryResponse,
    PatchApiUsersPreferencesData,
    PatchApiUsersPreferencesResponse,
    VerificationDelivery,
    User,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import type { DashboardChecklist, DashboardChecklistStep } from "@/lib/dashboard-checklist";

initApiClient();

export interface UpdateProfileData {
    firstName?: string;
    lastName?: string;
    telegramUserId?: string;
}

export interface UserPreferences {
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    tradeExecutionAlerts: boolean;
    performanceReports: boolean;
    reportFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    preferredLanguage?: "en" | "ar" | null;
    allowedReportFrequencies?: Array<"DAILY" | "WEEKLY" | "MONTHLY">;
}

export interface UpdatePreferencesData {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    tradeExecutionAlerts?: boolean;
    performanceReports?: boolean;
    reportFrequency?: "DAILY" | "WEEKLY" | "MONTHLY";
    preferredLanguage?: "en" | "ar" | null;
}

export type GetUserTradesParams = NonNullable<GetApiTradesData["query"]>;

export interface RequestAccountDeletionPayload {
    reasonCode:
    | "MULTIPLE_ACCOUNTS"
    | "NO_LONGER_USE_APP"
    | "NOT_SATISFIED"
    | "PRIVACY_SECURITY_CONCERNS"
    | "TECHNICAL_ISSUES"
    | "ALTERNATIVE_SERVICE"
    | "STOP_TRADING"
    | "ACCOUNT_INFO_INCORRECT"
    | "CREATE_NEW_ACCOUNT"
    | "OTHER";
    reasonDetails?: string;
    isResend?: boolean;
}

export interface SecureDeactivateAccountPayload {
    requestId: string;
    phoneNumber: string;
    otpCode: string;
    password: string;
    mode: "IMMEDIATE" | "SCHEDULED";
    verificationSessionToken: string;
    idempotencyKey?: string;
}

export interface RequestAccountDeletionResponse {
    success: boolean;
    message: string;
    expiresIn?: number;
    requestId: string;
    availableModes: Array<"IMMEDIATE" | "SCHEDULED">;
    verificationSessionToken?: string;
    verificationExpiresAt?: string;
    delivery?: {
        channel: "telegram_gateway";
        status: "otp_sent" | "delivery_pending";
        expiresIn: number;
    };
}

export interface ConfirmAccountDeletionResponse {
    success: boolean;
    message: string;
    mode: "IMMEDIATE" | "SCHEDULED";
    status: string;
    requestId: string;
    scheduledFor?: string | null;
    receiptToken?: string;
    receiptExpiresAt?: string;
    policyVersion?: string;
    supportPath?: string;
}

export interface AccountDeletionStatusResponse {
    success: boolean;
    deletedAt: string | null;
    deletionScheduledFor: string | null;
    request: {
        id: string;
        mode: "IMMEDIATE" | "SCHEDULED";
        status: string;
        reasonCode: RequestAccountDeletionPayload["reasonCode"];
        reasonLabel?: string | null;
        reasonDetails?: string | null;
        scheduledFor?: string | null;
        confirmedAt?: string | null;
        executedAt?: string | null;
        cancelledAt?: string | null;
        failureReason?: string | null;
    } | null;
}

export interface CancelAccountDeletionResponse {
    success: boolean;
    message: string;
    status: string;
    requestId: string;
}

export type DashboardChecklistResponse = DashboardChecklist;
export type DashboardSummaryResponse = GetApiUsersDashboardSummaryResponse;
export type DashboardOrdersPageParams = NonNullable<GetApiTradesData["query"]>;
export type DashboardOrdersCountsParams = NonNullable<GetApiTradesOrdersCountsData["query"]>;
export type DashboardSymbolSpecsResponse = GetApiTradesDashboardSymbolSpecsResponse;

export const userService = {
    // Get user preferences
    getPreferences: async (): Promise<UserPreferences> => {
        const response = await getApiUsersPreferences({
            throwOnError: true,
        });
        const payload = response.data;
        const preferences = payload.preferences;

        return {
            notificationsEnabled: preferences?.notificationsEnabled ?? true,
            emailNotifications: preferences?.emailNotifications ?? true,
            pushNotifications: preferences?.pushNotifications ?? true,
            tradeExecutionAlerts: preferences?.tradeExecutionAlerts ?? true,
            performanceReports: preferences?.performanceReports ?? true,
            reportFrequency: preferences?.reportFrequency ?? "WEEKLY",
            preferredLanguage:
                preferences?.preferredLanguage === "en" || preferences?.preferredLanguage === "ar"
                    ? preferences.preferredLanguage
                    : null,
            ...(payload.allowedReportFrequencies
                ? { allowedReportFrequencies: payload.allowedReportFrequencies }
                : {}),
        };
    },

    // Update user preferences
    updatePreferences: async (
        data: PatchApiUsersPreferencesData["body"]
    ): Promise<PatchApiUsersPreferencesResponse> => {
        const response = await patchApiUsersPreferences({
            body: data,
            throwOnError: true,
        });
        return response.data;
    },

    // Update user profile
    updateProfile: async (data: UpdateProfileData): Promise<User> => {
        const response = await patchApiUsersProfile({
            body: data,
            throwOnError: true,
        });
        return response.data.user ?? {};
    },

    // Get user activity
    getUserActivity: async (params?: { page?: number; limit?: number }) => {
        const response = await getApiUsersActivity({
            query: params,
            throwOnError: true,
        });
        return response.data;
    },

    // Get dashboard summary
    getUserStats: async (): Promise<DashboardSummaryResponse> => {
        const response = await getApiUsersDashboardSummary({
            throwOnError: true,
        });
        return response.data;
    },

    // Get user trades
    getUserTrades: async (params?: GetUserTradesParams): Promise<GetApiTradesResponse> => {
        const response = await getApiTrades({
            query: params,
            throwOnError: true,
        });
        return response.data;
    },

    // Get dashboard checklist
    getDashboardChecklist: async (): Promise<DashboardChecklistResponse> => {
        const response = await getApiUsersDashboardChecklist({
            throwOnError: true,
        });
        const data: GetApiUsersDashboardChecklistResponse = response.data;
        const steps: DashboardChecklistStep[] = (data.steps ?? []).map((step) => ({
            key: step.key ?? "",
            label: step.label ?? "",
            completed: Boolean(step.completed),
            ...(typeof step.count === "number" ? { count: step.count } : {}),
        }));
        const completed = data.completed ?? steps.filter((step) => step.completed).length;
        const total = data.total ?? steps.length;

        return {
            steps,
            completed,
            total,
            isCompleted: data.isCompleted ?? (total > 0 && completed >= total),
            ...(data.metricsScope ? { metricsScope: data.metricsScope } : {}),
            ...(data.metricsAccountId !== undefined ? { metricsAccountId: data.metricsAccountId } : {}),
        ...(data.metricsReasonCode ? { metricsReasonCode: data.metricsReasonCode } : {}),
            ...(data.subscriptionPaused !== undefined
                ? { subscriptionPaused: data.subscriptionPaused }
                : {}),
            ...(data.subscriptionPauseReason !== undefined
                ? { subscriptionPauseReason: data.subscriptionPauseReason }
                : {}),
            ...(data.subscriptionPauseMessage !== undefined
                ? { subscriptionPauseMessage: data.subscriptionPauseMessage }
                : {}),
        };
    },

    getDashboardOrdersPage: async (
        params: DashboardOrdersPageParams
    ): Promise<GetApiTradesResponse> => {
        const response = await getApiTrades({
            query: params,
            throwOnError: true,
        });
        return response.data;
    },

    getDashboardOrdersCounts: async (
        params?: DashboardOrdersCountsParams
    ): Promise<GetApiTradesOrdersCountsResponse> => {
        const response = await getApiTradesOrdersCounts({
            query: params,
            throwOnError: true,
        });
        return response.data;
    },

    getDashboardSymbolSpecs: async (): Promise<DashboardSymbolSpecsResponse> => {
        const response = await getApiTradesDashboardSymbolSpecs({
            throwOnError: true,
        });
        return response.data;
    },

    // Confirm account deletion
    confirmAccountDeletion: async (
        data: SecureDeactivateAccountPayload
    ): Promise<ConfirmAccountDeletionResponse> => {
        const response = await postApiUsersAccountDeletionConfirm({
            body: data,
            throwOnError: true,
        });
        return response.data as unknown as ConfirmAccountDeletionResponse;
    },

    // Request account deletion
    requestAccountDeletion: async (
        data: RequestAccountDeletionPayload
    ): Promise<RequestAccountDeletionResponse> => {
        const response = await postApiUsersAccountDeletionRequest({
            body: data,
            throwOnError: true,
        });
        return {
            ...(response.data as unknown as RequestAccountDeletionResponse),
            delivery: response.data.delivery as VerificationDelivery | RequestAccountDeletionResponse["delivery"] | undefined,
        };
    },

    getAccountDeletionStatus: async (): Promise<AccountDeletionStatusResponse> => {
        const response = await getApiUsersAccountDeletionStatus({
            throwOnError: true,
        });
        return response.data as unknown as AccountDeletionStatusResponse;
    },

    cancelAccountDeletion: async (requestId: string): Promise<CancelAccountDeletionResponse> => {
        const response = await postApiUsersAccountDeletionCancel({
            body: { requestId },
            throwOnError: true,
        });
        return response.data as unknown as CancelAccountDeletionResponse;
    },
};
