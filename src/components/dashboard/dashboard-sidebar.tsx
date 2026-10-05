"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarClock, CreditCard, Globe, LogOut, MessageCircle, Shield, User, Users } from "lucide-react";
import { localizePath, type Locale } from "@/lib/i18n";
import { TragramLogo } from "@/components/ui/logo";
import { ChannelsIcon, HomeIcon, ReportsIcon } from "@/components/dashboard/dashboard-icons";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";
import styles from "./dashboard-sidebar.module.css";

type DashboardSidebarProps = {
  lang: Locale;
  active: string;
  className?: string;
  onLogoutClick?: () => void;
};

type SidebarLinkKey =
  | "home"
  | "channels"
  | "reports"
  | "referrals"
  | "profile"
  | "notifications"
  | "plan"
  | "economicCalendar"
  | "language"
  | "security"
  | "privacyPolicy"
  | "terms"
  | "faqs"
  | "contact"
  | "more"
  | "logout";

type SidebarItem = { key: SidebarLinkKey; href: string; Icon: ComponentType<{ className?: string }> };
type SidebarActionItem = { key: "logout"; Icon: ComponentType<{ className?: string }> };

const navItems: SidebarItem[] = [
  { key: "home", href: "/dashboard", Icon: HomeIcon },
  { key: "channels", href: "/channels", Icon: ChannelsIcon },
  { key: "reports", href: "/reports", Icon: ReportsIcon },
  { key: "referrals", href: "/referrals", Icon: Users },
] as const;

const settingsItems: SidebarItem[] = [
  { key: "profile", href: "/profile/personal-data", Icon: User },
  { key: "notifications", href: "/profile/notifications", Icon: Bell },
  { key: "plan", href: "/profile/subscription", Icon: CreditCard },
  { key: "economicCalendar", href: "/dashboard/economic-calendar", Icon: CalendarClock },
  { key: "language", href: "/profile/language", Icon: Globe },
  { key: "security", href: "/profile/security", Icon: Shield },
] as const;

const otherItems: SidebarItem[] = [
  { key: "contact", href: "/profile/contact", Icon: MessageCircle },
] as const;

const actionItems: SidebarActionItem[] = [{ key: "logout", Icon: LogOut }];

export function DashboardSidebar({ lang, active, className, onLogoutClick }: DashboardSidebarProps) {
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardChrome;
  const links = t.links as Record<SidebarLinkKey, string>;
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const visibleSettingsItems = billingDisabled
    ? settingsItems.filter((item) => item.key !== "plan")
    : settingsItems;
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, "") ?? "";
  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") return normalizedPath === "/dashboard";
    if (href === "/channels") return normalizedPath.startsWith("/channels");
    if (href === "/reports") return normalizedPath.startsWith("/reports");
    if (href === "/referrals") return normalizedPath.startsWith("/referrals");
    return normalizedPath.startsWith(href);
  };

  return (
    <aside className={cn(styles.sidebar, className)}>
      <Link href={localizePath(lang, "/")} className={cn(styles.brand, styles.focusable)}>
        <TragramLogo className="h-8 w-auto" />
        <span>{t.brand}</span>
      </Link>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t.sections.dashboard}</p>
        <nav className={styles.nav} aria-label={t.aria.primaryNav}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={localizePath(lang, item.href)}
              className={cn(
                styles.link,
                styles.focusable,
                (active === item.key || isActiveRoute(item.href)) && styles.active
              )}
            >
              <item.Icon />
              <span>{links[item.key]}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.expanded}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t.sections.settings}</p>
          <div className={styles.sectionLinks}>
            {visibleSettingsItems.map((item) => (
              <Link
                key={item.key}
                href={localizePath(lang, item.href)}
                className={cn(
                  styles.link,
                  styles.focusable,
                  (active === item.key || isActiveRoute(item.href)) && styles.active
                )}
              >
                <item.Icon />
                <span>{links[item.key]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.section}>
          <p className={styles.sectionTitle}>{t.sections.other}</p>
          <div className={styles.sectionLinks}>
            {otherItems.map((item) => (
              <Link
                key={item.key}
                href={localizePath(lang, item.href)}
                className={cn(
                  styles.link,
                  styles.focusable,
                  (active === item.key || isActiveRoute(item.href)) && styles.active
                )}
              >
                <item.Icon />
                <span>{links[item.key]}</span>
              </Link>
            ))}
          </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionLinks}>
          {actionItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cn(
                styles.link,
                styles.accent,
                styles.focusable,
                "w-full border-0 bg-transparent text-left cursor-pointer"
              )}
              onClick={() => onLogoutClick?.()}
            >
              <item.Icon />
              <span>{links[item.key]}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
