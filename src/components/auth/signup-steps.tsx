"use client";

import type { CountryCode } from "libphonenumber-js";
import type { BaseSyntheticEvent, InputHTMLAttributes, ReactNode } from "react";
import type { Control, FieldErrors, UseFormClearErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Gift, Lock, Mail, User } from "lucide-react";
import { PhoneInput } from "@/components/phone/phone-input";
import { OtpVerificationPanel, type OtpVerificationStatus } from "@/components/auth/otp-verification-panel";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/form/password-field";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import type { TelegramDelivery } from "@/services/auth.service";
import { isTelegramGatewayPending } from "@/lib/telegram-delivery";

export interface SignupFormValues {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    referralCode?: string;
}

interface TextFieldProps {
    icon: ReactNode;
    placeholder: string;
    type?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

const TextField = ({ icon, placeholder, type = "text", error, disabled = false, className, inputProps }: TextFieldProps) => (
    <div className={cn("space-y-2", className)}>
        <div
            className={cn(
                "auth-round flex h-12 items-center gap-3 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] px-4",
                disabled && "opacity-60",
                error && "auth-flow-field-error border-red-400/90"
            )}
        >
            <span className="text-[var(--input-placeholder)]">{icon}</span>
            <input
                type={type}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] text-start focus:outline-none disabled:cursor-not-allowed"
                aria-invalid={Boolean(error)}
                disabled={disabled}
                {...inputProps}
            />
        </div>
        {error && <p className="text-xs text-[var(--error-color)]">{error}</p>}
    </div>
);

interface SignupDetailsStepProps {
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    register: UseFormRegister<SignupFormValues>;
    control: Control<SignupFormValues>;
    clearErrors: UseFormClearErrors<SignupFormValues>;
    errors: FieldErrors<SignupFormValues>;
    isLoading: boolean;
    isDisabled: boolean;
    defaultCountry?: CountryCode;
    policy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null;
}

export function SignupDetailsStep({
    onSubmit,
    register,
    control,
    clearErrors,
    errors,
    isLoading,
    isDisabled,
    defaultCountry,
    policy,
}: SignupDetailsStepProps) {
    const intlMessages = useRouteMessages();

    return (
        <form noValidate aria-busy={isDisabled} onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                    icon={<User className="h-4 w-4" />}
                    placeholder={intlMessages.auth.signup.fields.firstName}
                    error={errors.firstName?.message}
                    disabled={isDisabled}
                    inputProps={register("firstName", {
                        onChange: () => clearErrors("firstName"),
                    })}
                />
                <TextField
                    icon={<User className="h-4 w-4" />}
                    placeholder={intlMessages.auth.signup.fields.lastName}
                    error={errors.lastName?.message}
                    disabled={isDisabled}
                    inputProps={register("lastName", {
                        onChange: () => clearErrors("lastName"),
                    })}
                />
            </div>

            <Controller
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                    <PhoneInput
                        defaultCountry={defaultCountry}
                        policy={policy}
                        value={field.value ?? ""}
                        onChange={(value) => {
                            field.onChange(value);
                            clearErrors("phoneNumber");
                        }}
                        disabled={isDisabled}
                        error={errors.phoneNumber?.message}
                        tone="dark"
                    />
                )}
            />

            <p className="text-sm text-[var(--text-secondary)]" role="note">
                {intlMessages.auth.telegramDelivery.description}
            </p>

            <TextField
                icon={<Mail className="h-4 w-4" />}
                placeholder={intlMessages.auth.signup.fields.emailPlaceholder}
                type="email"
                error={errors.email?.message}
                disabled={isDisabled}
                inputProps={register("email", {
                    onChange: () => clearErrors("email"),
                })}
            />

            <PasswordField
                icon={<Lock className="h-4 w-4" />}
                placeholder={intlMessages.auth.signup.fields.passwordPlaceholder}
                inputProps={register("password", {
                    onChange: () => clearErrors("password"),
                })}
                disabled={isDisabled}
                error={errors.password?.message}
                tone="dark"
            />

            <TextField
                icon={<Gift className="h-4 w-4" />}
                placeholder={intlMessages.auth.signup.fields.referralCodePlaceholder}
                error={errors.referralCode?.message}
                disabled={isDisabled}
                inputProps={register("referralCode", {
                    onChange: () => clearErrors("referralCode"),
                })}
            />

            <button
                type="submit"
                disabled={isLoading || isDisabled}
                className="btn-default btn-highlighted auth-btn mt-6 text-center disabled:pointer-events-none disabled:opacity-60"
            >
                {isLoading ? intlMessages.auth.signup.buttonCreating : intlMessages.auth.signup.buttonSignUp}
            </button>
        </form>
    );
}

interface SignupOtpStepProps {
    otp: string;
    onOtpChange: (value: string) => void;
    onOtpComplete?: (value: string) => void;
    onSubmit: () => void;
    onResend: () => void;
    isLoading: boolean;
    isResending: boolean;
    isDisabled?: boolean;
    status?: OtpVerificationStatus;
    canResend: boolean;
    timeLeft: number;
    error?: string;
    telegramDelivery?: TelegramDelivery | null;
}

export function SignupOtpStep({
    otp,
    onOtpChange,
    onOtpComplete,
    onSubmit,
    onResend,
    isLoading,
    isResending,
    isDisabled,
    status = "idle",
    canResend,
    timeLeft,
    error,
    telegramDelivery,
}: SignupOtpStepProps) {
    const intlMessages = useRouteMessages();
    const isStepDisabled = isDisabled ?? (isLoading || isResending || status !== "idle");

    return (
        <div className="space-y-4">
            {isTelegramGatewayPending(telegramDelivery) ? (
                <p className="text-sm text-[var(--text-secondary)]" role="status">
                    {intlMessages.auth.telegramDelivery.gatewayPending}
                </p>
            ) : null}
            <OtpVerificationPanel
            value={otp}
            onChange={onOtpChange}
            onComplete={onOtpComplete}
            onSubmit={onSubmit}
            disabled={isStepDisabled}
            status={status}
            error={error}
            verifyLabel={intlMessages.auth.signup.buttonNext}
            verifyingLabel={intlMessages.auth.signup.otpButtonVerifying}
            successTitle={intlMessages.auth.signup.toastAccountCreated}
            successDescription={intlMessages.auth.signup.subtitleOtp}
            resend={{
                canResend: canResend && (!isTelegramGatewayPending(telegramDelivery) || timeLeft === 0),
                timeLeft,
                onResend,
                isResending,
                copy: {
                    prompt: intlMessages.auth.signup.otpPrompt,
                    resend: intlMessages.auth.signup.resend,
                    resending: intlMessages.auth.signup.resending,
                },
            }}
            />
        </div>
    );
}
