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
  const route = getPublicBaseRoute("/privacy-policy");

  return buildPublicPageMetadata({
    locale,
    path: "/privacy-policy",
    title: route?.title ?? "Tragram Privacy Policy",
    description:
      route?.description ??
      "Read how Tragram handles account, Telegram, MT4/MT5, billing, and support data for the signal automation workflow.",
    keywords: ["tragram privacy", "telegram signal copier privacy", "mt4 mt5 data privacy"],
  });
}

export default function PrivacyPolicyLayout({ children }: { children: ReactNode }) {
  return children;
}
