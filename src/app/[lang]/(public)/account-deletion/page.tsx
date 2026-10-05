import { headers } from 'next/headers';
import type { CountryCode } from 'libphonenumber-js';
import type { Locale } from '@/lib/i18n';
import { hasLocale } from '@/lib/i18n';
import { loadMessages } from '@/i18n/load-messages';
import { getCountryAccessServer } from '@/lib/country-detection-server';
import AccountDeletionContent from './account-deletion-content';

const DEFAULT_COUNTRY = 'US' as CountryCode;

export default async function AccountDeletionPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (hasLocale(lang) ? lang : 'en') as Locale;
  const messages = await loadMessages(locale, ['public-pages'] as const);
  const countryAccess = await getCountryAccessServer(await headers());
  return (
    <AccountDeletionContent
      locale={locale}
      copy={messages.accountDeletionPage}
      defaultCountry={countryAccess.countryCode ?? DEFAULT_COUNTRY}
      countryPolicy={countryAccess}
    />
  );
}
