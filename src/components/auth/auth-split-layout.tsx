"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TragramLogo } from "@/components/ui/logo";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  heading: string;
  helper?: string;
  stepTitle: string;
  stepSubtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
  stepIndicator?: React.ReactNode;
};

export function AuthSplitLayout({
  heading,
  helper,
  stepTitle,
  stepSubtitle,
  children,
  footer,
  onBack,
  backDisabled = false,
  stepIndicator,
}: AuthSplitLayoutProps) {
  const lang = useLocale();
    const intlMessages = useRouteMessages();
  const isRtl = lang === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const marketing = intlMessages.auth.marketing;
  const slides =
    (marketing.slides && marketing.slides.length > 0
      ? marketing.slides
      : [
        {
          kicker: marketing.heroKicker,
          title: marketing.heroTitle,
          body: marketing.heroBody,
        },
      ]) ?? [];
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const slideCount = slides.length || 1;
  const clampedIndex = ((activeSlide % slideCount) + slideCount) % slideCount;

  const goNext = () => setActiveSlide((prev) => (prev + 1) % slideCount);
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideCount]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--color-midnight),var(--surface-page))] text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-stretch lg:px-6 lg:py-10">
        <section
          className={cn(
            "login-panel relative w-full overflow-visible rounded-3xl border border-border-subtle bg-[var(--surface-elevated)] px-6 py-6 text-text-primary shadow-[0_30px_80px_rgba(8,13,24,0.45)] sm:px-8 lg:w-[42%] lg:py-12",
            isRtl ? "lg:rounded-l-none" : "lg:rounded-r-none"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={localizePath(lang, "/")}
                className="auth-round inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-secondary)] transition hover:border-primary hover:text-text-primary"
                aria-label={intlMessages.auth.common.backToHome}
              >
                <Home className="h-4 w-4" />
              </Link>
              <TragramLogo className="h-7 w-auto" />
              <span className="text-lg font-semibold tracking-wide text-text-primary">Tragram</span>
            </div>
          </div>

          <div className="mt-8 space-y-3 lg:mt-10">
            <p
              className={cn(
                "text-xs font-semibold text-primary",
                !isRtl && "uppercase tracking-[0.28em]"
              )}
            >
              {marketing.kicker}
            </p>
            <h1 className="text-3xl font-semibold text-text-primary sm:text-4xl">{heading}</h1>
            {helper && <p className="text-sm leading-6 text-text-secondary">{helper}</p>}
          </div>

          <div className="mt-6 flex items-center justify-between lg:mt-8">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={backDisabled}
                aria-disabled={backDisabled}
                className={cn(
                  "auth-round inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-secondary)] transition hover:border-primary hover:text-text-primary",
                  backDisabled && "cursor-not-allowed opacity-60 hover:border-[var(--input-border)] hover:text-[var(--text-secondary)]"
                )}
                aria-label={intlMessages.auth.common.back}
              >
                <BackIcon className="h-4 w-4" />
              </button>
            )}
            {stepIndicator}
          </div>

          <div className="mt-5 space-y-2.5 lg:mt-7">
            <h2 className="text-lg font-semibold text-text-primary">{stepTitle}</h2>
            {stepSubtitle && <p className="text-sm leading-6 text-text-secondary">{stepSubtitle}</p>}
          </div>

          <div className="mt-5 lg:mt-7">{children}</div>

          {footer && <div className="mt-4 text-center text-sm text-text-secondary lg:mt-5">{footer}</div>}

          <div className="mt-4 flex justify-center lg:mt-6">
            <LanguageSwitch className="appzen-lang-switch" variant="dropdown" />
          </div>
        </section>

        <aside
          className={cn(
            "relative mt-6 hidden w-full overflow-hidden rounded-3xl bg-[linear-gradient(160deg,var(--surface-elevated),rgba(15,107,255,0.22))] px-6 py-10 text-text-primary shadow-[0_24px_60px_rgba(5,10,22,0.45)] sm:px-8 lg:mt-0 lg:flex lg:w-[58%]",
            isRtl ? "lg:rounded-r-none" : "lg:rounded-l-none"
          )}
        >
          <div className="absolute inset-0">
            <div
              className={cn(
                "absolute -top-20 h-56 w-56 rounded-full bg-[rgba(15,107,255,0.55)] blur-[90px]",
                isRtl ? "-left-12" : "-right-12"
              )}
            />
            <div
              className={cn(
                "absolute top-1/3 h-48 w-48 rounded-full bg-[rgba(27,163,255,0.45)] blur-[80px]",
                isRtl ? "right-10" : "left-10"
              )}
            />
            <div
              className={cn(
                "absolute bottom-0 h-72 w-72 rounded-full bg-[rgba(4,10,20,0.9)] blur-[120px]",
                isRtl ? "right-0" : "left-0"
              )}
            />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-size-[24px_24px]" />
          </div>

          <div className="relative z-10 flex h-full min-w-0 flex-col justify-between gap-8">
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
              <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border-subtle bg-[color:var(--surface-elevated)] p-4 text-text-primary shadow-[0_18px_40px_rgba(8,13,24,0.35)]">
                <p className="text-xs font-semibold text-text-secondary">{marketing.cardPrimaryLabel}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{marketing.cardPrimaryValue}</p>
                <p className="mt-1 text-xs text-emerald-400">{marketing.cardPrimaryDelta}</p>
              </div>
              <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border-subtle bg-[color:var(--surface-elevated)] p-4 text-text-primary shadow-[0_18px_40px_rgba(8,13,24,0.35)]">
                <p className="text-xs font-semibold text-text-secondary">{marketing.cardSecondaryLabel}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{marketing.cardSecondaryValue}</p>
                <p className="mt-1 text-xs text-emerald-400">{marketing.cardSecondaryDelta}</p>
              </div>
            </div>

            <div className="w-full min-w-0 max-w-full overflow-hidden rounded-4xl border border-border-subtle bg-[color:var(--surface-panel-strong)] p-5 backdrop-blur xl:p-6">
              <div
                className="w-full min-w-0 overflow-hidden"
                role="region"
                aria-roledescription="carousel"
                aria-label={marketing.heroTitle}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="flex w-full transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${clampedIndex * 100}%)` }}
                >
                  {slides.map((slide, index) => (
                    <div className="min-w-full max-w-full" key={`auth-slide-${index}`}>
                      <div className="flex min-w-0 items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-xs text-[var(--text-muted)]",
                              !isRtl && "uppercase tracking-[0.28em]"
                            )}
                          >
                            {slide.kicker}
                          </p>
                          <h3 className="mt-3 text-xl leading-tight font-semibold text-text-primary xl:text-2xl">
                            {slide.title}
                          </h3>
                          <p className="mt-3 break-words text-sm text-text-secondary">{slide.body}</p>
                        </div>
                        <div className="hidden h-24 w-24 shrink-0 rounded-full border border-border-subtle bg-[color:var(--surface-panel)] 2xl:flex 2xl:items-center 2xl:justify-center">
                          <div className="h-12 w-12 rounded-full border-4 border-[var(--text-secondary)] border-t-transparent" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={`hero-dot-${index}`}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className="appearance-none border-0 bg-transparent p-0"
                    aria-label={`Go to slide ${index + 1}`}
                    aria-pressed={index === clampedIndex}
                  >
                    <span
                      className={
                        index === clampedIndex
                          ? "block h-2 w-2 rounded-full bg-primary"
                          : "block h-2 w-2 rounded-full bg-[var(--text-faint)]"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "pl-6" : "pr-6")}>
              <div
                className={cn(
                  "rounded-full bg-[color:var(--surface-panel-strong)] px-4 py-2 text-[11px] font-semibold text-text-secondary",
                  !isRtl && "uppercase tracking-[0.14em]"
                )}
              >
                {marketing.pillOne}
              </div>
              <div
                className={cn(
                  "rounded-full bg-[color:var(--surface-panel-strong)] px-4 py-2 text-[11px] font-semibold text-text-secondary",
                  !isRtl && "uppercase tracking-[0.14em]"
                )}
              >
                {marketing.pillTwo}
              </div>
              <div
                className={cn(
                  "rounded-full bg-[color:var(--surface-panel-strong)] px-4 py-2 text-[11px] font-semibold text-text-secondary",
                  !isRtl && "uppercase tracking-[0.14em]"
                )}
              >
                {marketing.pillThree}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
