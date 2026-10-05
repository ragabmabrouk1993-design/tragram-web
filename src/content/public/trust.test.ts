import { publicTrust } from './trust';
import en from '@/messages/en/public-pages.json';
import ar from '@/messages/ar/public-pages.json';
import enHome from '@/messages/en/home.json';
import arHome from '@/messages/ar/home.json';
test('public website contact omits phone numbers and keeps support email in both locales',()=>{
 for(const dictionary of [en,ar]) {
  expect(dictionary.legacyPages.contact.info).not.toHaveProperty('phoneValue');
  expect(dictionary.legacyPages.faqs.sidebar).not.toHaveProperty('phoneValue');
  expect(dictionary.legacyPages.contact.info.emailValue).toBe(publicTrust.supportEmail);
  expect(JSON.stringify(dictionary)).not.toContain('+201553979684');
 }
 for(const dictionary of [enHome, arHome]) {
  expect(dictionary.home2.footer).not.toHaveProperty('phoneValue');
  expect(JSON.stringify(dictionary)).not.toContain('+201553979684');
 }
 expect(JSON.stringify(publicTrust)).not.toContain('telephone');
});
