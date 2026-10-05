"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TragramLogo } from "@/components/ui/logo";
import { Menu, X, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { User as ApiUser } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export function Header() {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<ApiUser | null>(null);
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("accessToken");
            if (token) {
                try {
                    const profile = await authService.getProfile();
                    if (profile) {
                        setUser(profile);
                        setIsAuthenticated(true);
                    }
                } catch {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            }
        };
        checkAuth();
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) || intlMessages.nav.toastSignOutError
            );
            console.error("Logout error", error);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            trackAnalyticsEvent("logout");
            setIsAuthenticated(false);
            setUser(null);
            router.push(localizePath(lang, "/"));
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 backdrop-blur-lg border-b border-white/10">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <Link href={localizePath(lang, "/")} className="flex items-center gap-2">
                    <TragramLogo className="h-8 w-auto" />
                    <div className="text-xl font-bold tracking-tight text-white">
                        TRAGRAM
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {!billingDisabled && (
                        <Link href={localizePath(lang, "/pricing")} className="text-sm text-gray-300 hover:text-white transition-colors">
                            {intlMessages.nav.pricing}
                        </Link>
                    )}

                    {isAuthenticated && user ? (
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                                <span className="text-sm text-white">{user.firstName}</span>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate border border-white/10 rounded-xl shadow-xl overflow-hidden">
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            router.push(localizePath(lang, "/profile"));
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <User className="h-4 w-4" />
                                        {intlMessages.nav.profile}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            router.push(localizePath(lang, "/profile/settings"));
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <Settings className="h-4 w-4" />
                                        {intlMessages.nav.settings}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {intlMessages.nav.signOut}
                                    </button>
                                </div>
                            )}
                        </div>
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

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-slate border-t border-white/10">
                    <nav className="flex flex-col gap-4 p-4">
                        {!billingDisabled && (
                            <Link
                                href={localizePath(lang, "/pricing")}
                                className="text-sm text-gray-300 hover:text-white transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {intlMessages.nav.pricing}
                            </Link>
                        )}

                        {isAuthenticated && user ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    router.push(localizePath(lang, "/profile"));
                                }}
                            >
                                    <User className="h-4 w-4" />
                                    {intlMessages.nav.profile}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    router.push(localizePath(lang, "/profile/settings"));
                                }}
                            >
                                    <Settings className="h-4 w-4" />
                                    {intlMessages.nav.settings}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 text-red-400"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                >
                                    <LogOut className="h-4 w-4" />
                                    {intlMessages.nav.signOut}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    router.push(localizePath(lang, "/auth/login"));
                                }}
                            >
                                {intlMessages.nav.signIn}
                            </Button>
                                <Button
                                    variant="gradient"
                                    size="sm"
                                    className="w-full"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    router.push(localizePath(lang, "/auth/signup"));
                                }}
                            >
                                {intlMessages.nav.getStarted}
                            </Button>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
