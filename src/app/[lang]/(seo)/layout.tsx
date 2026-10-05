import type { ReactNode } from "react";
import Link from "next/link";
import { hasLocale, localizePath, type Locale } from "@/lib/i18n";
import { getSeoUiCopy } from "@/lib/seo";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import "../../styles/pages/seo-public.css";

export default async function SeoPublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : "en") as Locale;
  const copy = getSeoUiCopy(locale);
  const billingDisabled = isBillingDisabledInServerEnv();

  return (
    <div id="seo-route-root" className="seo-shell">
      <header className="seo-header">
        <Link className="seo-brand" href={localizePath(locale, "/")}>
          Tragram
        </Link>
        <nav className="seo-nav" aria-label="Main navigation">
          <Link href={localizePath(locale, "/features")}>{copy.features}</Link>
          {!billingDisabled && (
            <Link href={localizePath(locale, "/pricing")}>{copy.pricing}</Link>
          )}
          <Link href={localizePath(locale, "/blog")}>{copy.blog}</Link>
          <Link href={localizePath(locale, "/faqs")}>{copy.faqs}</Link>
          <Link className="seo-nav-cta" href={localizePath(locale, "/auth/signup")}>
            {copy.getStarted}
          </Link>
        </nav>
      </header>
      {children}
      <footer className="seo-footer">
        <p>{copy.footerText}</p>
        <nav aria-label="Footer navigation">
          <Link href={localizePath(locale, "/contact")}>{copy.contact}</Link>
          <Link href={localizePath(locale, "/blog")}>{copy.blog}</Link>
          <Link href={localizePath(locale, "/privacy-policy")}>{copy.privacy}</Link>
          <Link href={localizePath(locale, "/terms-of-service")}>{copy.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}
