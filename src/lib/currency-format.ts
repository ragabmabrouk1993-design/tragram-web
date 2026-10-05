export const normalizeCurrencyCode = (
  currency: string | null | undefined,
  fallback = 'USD'
): string => {
  const normalized = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  return normalized || fallback;
};

export const getCurrencySymbol = (
  currency: string | null | undefined,
  locale = 'en-US'
): string => {
  const normalizedCurrency = normalizeCurrencyCode(currency);

  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'symbol',
      })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? normalizedCurrency
    );
  } catch {
    return normalizedCurrency;
  }
};

export const formatCurrencyAmount = (
  value: number,
  currency: string | null | undefined = 'USD',
  locale = 'en-US'
): string => {
  const amount = Number.isFinite(value) ? value : 0;
  const normalizedCurrency = normalizeCurrencyCode(currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'symbol',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
};
