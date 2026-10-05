import Link from "next/link";
import { cn } from "@/lib/utils";
import { localizePath, type Locale } from "@/lib/i18n";
import { ChannelsIcon, HomeIcon, MoreIcon, ReportsIcon } from "@/components/dashboard/dashboard-icons";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import styles from "./mobile-bottom-nav.module.css";

type MobileBottomNavProps = {
  lang: Locale;
  active: string;
  moreMenuOpen?: boolean;
  onMoreClick?: () => void;
};

const navItems = [
  { key: "home", href: "/dashboard", Icon: HomeIcon },
  { key: "channels", href: "/channels", Icon: ChannelsIcon },
  { key: "reports", href: "/reports", Icon: ReportsIcon },
  { key: "more", href: "/profile", Icon: MoreIcon },
];

const moreRouteKeys = new Set([
  "more",
  "referrals",
  "profile",
  "notifications",
  "plan",
  "economicCalendar",
  "language",
  "security",
  "contact",
]);

export function MobileBottomNav({ lang, active, moreMenuOpen = false, onMoreClick }: MobileBottomNavProps) {
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardChrome;
  const links = t.links as Record<string, string>;
  return (
    <nav className={styles.nav} aria-label={t.aria.primaryNav}>
      {navItems.map((item) => {
        const isMore = item.key === "more";
        const isActive = active === item.key || (isMore && moreRouteKeys.has(active));
        if (isMore && onMoreClick) {
          return (
            <button
              key={item.key}
              type="button"
              className={cn(styles.link, isActive && styles.active)}
              onClick={onMoreClick}
              aria-haspopup="dialog"
              aria-expanded={moreMenuOpen}
              aria-label={t.aria.moreOpen}
            >
              <item.Icon />
              <span>{links[item.key]}</span>
            </button>
          );
        }
        return (
          <Link
            key={item.key}
            href={localizePath(lang, item.href)}
            className={cn(styles.link, isActive && styles.active)}
          >
            <item.Icon />
            <span>{links[item.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
