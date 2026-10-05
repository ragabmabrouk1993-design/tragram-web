"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/authSlice";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { toast } from "react-hot-toast";
import { authService } from "@/services/auth.service";
import { TragramLogo } from "@/components/ui/logo";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath, type Dictionary } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

const navLinks: Array<{ key: keyof Dictionary["nav"]; href: string }> = [
    { key: "features", href: "/features" },
    { key: "pricing", href: "/pricing" },
];

export function Navbar() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { accessToken } = useAppSelector((state) => state.auth);
    const isAuthenticated = Boolean(accessToken);
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();
    const visibleNavLinks = billingDisabled
      ? navLinks.filter((link) => link.key !== "pricing")
      : navLinks;

    const handleLogout = async () => {
        try {
            await authService.logout();
            toast.success(intlMessages.nav.toastSignOutSuccess);
        } catch (error) {
            console.error("Logout error", error);
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) || intlMessages.nav.toastSignOutError
            );
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            trackAnalyticsEvent("logout");
            dispatch(clearAuth());
            router.push(localizePath(lang, "/"));
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-midnight/70 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <Link href={localizePath(lang, "/")} className="flex items-center gap-3">
                    <TragramLogo className="h-7 w-auto" />
                    <span className="text-lg font-semibold tracking-wide text-white">Tragram</span>
                </Link>

                <nav className="hidden items-center gap-6 md:flex">
                    {visibleNavLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={localizePath(lang, link.href)}
                            className="text-sm text-white/70 transition-colors hover:text-white"
                        >
                            {intlMessages.nav[link.key]}
                        </Link>
                    ))}
                    <LanguageSwitch />
                    {isAuthenticated ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(localizePath(lang, "/dashboard"))}
                            >
                                {intlMessages.nav.dashboard}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-red-400"
                            >
                                {intlMessages.nav.signOut}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(localizePath(lang, "/auth/login"))}
                            >
                                {intlMessages.nav.signIn}
                            </Button>
                            <Button
                                variant="gradient"
                                size="sm"
                                onClick={() => router.push(localizePath(lang, "/auth/signup"))}
                            >
                                {intlMessages.nav.getStarted}
                            </Button>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-2 md:hidden">
                    {!isAuthenticated && (
                        <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => router.push(localizePath(lang, "/auth/signup"))}
                        >
                            {intlMessages.nav.getStarted}
                        </Button>
                    )}
                    <MobileMenu onSignOut={handleLogout} isAuthenticated={isAuthenticated} />
                </div>
            </div>
        </header>
    );
}
