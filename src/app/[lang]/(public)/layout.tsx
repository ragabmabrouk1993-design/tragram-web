import type { ReactNode } from "react";
import { Inter_Tight } from "next/font/google";
import "../marketing/styles/bootstrap.min.public-scoped.css";
import "../marketing/styles/swiper-bundle.min.public-scoped.css";
import "../marketing/styles/animate.public-scoped.css";
import "../marketing/styles/mousecursor.public-scoped.css";
import "../../styles/vendor/fontawesome-app-subset.css";
import "../../styles/legacy/core.public-scoped.css";
import "../../styles/legacy/legacy-pages.public-scoped.css";
import "../../styles/legacy/marketing-landing.public-scoped.css";
import "../../styles/pages/public-marketing.css";
import "../../styles/pages/public-parity.css";
import Home2Header from "../marketing/components/header";
import Home2Footer from "../marketing/components/footer";
import Home2Preloader from "../marketing/components/preloader";
import { PublicCursor } from "../marketing/components/public-cursor";
import { PublicLegacyScriptFallback } from "../marketing/components/public-legacy-script-fallback";
import { PublicRuntime } from "../marketing/components/public-runtime";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import { defaultLocale, hasLocale } from "@/lib/i18n";
import { loadMessages } from "@/i18n/load-messages";
import { getHome2Copy } from "../marketing/marketing-copy";
import RootProviders from "@/providers/root-providers";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPublicIdentityJsonLd } from "@/lib/seo";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const homeMessages = await loadMessages(locale, ["home"] as const);
  const home2Copy = getHome2Copy(homeMessages);

  return (
    <ScopedIntlProvider
      locale={locale}
      namespaces={["common", "home", "features", "pricing", "contact", "public-pages", "auth"]}
    >
      <RootProviders>
        <div className={interTight.variable}>
          <PublicCursor />
          <PublicRuntime />
          <PublicLegacyScriptFallback />
          <div id="public-route-root" data-bs-theme="dark">
            <JsonLd data={buildPublicIdentityJsonLd(locale)} />
            <Home2Preloader />
            <Home2Header copy={home2Copy} locale={locale} />
            {children}
            <Home2Footer copy={home2Copy} locale={locale} />
          </div>
        </div>
      </RootProviders>
    </ScopedIntlProvider>
  );
}
