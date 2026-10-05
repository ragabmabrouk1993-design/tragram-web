import type { Locale } from "@/i18n/routing";

export type CatalogLocale = "en" | "ar";

export const resolveCatalogLocale = (locale: Locale): CatalogLocale =>
  locale.toLowerCase().startsWith("ar") ? "ar" : "en";

