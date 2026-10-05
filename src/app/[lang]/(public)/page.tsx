import Home2About from "../marketing/components/about";
import Home2Benefits from "../marketing/components/benefits";
import Home2Hero from "../marketing/components/hero";
import Home2DigitalCompanion from "../marketing/components/digital-companion";
import Home2OurFeatures from "../marketing/components/our-features";
import Home2Pricing from "../marketing/components/pricing";
import Home2OurTools from "../marketing/components/our-tools";
import Home2WhyChooseUs from "../marketing/components/why-choose-us";
import Home2Faqs from "../marketing/components/faqs";
import Home2Cta from "../marketing/components/cta";
import type { Metadata } from "next";
import { hasLocale, type Locale } from "@/lib/i18n";
import { getHome2Copy } from "../marketing/marketing-copy";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import { loadMessages } from "@/i18n/load-messages";
import { buildPublicPageMetadata, getPublicBaseRoute } from "@/lib/seo";
import "../../styles/pages/public-home.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const route = getPublicBaseRoute("/");

  return buildPublicPageMetadata({
    locale,
    path: "/",
    title: route?.title ?? "Telegram Signal Copier for MT4 and MT5",
    description:
      route?.description ??
      "Tragram connects Telegram channels to MT4 and MT5 with user rules, risk controls, execution logs, and pause controls.",
    keywords: ["telegram signal copier", "telegram to mt4 copier", "telegram to mt5 copier"],
  });
}

export default async function Home2Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  const homeMessages = await loadMessages(locale, ["home"] as const);
  const home2Copy = getHome2Copy(homeMessages);
  const showPricing = !isBillingDisabledInServerEnv();
  return (
    <>
      <Home2Hero copy={home2Copy} locale={locale} />
      <Home2About copy={home2Copy} locale={locale} />
      <Home2OurFeatures copy={home2Copy} locale={locale} />
      <Home2WhyChooseUs copy={home2Copy} />
      <Home2DigitalCompanion copy={home2Copy} locale={locale} />
      <Home2Benefits copy={home2Copy} locale={locale} />
      <Home2OurTools copy={home2Copy} locale={locale} />
      {showPricing && <Home2Pricing copy={home2Copy} locale={locale} />}
      <Home2Faqs copy={home2Copy} locale={locale} />
      <Home2Cta copy={home2Copy} locale={locale} />
    </>
  );
}
