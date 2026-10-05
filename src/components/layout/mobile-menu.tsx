"use client";

import { ComponentProps, ComponentType, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentService } from "@/services/payment.service";
import { Shield, Bell, CreditCard, Globe, LogOut, Book, MessageCircle, User } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { Button } from "@/components/ui/button";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { MoreItemKey } from "@/lib/analytics/types";

interface MobileMenuProps {
    onSignOut: () => void;
    isAuthenticated: boolean;
}

const MenuItem = ({
    title,
    description,
    href,
    icon: Icon,
    accent,
    onClick,
}: {
    title: string;
    description: string;
    href: string;
    icon: ComponentType<ComponentProps<typeof User>>;
    accent?: boolean;
    onClick?: () => void;
}) => (
    <Link
        href={href}
        onClick={onClick}
        className={cn(
            "flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left transition hover:border-white/30",
            accent ? "text-red-400 hover:text-red-300" : "text-white/80 hover:text-white"
        )}
    >
        <span className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-white/60" />
            <span>
                <p className="text-base font-semibold">{title}</p>
                <p className="text-xs text-white/50">{description}</p>
            </span>
        </span>
        <span className="text-xs text-white/40">&lsaquo;</span>
    </Link>
);

const moreItemByHref: Partial<Record<string, MoreItemKey>> = {
    "/profile/personal-data": "profile",
    "/profile/notifications": "notifications",
    "/profile/security": "security",
    "/profile/language": "language",
    "/profile/subscription": "my_subscription",
    "/privacy-policy": "privacy",
    "/terms-of-service": "terms",
    "/faqs": "faqs",
    "/contact": "contact",
};

const trackMoreItemClick = (href: string) => {
    const item = moreItemByHref[href];
    if (item) trackAnalyticsEvent("more_item_clicked", { item });
};

export function MobileMenu({ onSignOut, isAuthenticated }: MobileMenuProps) {
    const [open, setOpen] = useState(false);
    const [fetchedSubscription, setFetchedSubscription] = useState<{ name?: string; status?: string; badge?: string } | null>(null);
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();

    const sectionLinks = [
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
        sectionLinks.splice(2, 0, {
            title: intlMessages.profileNav.plan.title,
            description: intlMessages.profileNav.plan.description,
            href: "/profile/subscription",
            icon: CreditCard,
        });
    }

    const otherLinks = [
        {
            title: intlMessages.profileNav.privacyPolicy.title,
            description: intlMessages.profileNav.privacyPolicy.description,
            href: "/privacy-policy",
            icon: Book,
        },
        {
            title: intlMessages.profileNav.terms.title,
            description: intlMessages.profileNav.terms.description,
            href: "/terms-of-service",
            icon: Book,
        },
        {
            title: intlMessages.profileNav.faqs.title,
            description: intlMessages.profileNav.faqs.description,
            href: "/faqs",
            icon: Book,
        },
        {
            title: intlMessages.profileNav.contact.title,
            description: intlMessages.profileNav.contact.description,
            href: "/contact",
            icon: MessageCircle,
        },
    ];

    const guestLinks = billingDisabled
        ? []
        : [
              {
                  title: intlMessages.nav.pricing,
                  description: intlMessages.pricingPage.subtitle,
                  href: "/pricing",
                  icon: CreditCard,
              },
          ];

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    useEffect(() => {
        if (!open || typeof document === "undefined") return;
        const { body, documentElement } = document;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyPaddingRight = body.style.paddingRight;
        const previousHtmlOverflow = documentElement.style.overflow;
        const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

        body.style.overflow = "hidden";
        documentElement.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            body.style.overflow = previousBodyOverflow;
            body.style.paddingRight = previousBodyPaddingRight;
            documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open || !isAuthenticated) {
            return;
        }

        let active = true;
        const fetchData = async () => {
            try {
                const context = await paymentService.getContext();
                if (!active) return;

                const planCode = context.access.planCode;
                const hasAccess = context.access.state === "ENTITLED" || context.access.state === "GRACE";
                setFetchedSubscription({
                    name: hasAccess && planCode
                        ? planCode.charAt(0).toUpperCase() + planCode.slice(1)
                        : intlMessages.menu.free,
                    status: hasAccess
                        ? context.billing.subscription?.state ?? context.access.state
                        : intlMessages.menu.noActivePlan,
                });
            } catch {
                // swallow
            }
        };

        void fetchData();
        return () => {
            active = false;
        };
    }, [open, isAuthenticated, intlMessages]);

    const subscription = useMemo(() => {
        if (!open || !isAuthenticated || billingDisabled) {
            return null;
        }
        return fetchedSubscription;
    }, [billingDisabled, fetchedSubscription, isAuthenticated, open]);

    const canUseDOM = typeof document !== "undefined";

    const overlay = (
        <div
            className={cn(
                "fixed inset-0 z-9999 transition-opacity duration-300",
                open ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden={!open}
        >
            <button
                type="button"
                aria-label="Close menu overlay"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <div
                className={cn(
                    "absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-midnight shadow-2xl transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-end px-5 py-4">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-12">
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                        <LanguageSwitch showLabel className="w-full justify-between" />
                    </div>
                    {!isAuthenticated && (
                        <div className="space-y-2">
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    setOpen(false);
                                    window.location.href = localizePath(lang, "/auth/login");
                                }}
                            >
                                {intlMessages.nav.signIn}
                            </Button>
                            <Button
                                variant="gradient"
                                className="w-full"
                                onClick={() => {
                                    setOpen(false);
                                    window.location.href = localizePath(lang, "/auth/signup");
                                }}
                            >
                                {intlMessages.nav.getStarted}
                            </Button>
                        </div>
                    )}
                    {isAuthenticated && !billingDisabled && (
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{intlMessages.menu.plan}</p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {subscription?.name ?? intlMessages.menu.free}
                            </p>
                            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                                {subscription?.status ?? intlMessages.menu.noActivePlan}
                            </p>
                            {subscription?.badge && (
                                <span className="mt-3 inline-flex rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                                    {subscription.badge}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        {(isAuthenticated ? sectionLinks : guestLinks).map((item) => (
                            <MenuItem
                                key={item.href}
                                title={item.title}
                                description={item.description}
                                href={localizePath(lang, item.href)}
                                icon={item.icon}
                                onClick={() => {
                                    trackMoreItemClick(item.href);
                                    setOpen(false);
                                }}
                            />
                        ))}
                        {isAuthenticated && (
                            <button
                                type="button"
                                onClick={() => {
                                    trackAnalyticsEvent("more_item_clicked", { item: "logout" });
                                    setOpen(false);
                                    onSignOut();
                                }}
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-red-400 transition hover:border-white/30"
                            >
                                <span className="flex items-center gap-3">
                                    <LogOut className="h-5 w-5 text-red-400" />
                                    <span>
                                        <p className="text-base font-semibold">{intlMessages.menu.logout}</p>
                                        <p className="text-xs text-red-300">{intlMessages.menu.logoutDescription}</p>
                                    </span>
                                </span>
                                <span className="text-xs text-white/40">&lsaquo;</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {otherLinks.map((item) => (
                            <MenuItem
                                key={item.href}
                                title={item.title}
                                description={item.description}
                                href={localizePath(lang, item.href)}
                                icon={item.icon}
                                onClick={() => {
                                    trackMoreItemClick(item.href);
                                    setOpen(false);
                                }}
                            />
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );

    return (
        <div className="md:hidden">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                aria-label="Open menu"
            >
                <Menu className="h-5 w-5" />
            </button>

            {canUseDOM && open && createPortal(overlay, document.body)}
        </div>
    );
}
