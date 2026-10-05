import {
    getApiReferrals,
    getApiReferralsCommissions,
    getApiReferralsLevels,
    getApiReferralsSummary,
    getApiReferralsWithdrawalOptions,
    getApiReferralsWithdrawals,
    postApiReferralsWithdrawals,
    postApiReferralsWithdrawalsVerificationCode,
    type ReferralWithdrawalVerificationCodeResponse,
    type GetApiReferralsData,
    type GetApiReferralsLevelsResponse,
    type GetApiReferralsResponse,
    type GetApiReferralsSummaryResponse,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";

initApiClient();

export type ReferralSummary = NonNullable<GetApiReferralsSummaryResponse["data"]>;
export type ReferralCommissionLevel = NonNullable<NonNullable<GetApiReferralsLevelsResponse["data"]>[number]>;
export type ReferralListPayload = NonNullable<GetApiReferralsResponse["data"]>;
export type ReferralListItem = NonNullable<ReferralListPayload["items"]>[number];
export type ReferralStatusFilter = NonNullable<NonNullable<GetApiReferralsData["query"]>["status"]>;

export type ReferralCommissionStatus = "PENDING" | "DUE" | "PAID" | "VOIDED";
export type ReferralWithdrawalStatus = "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED";

export type ReferralSafeUser = {
    id: string;
    email: string;
    fullName: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: string;
    isActive?: boolean;
    createdAt?: string;
    lastLoginAt?: string | null;
    phoneNumber?: string | null;
    phoneVerified?: boolean;
    telegramUserId?: string | null;
    emailVerified?: boolean;
    counts?: Record<string, number>;
};

export type ReferralPayoutNetwork = {
    id: string;
    methodId: string;
    code: string;
    label: string;
    minimumAmount: number | null;
    effectiveMinimumAmount?: number;
    addressPattern: string | null;
    iconType?: string | null;
    iconKey?: string | null;
    iconUrl?: string | null;
    iconAlt?: string | null;
    recipientFieldLabel?: string | null;
    recipientFieldPlaceholder?: string | null;
    recipientFieldHelp?: string | null;
    recipientValidationMessage?: string | null;
    instructions?: string | null;
    processingTime?: string | null;
    feesNote?: string | null;
    isActive: boolean;
    sortOrder: number;
};

export type ReferralPayoutMethod = {
    id: string;
    code: string;
    label: string;
    type: string;
    assetSymbol: string;
    currency: string;
    minimumAmount: number;
    eligibleRoles: string[];
    isRoleEligible?: boolean;
    iconType?: string | null;
    iconKey?: string | null;
    iconUrl?: string | null;
    iconAlt?: string | null;
    isActive: boolean;
    sortOrder: number;
    networks: ReferralPayoutNetwork[];
};

export type ReferralBalance = {
    currency: string;
    amount: number;
    count: number;
};

export type ReferralWithdrawalOptions = {
    userRole: string | null;
    availableBalances: ReferralBalance[];
    methods: ReferralPayoutMethod[];
    disabledReasons: string[];
};

export type ReferralCommissionHistoryItem = {
    id: string;
    referredUserId: string;
    referredUser: {
        id: string;
        email: string;
        fullName: string;
    };
    invoiceId: string | null;
    provider: string;
    status: ReferralCommissionStatus;
    ratePercent: number;
    sourceAmount: number;
    sourceCurrency: string;
    amount: number;
    currency: string;
    approvedAt: string | null;
    paidAt: string | null;
    voidedAt: string | null;
    createdAt: string;
    updatedAt: string;
    invoice: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        paidAt: string | null;
        createdAt: string;
        planName: string | null;
        subscriptionStatus: string | null;
        billingPeriod: string | null;
    } | null;
    withdrawalRequest: {
        id: string;
        status: ReferralWithdrawalStatus;
        createdAt: string;
        paidAt: string | null;
        rejectedAt: string | null;
    } | null;
};

export type ReferralWithdrawalRequest = {
    id: string;
    userId: string;
    status: ReferralWithdrawalStatus;
    amount: number;
    currency: string;
    commissionCount: number;
    payoutAddress: string;
    userNote: string | null;
    adminNote: string | null;
    transactionHash: string | null;
    paidAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
    user: ReferralSafeUser;
    payoutMethod: ReferralPayoutMethod;
    payoutNetwork: ReferralPayoutNetwork;
    commissions: ReferralCommissionHistoryItem[];
    paidByAdmin: ReferralSafeUser | null;
    rejectedByAdmin: ReferralSafeUser | null;
};

export type ReferralPaginated<T> = {
    items: T[];
    pagination?: {
        page?: number;
        totalPages?: number;
        total?: number;
        hasMore?: boolean;
    };
};

export const referralsService = {
    getSummary: async (): Promise<ReferralSummary> => {
        const response = await getApiReferralsSummary({
            throwOnError: true,
        });
        return response.data.data ?? {};
    },

    getLevels: async (): Promise<ReferralCommissionLevel[]> => {
        const response = await getApiReferralsLevels({
            throwOnError: true,
        });
        return response.data.data ?? [];
    },

    list: async (query: {
        page?: number;
        limit?: number;
        status?: ReferralStatusFilter;
    } = {}): Promise<ReferralListPayload> => {
        const response = await getApiReferrals({
            query,
            throwOnError: true,
        });
        return response.data.data ?? { items: [], pagination: undefined };
    },

    listCommissions: async (query: {
        page?: number;
        limit?: number;
        status?: ReferralCommissionStatus | "all";
    } = {}): Promise<ReferralPaginated<ReferralCommissionHistoryItem>> => {
        const response = await getApiReferralsCommissions({
            query,
            throwOnError: true,
        });
        return (response.data.data as ReferralPaginated<ReferralCommissionHistoryItem> | undefined) ?? { items: [], pagination: undefined };
    },

    getWithdrawalOptions: async (): Promise<ReferralWithdrawalOptions> => {
        const response = await getApiReferralsWithdrawalOptions({
            throwOnError: true,
        });
        return (response.data.data as ReferralWithdrawalOptions | undefined) ?? {
            userRole: null,
            availableBalances: [],
            methods: [],
            disabledReasons: ["NO_ELIGIBLE_PAYOUT_METHOD"],
        };
    },

    listWithdrawals: async (query: {
        page?: number;
        limit?: number;
        status?: ReferralWithdrawalStatus | "all";
    } = {}): Promise<ReferralPaginated<ReferralWithdrawalRequest>> => {
        const response = await getApiReferralsWithdrawals({
            query,
            throwOnError: true,
        });
        return (response.data.data as ReferralPaginated<ReferralWithdrawalRequest> | undefined) ?? { items: [], pagination: undefined };
    },

    requestWithdrawalVerificationCode: async (): Promise<{
        expiresIn: number | null;
        delivery?: NonNullable<NonNullable<ReferralWithdrawalVerificationCodeResponse["data"]>["delivery"]>;
    }> => {
        const response = await postApiReferralsWithdrawalsVerificationCode({
            throwOnError: true,
        });
        return {
            expiresIn: response.data.data?.expiresIn ?? null,
            delivery: response.data.data?.delivery,
        };
    },

    createWithdrawal: async (payload: {
        payoutNetworkId: string;
        payoutAddress: string;
        amount: number;
        verificationCode: string;
        userNote?: string;
    }): Promise<ReferralWithdrawalRequest> => {
        const response = await postApiReferralsWithdrawals({
            body: payload,
            throwOnError: true,
        });
        const request = response.data.data as ReferralWithdrawalRequest | undefined;
        if (!request) throw new Error("Withdrawal request was not returned");
        return request;
    },
};
