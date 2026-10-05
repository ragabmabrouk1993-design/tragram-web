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
  const route = getPublicBaseRoute("/help-center");

  return buildPublicPageMetadata({
    locale,
    path: "/help-center",
    title: route?.title ?? "Tragram Help Center",
    description:
      route?.description ??
      "Get help with Telegram signal copying, MT4/MT5 account setup, channel rules, risk controls, and execution visibility.",
    keywords: ["tragram help", "telegram copier setup help", "mt4 mt5 signal setup"],
  });
}

export default function HelpCenterLayout({ children }: { children: ReactNode }) {
  return children;
}
