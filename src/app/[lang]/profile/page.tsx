"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProfileShell } from "@/components/profile/profile-shell";
import { LogoutModal } from "@/components/profile/logout-modal";
import { useAppSelector } from "@/store/hooks";
import { authService } from "@/services/auth.service";
import { paymentService } from "@/services/payment.service";
import type { PaymentContextResponse } from "@/lib/api-client";
import type { User as ApiUser } from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";
import { isAccessActive } from "@/services/subscription-view-model";
import { LtrContent } from "@/components/ui/ltr-content";
import { cn } from "@/lib/utils";
import {
    Bell,
    CreditCard,
    Globe2,
    LogOut,
    MessageCircle,
    Shield,
    User as UserIcon,
} from "lucide-react";

type ProfileUser = ApiUser & { phoneNumber?: string };
type ProfileOverviewItem = {
    title: string;
    subtitle: string;
    href: string;
    icon: typeof UserIcon;
    value?: string;
    badge?: string;
};

const ProfileOverviewSkeleton = () => (
    <div className="profile-overview-skeleton" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={`profile-overview-section-skeleton-${sectionIndex}`} className="profile-overview-skeleton-section">
                <span className="profile-skeleton-line profile-overview-skeleton-heading" />
                <div className="profile-overview-skeleton-list">
                    {Array.from({ length: sectionIndex === 0 ? 5 : 1 }).map((__, rowIndex) => (
                        <div
                            key={`profile-overview-row-skeleton-${sectionIndex}-${rowIndex}`}
                            className="profile-more-row profile-overview-skeleton-row"
                        >
                            <span className="profile-overview-skeleton-icon" />
                            <div className="profile-overview-skeleton-copy">
                                <span className="profile-skeleton-line profile-skeleton-line-medium" />
                                <span className="profile-skeleton-line profile-skeleton-line-short" />
                            </div>
                            <span className="profile-skeleton-line profile-overview-skeleton-tail" />
                        </div>
                    ))}
                </div>
            </div>
        ))}

        <div className="profile-more-actions profile-overview-skeleton-actions">
            <div className="profile-more-row is-danger profile-overview-skeleton-row">
                <span className="profile-overview-skeleton-icon" />
                <div className="profile-overview-skeleton-copy">
                    <span className="profile-skeleton-line profile-skeleton-line-medium" />
                    <span className="profile-skeleton-line profile-skeleton-line-short" />
                </div>
                <span className="profile-skeleton-line profile-overview-skeleton-tail" />
            </div>
            <span className="profile-skeleton-line profile-overview-skeleton-version" />
        </div>
    </div>
);

export default function ProfileMenuPage() {
    const [fetchedContext, setFetchedContext] = useState<PaymentContextResponse | null>(null);
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const lang = useLocale();
    const isRtl = lang.toLowerCase().startsWith("ar");
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();

    useEffect(() => {
        let cancelled = false;
        const loadProfileOverview = async () => {
            setIsLoading(true);
            const [profileResult, contextResult] = await Promise.allSettled([
                authService.getProfile(),
                accessToken ? paymentService.getContext() : Promise.resolve(null),
            ]);

            if (cancelled) {
                return;
            }

            if (profileResult.status === "fulfilled") {
                setUser(profileResult.value ? (profileResult.value as ProfileUser) : null);
            } else {
                toast.error(
                    getLocalizedErrorMessage(profileResult.reason, intlMessages) ||
                    intlMessages.profilePages.overview.toastProfileError
                );
            }

            if (contextResult.status === "fulfilled") {
                setFetchedContext(contextResult.value);
            } else if (accessToken) {
                setFetchedContext(null);
                toast.error(
                    getLocalizedErrorMessage(contextResult.reason, intlMessages) ||
                    intlMessages.profilePages.overview.toastSubscriptionError
                );
            }

            setIsLoading(false);
        };

        void loadProfileOverview();
        return () => {
            cancelled = true;
        };
    }, [accessToken, billingDisabled, intlMessages]);

    const context = accessToken ? fetchedContext : null;
    const hasActiveSubscription = isAccessActive(context);

    const formatPlanStatus = (status?: string | null) => {
        if (!status) return "";
        return status
            .toLowerCase()
            .split("_")
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(" ");
    };

    const planCode = context?.access.planCode;
    const planLabel = hasActiveSubscription
        ? planCode
            ? planCode.charAt(0).toUpperCase() + planCode.slice(1)
            : intlMessages.menu.free
        : intlMessages.menu.free;
    const providerState = context?.billing.subscription?.state ?? context?.access.state;
    const planStatus = hasActiveSubscription
        ? formatPlanStatus(providerState)
        : intlMessages.menu.noActivePlan;
    const planSubtitle = planStatus
        ? `${intlMessages.profileNav.plan.description} • ${planStatus}`
        : intlMessages.profileNav.plan.description;
    const planBadge = undefined;

    const displayName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "—";
    const chevronIconClass = isRtl ? "fa-chevron-left" : "fa-chevron-right";

    const settings: ProfileOverviewItem[] = [
        {
            title: intlMessages.profileNav.profile.title,
            subtitle: intlMessages.profileNav.profile.description,
            href: "/profile/personal-data",
            icon: UserIcon,
            value: displayName || intlMessages.profilePages.overview.fullNameLabel,
        },
        {
            title: intlMessages.profileNav.notifications.title,
            subtitle: intlMessages.profileNav.notifications.description,
            href: "/profile/notifications",
            icon: Bell,
        },
        {
            title: intlMessages.profileNav.security.title,
            subtitle: intlMessages.profileNav.security.description,
            href: "/profile/security",
            icon: Shield,
            value: user?.id ? `#${user.id}` : undefined,
        },
        {
            title: intlMessages.profileNav.language.title,
            subtitle: intlMessages.profileNav.language.description,
            href: "/profile/language",
            icon: Globe2,
            value: lang?.toUpperCase?.() ?? "EN",
        },
    ];

    if (!billingDisabled) {
        settings.splice(2, 0, {
            title: intlMessages.profileNav.plan.title,
            subtitle: planSubtitle,
            href: "/profile/subscription",
            icon: CreditCard,
            value: planLabel,
            badge: planBadge,
        });
    }

    const other = useMemo(
        () => [
            {
                title: intlMessages.profileNav.contact.title,
                subtitle: intlMessages.profileNav.contact.description,
                href: "/profile/contact",
                icon: MessageCircle,
            },
        ],
        [intlMessages]
    );

    if (isLoading) {
        return (
            <ProfileShell
                title={intlMessages.profileNav.overview.title}
                subtitle={intlMessages.profileNav.overview.description}
                backHref={null}
                variant="mobile"
            >
                <ProfileOverviewSkeleton />
            </ProfileShell>
        );
    }

    return (
        <ProfileShell
            title={intlMessages.profileNav.overview.title}
            subtitle={intlMessages.profileNav.overview.description}
            backHref={null}
            variant="mobile"
        >

            <section className="profile-more-section">
                <p className="profile-more-heading">{intlMessages.profileNav.sectionAccount}</p>
                <div className="profile-more-list">
                    {settings.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={localizePath(lang, item.href)}
                                className="profile-more-row"
                            >
                                <div className="profile-more-icon">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="profile-more-text">
                                    <p className="profile-more-label">{item.title}</p>
                                    <p className="profile-more-sub">{item.subtitle}</p>
                                </div>
                                {item.badge && <span className="profile-more-badge">{item.badge}</span>}
                                {item.value && (
                                    item.href === "/profile/security" ? (
                                        <LtrContent className="profile-more-value">{item.value}</LtrContent>
                                    ) : (
                                        <span className="profile-more-value">{item.value}</span>
                                    )
                                )}
                                <i className={cn("fa-solid profile-more-chevron", chevronIconClass)} aria-hidden />
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section className="profile-more-section">
                <p className="profile-more-heading">{intlMessages.profileNav.sectionSupport}</p>
                <div className="profile-more-list">
                    {other.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={localizePath(lang, item.href)}
                                className="profile-more-row"
                            >
                                <div className="profile-more-icon">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="profile-more-text">
                                    <p className="profile-more-label">{item.title}</p>
                                    <p className="profile-more-sub">{item.subtitle}</p>
                                </div>
                                <i className={cn("fa-solid profile-more-chevron", chevronIconClass)} aria-hidden />
                            </Link>
                        );
                    })}
                </div>
            </section>

            <div className="profile-more-actions">
                <button
                    type="button"
                    className="profile-more-row is-danger w-full"
                    onClick={() => setShowLogoutModal(true)}
                >
                    <div className="profile-more-icon">
                        <LogOut className="h-5 w-5" />
                    </div>
                    <div className="profile-more-text">
                        <p className="profile-more-label">{intlMessages.profileNav.logout.title}</p>
                        <p className="profile-more-sub">{intlMessages.profileNav.logout.description}</p>
                    </div>
                    <i className={cn("fa-solid profile-more-chevron", chevronIconClass)} aria-hidden />
                </button>
                <p className="profile-more-version">
                    {intlMessages.profilePages.versionLabel.replace("{version}", "1.0")}
                </p>
            </div>
            <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
        </ProfileShell>
    );
}
