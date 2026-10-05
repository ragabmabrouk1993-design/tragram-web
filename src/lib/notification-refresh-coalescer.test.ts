import { createNotificationRefreshCoalescer } from './notification-refresh-coalescer';

describe('notification refresh coalescer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('coalesces a burst of notification events into one refresh', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const coalescer = createNotificationRefreshCoalescer({ refresh, delayMs: 100 });

    coalescer.schedule('event-1');
    coalescer.schedule('event-2');
    coalescer.schedule('event-1');
    jest.advanceTimersByTime(99);
    expect(refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledTimes(1);
    coalescer.dispose();
  });

  it('runs one follow-up refresh when an event arrives during an in-flight refresh', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const coalescer = createNotificationRefreshCoalescer({ refresh, delayMs: 10 });

    coalescer.schedule('event-1');
    jest.advanceTimersByTime(10);
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);

    coalescer.schedule('event-2');
    resolveRefresh?.();
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(10);
    await Promise.resolve();
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledTimes(2);
    coalescer.dispose();
  });

  it('deduplicates the same event key for the configured window', async () => {
    let now = 1_000;
    const refresh = jest.fn().mockResolvedValue(undefined);
    const coalescer = createNotificationRefreshCoalescer({
      refresh,
      delayMs: 1,
      dedupeWindowMs: 100,
      now: () => now,
    });

    coalescer.schedule('event-1');
    coalescer.schedule('event-1');
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);

    now += 99;
    coalescer.schedule('event-1');
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);

    now += 1;
    coalescer.schedule('event-1');
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(2);
    coalescer.dispose();
  });

  it('forces a refresh for reconnect recovery', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const coalescer = createNotificationRefreshCoalescer({ refresh, delayMs: 100 });

    coalescer.refreshNow();
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
    coalescer.dispose();
  });
});
