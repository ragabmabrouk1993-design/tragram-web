import { cn } from "@/lib/utils";
import type { FeatureItem } from "@/components/marketing/features/features-types";

type FeaturesGridSectionProps = {
    label: string;
    features: FeatureItem[];
    accent?: "core" | "security";
};

export function FeaturesGridSection({ label, features, accent = "core" }: FeaturesGridSectionProps) {
    const labelClass = accent === "core" ? "text-primary" : "text-accent";
    const cardClass =
        accent === "core"
            ? "bg-midnight/60 shadow-xl shadow-primary/10"
            : "bg-linear-to-br from-slate-900/80 to-midnight/70";

    return (
        <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <article
                            key={feature.title}
                            className={cn(
                                "rounded-3xl border border-white/10 p-6 reveal",
                                cardClass
                            )}
                            style={{ animationDelay: `${index * 120}ms` }}
                        >
                            <p className={cn("text-sm uppercase tracking-[0.3em]", labelClass)}>
                                {label}
                            </p>
                            <h2 className="mt-3 text-xl font-semibold text-white">
                                {feature.title}
                            </h2>
                            <p className="mt-3 text-white/70">{feature.copy}</p>
                            <p className="mt-4 text-sm text-white/60">{feature.detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
