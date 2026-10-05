"use client";

import Link from "next/link";
import { TragramLogo } from "@/components/ui/logo";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";

export default function RestrictedPage() {
    const lang = useLocale();
    const intlMessages = useRouteMessages();

    return (
        <div className="min-h-screen bg-midnight text-white relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="tg-grid absolute inset-0 opacity-30" />
                <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_1px_1px,var(--border-subtle)_1px,transparent_0)] bg-size-[26px_26px]" />
                <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--restricted-orb-1)] blur-[140px]" />
                <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[var(--restricted-orb-2)] blur-[140px]" />
            </div>

            <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-10 text-center font-(--font-sora)">
                <div className="flex items-center gap-3">
                    <TragramLogo className="h-7 w-auto" />
                    <span className="text-lg font-semibold tracking-wide">Tragram</span>
                </div>

                <h1 className="mt-8 text-3xl font-semibold">{intlMessages.restrictedPage.title}</h1>
                <p className="mt-3 max-w-xl text-sm text-white/70">
                    {intlMessages.restrictedPage.description}
                </p>

                <Link
                    href={localizePath(lang, "/")}
                    className="mt-8 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/80 transition-colors hover:bg-white/10"
                >
                    {intlMessages.restrictedPage.cta}
                </Link>
            </div>
        </div>
    );
}
