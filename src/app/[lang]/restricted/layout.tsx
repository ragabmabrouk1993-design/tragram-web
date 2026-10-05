import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import { defaultLocale, hasLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RestrictedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return (
    <ScopedIntlProvider locale={locale} namespaces={["common", "public-pages"]}>
      {children}
    </ScopedIntlProvider>
  );
}
