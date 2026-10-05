import { locales } from "@/i18n/routing-config";

const disabledVisualRuntimePrefixes = ["/blog"] as const;

const stripLocaleFromPathname = (pathname: string): string => {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (!firstSegment || !locales.includes(firstSegment as (typeof locales)[number])) {
    return pathname || "/";
  }

  const withoutLocale = `/${segments.slice(1).join("/")}`;
  return withoutLocale === "/" ? "/" : withoutLocale.replace(/\/+$/, "");
};

export const shouldDisablePublicVisualRuntime = (pathname: string): boolean => {
  const normalizedPath = stripLocaleFromPathname(pathname || "/");
  return disabledVisualRuntimePrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
};
