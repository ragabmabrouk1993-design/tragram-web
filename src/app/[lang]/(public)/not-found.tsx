import { getHome2Copy } from "../marketing/marketing-copy";
import PublicNotFoundContent from "./public-not-found-content";
import { hasLocale, type Locale } from "@/lib/i18n";
import { loadMessages } from "@/i18n/load-messages";

export default async function PublicNotFound({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const requestedLocale = resolvedParams?.lang;
  const locale = (hasLocale(requestedLocale) ? requestedLocale : "en") as Locale;
  const homeMessages = await loadMessages(locale, ["home"] as const);
  const copy = getHome2Copy(homeMessages);

  return <PublicNotFoundContent locale={locale} copy={copy} />;
}
