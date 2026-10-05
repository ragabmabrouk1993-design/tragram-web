import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import type { FeatureItem } from "@/components/marketing/features/features-types";

type FeaturesHeroProps = {
    dict: Dictionary;
    locale: Locale;
    highlights: FeatureItem[];
};

export function FeaturesHero({ dict, locale, highlights }: FeaturesHeroProps) {
    return (
        <section className="relative overflow-hidden py-16 md:py-24 tg-grid">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"
            />
            <div
                aria-hidden="true"
                className="absolute -left-20 top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="container relative z-10 mx-auto grid gap-10 px-4 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
                <div className="space-y-6 reveal">
                    <Badge variant="secondary">{dict.featuresPage.badge}</Badge>
                    <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                        {dict.featuresPage.heading}
                    </h1>
                    <p className="max-w-2xl text-lg text-white/80">
                        {dict.featuresPage.intro}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button variant="gradient" asChild>
                            <Link href={localizePath(locale, "/auth/signup")}>
                                {dict.featuresPage.primaryCta}
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={localizePath(locale, "/auth/login")}>
                                {dict.featuresPage.secondaryCta}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div
                    className="relative rounded-4xl border border-white/10 bg-[var(--marketing-highlight-gradient)] p-6 shadow-[0_20px_70px_rgba(12,17,33,0.5)] reveal"
                    style={{ animationDelay: "140ms" }}
                >
                    <div className="space-y-5">
                        {highlights.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                                <p className="text-xs uppercase tracking-[0.3em] text-primary">
                                    {index === 0
                                        ? dict.featuresPage.coreLabel
                                        : dict.featuresPage.securityLabel}
                                </p>
                                <h2 className="mt-2 text-lg font-semibold text-white">
                                    {feature.title}
                                </h2>
                                <p className="mt-2 text-sm text-white/70">{feature.copy}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
