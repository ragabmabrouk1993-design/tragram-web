import { formatReferralAmount, REFERRAL_CURRENCY } from './referral-currency';

describe('referral currency formatting', () => {
  test('keeps subscription referral balances denominated in USD', () => {
    expect(REFERRAL_CURRENCY).toBe('USD');
    expect(formatReferralAmount(125.5)).toBe('$125.50');
  });

  test('does not require an account currency or locale input', () => {
    expect(formatReferralAmount(0)).toBe('$0.00');
  });
});
