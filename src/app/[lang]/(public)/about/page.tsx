import type { Metadata } from "next";
import { getHome2Copy } from "../../marketing/marketing-copy";
import AboutContent from "./about-content";
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
  const route = getPublicBaseRoute("/about");

  return buildPublicPageMetadata({
    locale,
    path: "/about",
    title: route?.title ?? "About Tragram",
    description:
      route?.description ??
      "Learn how Tragram helps traders connect Telegram signals to MT4 and MT5 while keeping execution rules visible and under user control.",
    keywords: ["about tragram", "telegram signal automation", "telegram to mt4 mt5"],
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  const messages = await loadMessages(locale, ["home", "public-pages"] as const);
  const home2Copy = getHome2Copy(messages);

  return <AboutContent locale={locale} home2Copy={home2Copy} legacyPages={messages.legacyPages} />;
}
