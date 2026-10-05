import { decideDashboardRevision } from './dashboard-resource-revisions';

describe('dashboard resource revisions', () => {
  test('ignores stale and equal snapshots', () => {
    expect(decideDashboardRevision(4, 3)).toEqual({ apply: false, gap: false });
    expect(decideDashboardRevision(4, 4)).toEqual({ apply: false, gap: false });
  });

  test('applies the next revision and flags a gap', () => {
    expect(decideDashboardRevision(4, 5)).toEqual({ apply: true, gap: false });
    expect(decideDashboardRevision(4, 7)).toEqual({ apply: true, gap: true });
  });
});
