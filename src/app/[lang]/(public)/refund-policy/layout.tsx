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
  const route = getPublicBaseRoute("/refund-policy");

  return buildPublicPageMetadata({
    locale,
    path: "/refund-policy",
    title: route?.title ?? "Tragram Refund Policy",
    description:
      route?.description ??
      "Read Tragram refund terms for Telegram signal automation subscriptions and billing changes.",
    keywords: ["tragram refund policy", "telegram signal copier subscription refund"],
  });
}

export default function RefundPolicyLayout({ children }: { children: ReactNode }) {
  return children;
}
