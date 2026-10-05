import type { Metadata } from "next";
import { getHome2Copy } from "../../marketing/marketing-copy";
import FeaturesContent from "./features-content";
import { hasLocale, type Locale } from "@/lib/i18n";
import { loadMessages } from "@/i18n/load-messages";
import { buildPublicPageMetadata, getPublicBaseRoute } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const route = getPublicBaseRoute("/features");

  return buildPublicPageMetadata({
    locale,
    path: "/features",
    title: route?.title ?? "Telegram Signal Automation Features",
    description:
      route?.description ??
      "See how Tragram handles Telegram signal intake, parsing, MT4/MT5 routing, approval rules, risk controls, and execution history.",
    keywords: ["telegram signals automation", "telegram copier features", "mt4 mt5 signal copier"],
  });
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  const messages = await loadMessages(locale, ["home", "public-pages"] as const);
  const home2Copy = getHome2Copy(messages);

  return <FeaturesContent locale={locale} home2Copy={home2Copy} legacyPages={messages.legacyPages} />;
}
