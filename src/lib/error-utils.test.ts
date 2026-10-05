import type { Dictionary } from "@/lib/i18n";
import {
    getApiErrorDetails,
    getErrorCode,
    getErrorMessage,
    getLocalizedErrorMessage,
    resolveApiError,
} from "./error-utils";

const dict = {
    apiErrors: {
        AUTH_OTP_RATE_LIMIT: "Try again in {seconds} seconds.",
        AUTH_OTP_RATE_LIMIT_UNKNOWN: "Please wait before requesting another code.",
        VALIDATION_ERROR: "Validation failed.",
    },
} as unknown as Dictionary;

const buildApiError = (data: Record<string, unknown>) => ({
    response: { data },
});

describe("error-utils", () => {
    test("localizes existing errorCode and code-only error envelopes", () => {
        const messages = { apiErrors: { ACCOUNT_NOT_FOUND: "This account could not be found." } } as unknown as Dictionary;
        for (const payload of [{ errorCode: "ACCOUNT_NOT_FOUND", error: "provider detail" }, { error: "ACCOUNT_NOT_FOUND" }]) {
            expect(getLocalizedErrorMessage(buildApiError(payload), messages)).toBe("This account could not be found.");
        }
    });
    test("localizes an exact legacy Telegram message without accepting arbitrary provider text", () => {
        const legacyDict = { apiErrors: { TELEGRAM_PASSWORD_INVALID: 'كلمة مرور تيليجرام غير صحيحة.' } } as unknown as Dictionary;
        expect(getLocalizedErrorMessage(buildApiError({ message: 'Invalid Telegram password.' }), legacyDict)).toBe('كلمة مرور تيليجرام غير صحيحة.');
        expect(getLocalizedErrorMessage(buildApiError({ message: 'Invalid Telegram password. INTERNAL_DETAIL' }), legacyDict)).toBeUndefined();
    });
    test("does not expose an unknown provider message as user-facing copy", () => {
        const error = buildApiError({ message: "Request was unsuccessful 1 time(s)" });
        expect(getLocalizedErrorMessage(error, dict)).toBeUndefined();
        expect(getErrorMessage(error)).toBeUndefined();
        expect(resolveApiError(error, dict).rawMessage).toBe("Request was unsuccessful 1 time(s)");
    });

    test("does not expose arbitrary validation details or crash on malformed messages", () => {
        expect(getLocalizedErrorMessage(buildApiError({ details: ["SELECT secret FROM users"] }), dict)).toBeUndefined();
        expect(() => resolveApiError(buildApiError({ message: { internal: true }, details: [null, 12] }), dict)).not.toThrow();
    });

    test("does not display a duration placeholder when a retry time is unavailable", () => {
        expect(getLocalizedErrorMessage(buildApiError({ code: "AUTH_OTP_RATE_LIMIT" }), dict)).not.toContain("{seconds}");
    });
    test("retains uncoded messages for diagnostics only", () => {
        const error = buildApiError({
            message: "Primary account is unavailable.",
        });

        expect(resolveApiError(error, dict).rawMessage).toBe("Primary account is unavailable.");
        expect(getErrorMessage(error)).toBeUndefined();
        expect(getLocalizedErrorMessage(error, dict)).toBeUndefined();
    });

    test("returns payload error when message is absent", () => {
        const error = buildApiError({
            error: "Reconnect cooldown active (30s remaining): Account is not connected",
        });

        expect(resolveApiError(error, dict).rawMessage).toBe(
            "Reconnect cooldown active (30s remaining): Account is not connected"
        );
        expect(getLocalizedErrorMessage(error, dict)).toBeUndefined();
    });

    test("localizes otp rate limit and preserves code/details metadata", () => {
        const error = buildApiError({
            code: "AUTH_OTP_RATE_LIMIT",
            message: "Please wait 30 seconds before requesting another OTP.",
            details: ["Please wait 30 seconds before requesting another OTP."],
        });

        expect(getErrorCode(error)).toBe("AUTH_OTP_RATE_LIMIT");
        expect(getApiErrorDetails(error)).toEqual([
            "Please wait 30 seconds before requesting another OTP.",
        ]);
        expect(getLocalizedErrorMessage(error, dict)).toBe(
            "Try again in 30 seconds."
        );
    });

    test("localizes the actionable Telegram Gateway recipient error", () => {
        const error = buildApiError({
            code: "TELEGRAM_GATEWAY_RECIPIENT_UNAVAILABLE",
            message: "This phone number cannot receive Telegram verification codes.",
        });
        const localized = "Use a phone number registered with Telegram.";
        const localizedDict = {
            apiErrors: {
                TELEGRAM_GATEWAY_RECIPIENT_UNAVAILABLE: localized,
            },
        } as unknown as Dictionary;

        expect(getErrorCode(error)).toBe("TELEGRAM_GATEWAY_RECIPIENT_UNAVAILABLE");
        expect(getLocalizedErrorMessage(error, localizedDict)).toBe(localized);
    });

    test("falls back safely for unknown errors", () => {
        const error = new Error("Unexpected failure");
        const normalized = resolveApiError(error, dict);

        expect(normalized.localizedMessage).toBeUndefined();
        expect(normalized.rawMessage).toBe("Unexpected failure");
        expect(getLocalizedErrorMessage({}, dict)).toBeUndefined();
    });
});
