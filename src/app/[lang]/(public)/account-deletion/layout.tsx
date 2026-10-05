import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, type Locale } from '@/lib/i18n';
import { buildPublicPageMetadata, getPublicBaseRoute } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : 'en') as Locale;
  const route = getPublicBaseRoute('/account-deletion');
  return buildPublicPageMetadata({
    locale,
    path: '/account-deletion',
    title: route?.title ?? 'Delete your Tragram account',
    description: route?.description ?? 'Review account deletion options and complete the required account verification.',
    keywords: ['Tragram account deletion', 'delete Tragram account', 'Google Play account deletion'],
  });
}

export default function AccountDeletionLayout({ children }: { children: ReactNode }) {
  return children;
}
