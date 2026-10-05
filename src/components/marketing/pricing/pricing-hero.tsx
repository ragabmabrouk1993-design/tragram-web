import { Shield } from "lucide-react";

type PricingHeroProps = {
    kicker: string;
    title: string;
    subtitle: string;
    secureTitle: string;
    secureSubtitle: string;
};

export function PricingHero({
    kicker,
    title,
    subtitle,
    secureTitle,
    secureSubtitle,
}: PricingHeroProps) {
    return (
        <section className="relative overflow-hidden py-16 md:py-20 tg-grid">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"
            />
            <div
                aria-hidden="true"
                className="absolute -right-16 top-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="container relative z-10 mx-auto flex flex-col gap-6 px-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-center lg:text-start reveal">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                        {kicker}
                    </p>
                    <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-lg text-white/70">
                        {subtitle}
                    </p>
                </div>
                <div
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 reveal"
                    style={{ animationDelay: "140ms" }}
                >
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm font-medium text-white">{secureTitle}</p>
                        <p className="text-xs text-white/60">{secureSubtitle}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
