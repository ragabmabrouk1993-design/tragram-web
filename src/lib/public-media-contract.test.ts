import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '../app/[lang]', file), 'utf8');

test('marketing setup actions do not activate unrelated placeholder video', () => {
  for (const file of ['hero', 'our-tools']) {
    const source = read(`marketing/components/${file}.tsx`);
    expect(source).not.toContain('Y-x0efG1seA');
    expect(source).not.toContain('className="popup-video"');
    expect(source).toContain('withLocale("/help-center")');
  }
});

test('hero does not present an unsupported numerical execution gauge', () => {
  expect(read('marketing/components/hero.tsx')).not.toContain('HeroArcProgress');
});

test('deletion step retains its focus target without a second h1', () => {
  const source = read('(public)/account-deletion/account-deletion-content.tsx');
  expect(source).toContain('<h2 id="account-deletion-step-title" tabIndex={-1} ref={headingRef}>');
  expect(source).not.toContain('<h1');
});

test('legacy public copy does not reintroduce approval queues or Telegram-only deletion', () => {
  const messagesRoot=path.resolve(__dirname,'../messages');
  for(const locale of ['en','ar']) {
    const home=fs.readFileSync(path.join(messagesRoot,locale,'home.json'),'utf8');
    expect(home).not.toMatch(/Use manual review|استخدم المراجعة اليدوية|وافق أو/);
    const pages=fs.readFileSync(path.join(messagesRoot,locale,'public-pages.json'),'utf8');
    expect(pages).not.toMatch(/Telegram-only|تحقق حصري عبر Telegram|عناصر الموافقة/);
  }
});
