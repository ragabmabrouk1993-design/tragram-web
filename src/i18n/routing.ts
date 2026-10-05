import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, type Locale } from "./routing-config";

export { defaultLocale, locales, type Locale };

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  alternateLinks: false,
});
