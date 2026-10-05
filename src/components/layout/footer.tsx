"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath, type Dictionary } from "@/lib/i18n";

const footerLinks: Array<{ key: keyof Dictionary["footer"]; href: string }> = [
    { key: "privacyPolicy", href: "/privacy-policy" },
    { key: "termsOfService", href: "/terms-of-service" },
    { key: "contact", href: "/contact" },
    { key: "accountDeletion", href: "/account-deletion" },
];

export function Footer() {
    const lang = useLocale();
    const intlMessages = useRouteMessages();

    return (
        <footer className="border-t border-white/10 bg-midnight">
            <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 text-gray-400 md:flex-row md:justify-between md:px-6">
                <p className="text-sm text-white/70">{intlMessages.footer.copyright}</p>
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                    {footerLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={localizePath(lang, link.href)}
                            className="transition-colors hover:text-primary"
                        >
                            {intlMessages.footer[link.key]}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="border-t border-white/5 bg-slate/60 px-4 py-6 text-center text-[0.78rem] text-white/60">
                <p>{intlMessages.footer.disclaimerPrimary}</p>
                <p className="mt-2">{intlMessages.footer.disclaimerSecondary}</p>
            </div>
        </footer>
    );
}
