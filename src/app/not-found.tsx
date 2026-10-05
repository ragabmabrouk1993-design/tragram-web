import NotFoundContent from "./[lang]/not-found-content";
import { getHome2Copy } from "./[lang]/marketing/marketing-copy";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/load-messages";
import RootProviders from "@/providers/root-providers";
import { resolveLocaleFromServerRequest } from "@/lib/server-locale";

export default async function NotFound() {
  const locale = await resolveLocaleFromServerRequest();
  const homeMessages = await loadMessages(locale, ["home"] as const);
  const home2Copy = getHome2Copy(homeMessages);
  return (
    <NextIntlClientProvider locale={locale} messages={null}>
      <RootProviders>
        <NotFoundContent lang={locale} copy={home2Copy} standalone />
      </RootProviders>
    </NextIntlClientProvider>
  );
}
