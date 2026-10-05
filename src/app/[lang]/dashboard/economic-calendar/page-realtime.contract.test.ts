import { readFileSync } from 'node:fs';
import path from 'node:path';

const pageSource = readFileSync(path.join(process.cwd(), 'src/app/[lang]/dashboard/economic-calendar/page.tsx'), 'utf8');

it('uses one bootstrap and full websocket snapshots without browser refetch invalidations', () => {
  expect(pageSource).toContain('fetchEconomicNewsBootstrap');
  expect(pageSource).toContain('economic-calendar:snapshot');
  expect(pageSource).toContain('economic-news-guard:snapshot');
  expect(pageSource).toContain('economic-news-settings:snapshot');
  expect(pageSource).toContain('economic-news:subscribe');
  expect(pageSource).not.toContain('fetchEconomicCalendarGuard');
  expect(pageSource).not.toContain('fetchEconomicNewsSettings');
  expect(pageSource).not.toContain('economic-calendar-updated');
  expect(pageSource).not.toContain('economic-news-guard-updated');
  expect(pageSource).not.toContain('economic-news-settings-updated');
  expect(pageSource).not.toContain('refreshSettings()');
});
