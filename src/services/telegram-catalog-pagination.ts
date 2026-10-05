import type { ChannelCatalogWithStatus, TelegramChannelCatalogItem } from './channels.service';

export type TelegramCatalogPageRequest = {
  limit: number;
  cursor: string | null;
};

export type TelegramCatalogPageLoader = (
  request: TelegramCatalogPageRequest
) => Promise<ChannelCatalogWithStatus>;

export type TelegramCatalogPageProgress = {
  page: ChannelCatalogWithStatus;
  channels: TelegramChannelCatalogItem[];
  pagesRead: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
};

export type TelegramCatalogPagesResult = {
  channels: TelegramChannelCatalogItem[];
  lastPage: ChannelCatalogWithStatus | null;
  pagesRead: number;
  truncated: boolean;
};

type TelegramCatalogPageOptions = {
  limit?: number;
  maxPages?: number;
  onPage?: (progress: TelegramCatalogPageProgress) => void;
  restartOnCursorError?: boolean;
};

const catalogItemKey = (channel: TelegramChannelCatalogItem): string | null => {
  const value = channel.peerId ?? channel.id ?? channel.peerKey;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return value.trim();
};

const isCursorRestartableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return error instanceof Error && /TELEGRAM_CATALOG_(?:CHANGED|CURSOR_)/u.test(error.message);
  }
  const record = error as {
    code?: unknown;
    message?: unknown;
    response?: { data?: { code?: unknown; message?: unknown } };
  };
  const code =
    [record.code, record.response?.data?.code].find(
      (value): value is string => typeof value === 'string'
    ) ?? '';
  const message =
    [record.message, record.response?.data?.message].find(
      (value): value is string => typeof value === 'string'
    ) ?? '';
  return /TELEGRAM_CATALOG_(?:CHANGED|CURSOR_)/u.test(`${code} ${message}`);
};

/**
 * Consume the DB-backed cursor pages without requiring callers to understand
 * the response aliases or cursor stop conditions. The callback receives the
 * merged snapshot after every page so a UI can render progressively.
 */
export const loadTelegramCatalogPages = async (
  loadPage: TelegramCatalogPageLoader,
  options: TelegramCatalogPageOptions = {}
): Promise<TelegramCatalogPagesResult> => {
  const limit = Math.max(1, Math.min(Math.floor(options.limit ?? 100), 100));
  const maxPages = Math.max(1, Math.floor(options.maxPages ?? 100));
  const byKey = new Map<string, TelegramChannelCatalogItem>();
  let cursor: string | null = null;
  let lastPage: ChannelCatalogWithStatus | null = null;
  let pagesRead = 0;
  let hasMore = false;
  let restartedFromCursor = false;

  while (pagesRead < maxPages) {
    const pageCursor = cursor;
    let page: ChannelCatalogWithStatus;
    try {
      page = await loadPage({ limit, cursor: pageCursor });
    } catch (error) {
      if (
        options.restartOnCursorError !== false &&
        pageCursor &&
        !restartedFromCursor &&
        isCursorRestartableError(error)
      ) {
        restartedFromCursor = true;
        cursor = null;
        continue;
      }
      throw error;
    }
    lastPage = page;
    pagesRead += 1;

    for (const channel of page.channels) {
      const key = catalogItemKey(channel);
      if (key) byKey.set(key, channel);
    }

    const nextCursor = page.pagination?.nextCursor ?? null;
    hasMore = Boolean(page.pagination?.hasMore && nextCursor && nextCursor !== pageCursor);
    options.onPage?.({
      page,
      channels: Array.from(byKey.values()),
      pagesRead,
      cursor: pageCursor,
      nextCursor,
      hasMore,
    });

    if (!hasMore) break;
    cursor = nextCursor;
  }

  return {
    channels: Array.from(byKey.values()),
    lastPage,
    pagesRead,
    truncated: hasMore,
  };
};
