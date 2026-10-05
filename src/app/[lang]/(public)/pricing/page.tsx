import type { Metadata } from "next";
import { getHome2Copy } from "../../marketing/marketing-copy";
import PricingContent from "./pricing-content";
import { hasLocale, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import { loadMessages } from "@/i18n/load-messages";
import { buildPublicPageMetadata, getPublicBaseRoute } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  if (isBillingDisabledInServerEnv()) {
    notFound();
  }
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const route = getPublicBaseRoute("/pricing");

  return buildPublicPageMetadata({
    locale,
    path: "/pricing",
    title: route?.title ?? "Tragram Pricing",
    description:
      route?.description ??
      "Choose a Tragram plan for Telegram-to-MT4/MT5 signal automation based on channel and account capacity.",
    keywords: ["telegram signal copier pricing", "telegram to mt5 copier pricing", "tragram pricing"],
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  if (isBillingDisabledInServerEnv()) {
    notFound();
  }

  const messages = await loadMessages(locale, ["home", "public-pages"] as const);
  const home2Copy = getHome2Copy(messages);

  return <PricingContent locale={locale} home2Copy={home2Copy} legacyPages={messages.legacyPages} />;
}
