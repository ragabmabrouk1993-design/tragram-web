"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
    DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
    OtpVerificationPanel,
    parseOtpRetryAfterSeconds,
} from "@/components/auth/otp-verification-panel";
import { PasswordField } from "@/components/form/password-field";
import { PhoneInput } from "@/components/phone/phone-input";
import { Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { isAllowedPhoneNumber, isValidPhoneNumber } from "@/lib/phone";
import { StepIndicator } from "@/components/auth/step-indicator";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import type { TelegramDelivery } from "@/services/auth.service";
import { isTelegramGatewayPending } from "@/lib/telegram-delivery";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import { resolveApiError, getLocalizedErrorMessage, getErrorCode } from "@/lib/error-utils";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

const authPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const createForgotPasswordSchema = (messages: {
    phoneRequired: string;
    phoneInvalid: string;
    phoneNotSupported: string;
}, countryPolicy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null) =>
    z.object({
        phoneNumber: z
            .string()
            .min(1, messages.phoneRequired)
            .refine(isValidPhoneNumber, messages.phoneInvalid)
            .refine((value) => isAllowedPhoneNumber(value, countryPolicy), messages.phoneNotSupported),
    });

const createResetPasswordSchema = (messages: {
    passwordMin: string;
    confirmPasswordMin: string;
    passwordMismatch: string;
}) =>
    z
        .object({
            password: z.string().regex(authPasswordPattern, messages.passwordMin),
            confirmPassword: z.string().regex(authPasswordPattern, messages.confirmPasswordMin),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: messages.passwordMismatch,
            path: ["confirmPassword"],
        });

type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
type ForgotRequestField = keyof ForgotPasswordFormData;
type ForgotVerifyField = "otpCode";
type ForgotResetField = keyof ResetPasswordFormData;

const forgotRequestFieldAliases: Record<ForgotRequestField, readonly string[]> = {
    phoneNumber: ["phoneNumber", "phone number"],
};

const forgotVerifyFieldAliases: Record<ForgotVerifyField, readonly string[]> = {
    otpCode: ["otpCode", "otp code", "verification code", "code"],
};

const forgotResetFieldAliases: Record<ForgotResetField, readonly string[]> = {
    password: ["password", "newPassword", "new password"],
    confirmPassword: ["confirmPassword", "confirm password"],
};

const forgotRequestCodeFieldMap: Partial<Record<string, ForgotRequestField | readonly ForgotRequestField[]>> = {
    AUTH_RESTRICTED_COUNTRY: "phoneNumber",
    AUTH_NOT_ALLOWED_COUNTRY: "phoneNumber",
};

const forgotVerifyCodeFieldMap: Partial<Record<string, ForgotVerifyField | readonly ForgotVerifyField[]>> = {
    AUTH_OTP_INVALID: "otpCode",
};

const forgotResetCodeFieldMap: Partial<Record<string, ForgotResetField | readonly ForgotResetField[]>> = {
    AUTH_INVALID_PASSWORD: "password",
};

interface ForgotPasswordClientProps {
    defaultCountry?: CountryCode;
    countryPolicy?: CountryAccessPolicy;
}

export function ForgotPasswordClient({ defaultCountry, countryPolicy }: ForgotPasswordClientProps) {
    const router = useRouter();
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const [pendingStep, setPendingStep] = useState<"request" | "resend" | "verify" | "reset" | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [resetPhoneNumber, setResetPhoneNumber] = useState("");
    const [challengeId, setChallengeId] = useState("");
    const [resetSessionToken, setResetSessionToken] = useState("");
    const [otp, setOtp] = useState("");
    const [telegramDelivery, setTelegramDelivery] = useState<TelegramDelivery | null>(null);
    const [otpError, setOtpError] = useState("");
    const [timeLeft, setTimeLeft] = useState(DEFAULT_OTP_RESEND_COOLDOWN_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const steps = ["request", "verify", "reset"] as const;
    const totalSteps = steps.length;
    const isRequestPending = pendingStep === "request";
    const isResendPending = pendingStep === "resend";
    const isVerifyPending = pendingStep === "verify";
    const isResetPending = pendingStep === "reset";
    const isCurrentStepPending = pendingStep !== null;

    const clearResendTimer = useCallback(() => {
        if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
        }
    }, []);

    const startResendTimer = useCallback((initialSeconds = DEFAULT_OTP_RESEND_COOLDOWN_SECONDS) => {
        setCanResend(false);
        clearResendTimer();
        setTimeLeft(initialSeconds);
        resendTimerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (resendTimerRef.current) {
                        clearInterval(resendTimerRef.current);
                        resendTimerRef.current = null;
                    }
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearResendTimer]);

    useEffect(() => {
        if (stepIndex !== 1) {
            clearResendTimer();
        }
    }, [clearResendTimer, stepIndex]);

    useEffect(() => {
        return () => {
            clearResendTimer();
        };
    }, [clearResendTimer]);

    const forgotPasswordSchema = useMemo(
        () => createForgotPasswordSchema(intlMessages.auth.forgot.schema, countryPolicy),
        [countryPolicy, intlMessages]
    );
    const resetPasswordSchema = useMemo(
        () => createResetPasswordSchema(intlMessages.auth.forgot.schema),
        [intlMessages]
    );

    const {
        handleSubmit: handleSubmitRequest,
        control: controlRequest,
        setError: setRequestError,
        clearErrors: clearRequestErrors,
        formState: { errors: errorsRequest },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            phoneNumber: "",
        },
    });

    const {
        register: registerReset,
        handleSubmit: handleSubmitReset,
        setError: setResetError,
        clearErrors: clearResetErrors,
        formState: { errors: errorsReset },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onRequestSubmit = useCallback(async (data: ForgotPasswordFormData) => {
        setPendingStep("request");
        try {
            const response = await authService.requestPasswordReset(data.phoneNumber);
            const otpExpiresIn = response.expiresIn ?? response.delivery?.expiresIn;
            if (typeof otpExpiresIn === "number" && otpExpiresIn > 0) {
                trackAnalyticsEvent("otp_sent", { flow: "forgotPassword", expires_in: otpExpiresIn });
            }
            setTelegramDelivery((response as typeof response & { delivery?: TelegramDelivery }).delivery ?? null);
            setResetPhoneNumber(data.phoneNumber);
            setChallengeId(response.challengeId ?? "");
            setResetSessionToken("");
            setOtp("");
            setOtpError("");
            setStepIndex(1);
            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                startResendTimer();
            }
            toast.success(intlMessages.auth.forgot.toastCodeSent);
        } catch (error: unknown) {
            const { fieldErrors, toastMessage } = mapApiFormErrors<ForgotRequestField>({
                error,
                dict: intlMessages,
                fieldAliases: forgotRequestFieldAliases,
                fieldLabels: {
                    phoneNumber: intlMessages.commonPhone.phonePlaceholder,
                },
                codeFieldMap: forgotRequestCodeFieldMap,
            });

            if (fieldErrors.phoneNumber) {
                setRequestError("phoneNumber", {
                    type: "server",
                    message: fieldErrors.phoneNumber,
                });
            }

            toast.error(toastMessage || intlMessages.auth.forgot.toastSendFailed);
        } finally {
            setPendingStep(null);
        }
    }, [intlMessages, setRequestError, startResendTimer]);

    const handleRequestSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            void handleSubmitRequest(onRequestSubmit)(event);
        },
        [handleSubmitRequest, onRequestSubmit]
    );

    const handleResendCode = async () => {
        if (!resetPhoneNumber || isResendPending) {
            return;
        }

        setPendingStep("resend");
        try {
            if (!challengeId) {
                return;
            }
            const response = await authService.resendPasswordReset(challengeId);
            trackAnalyticsEvent("otp_resent", { flow: "forgotPassword" });
            setTelegramDelivery(response.delivery ?? null);
            setChallengeId(response.challengeId ?? "");
            setResetSessionToken("");
            setOtp("");
            setOtpError("");
            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                startResendTimer();
                toast.success(intlMessages.auth.forgot.toastCodeResent);
            }
        } catch (error: unknown) {
            const retryAfterSeconds = parseOtpRetryAfterSeconds(resolveApiError(error).rawMessage);
            if (retryAfterSeconds) {
                startResendTimer(retryAfterSeconds);
            }
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.auth.forgot.toastResendFailed
            );
        } finally {
            setPendingStep(null);
        }
    };

    const onVerifySubmit = async (otpValue = otp) => {
        setOtpError("");
        const sanitizedOtp = otpValue.replace(/\D/g, "").slice(0, 6);

        if (!challengeId || sanitizedOtp.length < 6) {
            setOtpError(intlMessages.auth.forgot.toastOtpRequired);
            toast.error(intlMessages.auth.forgot.toastOtpRequired);
            return;
        }

        setPendingStep("verify");
        try {
            const response = await authService.verifyPasswordReset({
                challengeId,
                otpCode: sanitizedOtp,
            });
            trackAnalyticsEvent("otp_verified", { flow: "forgotPassword" });
            setResetSessionToken(response.resetSessionToken ?? "");
            setStepIndex(2);
            toast.success(intlMessages.auth.forgot.toastCodeVerified);
        } catch (error: unknown) {
            const errorCode = getErrorCode(error);
            trackAnalyticsEvent("otp_failed", {
                flow: "forgotPassword",
                ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
            });
            const { fieldErrors, toastMessage } = mapApiFormErrors<ForgotVerifyField>({
                error,
                dict: intlMessages,
                fieldAliases: forgotVerifyFieldAliases,
                fieldLabels: {
                    otpCode: intlMessages.auth.forgot.otpTitle,
                },
                codeFieldMap: forgotVerifyCodeFieldMap,
            });

            if (fieldErrors.otpCode) {
                setOtpError(fieldErrors.otpCode);
            }

            toast.error(toastMessage || intlMessages.auth.forgot.toastVerifyFailed);
        } finally {
            setPendingStep(null);
        }
    };

    const onResetSubmit = async (data: ResetPasswordFormData) => {
        if (!resetSessionToken) {
            toast.error(intlMessages.auth.forgot.toastResetFailed);
            setStepIndex(1);
            return;
        }

        setPendingStep("reset");
        try {
            await authService.completePasswordReset({
                resetSessionToken,
                newPassword: data.password,
            });

            trackAnalyticsEvent("password_reset_completed");
            toast.success(intlMessages.auth.forgot.toastResetSuccess);
            router.push(localizePath(lang, "/auth/login"));
        } catch (error: unknown) {
            const { fieldErrors, toastMessage } = mapApiFormErrors<ForgotResetField>({
                error,
                dict: intlMessages,
                fieldAliases: forgotResetFieldAliases,
                fieldLabels: {
                    password: intlMessages.auth.forgot.newPasswordPlaceholder,
                    confirmPassword: intlMessages.auth.forgot.confirmPasswordPlaceholder,
                },
                codeFieldMap: forgotResetCodeFieldMap,
            });

            if (fieldErrors.password) {
                setResetError("password", {
                    type: "server",
                    message: fieldErrors.password,
                });
            }

            if (fieldErrors.confirmPassword) {
                setResetError("confirmPassword", {
                    type: "server",
                    message: fieldErrors.confirmPassword,
                });
            }

            toast.error(toastMessage || intlMessages.auth.forgot.toastResetFailed);
        } finally {
            setPendingStep(null);
        }
    };

    const stepTitle =
        stepIndex === 0
            ? intlMessages.auth.forgot.title
            : stepIndex === 1
              ? intlMessages.auth.forgot.otpTitle
              : intlMessages.auth.forgot.passwordTitle;

    const stepSubtitle =
        stepIndex === 0
            ? intlMessages.auth.forgot.subtitleRequest
            : stepIndex === 1
              ? intlMessages.auth.forgot.subtitleVerify
              : intlMessages.auth.forgot.subtitleReset;

    return (
        <AuthSplitLayout
            heading={intlMessages.auth.forgot.heading}
            helper={intlMessages.auth.forgot.helper}
            stepTitle={stepTitle}
            stepSubtitle={stepSubtitle}
            onBack={() => {
                if (stepIndex === 2) {
                    setResetSessionToken("");
                    setStepIndex(1);
                    return;
                }

                if (stepIndex === 1) {
                    setResetPhoneNumber("");
                    setChallengeId("");
                    setOtp("");
                    setOtpError("");
                    setStepIndex(0);
                    return;
                }

                router.push(localizePath(lang, "/auth/login"));
            }}
            backDisabled={isCurrentStepPending}
            stepIndicator={<StepIndicator total={totalSteps} current={stepIndex} tone="dark" />}
            footer={
                stepIndex === 0 ? (
                    <>
                        {intlMessages.auth.forgot.rememberPassword}{" "}
                        <Link
                            href={localizePath(lang, "/auth/login")}
                            aria-disabled={isRequestPending}
                            tabIndex={isRequestPending ? -1 : undefined}
                            className={`text-[var(--color-primary)] hover:text-[var(--color-accent)] ${isRequestPending ? "pointer-events-none opacity-60" : ""}`}
                        >
                            {intlMessages.auth.forgot.signIn}
                        </Link>
                    </>
                ) : null
            }
        >
            {stepIndex === 0 ? (
                <form noValidate aria-busy={isRequestPending} onSubmit={handleRequestSubmit} className="space-y-5">
                    <Controller
                        control={controlRequest}
                        name="phoneNumber"
                        render={({ field }) => (
                            <PhoneInput
                                defaultCountry={defaultCountry ?? "US"}
                                policy={countryPolicy}
                                value={field.value ?? ""}
                                onChange={(value) => {
                                    field.onChange(value);
                                    clearRequestErrors("phoneNumber");
                                }}
                                disabled={isRequestPending}
                                error={errorsRequest.phoneNumber?.message}
                                tone="dark"
                            />
                        )}
                    />

                    <p className="text-sm text-[var(--text-secondary)]" role="note">
                        {intlMessages.auth.telegramDelivery.description}
                    </p>

                    <button
                        type="submit"
                        disabled={isRequestPending}
                        className="btn-default btn-highlighted auth-btn text-center disabled:pointer-events-none disabled:opacity-60"
                    >
                        {isRequestPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {intlMessages.auth.forgot.buttonSending}
                            </span>
                        ) : (
                            intlMessages.auth.forgot.buttonSendCode
                        )}
                    </button>
                </form>
            ) : stepIndex === 1 ? (
                <form
                    noValidate
                    aria-busy={isVerifyPending}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void onVerifySubmit();
                    }}
                    className="space-y-6"
                >
                    <div className="space-y-4">
                    {isTelegramGatewayPending(telegramDelivery) ? (
                        <p className="text-sm text-[var(--text-secondary)]" role="status">
                            {intlMessages.auth.telegramDelivery.gatewayPending}
                        </p>
                    ) : null}
                    <OtpVerificationPanel
                        value={otp}
                        onChange={(nextOtp) => {
                            setOtp(nextOtp);
                            if (otpError) {
                                setOtpError("");
                            }
                        }}
                        onComplete={(completedOtp) => {
                            setOtp(completedOtp);
                            void onVerifySubmit(completedOtp);
                        }}
                        onSubmit={() => {
                            void onVerifySubmit();
                        }}
                        error={otpError}
                        disabled={isVerifyPending || isResendPending}
                        status={isVerifyPending ? "verifying" : "idle"}
                        verifyLabel={intlMessages.auth.forgot.buttonVerifyCode}
                        verifyingLabel={intlMessages.auth.forgot.buttonVerifyingCode}
                        successDescription={intlMessages.auth.forgot.subtitleVerify}
                        resend={{
                            canResend: canResend && (!isTelegramGatewayPending(telegramDelivery) || timeLeft === 0),
                            timeLeft,
                            onResend: handleResendCode,
                            isResending: isResendPending,
                            copy: {
                                prompt: intlMessages.auth.forgot.otpPrompt,
                                resend: intlMessages.auth.forgot.resend,
                                resending: intlMessages.auth.forgot.resending,
                            },
                        }}
                    />
                    </div>
                </form>
            ) : (
                <form noValidate aria-busy={isResetPending} onSubmit={handleSubmitReset(onResetSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <PasswordField
                            placeholder={intlMessages.auth.forgot.newPasswordPlaceholder}
                            inputProps={registerReset("password", {
                                onChange: () => clearResetErrors("password"),
                            })}
                            disabled={isResetPending}
                            error={errorsReset.password?.message}
                            tone="dark"
                        />
                        <PasswordField
                            placeholder={intlMessages.auth.forgot.confirmPasswordPlaceholder}
                            inputProps={registerReset("confirmPassword", {
                                onChange: () => clearResetErrors("confirmPassword"),
                            })}
                            disabled={isResetPending}
                            error={errorsReset.confirmPassword?.message}
                            tone="dark"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isResetPending}
                        className="btn-default btn-highlighted auth-btn text-center disabled:pointer-events-none disabled:opacity-60"
                    >
                        {isResetPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {intlMessages.auth.forgot.buttonResetting}
                            </span>
                        ) : (
                            intlMessages.auth.forgot.buttonReset
                        )}
                    </button>
                </form>
            )}
        </AuthSplitLayout>
    );
}
