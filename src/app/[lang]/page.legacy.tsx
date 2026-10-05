"use client";

import { Shield, Smartphone, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import {
    HomeFeatureGrid,
    HomeHero,
    HomeLaunchCta,
    HomeStatsStrip,
    type HomeFeaturePillar,
} from "@/components/marketing/home";

export default function HomePage() {
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const featureIcons = [Sparkles, Smartphone, Shield];
    const featurePillars: HomeFeaturePillar[] = intlMessages.home.featurePillars.map((pillar, index) => ({
        ...pillar,
        icon: featureIcons[index] ?? Sparkles,
    }));

    return (
        <div className="min-h-screen bg-midnight text-white">
            <HomeHero dict={intlMessages} lang={lang} highlights={featurePillars} />
            <HomeFeatureGrid title={intlMessages.home.whyTitle} features={featurePillars} />
            <HomeStatsStrip stats={intlMessages.home.stats} />
            <HomeLaunchCta
                label={intlMessages.home.launchLabel}
                heading={intlMessages.home.launchHeading}
                description={intlMessages.home.launchDescription}
                cta={intlMessages.home.launchCta}
                lang={lang}
            />
        </div>
    );
}
