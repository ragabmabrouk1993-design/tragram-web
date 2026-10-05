import { locales } from '@/i18n/routing-config';
import { getAllPublicSeoRoutes, buildSitemapEntries, buildLanguageAlternates } from './seo';
import { publicRouteManifest } from '@/content/public/route-manifest';
import { getPublicLocaleRedirect } from './public-locales';

describe('canonical public language contract', () => {
  test('the lightweight manifest covers every existing content route', () => {
    expect(publicRouteManifest.map(route => route.path).sort()).toEqual(
      getAllPublicSeoRoutes().map(route => route.path).sort(),
    );
    expect(publicRouteManifest).toHaveLength(35);
  });
  test.each(locales)('%s preserves every public suffix when canonicalizing', locale => {
    for (const { path } of publicRouteManifest) {
      const suffix = path === '/' ? '' : path;
      const expected = locale === 'en' || locale === 'ar' ? undefined
        : `/${locale.startsWith('ar') ? 'ar' : 'en'}${suffix}`;
      expect(getPublicLocaleRedirect(`/${locale}${suffix}`)).toBe(expected);
    }
  });
  test('private, utility, unknown and unprefixed URLs are untouched', () => {
    for (const path of ['/tr/auth/login', '/ar-EG/profile', '/fr/ref/abc', '/de/onboarding', '/tr/restricted', '/tr/missing', '/features', '/xx/features']) {
      expect(getPublicLocaleRedirect(path)).toBeUndefined();
    }
  });
  test('free mode discovers only the 68 genuine translations', () => {
    expect(buildSitemapEntries({ billingDisabled: true })).toHaveLength(68);
    expect(Object.keys(buildLanguageAlternates('/features')).sort()).toEqual(['ar', 'en', 'x-default']);
  });
});
