import {
    getApiAuthMe,
    postApiAuthFingerprintChallenge,
    postApiAuthChangePassword,
    postApiAuthLogout,
    postApiAuthPasswordResetComplete,
    postApiAuthPasswordResetRequest,
    postApiAuthPasswordResetResend,
    postApiAuthPasswordResetVerify,
    postApiAuthSignin,
    postApiAuthSigninResend,
    postApiAuthSigninVerify,
    postApiAuthSignup,
    postApiAuthSignupResend,
    postApiAuthSignupVerify,
    type AuthOtpSentResponse,
    type AuthTokensWithUserResponse,
    type TrialFingerprintChallengeResponse,
    type PasswordResetChallengeResponse,
    type PasswordResetVerifyResponse,
    type PostApiAuthPasswordResetCompleteData,
    type PostApiAuthSigninData,
    type PostApiAuthSigninVerifyData,
    type PostApiAuthPasswordResetVerifyData,
    type PostApiAuthSignupData,
    type PostApiAuthSignupVerifyData,
    type SuccessMessageResponse,
    type User,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import type { TelegramDelivery } from "@/lib/telegram-delivery";

export type { TelegramDelivery } from "@/lib/telegram-delivery";

initApiClient();

export type SignupData = PostApiAuthSignupData["body"];
export type VerifySignupData = PostApiAuthSignupVerifyData["body"];
export type SigninData = PostApiAuthSigninData["body"];
export type VerifySigninData = PostApiAuthSigninVerifyData["body"];

export type AuthOtpDeliveryResponse = Omit<AuthOtpSentResponse, "delivery"> & {
    delivery?: TelegramDelivery;
};

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

const toAuthResponse = (payload: AuthTokensWithUserResponse): AuthResponse => {
    const maybeUser = payload.user;
    const user =
        maybeUser && typeof maybeUser === "object" && !Array.isArray(maybeUser)
            ? (maybeUser as User)
            : {};

    return {
        accessToken: payload.tokens?.accessToken ?? "",
        refreshToken: payload.tokens?.refreshToken ?? "",
        user,
    };
};

export const authService = {
    // Signup Flow
    signup: async (data: SignupData): Promise<AuthOtpDeliveryResponse> => {
        const response = await postApiAuthSignup({
            body: { ...data, signupPlatform: "WEB" },
            throwOnError: true,
        });
        return response.data as unknown as AuthOtpDeliveryResponse;
    },

    resendSignup: async (phoneNumber: string): Promise<AuthOtpDeliveryResponse> => {
        const response = await postApiAuthSignupResend({
            body: { phoneNumber },
            throwOnError: true,
        });
        return response.data as unknown as AuthOtpDeliveryResponse;
    },

    verifySignup: async (data: VerifySignupData): Promise<AuthResponse> => {
        const response = await postApiAuthSignupVerify({
            body: data,
            throwOnError: true,
        });
        return toAuthResponse(response.data);
    },

    getFingerprintChallenge: async (): Promise<TrialFingerprintChallengeResponse> => {
        const response = await postApiAuthFingerprintChallenge({ throwOnError: true });
        return response.data;
    },

    // Signin Flow
    signin: async (data: SigninData): Promise<AuthOtpDeliveryResponse> => {
        const response = await postApiAuthSignin({
            body: data,
            throwOnError: true,
        });
        return response.data as unknown as AuthOtpDeliveryResponse;
    },

    resendSignin: async (data: SigninData): Promise<AuthOtpDeliveryResponse> => {
        const response = await postApiAuthSigninResend({
            body: data,
            throwOnError: true,
        });
        return response.data as unknown as AuthOtpDeliveryResponse;
    },

    verifySignin: async (data: VerifySigninData): Promise<AuthResponse> => {
        const response = await postApiAuthSigninVerify({
            body: data,
            throwOnError: true,
        });
        return toAuthResponse(response.data);
    },

    // Password Reset Flow
    requestPasswordReset: async (phoneNumber: string): Promise<PasswordResetChallengeResponse> => {
        const response = await postApiAuthPasswordResetRequest({
            body: { phoneNumber },
            throwOnError: true,
        });
        return response.data;
    },

    resendPasswordReset: async (challengeId: string): Promise<PasswordResetChallengeResponse> => {
        const response = await postApiAuthPasswordResetResend({
            body: { challengeId },
            throwOnError: true,
        });
        return response.data as PasswordResetChallengeResponse;
    },

    verifyPasswordReset: async (
        data: PostApiAuthPasswordResetVerifyData["body"]
    ): Promise<PasswordResetVerifyResponse> => {
        const response = await postApiAuthPasswordResetVerify({
            body: data,
            throwOnError: true,
        });
        return response.data;
    },

    completePasswordReset: async (
        data: PostApiAuthPasswordResetCompleteData["body"]
    ): Promise<SuccessMessageResponse> => {
        const response = await postApiAuthPasswordResetComplete({
            body: data,
            throwOnError: true,
        });
        return response.data;
    },

    // User Profile
    getProfile: async (): Promise<User> => {
        const response = await getApiAuthMe({
            throwOnError: true,
        });
        return response.data.user ?? {};
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await getApiAuthMe({
            throwOnError: true,
        });
        return response.data.user ?? {};
    },

    // Change Password (authenticated)
    changePassword: async (
        currentPassword: string,
        newPassword: string
    ): Promise<SuccessMessageResponse> => {
        const response = await postApiAuthChangePassword({
            body: { currentPassword, newPassword },
            throwOnError: true,
        });
        return response.data;
    },

    // Logout
    logout: async (pushToken?: string): Promise<SuccessMessageResponse> => {
        const response = await postApiAuthLogout({
            ...(pushToken ? { body: { pushToken } } : {}),
            throwOnError: true,
        });
        return response.data;
    },
};
