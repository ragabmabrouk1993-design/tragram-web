import { formatCurrencyAmount } from './currency-format';

export const REFERRAL_CURRENCY = 'USD';

// Referral payouts are part of USD-denominated subscription billing, not MT accounts.
export const formatReferralAmount = (value: number): string =>
  formatCurrencyAmount(value, REFERRAL_CURRENCY, 'en-US');
