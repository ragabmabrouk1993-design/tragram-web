export type OrderBucket = 'open' | 'pending' | 'closed';

export type RealtimeOrderLike = {
  id?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
  status?: string | null;
  orderType?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RealtimeOrdersSummaryLike<T extends RealtimeOrderLike> = {
  counts: {
    open: number;
    pending: number;
    closed: number;
  };
  lists: {
    open: T[];
    pending: T[];
    closed: T[];
  };
};

const parseOrderTimelineMs = (value?: string | null): number => {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export const buildOrderIdentity = (order: RealtimeOrderLike): string | null =>
  order.id ?? order.orderId ?? order.ticketId ?? null;

export const resolveOrderBucketFromStatusAndType = (
  status: string | undefined | null,
  orderType: string | undefined | null
): OrderBucket => {
  const normalizedStatus = status?.toUpperCase();
  const normalizedOrderType = orderType?.toUpperCase();

  if (normalizedStatus === 'CLOSED' || normalizedStatus === 'CANCELLED') {
    return 'closed';
  }
  if (normalizedOrderType && normalizedOrderType !== 'MARKET') {
    return 'pending';
  }
  return 'open';
};

export const resolveOrderBucket = (order: RealtimeOrderLike): OrderBucket =>
  resolveOrderBucketFromStatusAndType(order.status, order.orderType);

const resolveStableOrderSortTime = (
  order: RealtimeOrderLike,
  bucket: OrderBucket = resolveOrderBucket(order)
): number => {
  if (bucket === 'closed') {
    return (
      parseOrderTimelineMs(order.closeTime) ||
      parseOrderTimelineMs(order.openTime) ||
      parseOrderTimelineMs(order.createdAt)
    );
  }

  if (bucket === 'open') {
    return parseOrderTimelineMs(order.openTime) || parseOrderTimelineMs(order.createdAt);
  }

  return parseOrderTimelineMs(order.openTime) || parseOrderTimelineMs(order.createdAt);
};

export const compareOrdersForBucket = (
  left: RealtimeOrderLike,
  right: RealtimeOrderLike,
  bucket: OrderBucket
): number => {
  const timeDiff =
    resolveStableOrderSortTime(right, bucket) - resolveStableOrderSortTime(left, bucket);
  if (timeDiff !== 0) {
    return timeDiff;
  }

  const leftIdentity = buildOrderIdentity(left) ?? '';
  const rightIdentity = buildOrderIdentity(right) ?? '';
  return rightIdentity.localeCompare(leftIdentity);
};

export const normalizeSnapshotRowsPreservingOrder = <TInput, TOutput>(
  value: unknown,
  normalizeRow: (item: TInput) => TOutput | null
): TOutput[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeRow(item as TInput))
    .filter((item): item is TOutput => item !== null);
};

const insertOrderByBucket = <T extends RealtimeOrderLike>(
  orders: readonly T[],
  nextOrder: T,
  bucket: OrderBucket,
  limit?: number
): T[] => {
  const nextOrderTime = resolveStableOrderSortTime(nextOrder, bucket);
  if (nextOrderTime === 0) {
    const appended = [...orders, nextOrder];
    return typeof limit === 'number' ? appended.slice(0, limit) : appended;
  }

  let insertAt = orders.length;
  for (let index = 0; index < orders.length; index += 1) {
    const currentOrder = orders[index];
    const currentOrderTime = resolveStableOrderSortTime(currentOrder, bucket);
    if (currentOrderTime === 0) {
      insertAt = index;
      break;
    }

    if (compareOrdersForBucket(nextOrder, currentOrder, bucket) < 0) {
      insertAt = index;
      break;
    }
  }

  const nextOrders = [
    ...orders.slice(0, insertAt),
    nextOrder,
    ...orders.slice(insertAt),
  ];
  return typeof limit === 'number' ? nextOrders.slice(0, limit) : nextOrders;
};

const removeOrderByIdentity = <T extends RealtimeOrderLike>(
  orders: readonly T[],
  orderIdentity: string
): { nextOrders: T[]; removedIndex: number } => {
  const removedIndex = orders.findIndex((order) => buildOrderIdentity(order) === orderIdentity);
  if (removedIndex === -1) {
    return { nextOrders: [...orders], removedIndex: -1 };
  }

  return {
    nextOrders: [...orders.slice(0, removedIndex), ...orders.slice(removedIndex + 1)],
    removedIndex,
  };
};

export const mergeRealtimeOrderPatch = <T extends RealtimeOrderLike>(
  current: RealtimeOrdersSummaryLike<T>,
  nextOrder: T,
  options?: {
    previousStatus?: string | null;
    limit?: number;
    adjustCounts?: boolean;
  }
): RealtimeOrdersSummaryLike<T> => {
  const orderIdentity = buildOrderIdentity(nextOrder);
  if (!orderIdentity) {
    return current;
  }

  const nextBucket = resolveOrderBucket(nextOrder);
  const previousBucket = options?.previousStatus
    ? resolveOrderBucketFromStatusAndType(options.previousStatus, nextOrder.orderType)
    : null;

  const removeOpen = removeOrderByIdentity(current.lists.open, orderIdentity);
  const removePending = removeOrderByIdentity(current.lists.pending, orderIdentity);
  const removeClosed = removeOrderByIdentity(current.lists.closed, orderIdentity);

  const existingBucket =
    removeOpen.removedIndex !== -1
      ? 'open'
      : removePending.removedIndex !== -1
        ? 'pending'
        : removeClosed.removedIndex !== -1
          ? 'closed'
          : null;

  if (existingBucket && existingBucket === nextBucket) {
    const stableList = [...current.lists[nextBucket]];
    const existingIndex = stableList.findIndex((order) => buildOrderIdentity(order) === orderIdentity);
    if (existingIndex !== -1) {
      stableList[existingIndex] = nextOrder;
      return {
        counts: { ...current.counts },
        lists: {
          ...current.lists,
          [nextBucket]: stableList,
        },
      };
    }
  }

  const nextLists = {
    open: removeOpen.nextOrders,
    pending: removePending.nextOrders,
    closed: removeClosed.nextOrders,
  };

  nextLists[nextBucket] = insertOrderByBucket(
    nextLists[nextBucket],
    nextOrder,
    nextBucket,
    options?.limit
  );

  const nextCounts = { ...current.counts };
  const shouldAdjustCounts = options?.adjustCounts !== false;
  const effectivePreviousBucket = existingBucket ?? previousBucket;

  if (!shouldAdjustCounts) {
    return {
      counts: nextCounts,
      lists: nextLists,
    };
  }

  if (effectivePreviousBucket && effectivePreviousBucket !== nextBucket) {
    if (nextCounts[effectivePreviousBucket] > 0) {
      nextCounts[effectivePreviousBucket] -= 1;
    }
    nextCounts[nextBucket] += 1;
  } else if (!effectivePreviousBucket) {
    nextCounts[nextBucket] += 1;
  }

  return {
    counts: nextCounts,
    lists: nextLists,
  };
};
