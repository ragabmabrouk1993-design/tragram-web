import type {
    RequestAccountDeletionPayload,
    SecureDeactivateAccountPayload,
} from "@/services/user.service";

export type DeleteFlowStep = "reason_step" | "verify_step" | "scheduled_step";
export type DeleteReasonCode = RequestAccountDeletionPayload["reasonCode"];
export type DeleteExecutionMode = SecureDeactivateAccountPayload["mode"];

export const DELETE_REASON_CODES: DeleteReasonCode[] = [
    "MULTIPLE_ACCOUNTS",
    "NO_LONGER_USE_APP",
    "NOT_SATISFIED",
    "PRIVACY_SECURITY_CONCERNS",
    "TECHNICAL_ISSUES",
    "ALTERNATIVE_SERVICE",
    "STOP_TRADING",
    "ACCOUNT_INFO_INCORRECT",
    "CREATE_NEW_ACCOUNT",
    "OTHER",
];

export const nextStepAfterDeletionRequest = (): DeleteFlowStep => "verify_step";

export const validateDeleteReasonSelection = (
    reasonCode: DeleteReasonCode | null,
    reasonDetails: string
): "missing_reason" | "missing_other_details" | null => {
    if (!reasonCode) {
        return "missing_reason";
    }

    if (reasonCode === "OTHER" && reasonDetails.trim().length < 3) {
        return "missing_other_details";
    }

    return null;
};

export const buildDeleteReasonPayload = (input: {
    reasonCode: DeleteReasonCode | null;
    reasonDetails: string;
}): RequestAccountDeletionPayload | null => {
    const validation = validateDeleteReasonSelection(input.reasonCode, input.reasonDetails);
    if (validation || !input.reasonCode) {
        return null;
    }

    const trimmedDetails = input.reasonDetails.trim();

    return {
        reasonCode: input.reasonCode,
        ...(trimmedDetails ? { reasonDetails: trimmedDetails } : {}),
    };
};

export const buildSecureDeactivatePayload = (input: {
    requestId: string;
    phoneNumber: string;
    otpCode: string;
    password: string;
    mode: DeleteExecutionMode;
    verificationSessionToken: string;
}): SecureDeactivateAccountPayload | null => {
    const requestId = input.requestId.trim();
    const phoneNumber = input.phoneNumber.trim();
    const otpCode = input.otpCode.trim();
    const password = input.password.trim();
    const verificationSessionToken = input.verificationSessionToken.trim();

    if (!requestId || !phoneNumber || !otpCode || !password || !verificationSessionToken) {
        return null;
    }

    return {
        requestId,
        phoneNumber,
        otpCode,
        password: input.password,
        mode: input.mode,
        verificationSessionToken,
    };
};
