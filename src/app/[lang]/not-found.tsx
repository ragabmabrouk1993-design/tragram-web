import NotFoundContent from "./not-found-content";
import { getHome2Copy } from "./marketing/marketing-copy";
import { loadMessages } from "@/i18n/load-messages";
import { hasLocale } from "@/lib/i18n";
import { resolveLocaleFromServerRequest } from "@/lib/server-locale";

export default async function NotFound({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : await resolveLocaleFromServerRequest());
  const homeMessages = await loadMessages(locale, ["home"] as const);
  const home2Copy = getHome2Copy(homeMessages);
  return <NotFoundContent lang={locale} copy={home2Copy} />;
}
