export type RealtimeEventIdentity = {
  eventId?: unknown;
  sourceVersion?: unknown;
};

export type RealtimeEventDedupe = {
  /** Return true only when the semantic event is new or has a newer version. */
  shouldApply: (identity: RealtimeEventIdentity) => boolean;
  /** Forget all retained identities, normally when the authenticated user changes. */
  clear: () => void;
  /** Number of retained identities (exposed for boundedness tests/diagnostics). */
  size: () => number;
};

const DEFAULT_MAX_ENTRIES = 2_048;

const normalizeEventId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeVersion = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return 0;
  return value;
};

/**
 * Client-side protection for the at-least-once realtime transport. The map is
 * deliberately bounded: a browser tab can remain open for months and must
 * not turn durable event IDs into an unbounded memory cache.
 */
export const createRealtimeEventDedupe = (
  options: { maxEntries?: number } = {},
): RealtimeEventDedupe => {
  const maxEntries = Number.isSafeInteger(options.maxEntries) && (options.maxEntries ?? 0) > 0
    ? options.maxEntries as number
    : DEFAULT_MAX_ENTRIES;
  const latestVersions = new Map<string, number>();

  const shouldApply = (identity: RealtimeEventIdentity): boolean => {
    const eventId = normalizeEventId(identity.eventId);
    // Events from older/legacy transports without a durable identity remain
    // usable; they simply cannot be safely deduplicated here.
    if (!eventId) return true;

    const version = normalizeVersion(identity.sourceVersion);
    const previous = latestVersions.get(eventId);
    if (previous !== undefined && version <= previous) return false;

    // Refresh insertion order when a newer version arrives so the oldest
    // semantic identity is evicted first under the bound.
    latestVersions.delete(eventId);
    latestVersions.set(eventId, version);
    while (latestVersions.size > maxEntries) {
      const oldest = latestVersions.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      latestVersions.delete(oldest);
    }
    return true;
  };

  return {
    shouldApply,
    clear: () => latestVersions.clear(),
    size: () => latestVersions.size,
  };
};
