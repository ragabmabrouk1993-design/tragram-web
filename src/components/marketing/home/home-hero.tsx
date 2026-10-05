import Link from "next/link";
import Typewriter from "typewriter-effect";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import { HomeHeroVisual } from "@/components/marketing/home/home-hero-visual";
import type { HomeFeaturePillar } from "@/components/marketing/home/home-types";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

type HomeHeroProps = {
    dict: Dictionary;
    lang: Locale;
    highlights: HomeFeaturePillar[];
};

export function HomeHero({ dict, lang, highlights }: HomeHeroProps) {
    const billingDisabled = isBillingDisabledInCurrentEnv();
    const secondaryCtaHref = billingDisabled ? "/auth/signup" : "/pricing";
    return (
        <section className="relative overflow-hidden pb-16 pt-20 md:pb-24 md:pt-28 tg-grid">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent"
            />
            <div
                aria-hidden="true"
                className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="container relative z-10 mx-auto grid gap-12 px-4 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
                <div className="space-y-7 reveal">
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        {dict.home.badge}
                    </div>

                    <h1 className="grid text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-5xl tracking-tight">
                        <span className="invisible col-start-1 row-start-1">
                            {dict.home.heroStatementPlaceholder}
                        </span>
                        <span className="col-start-1 row-start-1">
                            <Typewriter
                                options={{
                                    strings: dict.home.heroStatements,
                                    autoStart: true,
                                    loop: true,
                                    delay: 60,
                                    deleteSpeed: 0,
                                    cursor: "",
                                    wrapperClassName: "block",
                                }}
                            />
                        </span>
                    </h1>

                    <p className="max-w-2xl text-base text-white/70 md:max-w-3xl">
                        {dict.home.heroDescription}
                    </p>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <Button
                            variant="gradient"
                            size="lg"
                            className="w-full gap-2 md:w-auto glow-button"
                            asChild
                        >
                            <Link
                                href={localizePath(lang, "/auth/signup")}
                                className="flex items-center justify-center gap-2"
                            >
                                {dict.home.primaryCta} <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full md:w-auto"
                            asChild
                        >
                            <Link href={localizePath(lang, secondaryCtaHref)}>{dict.home.secondaryCta}</Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-[0.3em] text-white/60">
                        {dict.home.trustLogos.map((logo) => (
                            <div key={logo} className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-white/50" /> {logo}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {highlights.map((feature) => (
                            <div
                                key={feature.title}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
                            >
                                <feature.icon className="h-4 w-4 text-primary" />
                                {feature.title}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="reveal" style={{ animationDelay: "140ms" }}>
                    <HomeHeroVisual
                        previewHeading={dict.home.previewHeading}
                        previewSubtitle={dict.home.previewSubtitle}
                        previewStatus={dict.home.previewStatus}
                        icons={highlights.map((feature) => feature.icon)}
                    />
                </div>
            </div>
        </section>
    );
}
