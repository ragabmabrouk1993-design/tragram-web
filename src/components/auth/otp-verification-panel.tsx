"use client";

import { Check, Loader2 } from "lucide-react";
import { OTPInput } from "@/components/auth/otp-input";
import { cn } from "@/lib/utils";
import styles from "./otp-verification-panel.module.css";

export const DEFAULT_OTP_RESEND_COOLDOWN_SECONDS = 2 * 60;

export const formatOtpCountdown = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    return `00:${safeSeconds.toString().padStart(2, "0")}`;
};

export const parseOtpRetryAfterSeconds = (message?: string | null) => {
    if (!message) {
        return null;
    }

    const matches = /Please wait (\d+) seconds/i.exec(message);
    if (!matches) {
        return null;
    }

    const seconds = Number(matches[1]);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

export type OtpVerificationStatus = "idle" | "verifying" | "success";

interface OtpResendCopy {
    prompt: string;
    resend: string;
    resending: string;
}

interface OtpVerificationPanelProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    onSubmit: () => void;
    error?: string;
    disabled?: boolean;
    status?: OtpVerificationStatus;
    length?: number;
    verifyLabel: string;
    verifyingLabel: string;
    successTitle?: string;
    successDescription?: string;
    resend?: {
        canResend: boolean;
        timeLeft: number;
        onResend: () => void;
        isResending: boolean;
        copy: OtpResendCopy;
    };
    className?: string;
}

export function OtpVerificationPanel({
    value,
    onChange,
    onComplete,
    onSubmit,
    error,
    disabled = false,
    status = "idle",
    length = 6,
    verifyLabel,
    verifyingLabel,
    successTitle = "Verified successfully",
    successDescription = "Your verification code has been confirmed.",
    resend,
    className,
}: OtpVerificationPanelProps) {
    const isBusy = disabled || status === "verifying" || status === "success";
    const showSuccess = status === "success";

    return (
        <div className={cn(styles.panel, "px-5 pb-5 pt-12 sm:px-7 sm:pb-7", className)} aria-busy={isBusy}>
            <div className={cn(styles.content, "space-y-6 text-center")}>
                {showSuccess ? (
                    <div className="flex min-h-[13rem] flex-col items-center justify-center gap-5">
                        <div
                            className={cn(
                                styles.successMark,
                                "relative z-0 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#111827] text-white"
                            )}
                            aria-hidden="true"
                        >
                            <Check className="h-8 w-8" strokeWidth={3} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-[var(--text-primary)]">{successTitle}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{successDescription}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={cn(styles.inputWrap, error && styles.shake)}>
                            <OTPInput
                                value={value}
                                onChange={onChange}
                                onComplete={onComplete}
                                tone="dark"
                                length={length}
                                error={Boolean(error)}
                                disabled={isBusy}
                                inputClassName="rounded-2xl bg-black/20 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.22)] transition duration-200 focus-visible:shadow-[0_0_0_1px_rgba(34,197,94,0.55),0_0_26px_rgba(34,197,94,0.42)]"
                            />
                        </div>

                        {error && <p className="text-xs text-[var(--error-color)]">{error}</p>}

                        {resend ? (
                            <div className="text-sm text-[var(--text-secondary)]">
                                {resend.copy.prompt}{" "}
                                {resend.canResend ? (
                                    <button
                                        type="button"
                                        onClick={resend.onResend}
                                        disabled={isBusy || resend.isResending}
                                        className="font-semibold text-[var(--color-primary)] underline-offset-4 transition hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-60"
                                    >
                                        {resend.isResending ? resend.copy.resending : resend.copy.resend}
                                    </button>
                                ) : (
                                    <span className="font-semibold text-[var(--color-primary)]">
                                        {formatOtpCountdown(resend.timeLeft)}
                                    </span>
                                )}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={isBusy}
                            className="btn-default btn-highlighted auth-btn text-center disabled:pointer-events-none disabled:opacity-60"
                        >
                            {status === "verifying" ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {verifyingLabel}
                                </span>
                            ) : (
                                verifyLabel
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
