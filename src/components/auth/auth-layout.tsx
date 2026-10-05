"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    activeTab?: "login" | "signup";
}

export function AuthLayout({ children, title, subtitle, activeTab }: AuthLayoutProps) {
    const lang = useLocale();
    const intlMessages = useRouteMessages();

    return (
        <div className="relative min-h-screen bg-[var(--auth-shell-gradient)] text-text-primary overflow-hidden">
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--auth-orb-1)] blur-[80px]" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--auth-orb-2)] blur-[120px]" />
                <div className="absolute inset-0 bg-[var(--auth-radial-overlay)]" />
            </div>

            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 md:px-10 font-(--font-inter-tight)">
                <div className="flex items-center justify-end">
                    <Link
                        href={localizePath(lang, "/")}
                        className="flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {intlMessages.auth.common.backToHome}
                    </Link>
                </div>

                    {activeTab && (
                    <div className="mt-6 inline-flex w-full max-w-xl items-center justify-between rounded-full bg-[var(--auth-shell-pill-bg)] px-2 py-2.5 text-sm font-semibold tracking-wide shadow-[0_10px_30px_rgba(10,30,80,0.35)] motion-safe:animate-[fadeIn_900ms_ease]">
                        <Link
                            href={localizePath(lang, "/auth/login")}
                            className={cn(
                                    "flex-1 rounded-full px-6 py-2 text-center transition-colors",
                                activeTab === "login"
                                    ? "bg-[var(--surface-panel-strong)] text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            {intlMessages.auth.login.title}
                        </Link>
                        <Link
                            href={localizePath(lang, "/auth/signup")}
                            className={cn(
                                    "flex-1 rounded-full px-6 py-2 text-center transition-colors",
                                activeTab === "signup"
                                    ? "bg-[var(--surface-panel-strong)] text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            {intlMessages.auth.signup.title}
                        </Link>
                    </div>
                )}

                <div className="mt-8 w-full max-w-xl space-y-6 motion-safe:animate-[fadeIn_1000ms_ease]">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
                        {subtitle && <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>}
                    </div>

                    <div className="rounded-3xl border border-[color:var(--border-subtle)] bg-[var(--auth-shell-card-bg)] p-6 shadow-[0_26px_60px_rgba(5,12,24,0.65)] backdrop-blur md:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
