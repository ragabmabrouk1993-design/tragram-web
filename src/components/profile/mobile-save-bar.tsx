"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileSaveBarProps = {
    label: string;
    loadingLabel?: string;
    isLoading?: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
};

export function MobileSaveBar({
    label,
    loadingLabel,
    isLoading = false,
    disabled = false,
    onClick,
    className,
}: MobileSaveBarProps) {
    return (
        <div className={cn("profile-mobile-save-bar", className)}>
            <Button
                variant="gradient"
                className={cn(
                    "profile-button profile-button-full profile-mobile-save-button disabled:opacity-100",
                    disabled && "is-disabled"
                )}
                disabled={disabled || isLoading}
                onClick={onClick}
            >
                {isLoading ? loadingLabel ?? label : label}
            </Button>
        </div>
    );
}

