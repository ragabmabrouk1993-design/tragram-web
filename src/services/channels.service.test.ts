const deleteApiTelegramChannelsSubscriptionsBySubscriptionIdMock = jest.fn();
const getApiTelegramChannelsCatalogMock = jest.fn();
const getApiTelegramChannelsSubscriptionsBySubscriptionIdChartMock = jest.fn();
const getApiTelegramChannelsSubscriptionsBySubscriptionIdOrdersMock = jest.fn();
const patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock = jest.fn();
const postApiTelegramChannelsRefreshMock = jest.fn();
const getApiTelegramChannelsRequestsByRequestIdMock = jest.fn();
const getApiTelegramChannelsSubscriptionsBySubscriptionIdHealthMock = jest.fn();
const postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccessMock = jest.fn();
const postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistoryMock = jest.fn();
const postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigrationMock = jest.fn();

jest.mock("@/lib/api-client", () => ({
  deleteApiTelegramChannelsSubscriptionsBySubscriptionId:
    deleteApiTelegramChannelsSubscriptionsBySubscriptionIdMock,
  getApiTelegramChannelsCatalog: getApiTelegramChannelsCatalogMock,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdChart:
    getApiTelegramChannelsSubscriptionsBySubscriptionIdChartMock,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdOrders:
    getApiTelegramChannelsSubscriptionsBySubscriptionIdOrdersMock,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMeta: jest.fn(),
  getApiTelegramChannelsSubscriptionsBySubscriptionIdSummary: jest.fn(),
  getApiTelegramChannelsSymbols: jest.fn(),
  patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettings:
    patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock,
  patchApiTelegramChannelsSubscriptionsBySubscriptionIdToggle: jest.fn(),
  postApiTelegramAuthDisconnect: jest.fn(),
  postApiTelegramAuthRequestCode: jest.fn(),
  postApiTelegramAuthVerifyCode: jest.fn(),
  postApiTelegramAuthVerifyPassword: jest.fn(),
  postApiTelegramChannelsRegister: jest.fn(),
  postApiTelegramChannelsRefresh: postApiTelegramChannelsRefreshMock,
  getApiTelegramChannelsRequestsByRequestId: getApiTelegramChannelsRequestsByRequestIdMock,
  getApiTelegramChannelsSubscriptionsBySubscriptionIdHealth:
    getApiTelegramChannelsSubscriptionsBySubscriptionIdHealthMock,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccess:
    postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccessMock,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistory:
    postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistoryMock,
  postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigration:
    postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigrationMock,
}));

jest.mock("@/lib/api-client-setup", () => ({
  initApiClient: jest.fn(),
}));

import {
  channelsService,
  mergeChannelOrdersMarketHours,
  normalizeChannelOrdersPayload,
} from "./channels.service";

describe("channelsService.getChannelCatalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the available catalog for the selected MT account", async () => {
    getApiTelegramChannelsCatalogMock.mockResolvedValue({
      data: {
        channels: [
          {
            id: "telegram-1",
            title: "Gold Calls",
            registrationState: {
              isRegistered: false,
              subscriptionId: null,
              mtAccountId: "mt-1",
              enabled: null,
              subscribedAt: null,
            },
          },
        ],
      },
    });

    const result = await channelsService.getChannelCatalog("mt-1", "available");

    expect(getApiTelegramChannelsCatalogMock).toHaveBeenCalledWith({
      query: {
        mtAccountId: "mt-1",
        state: "available",
        format: "2",
      },
      throwOnError: true,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "telegram-1",
      }),
    ]);
  });

  it("derives registered subscriptions from the catalog endpoint", async () => {
    getApiTelegramChannelsCatalogMock.mockResolvedValue({
      data: {
        channels: [
          {
            id: "telegram-1",
            title: "Gold Calls",
            username: "goldcalls",
            photoUrl: "https://cdn.example/channel.jpg",
            participantsCount: 1000,
            registrationState: {
              isRegistered: true,
              subscriptionId: "sub-1",
              mtAccountId: "mt-1",
              enabled: true,
              subscribedAt: "2026-04-28T00:00:00.000Z",
            },
          },
        ],
      },
    });

    const result = await channelsService.getRegisteredChannels("mt-1");

    expect(getApiTelegramChannelsCatalogMock).toHaveBeenCalledWith({
      query: {
        mtAccountId: "mt-1",
        state: "registered",
        format: "2",
      },
      throwOnError: true,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "sub-1",
        channelId: "telegram-1",
        channelTitle: "Gold Calls",
        enabled: true,
      }),
    ]);
  });

  it("preserves performance from registered catalog rows", async () => {
    getApiTelegramChannelsCatalogMock.mockResolvedValue({
      data: {
        channels: [
          {
            id: "telegram-1",
            title: "Gold Calls",
            registrationState: {
              isRegistered: true,
              subscriptionId: "sub-1",
              mtAccountId: "mt-1",
              enabled: true,
              subscribedAt: "2026-04-28T00:00:00.000Z",
            },
            performance: {
              value: -45,
              returnPercent: -4.5,
              trend: "down",
              currency: "USD",
            },
          },
        ],
      },
    });

    const result = await channelsService.getRegisteredChannels("mt-1");

    expect(result).toEqual([
      expect.objectContaining({
        id: "sub-1",
        performance: {
          value: -45,
          returnPercent: -4.5,
          trend: "down",
          currency: "USD",
        },
      }),
    ]);
  });

  it("builds available and registered channel lists from one catalog request", async () => {
    getApiTelegramChannelsCatalogMock.mockResolvedValue({
      data: {
        channels: [
          {
            id: "telegram-1",
            title: "Gold Calls",
            registrationState: {
              isRegistered: false,
              subscriptionId: null,
              mtAccountId: "mt-1",
              enabled: null,
              subscribedAt: null,
            },
          },
          {
            id: "telegram-2",
            title: "Oil Calls",
            registrationState: {
              isRegistered: true,
              subscriptionId: "sub-2",
              mtAccountId: "mt-1",
              enabled: true,
              subscribedAt: "2026-05-28T00:00:00.000Z",
            },
            performance: {
              value: 12,
              returnPercent: 1.2,
              trend: "up",
              currency: "USD",
            },
          },
        ],
      },
    });

    const result = await channelsService.getChannelLists("mt-1");

    expect(getApiTelegramChannelsCatalogMock).toHaveBeenCalledTimes(1);
    expect(getApiTelegramChannelsCatalogMock).toHaveBeenCalledWith({
      query: {
        mtAccountId: "mt-1",
        state: "all",
        format: "2",
      },
      throwOnError: true,
    });
    expect(result.available).toEqual([
      expect.objectContaining({
        id: "telegram-1",
      }),
    ]);
    expect(result.registered).toEqual([
      expect.objectContaining({
        id: "sub-2",
        channelId: "telegram-2",
        performance: {
          value: 12,
          returnPercent: 1.2,
          trend: "up",
          currency: "USD",
        },
      }),
    ]);
  });
});

describe("channelsService.deleteSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the typed delete payload", async () => {
    deleteApiTelegramChannelsSubscriptionsBySubscriptionIdMock.mockResolvedValue({
      data: {
        success: true,
        message: "Channel subscription deleted successfully",
        deletedSubscriptionId: "sub-1",
        telegramChannelId: "telegram-1",
        mtAccountId: "mt-1",
        channelTitle: "Gold Calls",
      },
    });

    const result = await channelsService.deleteSubscription("sub-1");

    expect(deleteApiTelegramChannelsSubscriptionsBySubscriptionIdMock).toHaveBeenCalledWith({
      throwOnError: true,
      path: { subscriptionId: "sub-1" },
    });
    expect(result).toEqual({
      success: true,
      message: "Channel subscription deleted successfully",
      deletedSubscriptionId: "sub-1",
      telegramChannelId: "telegram-1",
      mtAccountId: "mt-1",
      channelTitle: "Gold Calls",
    });
  });
});

describe("channelsService Telegram health actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads saved subscription health without a Telegram client", async () => {
    getApiTelegramChannelsSubscriptionsBySubscriptionIdHealthMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          subscriptionId: "sub-health",
          status: "STALE",
          reasonCode: "METADATA_REFRESH_DUE",
          reason: "Channel metadata is awaiting a fresh Telegram observation.",
          access: { state: "ACTIVE" },
          metadata: { state: "STALE" },
          ingestion: { connected: true, lastCommittedMessageId: "42" },
        },
      },
    });

    const result = await channelsService.getChannelSubscriptionHealth("sub-health");

    expect(getApiTelegramChannelsSubscriptionsBySubscriptionIdHealthMock).toHaveBeenCalledWith({
      path: { subscriptionId: "sub-health" },
      throwOnError: true,
    });
    expect(result.status).toBe("STALE");
    expect(result.ingestion.lastCommittedMessageId).toBe("42");
  });

  it("submits access and history repair actions with idempotency keys", async () => {
    postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccessMock.mockResolvedValue({ data: {} });
    postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistoryMock.mockResolvedValue({ data: {} });

    await channelsService.requestChannelAccessRefresh("sub-1", "access-key");
    await channelsService.requestChannelHistoryRefresh("sub-1", "42", "history-key");

    expect(postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshAccessMock).toHaveBeenCalledWith({
      path: { subscriptionId: "sub-1" },
      headers: { "Idempotency-Key": "access-key" },
      throwOnError: true,
    });
    expect(postApiTelegramChannelsSubscriptionsBySubscriptionIdRefreshHistoryMock).toHaveBeenCalledWith({
      path: { subscriptionId: "sub-1" },
      body: { fromMessageId: "42" },
      headers: { "Idempotency-Key": "history-key" },
      throwOnError: true,
    });
  });

  it("accepts a verified migration through the durable API action", async () => {
    postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigrationMock.mockResolvedValue({
      data: { success: true, data: { requestId: "request-migration" } },
    });

    await channelsService.acceptChannelMigration("sub-old", "peer-new", "migration-key");

    expect(postApiTelegramChannelsSubscriptionsBySubscriptionIdAcceptMigrationMock).toHaveBeenCalledWith({
      path: { subscriptionId: "sub-old" },
      body: { targetPeerId: "peer-new" },
      headers: { "Idempotency-Key": "migration-key" },
      throwOnError: true,
    });
  });
});

describe("channelsService.updateSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends allowForwardedSignals in the PATCH payload", async () => {
    patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock.mockResolvedValue({
      data: { success: true },
    });

    await channelsService.updateSettings("sub-1", {
      allowForwardedSignals: true,
    });

    expect(patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock).toHaveBeenCalledWith({
      throwOnError: true,
      path: { subscriptionId: "sub-1" },
      body: {
        allowForwardedSignals: true,
      },
    });
  });

  it("sends duplicateSignalTimeoutMinutes in the PATCH payload", async () => {
    patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock.mockResolvedValue({
      data: { success: true },
    });

    await channelsService.updateSettings("sub-1", {
      duplicateSignalTimeoutMinutes: 12,
    });

    expect(patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock).toHaveBeenCalledWith({
      throwOnError: true,
      path: { subscriptionId: "sub-1" },
      body: {
        duplicateSignalTimeoutMinutes: 12,
      },
    });
  });

  it("sends simplified pending-order settings in the PATCH payload", async () => {
    patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock.mockResolvedValue({
      data: { success: true },
    });

    await channelsService.updateSettings("sub-1", {
      signalPendingOrderHandlingEnabled: true,
      limitOrderExpirationMinutes: 60,
      marketEntryToleranceMode: "PIPS",
      marketEntryTolerancePips: 30,
    });

    expect(patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock).toHaveBeenCalledWith({
      throwOnError: true,
      path: { subscriptionId: "sub-1" },
      body: {
        signalPendingOrderHandlingEnabled: true,
        limitOrderExpirationMinutes: 60,
        marketEntryToleranceMode: "PIPS",
        marketEntryTolerancePips: 30,
      },
    });
  });

  it("sends missing SL pips config in the PATCH payload", async () => {
    patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock.mockResolvedValue({
      data: { success: true },
    });

    await channelsService.updateSettings("sub-1", {
      allowExecutionWithoutSlTp: true,
      missingSlConfig: {
        pips: 250,
        overrides: {
          XAUUSD: { pips: 120 },
        },
      },
    });

    expect(patchApiTelegramChannelsSubscriptionsBySubscriptionIdSettingsMock).toHaveBeenCalledWith({
      throwOnError: true,
      path: { subscriptionId: "sub-1" },
      body: {
        allowExecutionWithoutSlTp: true,
        missingSlConfig: {
          pips: 250,
          overrides: {
            XAUUSD: { pips: 120 },
          },
        },
      },
    });
  });
});

describe("channelsService.getChannelOrders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes canonical closed websocket/REST payloads into the rendered orders shape", async () => {
    getApiTelegramChannelsSubscriptionsBySubscriptionIdOrdersMock.mockResolvedValue({
      data: {
        success: true,
        status: "closed",
        counts: { open: 0, pending: 0, closed: 1 },
        data: {
          items: [{ id: "closed-trade-1", status: "closed", symbol: "XAUUSD" }],
          pagination: {
            mode: "offset",
            limit: 10,
            offset: 0,
            page: 1,
            total: 1,
            totalPages: 1,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
    });

    const result = await channelsService.getChannelOrders("sub-1", "closed", 1, 10);

    expect(result.status).toBe("closed");
    expect(result.counts.closed).toBe(1);
    expect(result.orders).toEqual([
      expect.objectContaining({ id: "closed-trade-1", status: "closed" }),
    ]);
    expect(result.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasMore: false,
      })
    );
  });

  it("preserves TP partial-close row identifiers from canonical closed payloads", async () => {
    getApiTelegramChannelsSubscriptionsBySubscriptionIdOrdersMock.mockResolvedValue({
      data: {
        success: true,
        status: "closed",
        counts: { open: 0, pending: 0, closed: 1 },
        data: {
          items: [
            {
              id: "tp-partial-close:exec-1",
              recordType: "TP_PARTIAL_CLOSE",
              parentTradeId: "trade-1",
              tpExecutionId: "exec-1",
              tpSliceId: "slice-1",
              status: "closed",
              closeReason: "TP",
              closeTpLevel: 1,
              profit: null,
              netProfit: null,
            },
          ],
          pagination: {
            mode: "offset",
            limit: 10,
            offset: 0,
            page: 1,
            total: 1,
            totalPages: 1,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
    });

    const result = await channelsService.getChannelOrders("sub-1", "closed", 1, 10);

    expect(result.orders).toEqual([
      expect.objectContaining({
        id: "tp-partial-close:exec-1",
        recordType: "TP_PARTIAL_CLOSE",
        parentTradeId: "trade-1",
        tpExecutionId: "exec-1",
        tpSliceId: "slice-1",
        closeReason: "TP",
        closeTpLevel: 1,
        profit: null,
        netProfit: null,
      }),
    ]);
  });

  it("normalizes raw channel:orders websocket payloads into the rendered orders shape", () => {
    const result = normalizeChannelOrdersPayload(
      {
        success: true,
        status: "closed",
        counts: { open: 0, pending: 0, closed: 1 },
        data: {
          items: [{ id: "closed-trade-ws-1", status: "closed", symbol: "EURUSD" }],
          pagination: {
            mode: "offset",
            limit: 10,
            offset: 0,
            page: 1,
            total: 1,
            totalPages: 1,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
      { status: "closed", page: 1, limit: 10 }
    );

    expect(result.status).toBe("closed");
    expect(result.orders).toEqual([
      expect.objectContaining({ id: "closed-trade-ws-1", status: "closed" }),
    ]);
  });

  it("preserves known market hours when a channel websocket snapshot omits them", () => {
    const current = normalizeChannelOrdersPayload(
      {
        success: true,
        status: "open",
        counts: { open: 1, pending: 0, closed: 0 },
        data: {
          items: [
            {
              id: "open-trade-1",
              orderId: "1001",
              status: "open",
              symbol: "XAUUSD",
              marketHours: {
                isTradeSessionOpen: false,
                reasonCode: "TRADE_SESSION_CLOSED",
                reasonMessage: "Market is closed for trading.",
                nextOpenAt: "2026-05-07T06:00:00.000Z",
                nextCloseAt: "2026-05-07T21:00:00.000Z",
                checkedAt: "2026-05-06T22:00:00.000Z",
                source: "MT5_SYMBOL_SESSIONS",
              },
            },
          ],
          pagination: {
            mode: "offset",
            limit: 10,
            offset: 0,
            page: 1,
            total: 1,
            totalPages: 1,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
      { status: "open", page: 1, limit: 10 }
    );
    const next = normalizeChannelOrdersPayload(
      {
        success: true,
        status: "open",
        counts: { open: 1, pending: 0, closed: 0 },
        data: {
          items: [{ id: "open-trade-1", orderId: "1001", status: "open", symbol: "XAUUSD" }],
          pagination: {
            mode: "offset",
            limit: 10,
            offset: 0,
            page: 1,
            total: 1,
            totalPages: 1,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
      { status: "open", page: 1, limit: 10 }
    );

    const merged = mergeChannelOrdersMarketHours(current, next);

    expect(merged.orders[0]).toMatchObject({
      id: "open-trade-1",
      marketHours: {
        reasonCode: "TRADE_SESSION_CLOSED",
      },
    });
  });
});

describe("channelsService.getChannelChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches channel chart data through the REST chart endpoint for range changes", async () => {
    getApiTelegramChannelsSubscriptionsBySubscriptionIdChartMock.mockResolvedValue({
      data: {
        success: true,
        range: "Month",
        points: [{ date: "2026-05-31", value: 25 }],
        totalProfit: 25,
        minValue: 25,
        maxValue: 25,
        previousPeriod: null,
      },
    });

    const result = await channelsService.getChannelChart("sub-1", "Month");

    expect(getApiTelegramChannelsSubscriptionsBySubscriptionIdChartMock).toHaveBeenCalledWith({
      path: { subscriptionId: "sub-1" },
      query: { range: "Month" },
      throwOnError: true,
    });
    expect(result.points).toEqual([{ date: "2026-05-31", value: 25 }]);
  });
});
