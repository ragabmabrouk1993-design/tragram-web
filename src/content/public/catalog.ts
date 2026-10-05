import type { PublicLocale } from '@/lib/public-locales';
import type { PublicPageCopy } from './types';
import { enPublicPages } from './en';
import { arPublicPages } from './ar';

export function getPublicPageCopy(locale: PublicLocale, path: string): PublicPageCopy | undefined {
  return (locale === 'ar' ? arPublicPages : enPublicPages)[path];
}
