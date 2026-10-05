import {
  compareOrdersForBucket,
  mergeRealtimeOrderPatch,
  normalizeSnapshotRowsPreservingOrder,
  type RealtimeOrdersSummaryLike,
} from './realtime-order-list';

type TestOrder = {
  id: string;
  orderId: string;
  status: string;
  orderType: string;
  openTime?: string;
  closeTime?: string;
  createdAt?: string;
  updatedAt?: string;
  profit?: number;
};

const createSummary = (
  overrides?: Partial<Omit<RealtimeOrdersSummaryLike<TestOrder>, 'counts' | 'lists'>> & {
    counts?: Partial<RealtimeOrdersSummaryLike<TestOrder>['counts']>;
    lists?: Partial<RealtimeOrdersSummaryLike<TestOrder>['lists']>;
  }
): RealtimeOrdersSummaryLike<TestOrder> => ({
  counts: {
    open: 0,
    pending: 0,
    closed: 0,
    ...(overrides?.counts ?? {}),
  },
  lists: {
    open: [],
    pending: [],
    closed: [],
    ...(overrides?.lists ?? {}),
  },
});

describe('realtime-order-list', () => {
  test('same-bucket patch preserves row index even when updatedAt changes', () => {
    const current = createSummary({
      counts: { open: 3, pending: 0, closed: 0 },
      lists: {
        open: [
          {
            id: 'newest',
            orderId: '3',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-27T12:22:30.184Z',
            createdAt: '2026-03-27T12:22:30.190Z',
            updatedAt: '2026-03-29T03:21:18.529Z',
            profit: 1,
          },
          {
            id: 'middle',
            orderId: '2',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-27T07:50:29.083Z',
            createdAt: '2026-03-27T07:50:29.087Z',
            updatedAt: '2026-03-29T03:21:18.517Z',
            profit: 2,
          },
          {
            id: 'oldest',
            orderId: '1',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-26T08:44:13.293Z',
            createdAt: '2026-03-26T08:44:13.296Z',
            updatedAt: '2026-03-29T03:21:18.504Z',
            profit: 3,
          },
        ],
      },
    });

    const next = mergeRealtimeOrderPatch(
      current,
      {
        id: 'oldest',
        orderId: '1',
        status: 'open',
        orderType: 'MARKET',
        openTime: '2026-03-26T08:44:13.293Z',
        createdAt: '2026-03-26T08:44:13.296Z',
        updatedAt: '2026-03-29T03:40:00.000Z',
        profit: 30,
      },
      {
        previousStatus: 'open',
        limit: 20,
      }
    );

    expect(next.lists.open.map((order) => order.id)).toEqual(['newest', 'middle', 'oldest']);
    expect(next.lists.open[2]?.profit).toBe(30);
    expect(next.counts).toEqual(current.counts);
  });

  test('new open order is inserted by timeline instead of prepended blindly', () => {
    const current = createSummary({
      counts: { open: 2, pending: 0, closed: 0 },
      lists: {
        open: [
          {
            id: 'newest',
            orderId: '3',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-27T12:22:30.184Z',
            createdAt: '2026-03-27T12:22:30.190Z',
          },
          {
            id: 'oldest',
            orderId: '1',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-26T08:44:13.293Z',
            createdAt: '2026-03-26T08:44:13.296Z',
          },
        ],
      },
    });

    const next = mergeRealtimeOrderPatch(
      current,
      {
        id: 'middle',
        orderId: '2',
        status: 'open',
        orderType: 'MARKET',
        openTime: '2026-03-27T07:50:29.083Z',
        createdAt: '2026-03-27T07:50:29.087Z',
      },
      {
        previousStatus: null,
        limit: 20,
      }
    );

    expect(next.lists.open.map((order) => order.id)).toEqual(['newest', 'middle', 'oldest']);
    expect(next.counts.open).toBe(3);
  });

  test('duplicate created events can update visible rows without incrementing counts again', () => {
    const current = createSummary({
      counts: { open: 1, pending: 0, closed: 0 },
      lists: {
        open: [],
      },
    });

    const next = mergeRealtimeOrderPatch(
      current,
      {
        id: 'trade-1',
        orderId: '1',
        status: 'open',
        orderType: 'MARKET',
        openTime: '2026-03-27T07:50:29.083Z',
        createdAt: '2026-03-27T07:50:29.087Z',
      },
      {
        previousStatus: null,
        limit: 20,
        adjustCounts: false,
      }
    );

    expect(next.lists.open.map((order) => order.id)).toEqual(['trade-1']);
    expect(next.counts).toEqual(current.counts);
  });

  test('bucket transition removes from the old bucket and inserts into the new bucket', () => {
    const current = createSummary({
      counts: { open: 1, pending: 0, closed: 0 },
      lists: {
        open: [
          {
            id: 'trade-1',
            orderId: '1',
            status: 'open',
            orderType: 'MARKET',
            openTime: '2026-03-27T07:50:29.083Z',
            createdAt: '2026-03-27T07:50:29.087Z',
          },
        ],
      },
    });

    const next = mergeRealtimeOrderPatch(
      current,
      {
        id: 'trade-1',
        orderId: '1',
        status: 'closed',
        orderType: 'MARKET',
        openTime: '2026-03-27T07:50:29.083Z',
        closeTime: '2026-03-29T03:21:30.000Z',
        createdAt: '2026-03-27T07:50:29.087Z',
      },
      {
        previousStatus: 'open',
        limit: 20,
      }
    );

    expect(next.lists.open).toHaveLength(0);
    expect(next.lists.closed.map((order) => order.id)).toEqual(['trade-1']);
    expect(next.counts).toEqual({
      open: 0,
      pending: 0,
      closed: 1,
    });
  });

  test('updatedAt does not affect active-order comparator decisions', () => {
    const olderOpen = {
      id: 'older',
      orderId: '1',
      status: 'open',
      orderType: 'MARKET',
      openTime: '2026-03-26T08:44:13.293Z',
      createdAt: '2026-03-26T08:44:13.296Z',
      updatedAt: '2026-03-29T03:50:00.000Z',
    };
    const newerOpen = {
      id: 'newer',
      orderId: '2',
      status: 'open',
      orderType: 'MARKET',
      openTime: '2026-03-27T12:22:30.184Z',
      createdAt: '2026-03-27T12:22:30.190Z',
      updatedAt: '2026-03-29T03:21:18.529Z',
    };

    expect(compareOrdersForBucket(newerOpen, olderOpen, 'open')).toBeLessThan(0);
    expect(compareOrdersForBucket(olderOpen, newerOpen, 'open')).toBeGreaterThan(0);
  });

  test('pending comparator uses broker open time before created time', () => {
    const createdNewerOpenOlder = {
      id: 'created-newer-open-older',
      orderId: '1',
      status: 'pending',
      orderType: 'BUY_LIMIT',
      openTime: '2026-03-27T07:50:29.083Z',
      createdAt: '2026-03-27T12:22:30.190Z',
    };
    const openNewerCreatedOlder = {
      id: 'open-newer-created-older',
      orderId: '2',
      status: 'pending',
      orderType: 'BUY_LIMIT',
      openTime: '2026-03-27T12:22:30.184Z',
      createdAt: '2026-03-27T07:50:29.087Z',
    };

    expect(compareOrdersForBucket(openNewerCreatedOlder, createdNewerOpenOlder, 'pending')).toBeLessThan(0);
    expect(compareOrdersForBucket(createdNewerOpenOlder, openNewerCreatedOlder, 'pending')).toBeGreaterThan(0);
  });

  test('snapshot normalization preserves backend order', () => {
    const result = normalizeSnapshotRowsPreservingOrder(
      [
        { id: 'first' },
        { id: 'second' },
        { bad: true },
        { id: 'third' },
      ],
      (item) => {
        if (!item || typeof item !== 'object' || !('id' in item)) {
          return null;
        }
        const value = item as { id?: string };
        return value.id ? value.id : null;
      }
    );

    expect(result).toEqual(['first', 'second', 'third']);
  });
});
