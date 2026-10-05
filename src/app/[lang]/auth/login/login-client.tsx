"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import type { FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
    OtpVerificationPanel,
    type OtpVerificationStatus,
} from "@/components/auth/otp-verification-panel";
import { StepIndicator } from "@/components/auth/step-indicator";
import { PhoneInput } from "@/components/phone/phone-input";
import { Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { isAllowedPhoneNumber, isValidPhoneNumber } from "@/lib/phone";
import { useAppDispatch } from "@/store/hooks";
import { normalizeUserForStore, setAuth } from "@/store/authSlice";
import { PasswordField } from "@/components/form/password-field";
import { resolveApiError, getLocalizedErrorMessage, getErrorCode } from "@/lib/error-utils";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import type { TelegramDelivery } from "@/services/auth.service";
import { isTelegramGatewayPending } from "@/lib/telegram-delivery";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import { trackAnalyticsEvent, updateAnalyticsIdentity } from "@/lib/analytics/client";

const createLoginSchema = (messages: {
    phoneRequired: string;
    phoneInvalid: string;
    phoneNotSupported: string;
    passwordMin: string;
}, countryPolicy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null) =>
    z.object({
        phoneNumber: z
            .string()
            .min(1, messages.phoneRequired)
            .refine(isValidPhoneNumber, messages.phoneInvalid)
            .refine((value) => isAllowedPhoneNumber(value, countryPolicy), messages.phoneNotSupported),
        password: z.string().min(6, messages.passwordMin),
    });

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
type LoginFormField = keyof LoginFormData;

const loginFieldAliases: Record<LoginFormField, readonly string[]> = {
    phoneNumber: ["phoneNumber", "phone number"],
    password: ["password"],
};

const loginCodeFieldMap: Partial<Record<string, LoginFormField | readonly LoginFormField[]>> = {
    AUTH_INVALID_CREDENTIALS: ["phoneNumber", "password"],
    AUTH_INVALID_PASSWORD: "password",
    AUTH_RESTRICTED_COUNTRY: "phoneNumber",
    AUTH_NOT_ALLOWED_COUNTRY: "phoneNumber",
};

interface LoginClientProps {
    defaultCountry?: CountryCode;
    countryPolicy?: CountryAccessPolicy;
}

export function LoginClient({ defaultCountry, countryPolicy }: LoginClientProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"credentials" | "otp">("credentials");
    const stepIndex = step === "otp" ? 1 : 0;
    const totalSteps = 2;
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [cachedPassword, setCachedPassword] = useState("");
    const [timeLeft, setTimeLeft] = useState(DEFAULT_OTP_RESEND_COOLDOWN_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [otpStatus, setOtpStatus] = useState<OtpVerificationStatus>("idle");
    const [telegramDelivery, setTelegramDelivery] = useState<TelegramDelivery | null>(null);
    const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const otpSubmitInFlightRef = useRef(false);
    const isCredentialsPending = step === "credentials" && isLoading;
    const isOtpPending = step === "otp" && (isLoading || isResending || otpStatus !== "idle");
    const isCurrentStepPending = step === "credentials" ? isCredentialsPending : isOtpPending;

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
        if (step !== "otp") {
            clearResendTimer();
        }
    }, [clearResendTimer, step]);

    useEffect(() => {
        return () => {
            clearResendTimer();
        };
    }, [clearResendTimer]);

    const loginSchema = useMemo(
        () => createLoginSchema(intlMessages.auth.login.schema, countryPolicy),
        [countryPolicy, intlMessages]
    );

    const {
        register,
        handleSubmit,
        control,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            phoneNumber: "",
            password: "",
        },
    });

    const parseRateLimitRetry = useCallback((message?: string) => {
        if (!message) return;
        const matches = /Please wait (\d+) seconds/i.exec(message);
        if (!matches) return;
        const seconds = Number(matches[1]);
        if (!Number.isNaN(seconds) && seconds > 0) {
            startResendTimer(seconds);
            setCanResend(false);
        }
    }, [startResendTimer]);

    const completeSigninVerification = useCallback(async (nextPhoneNumber: string, otpValue = otp) => {
        if (isOtpPending || otpSubmitInFlightRef.current) {
            return;
        }

        const sanitizedOtp = otpValue.replace(/\D/g, "").slice(0, 6);
        setOtpError("");

        if (sanitizedOtp.length < 6) {
            setOtpError(intlMessages.auth.login.toastOtpRequired);
            toast.error(intlMessages.auth.login.toastOtpRequired);
            return;
        }

        otpSubmitInFlightRef.current = true;
        setOtpStatus("verifying");
        setIsLoading(true);
        try {
            const response = await authService.verifySignin({
                phoneNumber: nextPhoneNumber,
                otpCode: sanitizedOtp,
            });
            localStorage.setItem("accessToken", response.accessToken);
            localStorage.setItem("refreshToken", response.refreshToken);
            const serializable = normalizeUserForStore(response.user);
            if (!serializable) {
                throw new Error("Missing user data");
            }

            updateAnalyticsIdentity(String(serializable.id));
            trackAnalyticsEvent("otp_verified", { flow: "login" });

            dispatch(
                setAuth({
                    user: serializable,
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken,
                })
            );

            trackAnalyticsEvent("login_completed", { method: "password" });

            setOtpStatus("success");
            toast.success(intlMessages.auth.login.toastLoginSuccess);
            await new Promise((resolve) => setTimeout(resolve, 650));
            router.push(localizePath(lang, "/profile"));
        } catch (error: unknown) {
            const errorCode = getErrorCode(error);
            trackAnalyticsEvent("otp_failed", {
                flow: "login",
                ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
            });
            trackAnalyticsEvent("login_failed", {
                method: "password",
                ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
            });
            const { fieldErrors, toastMessage } = mapApiFormErrors<"otpCode">({
                error,
                dict: intlMessages,
                fieldAliases: {
                    otpCode: ["otpCode", "otp code", "verification code", "code"],
                },
                codeFieldMap: {
                    AUTH_OTP_INVALID: "otpCode",
                    VALIDATION_ERROR: "otpCode",
                },
            });

            const nextOtpError = fieldErrors.otpCode || toastMessage || intlMessages.auth.login.toastInvalidOtp;
            setOtpError(nextOtpError);
            toast.error(toastMessage || intlMessages.auth.login.toastInvalidOtp);
            setOtpStatus("idle");
        } finally {
            otpSubmitInFlightRef.current = false;
            setIsLoading(false);
        }
    }, [dispatch, intlMessages, isOtpPending, lang, otp, router]);

    const handleResendOtp = async () => {
        if (!phoneNumber || !cachedPassword || isResending) return;

        setIsResending(true);
        try {
            const response = await authService.resendSignin({ phoneNumber, password: cachedPassword });
            if (!response.devBypass) trackAnalyticsEvent("otp_resent", { flow: "login" });
            setTelegramDelivery(response.delivery ?? null);
            const bypassOtpCode = response.devBypassOtpCode ?? "000000";
            setOtpStatus("idle");
            setOtp(response.devBypass ? bypassOtpCode : "");

            if (response.devBypass) {
                await completeSigninVerification(phoneNumber, bypassOtpCode);
                return;
            }

            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                toast.success(intlMessages.auth.login.toastOtpResent);
                startResendTimer();
            }
        } catch (error: unknown) {
            const message = resolveApiError(error).rawMessage;
            parseRateLimitRetry(message);
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.auth.login.toastOtpResendFailed
            );
        } finally {
            setIsResending(false);
        }
    };

    const onCredentialsSubmit = useCallback(async (data: LoginFormData) => {
        setIsLoading(true);
        trackAnalyticsEvent("login_submitted", { method: "password" });
        try {
            const response = await authService.signin(data);
            const otpExpiresIn = response.expiresIn ?? response.delivery?.expiresIn;
            if (!response.devBypass && typeof otpExpiresIn === "number" && otpExpiresIn > 0) {
                trackAnalyticsEvent("otp_sent", { flow: "login", expires_in: otpExpiresIn });
            }
            const bypassOtpCode = response.devBypassOtpCode ?? "000000";
            setCachedPassword(data.password);
            setPhoneNumber(data.phoneNumber);
            setTelegramDelivery(response.delivery ?? null);
            setOtpStatus("idle");
            setOtp(response.devBypass ? bypassOtpCode : "");
            setStep("otp");

            if (response.devBypass) {
                await completeSigninVerification(data.phoneNumber, bypassOtpCode);
                return;
            }

            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                startResendTimer();
            }
            toast.success(intlMessages.auth.login.toastOtpSent);
        } catch (error: unknown) {
            const errorCode = getErrorCode(error);
            trackAnalyticsEvent("login_failed", {
                method: "password",
                ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
            });
            const message = resolveApiError(error).rawMessage;
            parseRateLimitRetry(message);
            const { fieldErrors, toastMessage } = mapApiFormErrors<LoginFormField>({
                error,
                dict: intlMessages,
                fieldAliases: loginFieldAliases,
                fieldLabels: {
                    phoneNumber: intlMessages.commonPhone.phonePlaceholder,
                    password: intlMessages.auth.login.passwordPlaceholder,
                },
                codeFieldMap: loginCodeFieldMap,
            });

            (Object.entries(fieldErrors) as Array<[LoginFormField, string]>).forEach(
                ([field, fieldMessage]) => {
                    setError(field, {
                        type: "server",
                        message: fieldMessage,
                    });
                }
            );

            toast.error(toastMessage || intlMessages.auth.login.toastInvalidCredentials);
        } finally {
            setIsLoading(false);
        }
    }, [
        completeSigninVerification,
        intlMessages,
        parseRateLimitRetry,
        setError,
        startResendTimer,
    ]);

    const onOtpSubmit = async (otpValue = otp) => {
        await completeSigninVerification(phoneNumber, otpValue);
    };

    const handleBack = () => {
        if (step === "otp") {
            setStep("credentials");
            setOtpError("");
            setOtpStatus("idle");
            return;
        }
        router.back();
    };

    const handleCredentialsSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            void handleSubmit(onCredentialsSubmit)(event);
        },
        [handleSubmit, onCredentialsSubmit]
    );

    return (
        <AuthSplitLayout
            heading={intlMessages.auth.login.heading}
            helper={intlMessages.auth.login.helper}
            stepTitle={step === "credentials" ? intlMessages.auth.login.title : intlMessages.auth.login.otpTitle}
            stepSubtitle={
                step === "credentials"
                    ? intlMessages.auth.login.subtitleCredentials
                    : intlMessages.auth.login.subtitleOtp
            }
            onBack={handleBack}
            backDisabled={isCurrentStepPending}
            stepIndicator={<StepIndicator total={totalSteps} current={stepIndex} tone="dark" />}
            footer={
                step === "credentials" ? (
                    <>
                        {intlMessages.auth.login.noAccount}{" "}
                        <Link
                            href={localizePath(lang, "/auth/signup")}
                            aria-disabled={isCredentialsPending}
                            tabIndex={isCredentialsPending ? -1 : undefined}
                            className={`text-[var(--color-primary)] hover:text-[var(--color-accent)] ${isCredentialsPending ? "pointer-events-none opacity-60" : ""}`}
                        >
                            {intlMessages.auth.login.signUp}
                        </Link>
                    </>
                ) : null
            }
        >
            {step === "credentials" ? (
                <form noValidate aria-busy={isCredentialsPending} onSubmit={handleCredentialsSubmit} className="space-y-5">
                    <Controller
                        control={control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <PhoneInput
                                defaultCountry={defaultCountry ?? "US"}
                                policy={countryPolicy}
                                value={field.value ?? ""}
                                onChange={(value) => {
                                    field.onChange(value);
                                    clearErrors("phoneNumber");
                                }}
                                disabled={isCredentialsPending}
                                error={errors.phoneNumber?.message}
                                tone="dark"
                            />
                        )}
                    />

                    <p className="text-sm text-[var(--text-secondary)]" role="note">
                        {intlMessages.auth.telegramDelivery.description}
                    </p>

                    <PasswordField
                        placeholder={intlMessages.auth.login.passwordPlaceholder}
                        inputProps={register("password", {
                            onChange: () => clearErrors("password"),
                        })}
                        disabled={isCredentialsPending}
                        error={errors.password?.message}
                        tone="dark"
                    />

                    <div className={lang === "ar" ? "flex justify-start" : "flex justify-end"}>
                        <Link
                            href={localizePath(lang, "/auth/forgot-password")}
                            aria-disabled={isCredentialsPending}
                            tabIndex={isCredentialsPending ? -1 : undefined}
                            className={`text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${isCredentialsPending ? "pointer-events-none opacity-60" : ""}`}
                        >
                            {intlMessages.auth.login.forgotPassword}
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isCredentialsPending}
                        className="btn-default btn-highlighted auth-btn text-center disabled:pointer-events-none disabled:opacity-60"
                    >
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {intlMessages.auth.login.buttonSigningIn}
                            </span>
                        ) : (
                            intlMessages.auth.login.buttonLogin
                        )}
                    </button>
                </form>
            ) : (
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
                        void onOtpSubmit(completedOtp);
                    }}
                    onSubmit={() => {
                        void onOtpSubmit();
                    }}
                    status={otpStatus}
                    error={otpError}
                    disabled={isOtpPending}
                    verifyLabel={intlMessages.auth.login.verify}
                    verifyingLabel={intlMessages.auth.login.verifying}
                    successTitle={intlMessages.auth.login.toastLoginSuccess}
                    successDescription={intlMessages.auth.login.subtitleOtp}
                    resend={{
                        canResend: canResend && (!isTelegramGatewayPending(telegramDelivery) || timeLeft === 0),
                        timeLeft,
                        onResend: handleResendOtp,
                        isResending,
                        copy: {
                            prompt: intlMessages.auth.login.otpPrompt,
                            resend: intlMessages.auth.login.resend,
                            resending: intlMessages.auth.login.resending,
                        },
                    }}
                    />
                </div>
            )}
        </AuthSplitLayout>
    );
}
