import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, invalid, "aria-invalid": ariaInvalid, ...props }, ref) => {
        const resolvedAriaInvalid = ariaInvalid ?? (invalid ? true : undefined);
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-xl border px-4 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium border-[color:var(--input-border)] bg-[color:var(--input-bg)] text-[color:var(--input-text)] placeholder:text-[color:var(--input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60",
                    invalid && "border-red-400/90 focus-visible:border-red-400/90 focus-visible:ring-red-400/40",
                    className
                )}
                aria-invalid={resolvedAriaInvalid}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
