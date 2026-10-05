import { locales } from '@/i18n/routing-config';
import { publicRouteManifest } from '@/content/public/route-manifest';

export const publicLocales = ['en', 'ar'] as const;
export type PublicLocale = (typeof publicLocales)[number];
export function resolvePublicLocale(locale: string): PublicLocale {
  return locale.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

const publicPaths = new Set(publicRouteManifest.map(route => route.path));
const appLocales = new Set<string>(locales);

export function isCanonicalPublicContentPathname(pathname: string): boolean {
  const [, locale, ...segments] = pathname.split('/');
  return (locale === 'en' || locale === 'ar') && publicPaths.has('/' + segments.join('/').replace(/\/$/, ''));
}

/** Returns only a pathname; the caller retains the request query unchanged. */
export function getPublicLocaleRedirect(pathname: string): string | undefined {
  const [, locale, ...segments] = pathname.split('/');
  if (!appLocales.has(locale) || locale === 'en' || locale === 'ar') return;
  const path = '/' + segments.join('/').replace(/\/$/, '');
  if (!publicPaths.has(path)) return;
  return '/' + resolvePublicLocale(locale) + (path === '/' ? '' : path);
}
