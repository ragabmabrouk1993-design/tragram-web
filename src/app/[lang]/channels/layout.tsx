import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppClientShell } from "@/components/app-client-shell";
import { DashboardBaseLayout } from "@/components/dashboard";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import "../../styles/vendor/fontawesome-app-subset.css";
import "../../styles/pages/dashboard-shared.css";
import "../../styles/pages/profile-shell.css";
import "../../styles/pages/channels.css";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type ChannelsLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ChannelsLayout({
  children,
  params,
}: ChannelsLayoutProps & { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : defaultLocale) as Locale;
  return (
    <AppClientShell locale={locale}>
      <ScopedIntlProvider
        locale={locale}
        namespaces={["common", "dashboard", "profile", "pricing", "channels", "channel-settings"]}
      >
        <DashboardBaseLayout lang={locale} active="channels">
          {children}
        </DashboardBaseLayout>
      </ScopedIntlProvider>
    </AppClientShell>
  );
}
