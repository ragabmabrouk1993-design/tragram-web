import {
    postApiAuthPasswordResetRequest,
    postApiAuthPasswordResetResend,
    postApiAuthFingerprintChallenge,
    postApiAuthSignin,
    postApiAuthSigninResend,
    postApiAuthSignup,
    postApiAuthSignupResend,
} from "@/lib/api-client";
import { authService } from "./auth.service";

jest.mock("@/lib/api-client-setup", () => ({
    initApiClient: jest.fn(),
}));

jest.mock("@/lib/api-client", () => {
    const mock = () => jest.fn();
    return {
        getApiAuthMe: mock(),
        postApiAuthChangePassword: mock(),
        postApiAuthLogout: mock(),
        postApiAuthPasswordResetComplete: mock(),
        postApiAuthPasswordResetRequest: mock(),
        postApiAuthPasswordResetResend: mock(),
        postApiAuthPasswordResetVerify: mock(),
        postApiAuthSignin: mock(),
        postApiAuthSigninResend: mock(),
        postApiAuthSigninVerify: mock(),
        postApiAuthSignup: mock(),
        postApiAuthSignupResend: mock(),
        postApiAuthSignupVerify: mock(),
        postApiAuthFingerprintChallenge: mock(),
    };
});

const gatewayDelivery = {
    channel: "telegram_gateway" as const,
    status: "otp_sent" as const,
    expiresIn: 300,
};

describe("authService Telegram delivery contracts", () => {
    beforeEach(() => jest.clearAllMocks());

    it("uses generated SDK calls and preserves Gateway signup/login delivery", async () => {
        (postApiAuthSignup as jest.Mock).mockResolvedValue({ data: { delivery: gatewayDelivery } });
        (postApiAuthSignupResend as jest.Mock).mockResolvedValue({ data: { delivery: gatewayDelivery } });
        (postApiAuthSignin as jest.Mock).mockResolvedValue({ data: { delivery: gatewayDelivery } });
        (postApiAuthSigninResend as jest.Mock).mockResolvedValue({ data: { delivery: gatewayDelivery } });

        const signup = await authService.signup({
            phoneNumber: "+905551234567",
            email: "new@example.com",
            password: "password-123",
            firstName: "New",
            lastName: "User",
        });
        const signupResend = await authService.resendSignup("+905551234567");
        const signin = await authService.signin({ phoneNumber: "+905551234567", password: "password-123" });
        const signinResend = await authService.resendSignin({
            phoneNumber: "+905551234567",
            password: "password-123",
        });

        expect(signup.delivery).toEqual(gatewayDelivery);
        expect(signupResend.delivery).toEqual(gatewayDelivery);
        expect(signin.delivery).toEqual(gatewayDelivery);
        expect(signinResend.delivery).toEqual(gatewayDelivery);
        expect(postApiAuthSignup).toHaveBeenCalledWith({
            body: expect.objectContaining({ phoneNumber: "+905551234567", signupPlatform: "WEB" }),
            throwOnError: true,
        });
        expect(postApiAuthSignupResend).toHaveBeenCalledWith({
            body: { phoneNumber: "+905551234567" },
            throwOnError: true,
        });
        expect(postApiAuthSignin).toHaveBeenCalledWith({
            body: { phoneNumber: "+905551234567", password: "password-123" },
            throwOnError: true,
        });
        expect(postApiAuthSigninResend).toHaveBeenCalledWith({
            body: { phoneNumber: "+905551234567", password: "password-123" },
            throwOnError: true,
        });
    });

    it("uses opaque challenge IDs for password-reset requests and resends", async () => {
        const challenge = { challengeId: "challenge-1", delivery: gatewayDelivery };
        (postApiAuthPasswordResetRequest as jest.Mock).mockResolvedValue({ data: challenge });
        (postApiAuthPasswordResetResend as jest.Mock).mockResolvedValue({ data: challenge });

        await expect(authService.requestPasswordReset("+905551234567")).resolves.toEqual(challenge);
        await expect(authService.resendPasswordReset("challenge-1")).resolves.toEqual(challenge);

        expect(postApiAuthPasswordResetRequest).toHaveBeenCalledWith({
            body: { phoneNumber: "+905551234567" },
            throwOnError: true,
        });
        expect(postApiAuthPasswordResetResend).toHaveBeenCalledWith({
            body: { challengeId: "challenge-1" },
            throwOnError: true,
        });
    });
});

describe("authService browser trial challenge", () => {
    test("uses the generated challenge endpoint and preserves its additive response", async () => {
        const challenge = {
            success: true,
            challenge_id: "challenge-1",
            nonce: "nonce-1",
            expires_at: new Date("2026-09-13T17:00:00.000Z"),
        };
        (postApiAuthFingerprintChallenge as jest.Mock).mockResolvedValue({ data: challenge });

        await expect(authService.getFingerprintChallenge()).resolves.toBe(challenge);
        expect(postApiAuthFingerprintChallenge).toHaveBeenCalledWith({ throwOnError: true });
    });
});
