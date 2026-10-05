import { getSelectedPrice, getPlanPriceDetail, getPlanFeaturesTitle, getAdvertisedWebTrialDays } from './pricing-utils';
import type { PricingPagePlan } from '@/services/payment.service';
const plan: PricingPagePlan = {
  code: 'fixture', planVersionId: 'fixture:v1', name: 'Fixture', recommended: false, sortOrder: 0,
  prices: { monthly: { id: 'fixture-price', lookupKey: 'fixture-monthly', provider: 'fixture', currency: 'USD', billingInterval: 'MONTHLY', amountMinor: 1000, display: '$10' } },
  includedFromPlanName: 'Basic', cta: { type: 'signup', label: 'Create account' }, highlights: [], featureSummary: [],
};
test('does not mislabel a monthly fallback as yearly', () => {
  expect(getSelectedPrice(plan, 'YEARLY')).toBeNull();
  expect(getPlanPriceDetail(plan, 'YEARLY').display).toBeNull();
  expect(getSelectedPrice(plan, 'MONTHLY')?.display).toBe('$10');
});
test('localizes inherited feature heading', () => {
  expect(getPlanFeaturesTitle(plan,'Included','ar')).toBe('كل ميزات Basic، بالإضافة إلى:');
});

test('advertises only valid web trial grants, regardless of account eligibility', () => {
  expect(getAdvertisedWebTrialDays({ ...plan, trialGrant: { enabled: true, days: 3, salesChannels: ['WEB'] } })).toBe(3);
  expect(getAdvertisedWebTrialDays({ ...plan, trialGrant: { enabled: false, days: 3, salesChannels: ['WEB'] } })).toBeNull();
  expect(getAdvertisedWebTrialDays({ ...plan, trialGrant: { enabled: true, days: 0, salesChannels: ['WEB'] } })).toBeNull();
  expect(getAdvertisedWebTrialDays({ ...plan, trialGrant: { enabled: true, days: 7, salesChannels: ['IOS_APP'] } })).toBeNull();
});
