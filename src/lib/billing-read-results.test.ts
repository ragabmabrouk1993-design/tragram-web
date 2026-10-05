import { settleBillingReads } from './billing-read-results';

describe('billing panel reads', () => {
  it('retains successful panels when another panel fails', async () => {
    const result = await settleBillingReads(Promise.resolve(['basic']), Promise.reject(new Error('offline')), Promise.resolve([]));
    expect(result.pricing).toEqual({ status: 'fulfilled', value: ['basic'] });
    expect(result.subscription.status).toBe('rejected');
    expect(result.invoices).toEqual({ status: 'fulfilled', value: [] });
  });
  it('distinguishes confirmed empty results from failed reads', async () => {
    const result = await settleBillingReads(Promise.reject(new Error('offline')), Promise.resolve(null), Promise.reject(new Error('offline')));
    expect(result.subscription).toEqual({ status: 'fulfilled', value: null });
    expect(result.pricing.status).toBe('rejected');
    expect(result.invoices.status).toBe('rejected');
  });
});
