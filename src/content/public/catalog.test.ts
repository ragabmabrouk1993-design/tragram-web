import { getPublicPageCopy } from './catalog';
import { publicRouteManifest } from './route-manifest';

describe('public content ownership', () => {
  test.each(['en', 'ar'] as const)('%s covers all 35 routes with valid related links', locale => {
    const paths = new Set(publicRouteManifest.map(route => route.path));
    for (const { path } of publicRouteManifest) {
      const copy = getPublicPageCopy(locale, path);
      expect(copy).toBeDefined();
      expect(copy?.title).toBeTruthy();
      expect(copy?.h1).toBeTruthy();
      expect(copy?.description).toBeTruthy();
      expect(new Set(copy?.sections.map(section => section.id)).size).toBe(copy?.sections.length);
      for (const related of copy?.relatedPaths ?? []) expect(paths.has(related)).toBe(true);
      expect(copy?.relatedPaths).not.toContain('/pricing');
      if (locale === 'ar') expect(copy?.title).toMatch(/[\u0600-\u06ff]/);
    }
  });
  test('does not resolve unknown routes', () => {
    expect(getPublicPageCopy('en', '/not-a-page')).toBeUndefined();
  });
  test('public product copy does not promise a manual approval queue', () => {
    for (const {path} of publicRouteManifest) {
      expect(JSON.stringify(getPublicPageCopy('en',path)).match(/approvals?|approve/gi)).toBeNull();
    }
  });
  test.each(['en', 'ar'] as const)('%s FAQ topics and help anchors are explicit', locale => {
    expect(getPublicPageCopy(locale, '/faqs')?.faqs).toHaveLength(24);
    expect(getPublicPageCopy(locale, '/help-center')?.sections).toHaveLength(12);
    const sections = getPublicPageCopy(locale, '/help-center')!.sections;
    expect(new Set(sections.map(section => JSON.stringify(section.steps))).size).toBe(12);
    for (const section of sections) expect(section.steps).toHaveLength(2);
  });
});
