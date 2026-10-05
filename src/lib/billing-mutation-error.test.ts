import { getBillingMutationError } from './billing-mutation-error';
import type { Dictionary } from './i18n';

const dict = { apiErrors: { INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again.', DATABASE_ERROR: 'Database error. Please try again.', PRICE_UNAVAILABLE: 'Choose another price.' } } as unknown as Dictionary;
const fallback = 'Check your plan before trying again.';
test.each([
  new Error('timeout'),
  { response: { data: { code: 'INTERNAL_SERVER_ERROR', message: 'private' } } },
  { response: { data: { code: 'DATABASE_ERROR', message: 'private' } } },
  { response: { data: { code: 'UNKNOWN_PROVIDER_ERROR', message: 'private' } } },
])('an uncertain billing mutation uses action-specific guidance', error => {
  expect(getBillingMutationError(error, dict, fallback)).toBe(fallback);
});
test('known actionable errors retain their guidance', () => {
  expect(getBillingMutationError({ response: { data: { code: 'PRICE_UNAVAILABLE' } } }, dict, fallback)).toBe('Choose another price.');
});
