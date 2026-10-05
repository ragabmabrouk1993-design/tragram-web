import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import type { AppMessages } from "@/i18n/messages";

export { defaultLocale, locales, type Locale };
export const localeCookieName = "tragram-locale";

export const isLocale = (value?: string | null): value is Locale =>
  Boolean(value && locales.includes(value as Locale));

export const hasLocale = (value?: string | null): value is Locale => isLocale(value);

export const getLocaleFromPathname = (pathname: string): Locale | null => {
  const segment = pathname.split("/").filter(Boolean)[0];
  return isLocale(segment) ? segment : null;
};

export const stripLocaleFromPathname = (pathname: string): string => {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname;
  const stripped = pathname.replace(`/${locale}`, "") || "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
};

export const localizePath = (locale: Locale, href: string): string => {
  if (!href.startsWith("/")) return href;
  if (getLocaleFromPathname(href)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
};

export type Dictionary = AppMessages;
