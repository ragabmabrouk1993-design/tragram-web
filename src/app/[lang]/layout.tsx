import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Script from "next/script";
import type { ReactNode } from "react";
import "../globals.css";
import { hasLocale, locales } from "@/lib/i18n";
import { siteName, siteUrl } from "@/lib/seo";
import { resolveCommercialModeServerEnv } from "@/lib/runtime-environment";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tragram - Telegram Signal Copier for MT4 and MT5",
    template: `%s | ${siteName}`,
  },
  description: "Connect Telegram channels to MT4 and MT5 with user rules, risk controls, approval options, execution logs, and pause controls.",
  applicationName: siteName,
  category: "FinanceApplication",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0048FB" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050910" },
    { media: "(prefers-color-scheme: light)", color: "#0F6BFF" },
  ],
};

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

type RootLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  setRequestLocale(lang);

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "")
    .replace(/\/api\/?$/, "");
  const runtimeEnvironment =
    process.env.NEXT_PUBLIC_ENVIRONMENT ??
    process.env.ENVIRONMENT ??
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    "";
  const visualParityMode =
    process.env.NEXT_PUBLIC_VISUAL_PARITY_MODE ??
    process.env.VISUAL_PARITY_MODE ??
    "";
  const commercialMode = resolveCommercialModeServerEnv();
  const crispWebsiteId =
    process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ??
    process.env.CRISP_WEBSITE_ID ??
    "";

  return (
    <html lang={lang} dir={lang.toLowerCase().startsWith("ar") ? "rtl" : "ltr"} data-theme="dark">
      <head>
        <meta name="tragram-api-url" content={apiBaseUrl} />
        <meta name="tragram-runtime-env" content={runtimeEnvironment} />
        <meta name="tragram-visual-parity-mode" content={visualParityMode} />
        <meta name="tragram-commercial-mode" content={commercialMode} />
        <meta name="tragram-crisp-website-id" content={crispWebsiteId} />
      </head>
      <body className="antialiased">
        {process.env.NODE_ENV === "development" && (
          <Script id="appzen-dev-flags" strategy="beforeInteractive">
            {"window.__APPZEN_DISABLE_SPLITTEXT__ = true;"}
          </Script>
        )}
        <NextIntlClientProvider locale={lang} messages={null}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
