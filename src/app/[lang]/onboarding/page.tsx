"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import AppStoreButtons from '@/components/marketing/app-store-buttons';
import { resolvePublicLocale } from '@/lib/public-locales';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

type Slide = {
  heading: string;
  subheading: string;
  body: string;
};

export default function OnboardingPage() {
  const lang = useLocale();
  const router = useRouter();
    const intlMessages = useRouteMessages();
  const slides: Slide[] = intlMessages.onboardingPage.slides;
  const [index, setIndex] = useState(0);
  const viewedSlides = useRef(new Set<number>([0]));
  const slide = slides[index];

  useEffect(() => {
    if (viewedSlides.current.has(index)) return;
    viewedSlides.current.add(index);
    trackAnalyticsEvent("onboarding_slide_viewed", { slide_index: index });
  }, [index]);

  const goNext = () => setIndex((i) => Math.min(slides.length - 1, i + 1));
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const progress = ((index + 1) / slides.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-midnight text-white relative overflow-hidden">
      <div className="absolute inset-0 tg-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(15,107,255,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(27,163,255,0.18),transparent_32%)] pointer-events-none" />

      <header className="flex items-center justify-between px-6 pt-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#0f6bff,#1ba3ff)] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-xl font-black text-[var(--color-on-accent)]">T</span>
          </div>
          <span className="text-lg font-semibold">{intlMessages.onboardingPage.brand}</span>
        </div>
        <Link href={localizePath(lang, "/")} onClick={() => trackAnalyticsEvent("onboarding_skipped", { slide_index: index })} className="text-sm text-primary/80 hover:text-primary transition">
          {intlMessages.onboardingPage.skip}
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 relative z-10">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-primary/80">{slide.subheading}</p>
          <h1 className="text-2xl md:text-3xl font-bold leading-snug max-w-2xl">{slide.heading}</h1>
          <p className="text-gray-400 text-base max-w-xl">{slide.body}</p>
        </div>

        <section aria-label={intlMessages.onboardingPage.mobilePreview} className="rounded-2xl border border-white/10 p-6">
          <p className="mb-4 text-sm text-white/80">{intlMessages.onboardingPage.mobilePreview}</p>
          <AppStoreButtons locale={resolvePublicLocale(lang)} />
        </section>

        <div className="w-full max-w-md space-y-4">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[linear-gradient(135deg,#0f6bff,#1ba3ff)] rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" className="text-white/80" onClick={goPrev} disabled={index === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {intlMessages.onboardingPage.back}
            </Button>
            {index === slides.length - 1 ? (
              <Button
                variant="gradient"
                className="flex-1"
                onClick={() => {
                  trackAnalyticsEvent("onboarding_completed", { slide_index: index });
                  router.push(localizePath(lang, "/auth/signup"));
                }}
              >
                {intlMessages.onboardingPage.getStarted}
              </Button>
            ) : (
              <Button variant="gradient" className="flex-1" onClick={goNext}>
                {intlMessages.onboardingPage.next} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
