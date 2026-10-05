import type { Dictionary } from "@/lib/i18n";

type ApiErrorPayload = {
    message?: string;
    error?: string;
    code?: string;
    errorCode?: string;
    details?: string[];
};

type ApiError = {
    response?: {
        data?: ApiErrorPayload;
    };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isApiError = (value: unknown): value is ApiError => {
    if (!isObject(value)) return false;
    const response = value.response;
    if (!isObject(response)) return false;
    return isObject(response.data);
};

const getApiErrorPayload = (error: unknown): ApiErrorPayload | undefined =>
    isApiError(error) ? error.response?.data : undefined;

const getPayloadMessage = (payload?: ApiErrorPayload): string | undefined => {
    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
        return payload.message;
    }
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
        return payload.error;
    }
    return undefined;
};

const extractRateLimitSeconds = (message?: string): string | undefined => {
    if (!message) return undefined;
    const rateLimitMatch = /Please wait (\d+) seconds/i.exec(message);
    return rateLimitMatch ? rateLimitMatch[1] : undefined;
};

// Exact, owned legacy messages only. Some existing endpoints have no error code;
// translating their known responses avoids a contract change and never trusts
// arbitrary provider text or substring matches.
const legacyMessageKeys: Record<string, string> = {
    'We could not load your Telegram channels. Check your Telegram connection and try again.': 'TELEGRAM_CHANNELS_LOAD_FAILED',
    'We could not confirm whether your channels were added. Refresh your channel list before trying again.': 'TELEGRAM_CHANNELS_ADD_UNCONFIRMED',
    'We could not confirm whether Telegram was disconnected. Check your connection status before trying again.': 'TELEGRAM_DISCONNECT_UNCONFIRMED',
    'Your Telegram connection has expired. Reconnect Telegram to continue.': 'TELEGRAM_CONNECTION_EXPIRED',
    'Your plan has reached its Telegram channel limit. Remove a channel before adding another, or choose a plan with a higher limit.': 'TELEGRAM_CHANNEL_LIMIT_REACHED',
    'Select at least one Telegram channel before continuing.': 'TELEGRAM_CHANNEL_SELECTION_REQUIRED',
    'Choose channels from your saved list or from the catalog, not both at the same time.': 'TELEGRAM_CHANNEL_SOURCE_CONFLICT',
    'Refresh the Telegram channel list before registering catalog channels.': 'TELEGRAM_CATALOG_REFRESH_REQUIRED',
    "breakEvenProfitLockPips must be greater than or equal to 0": "CHANNEL_BREAK_EVEN_LOCK_INVALID",
    "Profit locked at break-even cannot be negative.": "CHANNEL_BREAK_EVEN_LOCK_INVALID",
    "breakEvenTpTarget is required when breakEvenMode is TP_HIT": "CHANNEL_BREAK_EVEN_TARGET_REQUIRED",
    "Choose the take-profit level that should activate break-even.": "CHANNEL_BREAK_EVEN_TARGET_REQUIRED",
    "breakEvenTrigger is required when breakEvenMode is FIXED_PIPS": "CHANNEL_BREAK_EVEN_TRIGGER_REQUIRED",
    "Enter how many pips of profit should activate break-even.": "CHANNEL_BREAK_EVEN_TRIGGER_REQUIRED",
    "trailingStopStepTriggerPips is required when trailingStopEnabled is true for STEP_PIPS": "CHANNEL_TRAILING_TRIGGER_REQUIRED",
    "Enter how many pips the price must move before the trailing stop advances.": "CHANNEL_TRAILING_TRIGGER_REQUIRED",
    "trailingStopStepMovePips is required when trailingStopEnabled is true for STEP_PIPS": "CHANNEL_TRAILING_MOVE_REQUIRED",
    "Enter how many pips the trailing stop should move each time.": "CHANNEL_TRAILING_MOVE_REQUIRED",
    "missingSlConfig is required when allowExecutionWithoutSlTp is true": "CHANNEL_BACKUP_STOP_REQUIRED",
    "Set a backup stop-loss before allowing signals without a stop-loss.": "CHANNEL_BACKUP_STOP_REQUIRED",
    "marketEntryTolerancePips must be a positive number when marketEntryToleranceMode is PIPS": "CHANNEL_PRICE_TOLERANCE_REQUIRED",
    "Enter a price tolerance greater than zero, in pips.": "CHANNEL_PRICE_TOLERANCE_REQUIRED",
    "limitOrderExpirationMinutes is required when signalPendingOrderHandlingEnabled is true": "CHANNEL_PENDING_DURATION_REQUIRED",
    "Enter how many minutes pending orders should remain active.": "CHANNEL_PENDING_DURATION_REQUIRED",
    "No valid fields provided for update": "CHANNEL_SETTINGS_REQUIRED",
    "Choose at least one setting to update.": "CHANNEL_SETTINGS_REQUIRED",
    'To switch trading accounts, select the account you want to use.': 'MT_SELECTION_REQUIRED',
    'We could not reconnect your trading account. Check its connection status before trying again.': 'MT_RECONNECT_UNCONFIRMED',
    'Enter your broker server name to search.': 'MT_SERVER_REQUIRED',
    'Trading account connections are temporarily unavailable. Please try again later.': 'MT_CONNECTION_UNAVAILABLE',
    'Your trading account session is no longer connected. Reconnect the account to continue.': 'MT_CONNECTION_CHECK_DISCONNECTED',
    'Your trading account session has expired. Reconnect the account to continue.': 'MT_CONNECTION_CHECK_EXPIRED',
    'The broker returned a different trading account. Check the account number and reconnect it.': 'MT_CONNECTION_IDENTITY_MISMATCH',
    'Your trading account was checked recently. Please wait a moment and try again.': 'MT_CONNECTION_CHECK_COOLDOWN',
    'We could not reach the trading account service. Please try again shortly.': 'MT_CONNECTION_SERVICE_UNAVAILABLE',
    'We could not reach your broker in time. Please try again shortly.': 'MT_CONNECTION_CHECK_TIMEOUT',
    'We could not confirm the trading account connection. Reconnect the account and try again.': 'MT_CONNECTION_INVALID_RESPONSE',
    'We could not check the trading account connection. Please try again.': 'MT_CONNECTION_CHECK_FAILED',
    "We couldn't find this trading account. Refresh the page and try again.": 'MT_RECONNECT_ACCOUNT_NOT_FOUND',
    'This trading account is unavailable. Contact support if you need help.': 'MT_RECONNECT_BLOCKED',
    'Your trading account is already reconnecting. Please wait a moment and try again.': 'MT_RECONNECT_COOLDOWN',
    'Your saved trading account credentials need to be updated. Reconnect the account with your current details.': 'MT_RECONNECT_CREDENTIALS_REQUIRED',
    'The trading account details were not accepted. Check the account number, password and server, then try again.': 'MT_RECONNECT_CREDENTIALS_INVALID',
    'We could not securely submit your trading account details. Refresh the page and try again.': 'MT_SECURE_SUBMISSION_FAILED',
    'We could not find the trading account for this trade. Check the trade in MetaTrader or contact support.': 'TRADE_ACCOUNT_UNAVAILABLE',
    'We could not identify this trade with your broker. Check it in MetaTrader before trying again.': 'TRADE_REFERENCE_UNAVAILABLE',
    'Your trading account is disconnected. Reconnect it or manage this trade directly in MetaTrader.': 'TRADE_ACCOUNT_DISCONNECTED',
    'This trading platform is not supported. Manage this trade directly in MetaTrader.': 'TRADE_PLATFORM_UNSUPPORTED',
    'Your broker did not confirm this action. Check the trade in MetaTrader before trying again.': 'TRADE_ACTION_UNCONFIRMED',
    'This Telegram account is linked to another Tragram account. Sign in to that Tragram account to disconnect it, or contact support if you cannot access it.': 'TELEGRAM_ACCOUNT_IN_USE',
    'Invalid Telegram password.': 'TELEGRAM_PASSWORD_INVALID',
    'Telegram password is required.': 'TELEGRAM_PASSWORD_REQUIRED',
    'The Telegram verification code is incorrect. Please check the code and try again.': 'TELEGRAM_CODE_INVALID',
    'The Telegram verification code has expired. Please request a new code.': 'TELEGRAM_CODE_EXPIRED',
    'Authentication session expired. Please request a new verification code.': 'TELEGRAM_AUTH_SESSION_EXPIRED',
    'Authentication session mismatch. Please request a new verification code.': 'TELEGRAM_AUTH_SESSION_EXPIRED',
    'Two-factor authentication is not pending for this session.': 'TELEGRAM_AUTH_SESSION_EXPIRED',
    'Too many verification attempts. Please request a new verification code and try again.': 'TELEGRAM_AUTH_ATTEMPTS_EXCEEDED',
    'Too many password attempts. Please request a new verification code and try again.': 'TELEGRAM_AUTH_ATTEMPTS_EXCEEDED',
    "We couldn't send your Telegram verification code. Please try again shortly.": 'TELEGRAM_CODE_SEND_FAILED',
    "We couldn't complete your Telegram connection. Check your connection status before trying again.": 'TELEGRAM_CONNECTION_UNCONFIRMED',
    'Telegram connection is temporarily unavailable. Please try again later.': 'TELEGRAM_CONNECTION_UNAVAILABLE',
};

export type NormalizedApiError = {
    localizedMessage?: string;
    rawMessage?: string;
    code?: string;
    details?: string[];
};

export const resolveApiError = (
    error: unknown,
    dict?: Dictionary
): NormalizedApiError => {
    const payload = getApiErrorPayload(error);
    const apiErrors = dict?.apiErrors as Record<string, string> | undefined;
    // Existing APIs use both code and errorCode; some older endpoints put
    // the machine code in error. Resolve these without changing their contracts.
    const code = typeof payload?.code === "string" ? payload.code
        : typeof payload?.errorCode === "string" ? payload.errorCode
            : typeof payload?.error === "string" &&
                Object.prototype.hasOwnProperty.call(apiErrors ?? {}, payload.error)
                ? payload.error : undefined;
    const details = Array.isArray(payload?.details)
        ? payload.details.filter((detail): detail is string => typeof detail === "string")
        : undefined;
    const payloadMessage = getPayloadMessage(payload);
    const rawMessage =
        payloadMessage || (error instanceof Error ? error.message : undefined);
    const rateLimitSeconds = extractRateLimitSeconds(payloadMessage);

    if (code && Object.prototype.hasOwnProperty.call(apiErrors ?? {}, code) && apiErrors?.[code]) {
        if (code === "AUTH_OTP_RATE_LIMIT") {
            return {
                localizedMessage: rateLimitSeconds
                    ? apiErrors[code].replace("{seconds}", rateLimitSeconds)
                    : apiErrors.AUTH_OTP_RATE_LIMIT_UNKNOWN,
                rawMessage,
                code,
                details,
            };
        }

        return {
            localizedMessage: apiErrors[code],
            rawMessage,
            code,
            details,
        };
    }

    if (payloadMessage) {
        const legacyKey = !code && Object.prototype.hasOwnProperty.call(legacyMessageKeys, payloadMessage)
            ? legacyMessageKeys[payloadMessage] : undefined;
        if (legacyKey && apiErrors?.[legacyKey]) {
            return { localizedMessage: apiErrors[legacyKey], rawMessage, code, details };
        }
        if (rateLimitSeconds && apiErrors?.AUTH_OTP_RATE_LIMIT) {
            return {
                localizedMessage: apiErrors.AUTH_OTP_RATE_LIMIT.replace(
                    "{seconds}",
                    rateLimitSeconds
                ),
                rawMessage,
                code,
                details,
            };
        }

    }

    return { rawMessage, code, details };
};

export const getErrorMessage = (error: unknown): string | undefined => {
    // Legacy display callers must use their action-specific fallback, not an
    // arbitrary provider exception. Diagnostic text is available via resolveApiError.
    return resolveApiError(error).localizedMessage;
};

export const getErrorCode = (error: unknown): string | undefined =>
    resolveApiError(error).code;

export const getApiErrorDetails = (error: unknown): string[] | undefined => {
    return resolveApiError(error).details;
};

export const getLocalizedErrorMessage = (
    error: unknown,
    dict?: Dictionary
): string | undefined => {
    return resolveApiError(error, dict).localizedMessage;
};
