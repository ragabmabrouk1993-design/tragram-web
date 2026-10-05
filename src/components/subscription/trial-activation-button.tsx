"use client";

import { useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type TrialActivationButtonProps = Omit<ButtonProps, "children" | "onClick" | "disabled"> & {
  label: string;
  loadingLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onActivate: () => void | Promise<void>;
};

export function TrialActivationButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onActivate,
  ...buttonProps
}: TrialActivationButtonProps) {
  const inFlight = useRef(false);

  const handleClick = async () => {
    if (disabled || loading || inFlight.current) return;
    inFlight.current = true;
    try {
      await onActivate();
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <Button
      type="button"
      {...buttonProps}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={() => {
        void handleClick();
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
