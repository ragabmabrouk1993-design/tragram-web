import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasLocale, type Locale } from "@/lib/i18n";
import { buildPublicPageMetadata, getPublicBaseRoute } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const route = getPublicBaseRoute("/terms-of-service");

  return buildPublicPageMetadata({
    locale,
    path: "/terms-of-service",
    title: route?.title ?? "Tragram Terms of Service",
    description:
      route?.description ??
      "Read the terms for using Tragram to connect Telegram channels, apply user rules, and route eligible signals to MT4/MT5.",
    keywords: ["tragram terms", "telegram signal copier terms", "mt4 mt5 automation terms"],
  });
}

export default function TermsOfServiceLayout({ children }: { children: ReactNode }) {
  return children;
}
