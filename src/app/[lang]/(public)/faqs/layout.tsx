import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { loadMessages } from "@/i18n/load-messages";
import { hasLocale, type Locale } from "@/lib/i18n";
import { buildFaqJsonLd, buildPublicPageMetadata, getPublicBaseRoute } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const route = getPublicBaseRoute("/faqs");

  return buildPublicPageMetadata({
    locale,
    path: "/faqs",
    title: route?.title ?? "Telegram Signal Copier FAQs",
    description:
      route?.description ??
      "Answers about connecting Telegram channels, copying signals to MT4/MT5, using approvals, and controlling risk in Tragram.",
    keywords: ["telegram signal copier faq", "copy telegram signals mt4 mt5", "telegram copier questions"],
  });
}

export default async function FaqsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const messages = await loadMessages(locale, ["home"] as const);
  const faqs = messages.home2.faqs.questions.map((faq) => ({
    question: faq.q.replace(/^Q\d+\.\s*/, ""),
    answer: faq.a,
  }));

  return (
    <>
      <JsonLd data={buildFaqJsonLd(faqs)} />
      {children}
    </>
  );
}
