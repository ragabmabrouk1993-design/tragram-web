import {
  formatCurrencyAmount,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from './currency-format';

describe('currency-format', () => {
  test('uses localized standard symbols without losing currency disambiguation', () => {
    expect(getCurrencySymbol('USD', 'en-US')).toBe('$');
    expect(getCurrencySymbol('CAD', 'en-US')).toBe('CA$');
    expect(getCurrencySymbol('TRY', 'tr-TR')).toBe('₺');
  });

  test('formats amounts with the requested currency and locale', () => {
    expect(formatCurrencyAmount(1250.5, 'EUR', 'en-US')).toBe('€1,250.50');
  });

  test('normalizes valid currency codes and falls back for blank values', () => {
    expect(normalizeCurrencyCode(' gbp ')).toBe('GBP');
    expect(normalizeCurrencyCode(null)).toBe('USD');
  });

  test('falls back to the displayed code for invalid formatter input', () => {
    expect(getCurrencySymbol('NOT-A-CURRENCY', 'en-US')).toBe('NOT-A-CURRENCY');
    expect(formatCurrencyAmount(50, 'NOT-A-CURRENCY', 'en-US')).toBe(
      '50.00 NOT-A-CURRENCY'
    );
  });
});
