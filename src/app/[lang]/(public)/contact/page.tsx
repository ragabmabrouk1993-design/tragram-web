import type { Metadata } from "next";
import ContactUsContent from "./contact-us-content";
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
  const route = getPublicBaseRoute("/contact");

  return buildPublicPageMetadata({
    locale,
    path: "/contact",
    title: route?.title ?? "Contact Tragram",
    description:
      route?.description ??
      "Contact Tragram support for help with Telegram channel setup, MT4/MT5 connection, signal automation, and billing questions.",
    keywords: ["tragram support", "telegram signal copier support", "mt4 mt5 setup help"],
  });
}

export default async function ContactUsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  const messages = await loadMessages(locale, ["public-pages"] as const);
  return <main id="main-content" tabIndex={-1}><ContactUsContent locale={locale} legacyPages={{contact:messages.legacyPages.contact}} /></main>;
}
