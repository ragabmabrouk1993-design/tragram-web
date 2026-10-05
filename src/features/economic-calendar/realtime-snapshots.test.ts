import { nextRevisionState, shouldApplyRevision } from './realtime-snapshots';

it('ignores duplicate and malformed revisions', () => {
  expect(shouldApplyRevision('same', 'same')).toBe(false);
  expect(shouldApplyRevision('same', null)).toBe(false);
  expect(shouldApplyRevision(null, 'next')).toBe(true);
});

it('updates only the resource whose complete snapshot was applied', () => {
  expect(nextRevisionState({ calendarRevision: 'c1', guardRevision: 'g1', settingsRevision: 's1' }, 'guardRevision', 'g2')).toEqual({ calendarRevision: 'c1', guardRevision: 'g2', settingsRevision: 's1' });
});
