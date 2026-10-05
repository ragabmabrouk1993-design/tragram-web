"use client";

import {
    postEmailChangeConfirmNew,
    postEmailChangeRequestNew,
    postEmailChangeRequestOld,
    postEmailChangeVerifyOld,
    postEmailVerificationConfirm,
    postEmailVerificationRequest,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";

initApiClient();

type ApiResponse = {
    success?: boolean;
    message?: string;
    expiresAt?: string;
};

export const emailService = {
    requestEmailVerification: async (): Promise<ApiResponse> => {
        const response = await postEmailVerificationRequest({
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
    confirmEmailVerification: async (code: string): Promise<ApiResponse> => {
        const response = await postEmailVerificationConfirm({
            body: { code },
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
    requestChangeOld: async (): Promise<ApiResponse> => {
        const response = await postEmailChangeRequestOld({
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
    confirmChangeOld: async (code: string): Promise<ApiResponse> => {
        const response = await postEmailChangeVerifyOld({
            body: { code },
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
    requestChangeNew: async (newEmail: string): Promise<ApiResponse> => {
        const response = await postEmailChangeRequestNew({
            body: { newEmail },
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
    confirmChangeNew: async (code: string): Promise<ApiResponse> => {
        const response = await postEmailChangeConfirmNew({
            body: { code },
            throwOnError: true,
        });
        return response.data as ApiResponse;
    },
};
