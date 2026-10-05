"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export function Switch({ label, className, ...props }: SwitchProps) {
    const isChecked = Boolean(props.checked ?? props.defaultChecked);

    return (
        <label
            className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] hover:border-[color:var(--border-heavy)]",
                className
            )}
        >
            <span className="text-[color:var(--text-secondary)]">{label}</span>
            <span
                className={cn(
                    "relative inline-flex h-6 w-12 items-center rounded-full transition-all",
                    isChecked ? "bg-linear-to-r from-primary to-accent" : "bg-[color:var(--surface-panel-strong)]"
                )}
            >
                <span
                    className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-[color:var(--surface-panel-solid)] transition",
                        isChecked ? "translate-x-6" : "translate-x-1"
                    )}
                />
                <input
                    type="checkbox"
                    className="sr-only"
                    {...props}
                />
            </span>
        </label>
    );
}
