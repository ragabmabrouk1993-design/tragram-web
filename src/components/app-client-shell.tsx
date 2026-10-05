"use client";

import type { ReactNode } from "react";
import { AuthRouteGuard } from "@/components/auth/auth-route-guard";
import ToastContainerClient from "@/components/toast-container";
import RootProviders from "@/providers/root-providers";
import type { Locale } from "@/lib/i18n";

export function AppClientShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <RootProviders>
      <AuthRouteGuard locale={locale}>{children}</AuthRouteGuard>
      <ToastContainerClient />
    </RootProviders>
  );
}
