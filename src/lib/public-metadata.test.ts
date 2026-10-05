import { buildPublicPageMetadata, buildSoftwareApplicationJsonLd, buildSitemapEntries } from './seo';
import { getPublicPageCopy } from '@/content/public/catalog';
test('Arabic metadata follows the same localized record as the body', () => {
  const metadata = buildPublicPageMetadata({locale:'ar',path:'/features',title:'English fallback',description:'English fallback'});
  expect(metadata.title).toEqual({absolute:getPublicPageCopy('ar','/features')?.title});
  expect(metadata.description).toBe(getPublicPageCopy('ar','/features')?.description);
  expect(metadata.openGraph).toHaveProperty('images');
  expect(metadata.twitter).toHaveProperty('images');
});
test('schema describes published client platforms without approval fiction', () => {
  const schema = buildSoftwareApplicationJsonLd('en','/features',{billingDisabled:true});
  expect(schema.operatingSystem).toContain('iOS');
  expect(schema.operatingSystem).toContain('Android');
  expect(schema.description).not.toMatch(/approval/i);
  expect(schema).not.toHaveProperty('offers');
});
test('unknown editorial dates are omitted, known revisions are used', () => {
  const entries = buildSitemapEntries({billingDisabled:true});
  expect(entries.find(e=>e.url.endsWith('/en/privacy-policy'))?.lastModified).toBeUndefined();
  expect(entries.find(e=>e.url.endsWith('/en/blog/copy-telegram-signals-from-phone'))?.lastModified).toBe('2026-09-08');
});
