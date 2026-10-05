import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localizePath, type Locale } from "@/lib/i18n";
import { HomeSection } from "@/components/marketing/home/home-section";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

type HomeLaunchCtaProps = {
    label: string;
    heading: string;
    description: string;
    cta: string;
    lang: Locale;
};

export function HomeLaunchCta({ label, heading, description, cta, lang }: HomeLaunchCtaProps) {
    const billingDisabled = isBillingDisabledInCurrentEnv();
    const ctaHref = billingDisabled ? "/auth/signup" : "/pricing";
    return (
        <HomeSection className="pt-0">
            <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-[var(--marketing-cta-gradient)] p-6 text-center md:p-8 reveal">
                <div
                    aria-hidden="true"
                    className="absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
                />
                <div className="relative flex flex-col gap-5">
                    <p className="text-sm uppercase tracking-[0.4em] text-white/70">{label}</p>
                    <h3 className="text-3xl font-semibold text-white">{heading}</h3>
                    <p className="text-white/70">{description}</p>
                    <Button variant="gradient" size="lg" className="mx-auto gap-2" asChild>
                        <Link
                            href={localizePath(lang, ctaHref)}
                            className="flex items-center gap-2"
                        >
                            {cta} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </HomeSection>
    );
}
