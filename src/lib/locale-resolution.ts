import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, getLocaleFromPathname, isLocale, locales, type Locale } from "@/lib/i18n";

type ResolveLocaleInput = {
  pathnameCandidates?: Array<string | null | undefined>;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
};

const parsePathname = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }
  return value;
};

const resolveLocaleFromAcceptLanguage = (acceptLanguage?: string | null): Locale => {
  const languages = new Negotiator({
    headers: {
      "accept-language": acceptLanguage ?? "",
    },
  }).languages();
  const safeLanguages: string[] = [];

  for (const language of languages) {
    try {
      safeLanguages.push(...Intl.getCanonicalLocales(language));
    } catch {
      // Ignore invalid locale values from client headers.
    }
  }

  return match(
    safeLanguages.length ? safeLanguages : [defaultLocale],
    locales,
    defaultLocale
  ) as Locale;
};

export const resolveLocale = ({
  pathnameCandidates = [],
  cookieLocale,
  acceptLanguage,
}: ResolveLocaleInput): Locale => {
  for (const candidate of pathnameCandidates) {
    if (!candidate) continue;
    const localeFromPath = getLocaleFromPathname(parsePathname(candidate));
    if (localeFromPath) return localeFromPath;
  }

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return resolveLocaleFromAcceptLanguage(acceptLanguage);
};
