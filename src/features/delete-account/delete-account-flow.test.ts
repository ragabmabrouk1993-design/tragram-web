import {
    buildDeleteReasonPayload,
    buildSecureDeactivatePayload,
    nextStepAfterDeletionRequest,
    validateDeleteReasonSelection,
} from "./delete-account-flow";

describe("delete-account flow helpers", () => {
    test("blocks reason step submission when no reason is selected", () => {
        expect(validateDeleteReasonSelection(null, "")).toBe("missing_reason");
    });

    test("requires details when reason is OTHER", () => {
        expect(validateDeleteReasonSelection("OTHER", "   ")).toBe("missing_other_details");
    });

    test("builds reason payload with trimmed details", () => {
        expect(
            buildDeleteReasonPayload({
                reasonCode: "OTHER",
                reasonDetails: "  I want to leave now  ",
            })
        ).toEqual({
            reasonCode: "OTHER",
            reasonDetails: "I want to leave now",
        });
    });

    test("moves to verify step after deletion request success", () => {
        expect(nextStepAfterDeletionRequest()).toBe("verify_step");
    });

    test("builds secure deactivation payload only when fields are present", () => {
        expect(
            buildSecureDeactivatePayload({
                requestId: "req-1",
                phoneNumber: "+201234567890",
                otpCode: "123456",
                password: "Secret123!",
                verificationSessionToken: "S".repeat(43),
                mode: "IMMEDIATE",
            })
        ).toEqual({
            requestId: "req-1",
            phoneNumber: "+201234567890",
            otpCode: "123456",
            password: "Secret123!",
            verificationSessionToken: "S".repeat(43),
            mode: "IMMEDIATE",
        });

        expect(
            buildSecureDeactivatePayload({
                requestId: "",
                phoneNumber: "",
                otpCode: "123456",
                password: "Secret123!",
                verificationSessionToken: "S".repeat(43),
                mode: "IMMEDIATE",
            })
        ).toBeNull();
    });
});
