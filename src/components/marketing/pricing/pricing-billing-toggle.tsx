import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/services/payment.service";

type PricingBillingToggleProps = {
    billingPeriod: BillingPeriod;
    onChange: (period: BillingPeriod) => void;
    monthlyLabel: string;
    yearlyLabel: string;
    saveLabel: string;
};

export function PricingBillingToggle({
    billingPeriod,
    onChange,
    monthlyLabel,
    yearlyLabel,
    saveLabel,
}: PricingBillingToggleProps) {
    return (
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <div className="relative inline-grid w-full max-w-[18rem] min-w-0 grid-cols-2 overflow-hidden rounded-full border border-white/10 bg-white/5 p-1 sm:w-auto sm:max-w-none">
                <span
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-linear-to-r from-primary to-accent shadow-[0_8px_24px_rgba(15,107,255,0.28)] transition-transform duration-200 ease-out",
                        billingPeriod === "YEARLY" ? "translate-x-full" : "translate-x-0"
                    )}
                />
                <button
                    onClick={() => onChange("MONTHLY")}
                    className={cn(
                        "relative z-10 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors sm:min-w-[7.5rem] sm:px-6",
                        billingPeriod === "MONTHLY"
                            ? "text-[var(--color-on-accent)]"
                            : "text-white/60 hover:text-white"
                    )}
                    aria-pressed={billingPeriod === "MONTHLY"}
                    type="button"
                >
                    {monthlyLabel}
                </button>
                <button
                    onClick={() => onChange("YEARLY")}
                    className={cn(
                        "relative z-10 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors sm:min-w-[7.5rem] sm:px-6",
                        billingPeriod === "YEARLY"
                            ? "text-[var(--color-on-accent)]"
                            : "text-white/60 hover:text-white"
                    )}
                    aria-pressed={billingPeriod === "YEARLY"}
                    type="button"
                >
                    {yearlyLabel}
                </button>
            </div>
            <span className="inline-flex min-h-7 items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold leading-none text-emerald-300">
                {saveLabel}
            </span>
        </div>
    );
}
