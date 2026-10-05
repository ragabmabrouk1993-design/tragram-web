import { createRealtimeEventDedupe } from './realtime-event-dedupe';

describe('realtime event dedupe', () => {
  test('applies a semantic event once and accepts only newer lifecycle versions', () => {
    const dedupe = createRealtimeEventDedupe();

    expect(dedupe.shouldApply({ eventId: 'lifecycle-1', sourceVersion: 4 })).toBe(true);
    expect(dedupe.shouldApply({ eventId: 'lifecycle-1', sourceVersion: 4 })).toBe(false);
    expect(dedupe.shouldApply({ eventId: 'lifecycle-1', sourceVersion: 3 })).toBe(false);
    expect(dedupe.shouldApply({ eventId: 'lifecycle-1', sourceVersion: 5 })).toBe(true);
    expect(dedupe.shouldApply({ eventId: 'lifecycle-2', sourceVersion: 1 })).toBe(true);
  });

  test('does not pretend unidentifiable transport messages are durable duplicates', () => {
    const dedupe = createRealtimeEventDedupe();

    expect(dedupe.shouldApply({})).toBe(true);
    expect(dedupe.shouldApply({ sourceVersion: 2 })).toBe(true);
  });

  test('bounds retained identities and can be reset after a reconnect', () => {
    const dedupe = createRealtimeEventDedupe({ maxEntries: 2 });

    expect(dedupe.shouldApply({ eventId: 'one', sourceVersion: 1 })).toBe(true);
    expect(dedupe.shouldApply({ eventId: 'two', sourceVersion: 1 })).toBe(true);
    expect(dedupe.shouldApply({ eventId: 'three', sourceVersion: 1 })).toBe(true);
    expect(dedupe.size()).toBe(2);
    expect(dedupe.shouldApply({ eventId: 'one', sourceVersion: 1 })).toBe(true);

    dedupe.clear();
    expect(dedupe.size()).toBe(0);
    expect(dedupe.shouldApply({ eventId: 'three', sourceVersion: 1 })).toBe(true);
  });
});
