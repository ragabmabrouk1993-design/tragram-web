"use client";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "primary" | "secondary" | "outline";
}

export function Badge({ variant = "primary", className, children, ...props }: BadgeProps) {
    const variantClass = {
        primary: "bg-primary text-[var(--color-on-accent)]",
        secondary:
            "border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-strong)] text-[color:var(--text-secondary)]",
        outline: "border border-[color:var(--border-heavy)] text-[color:var(--text-secondary)]",
    }[variant];

    return (
        <span
            {...props}
            className={cn(
                "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                variantClass,
                className
            )}
        >
            {children}
        </span>
    );
}
