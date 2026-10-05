import {
  loadTelegramCatalogPages,
  type TelegramCatalogPageLoader,
} from './telegram-catalog-pagination';

describe('loadTelegramCatalogPages', () => {
  test('follows cursor pages and reports the merged saved projection', async () => {
    const loadPage: jest.MockedFunction<TelegramCatalogPageLoader> = jest
      .fn()
      .mockResolvedValueOnce({
        channels: [
          { id: 'channel-1', peerId: 'peer-1', registrationState: { isRegistered: false } },
        ],
        status: {} as never,
        refresh: null,
        pagination: {
          mode: 'cursor',
          limit: 100,
          hasMore: true,
          nextCursor: 'cursor-1',
          previousCursor: null,
        },
      })
      .mockResolvedValueOnce({
        channels: [
          {
            id: 'channel-1',
            peerId: 'peer-1',
            title: 'Updated title',
            registrationState: { isRegistered: false },
          },
          { id: 'channel-2', peerId: 'peer-2', registrationState: { isRegistered: false } },
        ],
        status: {} as never,
        refresh: null,
        pagination: {
          mode: 'cursor',
          limit: 100,
          hasMore: false,
          nextCursor: null,
          previousCursor: 'cursor-1',
        },
      });

    const progress: Array<{ pagesRead: number; channelCount: number }> = [];
    const result = await loadTelegramCatalogPages(loadPage, {
      onPage: ({ pagesRead, channels }) => {
        progress.push({ pagesRead, channelCount: channels.length });
      },
    });

    expect(loadPage).toHaveBeenNthCalledWith(1, { limit: 100, cursor: null });
    expect(loadPage).toHaveBeenNthCalledWith(2, { limit: 100, cursor: 'cursor-1' });
    expect(result.channels).toEqual([
      {
        id: 'channel-1',
        peerId: 'peer-1',
        title: 'Updated title',
        registrationState: { isRegistered: false },
      },
      {
        id: 'channel-2',
        peerId: 'peer-2',
        registrationState: { isRegistered: false },
      },
    ]);
    expect(result.pagesRead).toBe(2);
    expect(result.truncated).toBe(false);
    expect(progress).toEqual([
      { pagesRead: 1, channelCount: 1 },
      { pagesRead: 2, channelCount: 2 },
    ]);
  });

  test('stops safely when the API returns a non-advancing cursor', async () => {
    const loadPage: jest.MockedFunction<TelegramCatalogPageLoader> = jest.fn().mockResolvedValue({
      channels: [{ id: 'channel-1', registrationState: { isRegistered: false } }],
      status: {} as never,
      refresh: null,
      pagination: {
        mode: 'cursor',
        limit: 100,
        hasMore: true,
        nextCursor: null,
        previousCursor: null,
      },
    });

    const result = await loadTelegramCatalogPages(loadPage);

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(result.truncated).toBe(false);
    expect(result.pagesRead).toBe(1);
  });

  test('marks a catalog as truncated when the configured page safety cap is reached', async () => {
    const loadPage: jest.MockedFunction<TelegramCatalogPageLoader> = jest.fn(
      async ({ cursor }) => ({
        channels: [{ id: cursor ?? 'channel-1', registrationState: { isRegistered: false } }],
        status: {} as never,
        refresh: null,
        pagination: {
          mode: 'cursor' as const,
          limit: 100,
          hasMore: true,
          nextCursor: `${cursor ?? 'cursor-0'}-next`,
          previousCursor: null,
        },
      })
    );

    const result = await loadTelegramCatalogPages(loadPage, { maxPages: 2 });

    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(result.pagesRead).toBe(2);
    expect(result.truncated).toBe(true);
  });

  test('restarts once from the first page when a catalog cursor is invalidated', async () => {
    const loadPage: jest.MockedFunction<TelegramCatalogPageLoader> = jest
      .fn()
      .mockResolvedValueOnce({
        channels: [{ id: 'channel-1', registrationState: { isRegistered: false } }],
        status: {} as never,
        refresh: null,
        pagination: {
          mode: 'cursor',
          limit: 100,
          hasMore: true,
          nextCursor: 'stale-cursor',
          previousCursor: null,
        },
      })
      .mockRejectedValueOnce(new Error('TELEGRAM_CATALOG_CHANGED'))
      .mockResolvedValueOnce({
        channels: [
          { id: 'channel-1', registrationState: { isRegistered: false } },
          { id: 'channel-2', registrationState: { isRegistered: false } },
        ],
        status: {} as never,
        refresh: null,
        pagination: {
          mode: 'cursor',
          limit: 100,
          hasMore: false,
          nextCursor: null,
          previousCursor: null,
        },
      });

    const result = await loadTelegramCatalogPages(loadPage, { restartOnCursorError: true });

    expect(loadPage).toHaveBeenNthCalledWith(3, { limit: 100, cursor: null });
    expect(result.channels).toHaveLength(2);
    expect(result.truncated).toBe(false);
  });
});
