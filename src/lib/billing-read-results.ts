/** A failed read must never be presented as a confirmed empty subscription/history. */
export async function settleBillingReads<P, S, I>(pricing: Promise<P>, subscription: Promise<S>, invoices: Promise<I>) {
  const [pricingResult, subscriptionResult, invoiceResult] = await Promise.allSettled([pricing, subscription, invoices]);
  return { pricing: pricingResult, subscription: subscriptionResult, invoices: invoiceResult };
}
