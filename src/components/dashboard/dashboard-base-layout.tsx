"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { ProfileMenuPanel } from "@/components/profile/profile-shell";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { LogoutModal } from "@/components/profile/logout-modal";
import shellStyles from "@/components/dashboard/dashboard-shell.module.css";
import styles from "@/components/dashboard/dashboard-base-layout.module.css";

type DashboardBaseLayoutProps = {
  children: ReactNode;
  lang: Locale;
  active: string;
  className?: string;
};

export function DashboardBaseLayout({ children, lang, active, className }: DashboardBaseLayoutProps) {
  const intlMessages = useRouteMessages();
  const chrome = intlMessages.dashboardChrome;
  const pathname = usePathname();
  const normalizedPathname = pathname?.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, "") ?? "";
  const resolvedActive = normalizedPathname.startsWith("/dashboard/economic-calendar")
    ? "economicCalendar"
    : active;
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [moreMenuOpen]);

  return (
    <DashboardShell className={cn(shellStyles.gridBg, className)}>
      <div className={styles.layout}>
        <div className={styles.sidebarSlot}>
          <DashboardSidebar
            lang={lang}
            active={resolvedActive}
            onLogoutClick={() => setShowLogoutModal(true)}
          />
        </div>
        <div className={styles.content}>{children}</div>
      </div>

      <MobileBottomNav
        lang={lang}
        active={resolvedActive}
        moreMenuOpen={moreMenuOpen}
        onMoreClick={() => setMoreMenuOpen(true)}
      />

      {moreMenuOpen && (
        <div className={styles.moreBackdrop} onClick={() => setMoreMenuOpen(false)}>
          <div
            className={styles.moreModal}
            role="dialog"
            aria-modal="true"
            aria-label={chrome.aria.moreOpen}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            ref={moreMenuRef}
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.moreHeader}>
              <h2 className={styles.moreTitle}>{chrome.links.more}</h2>
              <button
                type="button"
                className={styles.moreClose}
                onClick={() => setMoreMenuOpen(false)}
                aria-label={chrome.aria.moreClose}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <ProfileMenuPanel
              className={styles.morePanel}
              onNavigate={() => setMoreMenuOpen(false)}
              onLogoutClick={() => {
                setMoreMenuOpen(false);
                setShowLogoutModal(true);
              }}
            />
          </div>
        </div>
      )}
      <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </DashboardShell>
  );
}
