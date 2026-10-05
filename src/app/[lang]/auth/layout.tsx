import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter_Tight } from "next/font/google";
import "../../styles/pages/auth.css";
import { AppClientShell } from "@/components/app-client-shell";
import { ScopedIntlProvider } from "@/components/i18n/scoped-intl-provider";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
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
      <ScopedIntlProvider locale={locale} namespaces={["common", "auth"]}>
        <div id="auth-route-root" className={interTight.variable}>
          {children}
        </div>
      </ScopedIntlProvider>
    </AppClientShell>
  );
}
