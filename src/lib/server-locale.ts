import "server-only";

import { cookies, headers } from "next/headers";
import { localeCookieName, type Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale-resolution";

const localeHeaderKeys = [
  "x-nextjs-url",
  "x-invoke-path",
  "x-matched-path",
  "x-next-url",
  "next-url",
  "referer",
] as const;

export const resolveLocaleFromServerRequest = async (): Promise<Locale> => {
  const headerList = await headers();
  const cookieStore = await cookies();

  return resolveLocale({
    pathnameCandidates: localeHeaderKeys.map((key) => headerList.get(key)),
    cookieLocale: cookieStore.get(localeCookieName)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
};
