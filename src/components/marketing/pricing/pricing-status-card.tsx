import type { UserSubscription } from "@/services/payment.service";

type PricingStatusCardProps = {
    subscription: UserSubscription | null;
    statusLabel: string;
    billingLabel: string;
    noActivePlan: string;
    notSubscribed: string;
    billingPeriod?: string;
};

export function PricingStatusCard({
    subscription,
    statusLabel,
    billingLabel,
    noActivePlan,
    notSubscribed,
    billingPeriod,
}: PricingStatusCardProps) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 reveal">
            <p className="font-semibold text-white">
                {subscription?.plan?.name || noActivePlan}
            </p>
            <p>
                {statusLabel}:{" "}
                <span className="text-primary">
                    {subscription?.status ?? notSubscribed}
                </span>
            </p>
            {billingPeriod && <p>{billingLabel}: {billingPeriod}</p>}
        </div>
    );
}
