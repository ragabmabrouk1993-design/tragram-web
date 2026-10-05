import { selectCommercialCopy } from './public-commercial-copy';
test('selects current access without falling through to purchase wording', () => {
  const copy = { freeBasic: 'Current access', standardBilling: 'Available plans' };
  expect(selectCommercialCopy(true, copy)).toBe(copy.freeBasic);
  expect(selectCommercialCopy(false, copy)).toBe(copy.standardBilling);
});
