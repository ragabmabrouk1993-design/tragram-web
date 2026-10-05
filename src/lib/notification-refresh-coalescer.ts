export type NotificationRefreshCoalescer = {
  /** Schedule a refresh for a durable notification event. */
  schedule: (eventKey?: string) => void;
  /** Run a refresh immediately, or queue one after the current refresh. */
  refreshNow: () => void;
  dispose: () => void;
};

type NotificationRefreshCoalescerOptions = {
  refresh: () => Promise<void> | void;
  delayMs?: number;
  dedupeWindowMs?: number;
  maxKeys?: number;
  now?: () => number;
};

const ANONYMOUS_EVENT_KEY = '__anonymous__';

/**
 * Coalesces websocket invalidations into bounded REST recovery reads.
 *
 * The websocket event is only an invalidation; the refresh reads the unread
 * count and (when open) the summary page. A small delay absorbs a burst, while
 * the in-flight guard prevents overlapping reads and preserves one follow-up
 * refresh for events that arrive during a request.
 */
export const createNotificationRefreshCoalescer = (
  options: NotificationRefreshCoalescerOptions,
): NotificationRefreshCoalescer => {
  const delayMs = Math.max(0, options.delayMs ?? 100);
  const dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 10 * 60 * 1000);
  const maxKeys = Math.max(1, Math.floor(options.maxKeys ?? 500));
  const now = options.now ?? Date.now;
  const seen = new Map<string, number>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let pending = false;
  let forcePending = false;
  let disposed = false;

  const trimSeen = () => {
    while (seen.size > maxKeys) {
      const oldest = seen.keys().next().value as string | undefined;
      if (oldest === undefined) return;
      seen.delete(oldest);
    }
  };

  const arm = () => {
    if (disposed || timer || inFlight || (!pending && !forcePending)) return;
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delayMs);
  };

  const run = async (): Promise<void> => {
    if (disposed || inFlight || (!pending && !forcePending)) return;
    pending = false;
    forcePending = false;
    let refreshPromise: Promise<void>;
    try {
      refreshPromise = Promise.resolve(options.refresh());
    } catch (error) {
      refreshPromise = Promise.reject(error);
    }
    const current = refreshPromise
      .catch(() => undefined)
      .finally(() => {
        if (inFlight === current) inFlight = null;
        if (!disposed && (pending || forcePending)) arm();
      });
    inFlight = current;
    await current;
  };

  const schedule = (eventKey?: string) => {
    if (disposed) return;
    const key = eventKey?.trim() || ANONYMOUS_EVENT_KEY;
    const timestamp = now();
    const previous = seen.get(key);
    if (previous !== undefined && timestamp - previous < dedupeWindowMs) return;
    seen.delete(key);
    seen.set(key, timestamp);
    trimSeen();
    pending = true;
    arm();
  };

  const refreshNow = () => {
    if (disposed) return;
    pending = false;
    forcePending = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!inFlight) void run();
  };

  const dispose = () => {
    disposed = true;
    pending = false;
    forcePending = false;
    if (timer) clearTimeout(timer);
    timer = null;
    seen.clear();
  };

  return { schedule, refreshNow, dispose };
};
