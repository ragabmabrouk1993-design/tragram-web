import { redirect } from "next/navigation";
import { defaultLocale, isLocale, localizePath } from "@/lib/i18n";

export default async function LogoutPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const locale = isLocale(lang) ? lang : defaultLocale;
    redirect(localizePath(locale, "/profile"));
}
