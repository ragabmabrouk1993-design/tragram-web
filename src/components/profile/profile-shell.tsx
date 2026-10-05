"use client";

import { usePathname } from "next/navigation";
import {
    Bell,
    CalendarClock,
    CreditCard,
    Globe,
    LayoutGrid,
    LogOut,
    MessageCircle,
    Receipt,
    Shield,
    User,
    Users,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath, stripLocaleFromPathname } from "@/lib/i18n";
import { BackButton } from "@/components/ui/back-button";
import Link from "next/link";
import { LogoutModal } from "@/components/profile/logout-modal";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

interface ProfileShellProps {
    title: string;
    subtitle?: string;
    backHref?: string | null;
    children: ReactNode;
    variant?: "default" | "mobile";
    shellClassName?: string;
    showSidebar?: boolean;
    showBreadcrumbs?: boolean;
}

interface ProfileMenuPanelProps {
    onNavigate?: () => void;
    onLogoutClick?: () => void;
    className?: string;
}

const ProfileNavLink = ({
    title,
    description,
    href,
    icon: Icon,
    active,
    accent,
    onNavigate,
}: {
    title: string;
    description: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    active: boolean;
    accent?: boolean;
    onNavigate?: () => void;
}) => (
    <Link
        href={href}
        className={cn(
            "profile-nav-link",
            active && "is-active",
            accent && "is-accent"
        )}
        onClick={onNavigate}
    >
        <Icon className="profile-nav-icon" />
        <span className="profile-nav-text">
            <span className="profile-nav-title">{title}</span>
            <span className="profile-nav-description">{description}</span>
        </span>
    </Link>
);

export function ProfileMenuPanel({ onNavigate, onLogoutClick, className }: ProfileMenuPanelProps) {
  const pathname = usePathname();
  const lang = useLocale();
    const intlMessages = useRouteMessages();
  const billingDisabled = isBillingDisabledInCurrentEnv();

  const accountLinks = [
    {
      title: intlMessages.profileNav.overview.title,
      description: intlMessages.profileNav.overview.description,
      href: "/profile",
      icon: LayoutGrid,
    },
    {
      title: intlMessages.profileNav.referrals.title,
      description: intlMessages.profileNav.referrals.description,
      href: "/referrals",
      icon: Users,
    },
    {
      title: intlMessages.profileNav.economicCalendar.title,
      description: intlMessages.profileNav.economicCalendar.description,
      href: "/dashboard/economic-calendar",
      icon: CalendarClock,
    },
    {
      title: intlMessages.profileNav.profile.title,
      description: intlMessages.profileNav.profile.description,
      href: "/profile/personal-data",
      icon: User,
    },
    {
      title: intlMessages.profileNav.notifications.title,
      description: intlMessages.profileNav.notifications.description,
      href: "/profile/notifications",
      icon: Bell,
    },
    {
      title: intlMessages.profileNav.security.title,
      description: intlMessages.profileNav.security.description,
      href: "/profile/security",
            icon: Shield,
        },
        {
            title: intlMessages.profileNav.language.title,
            description: intlMessages.profileNav.language.description,
      href: "/profile/language",
      icon: Globe,
    },
  ];
  if (!billingDisabled) {
    accountLinks.splice(3, 0, {
      title: intlMessages.profileNav.plan.title,
      description: intlMessages.profileNav.plan.description,
      href: "/profile/subscription",
      icon: CreditCard,
    });
    accountLinks.splice(4, 0, {
      title: intlMessages.profileNav.invoices.title,
      description: intlMessages.profileNav.invoices.description,
      href: "/profile/invoices",
      icon: Receipt,
    });
  }

    const supportLinks = [
        {
            title: intlMessages.profileNav.contact.title,
            description: intlMessages.profileNav.contact.description,
            href: "/profile/contact",
            icon: MessageCircle,
        },
    ];

    const actionLinks = [
        {
            key: "logout",
            title: intlMessages.profileNav.logout.title,
            description: intlMessages.profileNav.logout.description,
            icon: LogOut,
            accent: true,
        },
    ];

    const normalizedPathname = stripLocaleFromPathname(pathname);

    const isActive = (href: string) => {
        if (href === "/profile") {
            return normalizedPathname === "/profile";
        }
        if (href.startsWith("/profile/")) {
            return normalizedPathname.startsWith(href);
        }
        return normalizedPathname === href;
    };

    return (
        <aside className={cn("profile-shell-sidebar", className)}>
            <div className="profile-nav-section">
                <p className="profile-nav-section-title">{intlMessages.profileNav.sectionAccount}</p>
                <div className="profile-nav-links">
                    {accountLinks.map((link) => (
                        <ProfileNavLink
                            key={link.href}
                            title={link.title}
                            description={link.description}
                            href={localizePath(lang, link.href)}
                            icon={link.icon}
                            active={isActive(link.href)}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            </div>

            <div className="profile-nav-section">
                <p className="profile-nav-section-title">{intlMessages.profileNav.sectionSupport}</p>
                <div className="profile-nav-links">
                    {supportLinks.map((link) => (
                        <ProfileNavLink
                            key={link.href}
                            title={link.title}
                            description={link.description}
                            href={localizePath(lang, link.href)}
                            icon={link.icon}
                            active={isActive(link.href)}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            </div>

            <div className="profile-nav-section">
                <p className="profile-nav-section-title">{intlMessages.profileNav.sectionSession}</p>
                <div className="profile-nav-links">
                    {actionLinks.map((link) => (
                        <button
                            key={link.key}
                            type="button"
                            className={cn("profile-nav-link", link.accent && "is-accent")}
                            onClick={() => {
                                onNavigate?.();
                                onLogoutClick?.();
                            }}
                        >
                            <link.icon className="profile-nav-icon" />
                            <span className="profile-nav-text">
                                <span className="profile-nav-title">{link.title}</span>
                                <span className="profile-nav-description">{link.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}

export function ProfileShell({
    title,
    subtitle,
    backHref = "/profile",
    children,
    variant = "default",
    shellClassName,
    showSidebar = true,
    showBreadcrumbs = true,
}: ProfileShellProps) {
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const normalizedPathname = stripLocaleFromPathname(pathname);

    const breadcrumbs: Array<{ label: string; href: string }> = [
        { label: intlMessages.profile.label, href: localizePath(lang, "/profile") },
    ];

    if (title) {
        breadcrumbs.push({
            label: title,
            href: localizePath(lang, backHref ?? normalizedPathname),
        });
    }

    if (subtitle) {
        breadcrumbs.push({
            label: subtitle,
            href: localizePath(lang, normalizedPathname),
        });
    }

    if (variant === "mobile") {
        return (
            <div className={cn("profile-mobile-shell", shellClassName)}>
                <header className="profile-mobile-header">
                    {backHref ? (
                        <BackButton href={localizePath(lang, backHref)} className="profile-mobile-back-link" />
                    ) : (
                        <span className="profile-mobile-header-spacer" aria-hidden />
                    )}
                    <div className="profile-mobile-title-group">
                        <h1 className="profile-mobile-title">{title}</h1>
                        {subtitle && <p className="profile-mobile-sub">{subtitle}</p>}
                    </div>
                    <span className="profile-mobile-header-spacer" aria-hidden />
                </header>
                <main className="profile-mobile-body">{children}</main>
            </div>
        );
    }

    return (
        <>
            {showBreadcrumbs && (
                <div className="profile-breadcrumbs-wrap">
                    <div className="container">
                        <div className="profile-breadcrumbs">
                            <div className="profile-shell-heading">
                                <nav className="profile-breadcrumbs-line" aria-label={intlMessages.profileNav.breadcrumbAria}>
                                    <ol>
                                        {breadcrumbs.map((crumb, index) => (
                                            <li key={`${crumb.label}-${index}`}>
                                                <Link href={crumb.href}>{crumb.label}</Link>
                                            </li>
                                        ))}
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="profile-page tg-grid">
                <div className="container">
                    <div className={cn("profile-shell", shellClassName)}>
                        {showSidebar ? (
                            <div className="profile-shell-grid">
                                <ProfileMenuPanel onLogoutClick={() => setShowLogoutModal(true)} />

                                <main className="profile-shell-main">{children}</main>
                            </div>
                        ) : (
                            <main className="profile-shell-main profile-shell-main-full">{children}</main>
                        )}
                    </div>
                </div>
            </div>
            <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
        </>
    );
}
