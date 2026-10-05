import {
    DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
    formatOtpCountdown,
    parseOtpRetryAfterSeconds,
} from "./otp-verification-panel";

describe("otp-verification-panel helpers", () => {
    test("uses a two-minute default resend cooldown", () => {
        expect(DEFAULT_OTP_RESEND_COOLDOWN_SECONDS).toBe(2 * 60);
    });

    test("formatOtpCountdown clamps negative values and renders two digit seconds", () => {
        expect(formatOtpCountdown(30)).toBe("00:30");
        expect(formatOtpCountdown(5)).toBe("00:05");
        expect(formatOtpCountdown(-4)).toBe("00:00");
    });

    test("parseOtpRetryAfterSeconds reads positive wait seconds from rate-limit messages", () => {
        expect(parseOtpRetryAfterSeconds("Please wait 42 seconds before requesting another code")).toBe(42);
        expect(parseOtpRetryAfterSeconds("try again later")).toBeNull();
        expect(parseOtpRetryAfterSeconds("Please wait 0 seconds")).toBeNull();
    });
});
