import { getRequestConfig } from "next-intl/server";
import { defaultLocale, routing, type Locale } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: {},
  };
});

