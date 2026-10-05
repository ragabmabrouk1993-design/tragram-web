import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppClientShell } from "@/components/app-client-shell";
import { DashboardBaseLayout } from "@/components/dashboard";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import "../../styles/vendor/fontawesome-app-subset.css";
import "../../styles/pages/dashboard-shared.css";
import "../../styles/pages/profile-shell.css";
import "../../styles/pages/reports.css";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type ReportsLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReportsLayout({
  children,
  params,
}: ReportsLayoutProps & { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : defaultLocale) as Locale;
  return (
    <AppClientShell locale={locale}>
      <ScopedIntlProvider locale={locale} namespaces={["common", "dashboard", "profile", "pricing", "reports"]}>
        <DashboardBaseLayout lang={locale} active="reports">
          {children}
        </DashboardBaseLayout>
      </ScopedIntlProvider>
    </AppClientShell>
  );
}
