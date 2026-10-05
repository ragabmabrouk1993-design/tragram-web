"use client";

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
    total: number;
    current: number;
    className?: string;
    tone?: "light" | "dark";
}

export function StepIndicator({ total, current, className, tone = "light" }: StepIndicatorProps) {
    return (
        <div
            className={cn("flex items-center gap-2", className)}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={current + 1}
        >
            {Array.from({ length: total }).map((_, index) => (
                <span
                    key={index}
                    className={cn(
                        "h-2 rounded-full transition-colors",
                        index === current
                            ? "w-6 bg-[var(--color-primary)]"
                            : tone === "dark"
                                ? "w-2 bg-[var(--text-faint)]"
                                : "w-2 bg-slate-200"
                    )}
                />
            ))}
        </div>
    );
}
