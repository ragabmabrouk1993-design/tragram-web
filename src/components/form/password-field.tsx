"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

interface PasswordFieldProps {
    icon?: ReactNode;
    error?: string;
    placeholder?: string;
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
    className?: string;
    tone?: "dark";
    disabled?: boolean;
    showPasswordLabel?: string;
    hidePasswordLabel?: string;
}

export function PasswordField({
    icon,
    error,
    placeholder,
    inputProps,
    className,
    disabled = false,
    showPasswordLabel,
    hidePasswordLabel,
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const lang = useLocale();
    const isRtl = lang === "ar";
    const { type: _inputType, ...restInputProps } = inputProps ?? {};
    void _inputType;
    const isDisabled = disabled || Boolean(restInputProps.disabled);

    return (
        <div className={cn("space-y-2", className)}>
            <div
                className={cn(
                    "auth-round relative flex h-12 items-center gap-3 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] px-4",
                    isDisabled && "opacity-60",
                    error && "auth-flow-field-error border-red-400/90"
                )}
            >
                {icon && (
                    <span className="text-[var(--input-placeholder)]">
                        {icon}
                    </span>
                )}
                <input
                    type={visible ? "text" : "password"}
                    placeholder={placeholder}
                    aria-invalid={Boolean(error)}
                    className={cn(
                        "w-full bg-transparent text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none disabled:cursor-not-allowed",
                        isRtl ? "pl-10 text-right" : "pr-10 text-left"
                    )}
                    disabled={isDisabled}
                    {...restInputProps}
                />
                <button
                    type="button"
                    onClick={() => setVisible((prev) => !prev)}
                    disabled={isDisabled}
                    className={cn(
                        "absolute grid h-8 w-8 place-items-center rounded-full bg-transparent text-[var(--text-secondary)] transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[var(--text-secondary)]",
                        isRtl ? "left-4" : "right-4"
                    )}
                    aria-label={visible ? hidePasswordLabel ?? "Hide password" : showPasswordLabel ?? "Show password"}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
            {error && <p className="text-xs text-[var(--error-color)]">{error}</p>}
        </div>
    );
}
