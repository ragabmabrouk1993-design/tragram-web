"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BaseSyntheticEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";
import * as z from "zod";

import { StepIndicator } from "@/components/auth/step-indicator";
import {
    SignupDetailsStep,
    SignupFormValues,
    SignupOtpStep,
} from "@/components/auth/signup-steps";
import {
    DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
    type OtpVerificationStatus,
} from "@/components/auth/otp-verification-panel";
import { authService, type SignupData } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { isAllowedPhoneNumber, isValidPhoneNumber } from "@/lib/phone";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { normalizeUserForStore, setAuth } from "@/store/authSlice";
import { clearReferralCode, setReferralCode } from "@/store/uiSlice";
import { getErrorCode, resolveApiError, getLocalizedErrorMessage } from "@/lib/error-utils";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import { isTelegramGatewayPending } from "@/lib/telegram-delivery";
import { useTrialFingerprint } from "@/lib/trial-fingerprint";
import { trackAnalyticsEvent, updateAnalyticsIdentity } from "@/lib/analytics/client";

const authPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const createSignupSchema = (messages: {
    firstNameRequired: string;
    lastNameRequired: string;
    emailInvalid: string;
    phoneRequired: string;
    phoneInvalid: string;
    phoneNotSupported: string;
    passwordMin: string;
}, countryPolicy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null) =>
    z.object({
        firstName: z.string().trim().min(1, messages.firstNameRequired),
        lastName: z.string().trim().min(1, messages.lastNameRequired),
        email: z.string().trim().email(messages.emailInvalid),
        phoneNumber: z
            .string()
            .min(1, messages.phoneRequired)
            .refine(isValidPhoneNumber, messages.phoneInvalid)
            .refine((value) => isAllowedPhoneNumber(value, countryPolicy), messages.phoneNotSupported),
        password: z.string().regex(authPasswordPattern, messages.passwordMin),
        referralCode: z.string().trim().max(32).optional(),
    });

type SignupFormData = SignupFormValues;
type SignupFormField = keyof SignupFormData;

const signupFieldAliases: Record<SignupFormField, readonly string[]> = {
    firstName: ["firstName", "first name"],
    lastName: ["lastName", "last name"],
    email: ["email", "e-mail"],
    phoneNumber: ["phoneNumber", "phone number"],
    password: ["password"],
    referralCode: ["referralCode", "referral code"],
};

const signupCodeFieldMap: Partial<Record<string, SignupFormField | readonly SignupFormField[]>> = {
    AUTH_SIGNUP_PHONE_EXISTS: "phoneNumber",
    AUTH_SIGNUP_EMAIL_EXISTS: "email",
    AUTH_INVALID_PASSWORD: "password",
    AUTH_RESTRICTED_COUNTRY: "phoneNumber",
    AUTH_NOT_ALLOWED_COUNTRY: "phoneNumber",
};

interface SignupClientProps {
    defaultCountry?: CountryCode;
    countryPolicy?: CountryAccessPolicy;
}

export function SignupClient({ defaultCountry, countryPolicy }: SignupClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const reduxReferralCode = useAppSelector((state) => state.ui.referralCode);
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const [isLoading, setIsLoading] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [timeLeft, setTimeLeft] = useState(DEFAULT_OTP_RESEND_COOLDOWN_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [otpStatus, setOtpStatus] = useState<OtpVerificationStatus>("idle");
    const [telegramDelivery, setTelegramDelivery] = useState<import("@/services/auth.service").TelegramDelivery | null>(null);
    const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const otpSubmitInFlightRef = useRef(false);
    const { collectTrialFingerprintEvent } = useTrialFingerprint();
    const stepComponents = [SignupDetailsStep, SignupOtpStep];
    const totalSteps = stepComponents.length;
    const isDetailsPending = stepIndex === 0 && isLoading;
    const isOtpPending = stepIndex === 1 && (isLoading || isResending || otpStatus !== "idle");
    const isCurrentStepPending = stepIndex === 0 ? isDetailsPending : isOtpPending;

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

    const signupSchema = useMemo(
        () => createSignupSchema(intlMessages.auth.signup.schema, countryPolicy),
        [countryPolicy, intlMessages]
    );

    const {
        register,
        handleSubmit,
        control,
        setError,
        setValue,
        clearErrors,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            password: "",
            referralCode: "",
        },
    });

    useEffect(() => {
        const queryReferralCode = searchParams.get("ref");
        const referralCode = queryReferralCode || reduxReferralCode || "";
        if (referralCode) {
            dispatch(setReferralCode(referralCode));
            setValue("referralCode", referralCode, {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: false,
            });
            clearErrors("referralCode");
        }
    }, [clearErrors, dispatch, reduxReferralCode, searchParams, setValue]);

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

    const completeSignupVerification = useCallback(async (nextPhoneNumber: string, otpValue = otp) => {
        if (isOtpPending || otpSubmitInFlightRef.current) {
            return;
        }

        const sanitizedOtp = otpValue.replace(/\D/g, "").slice(0, 6);
        setOtpError("");

        if (sanitizedOtp.length < 6) {
            setOtpError(intlMessages.auth.signup.toastOtpRequired);
            toast.error(intlMessages.auth.signup.toastOtpRequired);
            return;
        }

        otpSubmitInFlightRef.current = true;
        setOtpStatus("verifying");
        setIsLoading(true);
        try {
            const response = await authService.verifySignup({
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
            trackAnalyticsEvent("otp_verified", { flow: "register" });

            dispatch(
                setAuth({
                    user: serializable,
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken,
                })
            );

            trackAnalyticsEvent("signup_completed", { signup_platform: "WEB" });

            dispatch(clearReferralCode());
            setOtpStatus("success");
            toast.success(intlMessages.auth.signup.toastAccountCreated);
            await new Promise((resolve) => setTimeout(resolve, 650));
            const selectedPlan = searchParams.get("plan")?.trim();
            const selectedPeriod = searchParams.get("billingPeriod");
            const subscriptionParams = new URLSearchParams();
            if (selectedPlan) subscriptionParams.set("plan", selectedPlan);
            if (selectedPeriod === "MONTHLY" || selectedPeriod === "YEARLY") {
                subscriptionParams.set("billingPeriod", selectedPeriod);
            }
            const subscriptionPath = selectedPlan
                ? `/profile/subscription?${subscriptionParams.toString()}`
                : "/profile";
            router.push(localizePath(lang, subscriptionPath));
        } catch (error: unknown) {
            const errorCode = getErrorCode(error);
            trackAnalyticsEvent("otp_failed", {
                flow: "register",
                ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
            });
            trackAnalyticsEvent("signup_failed", {
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

            const nextOtpError = fieldErrors.otpCode || toastMessage || intlMessages.auth.signup.toastInvalidOtp;
            setOtpError(nextOtpError);
            toast.error(toastMessage || intlMessages.auth.signup.toastInvalidOtp);
            setOtpStatus("idle");
        } finally {
            otpSubmitInFlightRef.current = false;
            setIsLoading(false);
        }
    }, [dispatch, intlMessages, isOtpPending, lang, otp, router, searchParams]);

    const onDetailsSubmit: SubmitHandler<SignupFormData> = useCallback(async (data) => {
        setIsLoading(true);
        try {
            const storedReferralCode = data.referralCode?.trim() || reduxReferralCode || "";
            trackAnalyticsEvent("signup_submitted", { has_referral_code: Boolean(storedReferralCode) });
            let fingerprintProof: Pick<SignupData, "fingerprint_event_id" | "fingerprint_challenge_id"> = {};
            try {
                const challenge = await authService.getFingerprintChallenge();
                const eventId = await collectTrialFingerprintEvent(challenge.nonce);
                fingerprintProof = {
                    fingerprint_event_id: eventId,
                    fingerprint_challenge_id: challenge.challenge_id,
                };
            } catch {
                // Fingerprint is an anti-abuse signal, not a signup transport
                // dependency. The backend records REQUIRED/UNAVAILABLE and
                // decides trial eligibility after the request is received.
            }
            const response = await authService.signup({
                ...data,
                referralCode: storedReferralCode || undefined,
                ...fingerprintProof,
            });
            const otpExpiresIn = response.expiresIn ?? response.delivery?.expiresIn;
            if (!response.devBypass && typeof otpExpiresIn === "number" && otpExpiresIn > 0) {
                trackAnalyticsEvent("otp_sent", { flow: "register", expires_in: otpExpiresIn });
            }
            const bypassOtpCode = response.devBypassOtpCode ?? "000000";
            setPhoneNumber(data.phoneNumber);
            setTelegramDelivery(response.delivery ?? null);
            setOtpStatus("idle");
            setOtp(response.devBypass ? bypassOtpCode : "");
            setStepIndex((prev) => Math.min(prev + 1, stepComponents.length - 1));

            if (response.devBypass) {
                await completeSignupVerification(data.phoneNumber, bypassOtpCode);
                return;
            }

            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                startResendTimer();
            }
            toast.success(intlMessages.auth.signup.toastOtpSent);
        } catch (error: unknown) {
            const errorCode = getErrorCode(error);
            if (errorCode !== "AUTH_SIGNUP_PENDING") {
                trackAnalyticsEvent("signup_failed", {
                    ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
                });
            }
            parseRateLimitRetry(resolveApiError(error).rawMessage);
            if (getErrorCode(error) === "AUTH_SIGNUP_PENDING") {
                setPhoneNumber(data.phoneNumber);
                setOtpStatus("idle");
                setStepIndex((prev) => Math.min(prev + 1, stepComponents.length - 1));
                startResendTimer();
                toast.success(intlMessages.auth.signup.toastPendingSignup);
                return;
            }
            const { fieldErrors, toastMessage } = mapApiFormErrors<SignupFormField>({
                error,
                dict: intlMessages,
                fieldAliases: signupFieldAliases,
                fieldLabels: {
                    firstName: intlMessages.auth.signup.fields.firstName,
                    lastName: intlMessages.auth.signup.fields.lastName,
                    email: intlMessages.auth.signup.fields.emailPlaceholder,
                    phoneNumber: intlMessages.commonPhone.phonePlaceholder,
                    password: intlMessages.auth.signup.fields.passwordPlaceholder,
                },
                codeFieldMap: signupCodeFieldMap,
            });

            (Object.entries(fieldErrors) as Array<[SignupFormField, string]>).forEach(
                ([field, fieldMessage]) => {
                    setError(field, {
                        type: "server",
                        message: fieldMessage,
                    });
                }
            );

            toast.error(toastMessage || intlMessages.auth.signup.toastSignupFailed);
        } finally {
            setIsLoading(false);
        }
    }, [
        completeSignupVerification,
        collectTrialFingerprintEvent,
        intlMessages,
        parseRateLimitRetry,
        reduxReferralCode,
        setError,
        startResendTimer,
        stepComponents.length,
    ]);

    const onResendOtp = async () => {
        if (!phoneNumber || isResending) return;

        setIsResending(true);
        try {
            const response = await authService.resendSignup(phoneNumber);
            if (!response.devBypass) trackAnalyticsEvent("otp_resent", { flow: "register" });
            const bypassOtpCode = response.devBypassOtpCode ?? "000000";
            setTelegramDelivery(response.delivery ?? null);
            setOtpStatus("idle");
            setOtp(response.devBypass ? bypassOtpCode : "");

            if (response.devBypass) {
                await completeSignupVerification(phoneNumber, bypassOtpCode);
                return;
            }

            if (isTelegramGatewayPending(response.delivery)) {
                startResendTimer(response.delivery.expiresIn ?? 300);
            } else {
                toast.success(intlMessages.auth.signup.toastOtpResent);
                startResendTimer();
            }
        } catch (error: unknown) {
            parseRateLimitRetry(resolveApiError(error).rawMessage);
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.auth.signup.toastOtpResendFailed
            );
        } finally {
            setIsResending(false);
        }
    };

    const onOtpSubmit = async (otpValue = otp) => {
        await completeSignupVerification(phoneNumber, otpValue);
    };

    const handleDetailsSubmit = useCallback(
        (event?: BaseSyntheticEvent) => {
            return handleSubmit(onDetailsSubmit)(event);
        },
        [handleSubmit, onDetailsSubmit]
    );

    const steps = [
        <SignupDetailsStep
            key="details"
            defaultCountry={defaultCountry ?? "US"}
            policy={countryPolicy}
            onSubmit={handleDetailsSubmit}
            register={register}
            control={control}
            clearErrors={clearErrors}
            errors={errors}
            isLoading={isLoading}
            isDisabled={isDetailsPending}
        />,
        <SignupOtpStep
            key="otp"
            otp={otp}
            onOtpChange={(nextOtp) => {
                setOtp(nextOtp);
                if (otpError) {
                    setOtpError("");
                }
            }}
            onOtpComplete={(completedOtp) => {
                void onOtpSubmit(completedOtp);
            }}
            onSubmit={onOtpSubmit}
            onResend={onResendOtp}
            isLoading={isLoading}
            isResending={isResending}
            isDisabled={isOtpPending}
            status={otpStatus}
            canResend={canResend}
            timeLeft={timeLeft}
            error={otpError}
            telegramDelivery={telegramDelivery}
        />,
    ];

    const handleBack = () => {
        if (stepIndex > 0) {
            setStepIndex((prev) => prev - 1);
            setOtpError("");
            setOtpStatus("idle");
            return;
        }
        router.push(localizePath(lang, "/auth/login"));
    };

    return (
        <AuthSplitLayout
            heading={intlMessages.auth.signup.heading}
            helper={intlMessages.auth.signup.helper}
            stepTitle={stepIndex === 0 ? intlMessages.auth.signup.title : intlMessages.auth.signup.otpTitle}
            stepSubtitle={
                stepIndex === 0
                    ? intlMessages.auth.signup.subtitleDetails
                    : intlMessages.auth.signup.subtitleOtp
            }
            onBack={handleBack}
            backDisabled={isCurrentStepPending}
            stepIndicator={<StepIndicator total={totalSteps} current={stepIndex} tone="dark" />}
            footer={
                stepIndex === 0 ? (
                    <>
                        {intlMessages.auth.signup.alreadyHaveAccount}{" "}
                        <Link
                            href={localizePath(lang, "/auth/login")}
                            aria-disabled={isDetailsPending}
                            tabIndex={isDetailsPending ? -1 : undefined}
                            className={`text-[var(--color-primary)] hover:text-[var(--color-accent)] ${isDetailsPending ? "pointer-events-none opacity-60" : ""}`}
                        >
                            {intlMessages.auth.signup.loginLink}
                        </Link>
                    </>
                ) : null
            }
        >
            {steps[stepIndex]}
        </AuthSplitLayout>
    );
}
