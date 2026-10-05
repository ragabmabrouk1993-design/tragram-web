import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppClientShell } from "@/components/app-client-shell";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : defaultLocale) as Locale;

  return (
    <AppClientShell locale={locale}>
      <ScopedIntlProvider locale={locale} namespaces={["common", "onboarding"]}>
        {children}
      </ScopedIntlProvider>
    </AppClientShell>
  );
}
