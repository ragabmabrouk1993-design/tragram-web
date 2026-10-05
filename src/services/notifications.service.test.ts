jest.mock("@/lib/api-client-setup", () => ({
  initApiClient: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  getApiNotificationsGroups: jest.fn(),
  getApiNotificationsGroupsByGroupIdEvents: jest.fn(),
  getApiNotificationsGroupsUnreadCount: jest.fn(),
  getApiNotificationsSettings: jest.fn(),
  patchApiNotificationsSettings: jest.fn(),
  putApiNotificationsGroupsByGroupIdRead: jest.fn(),
  putApiNotificationsGroupsReadAll: jest.fn(),
}));

import { mapCanonicalNotification, mapNotification, notificationsService } from "./notifications.service";

type MapNotificationInput = Parameters<typeof mapNotification>[0];

describe("notifications.service mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("preserves backend message for TRADE_EXECUTED when provided", () => {
    const mapped = mapNotification({
      id: "n-1",
      type: "TRADE_EXECUTED",
      title: "Order placed",
      message: "Backend generated message",
      sentAt: "2026-02-24T10:00:00.000Z",
      data: {
        channelName: "Gold Pro",
        referenceLabel: "Gold Pro • Buy XAUUSD",
        eventLabel: "Order placed",
        symbol: "XAUUSD",
        side: "BUY",
        volume: 0.5,
        entryPrice: 2320,
      },
    } satisfies MapNotificationInput);

    expect(mapped.message).toBe("Backend generated message");
    expect(mapped.title).toBe("Order placed");
    expect(mapped.referenceLabel).toBe("Gold Pro • Buy XAUUSD");
    expect(mapped.eventLabel).toBe("Order placed");
  });

  test("falls back to generated TRADE_EXECUTED message when backend message is missing", () => {
    const mapped = mapNotification({
      id: "n-2",
      type: "TRADE_EXECUTED",
      sentAt: "2026-02-24T10:00:00.000Z",
      data: {
        orderId: "123",
        symbol: "EURUSD",
        side: "SELL",
        volume: 0.25,
        entryPrice: 1.08234,
      },
    } satisfies MapNotificationInput);

    expect(mapped.message).toContain("was placed");
    expect(mapped.title).toBe("Order placed");
  });

  test("extracts optional why and possibleIssue details", () => {
    const mapped = mapNotification({
      id: "n-3",
      type: "ERROR_ALERT",
      title: "Order issue",
      message: "We couldn't place the latest Buy EURUSD order.",
      sentAt: "2026-02-24T10:00:00.000Z",
      data: {
        why: "The order could not be completed this time.",
        possibleIssue: "Please check your account settings and available balance, then try again.",
      },
    } satisfies MapNotificationInput);

    expect(mapped.why).toContain("could not be completed");
    expect(mapped.possibleIssue).toContain("available balance");
  });

  test("uses restored top-level signal aliases when mapping a canonical group preview", () => {
    const mapped = mapCanonicalNotification({
      id: "notification-1",
      groupId: "ng1.signal-1",
      type: "SIGNAL_RECEIVED",
      title: "Signal received",
      message: "The latest signal was received.",
      sentAt: "2026-09-01T13:08:35.000Z",
      read: false,
      signalId: "signal-1",
      channelName: "Gold VIP",
      signalText: "GOLD BUY NOW 4382",
      symbol: "XAUUSD",
      avatarUrl: "https://cdn.example.com/gold-vip.jpg",
      data: {},
    });

    expect(mapped).toMatchObject({
      source: "Gold VIP",
      avatarUrl: "https://cdn.example.com/gold-vip.jpg",
      referenceLabel: "GOLD BUY NOW 4382",
    });
  });

  test("drops source-only reference labels so the channel is shown once in the card", () => {
    const mapped = mapNotification({
      id: "n-3b",
      type: "ERROR_ALERT",
      title: "Signal issue",
      message: "We couldn't process the latest signal.",
      sentAt: "2026-02-24T10:00:00.000Z",
      data: {
        channelName: "Tragram Test Signals",
        referenceLabel: "Tragram Test Signals",
        eventLabel: "Signal issue",
      },
    } satisfies MapNotificationInput);

    expect(mapped.source).toBe("Tragram Test Signals");
    expect(mapped.referenceLabel).toBeUndefined();
    expect(mapped.message).toBe("We couldn't process the latest signal.");
  });

  test("drops technical legacy fields and internal source terms from mapped notification", () => {
    const mapped = mapNotification({
      id: "n-4",
      type: "ERROR_ALERT",
      title: "Execution Issue",
      message: "We detected an issue while processing one of your trading actions.",
      sentAt: "2026-02-24T10:00:00.000Z",
      data: {
        source: "trade-executor",
        reasonCode: "EXECUTION_ERROR",
        technicalMessage: "internal stack",
        why: "Parser service failed",
      },
    } satisfies MapNotificationInput);

    expect(mapped.source).toBe("ERROR ALERT");
    expect(mapped.why).toBe("");
  });

  test("maps TELEGRAM_DISCONNECTED notification with friendly source details", () => {
    const mapped = mapNotification({
      id: "n-5",
      type: "TELEGRAM_DISCONNECTED",
      title: "Telegram needs attention",
      message: "Your Telegram connection was interrupted. Reconnect it to keep receiving channel updates.",
      sentAt: "2026-02-25T10:00:00.000Z",
      data: {
        source: "Telegram",
        why: "Your Telegram session is no longer valid and must be connected again.",
        referenceLabel: "Telegram connection",
        eventLabel: "Reconnect needed",
      },
    } satisfies MapNotificationInput);

    expect(mapped.title).toBe("Reconnect needed");
    expect(mapped.source).toBe("Telegram");
    expect(mapped.referenceLabel).toBe("Telegram connection");
    expect(mapped.why).toContain("no longer valid");
  });

  test("does not render the legacy generic order issue title", () => {
    const mapped = mapNotification({
      id: "n-6",
      type: "UNKNOWN_EVENT",
      title: "Order Issue",
      message: "The latest update needs attention.",
      sentAt: "2026-02-25T10:00:00.000Z",
    } satisfies MapNotificationInput);

    expect(mapped.title).toBe("Trading update");
    expect(mapped.eventLabel).toBe("Trading update");
  });

  test("uses the neutral fallback for an unknown notification without a title", () => {
    const mapped = mapNotification({
      id: "n-7",
      type: "UNKNOWN_EVENT",
      message: "The latest update needs attention.",
      sentAt: "2026-02-25T10:00:00.000Z",
    } satisfies MapNotificationInput);

    expect(mapped.title).toBe("Trading update");
    expect(mapped.eventLabel).toBe("Trading update");
  });

  test("getNotificationThreads uses grouped notifications endpoint and maps groupId into threadId", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsGroups: jest.Mock;
    };

    apiClient.getApiNotificationsGroups.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              groupId: "signal:signal-1",
              signalId: "signal-1",
              channelId: "3297819833",
              channelName: "Gold VIP",
              symbol: "XAUUSD",
              title: "Order placed",
              message:
                "Signal 'XAUUSD buy now 2320' was executed: your Buy XAUUSD order was placed at 2320 for 0.5 lot(s).",
              sentAt: "2026-04-10T12:00:00.000Z",
              read: false,
              notifications: [
                {
                  id: "notification-2",
                  signalId: "signal-1",
                  channelId: "3297819833",
                  channelName: "Gold VIP",
                  signalText: "XAUUSD buy now 2320",
                  symbol: "XAUUSD",
	                  title: "Order placed",
	                  message:
	                    "Signal 'XAUUSD buy now 2320' was executed: your Buy XAUUSD order was placed at 2320 for 0.5 lot(s).",
                  sentAt: "2026-04-10T12:00:00.000Z",
                  read: false,
                },
              ],
            },
          ],
          pagination: {
            mode: "cursor",
            limit: 20,
            offset: null,
            page: null,
            total: null,
            totalPages: null,
            hasMore: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      },
    });

    const page = await notificationsService.getNotificationThreads();

    expect(apiClient.getApiNotificationsGroups).toHaveBeenCalledWith({
      query: {
        limit: 20,
        scope: "selected",
      },
      throwOnError: true,
    });
    expect(page).toEqual({
      items: [
          expect.objectContaining({
            threadId: "signal:signal-1",
            signalId: "signal-1",
            unreadCount: 1,
	            sourceLabel: "Gold VIP",
	            previewText:
	              "Signal 'XAUUSD buy now 2320' was executed: your Buy XAUUSD order was placed at 2320 for 0.5 lot(s).",
	            latestNotification: expect.objectContaining({
	              title: "Order placed",
	              message:
	                "Signal 'XAUUSD buy now 2320' was executed: your Buy XAUUSD order was placed at 2320 for 0.5 lot(s).",
              source: "Gold VIP",
            }),
            notifications: [expect.objectContaining({ id: "notification-2" })],
          }),
      ],
      limit: 20,
      hasMore: false,
      nextCursor: null,
    });
    expect(page.items[0]?.notifications[0]?.referenceLabel).toBeUndefined();
  });

  test("getNotificationThreads prefers group channel photo over stale notification avatar URLs", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsGroups: jest.Mock;
    };

    apiClient.getApiNotificationsGroups.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              groupId: "signal:signal-1",
              groupKind: "SIGNAL",
              signalId: "signal-1",
              channel: {
                id: "channel-1",
                channelId: "3297819833",
                title: "Gold VIP",
                username: "goldvip",
                photoUrl:
                  "https://tragram-channel-photos-staging-265742305340.s3.eu-central-1.amazonaws.com/channel-photos/3297819833.jpg",
              },
              updatedAt: "2026-04-10T12:00:00.000Z",
              unreadCount: 2,
              hasUnread: true,
              channelId: "3297819833",
              channelName: "Gold VIP",
              signalText: "XAUUSD buy now 2320",
              symbol: "XAUUSD",
              title: "Order placed",
              message: "Signal 'XAUUSD buy now 2320' was executed.",
              sentAt: "2026-04-10T12:00:00.000Z",
              read: false,
              notifications: [
                {
                  id: "notification-1",
                  signalId: "signal-1",
                  channelId: "3297819833",
                  channelName: "Gold VIP",
                  symbol: "XAUUSD",
                  title: "Signal received",
                  message: "Signal 'XAUUSD buy now 2320' was received.",
                  sentAt: "2026-04-10T11:59:00.000Z",
                  read: false,
                },
              ],
            },
          ],
          pagination: {
            mode: "cursor",
            limit: 20,
            hasMore: false,
            nextCursor: null,
          },
        },
      },
    });

    const page = await notificationsService.getNotificationThreads();

    expect(page.items[0]?.latestNotification.avatarUrl).toBe(
      "https://tragram-channel-photos-staging-265742305340.s3.eu-central-1.amazonaws.com/channel-photos/3297819833.jpg"
    );
    expect(page.items[0]?.notifications[0]?.avatarUrl).toBe(
      "https://tragram-channel-photos-staging-265742305340.s3.eu-central-1.amazonaws.com/channel-photos/3297819833.jpg"
    );
    expect(page.items[0]?.notifications[0]?.referenceLabel).toBeUndefined();
  });

  test("maps canonical group summaries without rewriting server display copy", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsGroups: jest.Mock;
    };

    apiClient.getApiNotificationsGroups.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              groupId: "ng1.bXQtYWNjb3VudDptdC0xOnNpZ25hbDpzaWduYWwtMQ",
              groupKey: "mt-account:mt-1:signal:signal-1",
              groupKind: "SIGNAL",
              scopeKind: "MT_ACCOUNT",
              scopeKey: "mt-account:mt-1",
              mtAccountId: "mt-1",
              signalId: "signal-1",
              updatedAt: "2026-04-10T12:00:00.000Z",
              unreadCount: 2,
              hasUnread: true,
              latest: {
                id: "notification-2",
                type: "SIGNAL_REJECTED",
                title: "Signal rejected",
                message: "This signal was rejected because the channel is not enabled for trading.",
                sentAt: "2026-04-10T12:00:00.000Z",
                read: false,
                data: { channelName: "Gold VIP", symbol: "XAUUSD", side: "SELL" },
              },
            },
          ],
          pagination: { limit: 20, hasMore: false, nextCursor: null },
        },
      },
    });

    const page = await notificationsService.getNotificationThreads();
    expect(page.items[0]).toEqual(
      expect.objectContaining({
        threadId: "ng1.bXQtYWNjb3VudDptdC0xOnNpZ25hbDpzaWduYWwtMQ",
        mtAccountId: "mt-1",
        unreadCount: 2,
        notifications: [],
        latestNotification: expect.objectContaining({
          title: "Signal rejected",
          eventLabel: "Signal rejected",
          message: "This signal was rejected because the channel is not enabled for trading.",
          source: "Gold VIP",
        }),
      }),
    );
  });

  test("loads canonical event pages by opaque group id and preserves event copy", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsGroupsByGroupIdEvents: jest.Mock;
    };
    apiClient.getApiNotificationsGroupsByGroupIdEvents.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              id: "notification-2",
              groupId: "ng1.bXQtYWNjb3VudDptdC0xOnNpZ25hbDpzaWduYWwtMQ",
              groupKey: "mt-account:mt-1:signal:signal-1",
              scopeKind: "MT_ACCOUNT",
              scopeKey: "mt-account:mt-1",
              mtAccountId: "mt-1",
              type: "ORDER_OPENED",
              title: "Order opened",
              message: "Your order is open.",
              sentAt: "2026-04-10T12:00:00.000Z",
              read: false,
              data: { channelName: "Gold VIP" },
            },
          ],
          pagination: { limit: 20, hasMore: true, nextCursor: "event-cursor" },
        },
      },
    });

    const page = await notificationsService.getNotificationThreadEvents({ threadId: "ng1.bXQtYWNjb3VudDptdC0xOnNpZ25hbDpzaWduYWwtMQ" });
    expect(apiClient.getApiNotificationsGroupsByGroupIdEvents).toHaveBeenCalledWith({
      path: { groupId: "ng1.bXQtYWNjb3VudDptdC0xOnNpZ25hbDpzaWduYWwtMQ" },
      query: { limit: 20, scope: "selected" },
      throwOnError: true,
    });
    expect(page.items[0]).toEqual(expect.objectContaining({ title: "Order opened", message: "Your order is open." }));
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("event-cursor");
  });

  test("canonical mapper uses a safe fallback instead of internal copy", () => {
    const mapped = mapCanonicalNotification({
      id: "n-unknown",
      type: "UNKNOWN",
      title: "broker service failure",
      message: "parser service failed",
      sentAt: "2026-04-10T12:00:00.000Z",
      mtAccountId: null,
      data: {},
    });
    expect(mapped.title).toBe("Trading update");
    expect(mapped.message).toBe("An update is available.");
  });

  test("getAccountNotificationSettings uses generated settings endpoint", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsSettings: jest.Mock;
    };

    apiClient.getApiNotificationsSettings.mockResolvedValue({
      data: {
        data: {
          mtAccountId: "mt-1",
          settings: {
            orderExecuted: true,
            orderClosed: false,
            breakeven: true,
            tpHit: true,
            stopLossHit: true,
            signalRejection: true,
            duplicated: false,
            outOfMarketPrice: true,
            outOfTolerance: true,
            excludedSymbol: false,
            insufficientBalance: true,
            allowTradesWithoutSlTp: false,
            allowForwardedSignals: true,
            useBrokerMinimumLot: true,
            limitOrderPlaced: true,
            limitOrderExecuted: true,
            limitOrderExpiration: false,
          },
        },
      },
    });

    const result = await notificationsService.getAccountNotificationSettings("mt-1");

    expect(apiClient.getApiNotificationsSettings).toHaveBeenCalledWith({
      query: { mtAccountId: "mt-1" },
      throwOnError: true,
    });
    expect(result.mtAccountId).toBe("mt-1");
    expect(result.settings.orderClosed).toBe(false);
    expect(result.settings.allowTradesWithoutSlTp).toBe(false);
  });

  test("updateAccountNotificationSettings uses generated settings mutation", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      patchApiNotificationsSettings: jest.Mock;
    };

    apiClient.patchApiNotificationsSettings.mockResolvedValue({
      data: {
        data: {
          mtAccountId: "mt-1",
          settings: {
            orderExecuted: true,
            orderClosed: true,
            breakeven: true,
            tpHit: true,
            stopLossHit: true,
            signalRejection: true,
            duplicated: true,
            outOfMarketPrice: true,
            outOfTolerance: true,
            excludedSymbol: true,
            insufficientBalance: true,
            allowTradesWithoutSlTp: true,
            allowForwardedSignals: true,
            useBrokerMinimumLot: true,
            limitOrderPlaced: true,
            limitOrderExecuted: true,
            limitOrderExpiration: true,
          },
        },
      },
    });

    const result = await notificationsService.updateAccountNotificationSettings({
      mtAccountId: "mt-1",
      updates: {
        orderClosed: true,
        limitOrderExpiration: true,
      },
    });

    expect(apiClient.patchApiNotificationsSettings).toHaveBeenCalledWith({
      body: {
        mtAccountId: "mt-1",
        orderClosed: true,
        limitOrderExpiration: true,
      },
      throwOnError: true,
    });
    expect(result.mtAccountId).toBe("mt-1");
    expect(result.settings.limitOrderExpiration).toBe(true);
  });

  test("loads global settings without requiring an account compatibility field", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsSettings: jest.Mock;
    };
    apiClient.getApiNotificationsSettings.mockResolvedValue({
      data: { data: { settings: { tpHit: false } } },
    });

    const result = await notificationsService.getAccountNotificationSettings();

    expect(apiClient.getApiNotificationsSettings).toHaveBeenCalledWith({
      query: undefined,
      throwOnError: true,
    });
    expect(result).not.toHaveProperty("mtAccountId");
    expect(result.settings.tpHit).toBe(false);
  });

  test("sends only the supplied global category changes without an account id", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      patchApiNotificationsSettings: jest.Mock;
    };
    apiClient.patchApiNotificationsSettings.mockResolvedValue({
      data: { data: { settings: { orderClosed: false } } },
    });

    const result = await notificationsService.updateAccountNotificationSettings({
      updates: { orderClosed: false },
    });

    expect(apiClient.patchApiNotificationsSettings).toHaveBeenCalledWith({
      body: { orderClosed: false },
      throwOnError: true,
    });
    expect(result).not.toHaveProperty("mtAccountId");
    expect(result.settings.orderClosed).toBe(false);
  });

  test("getUnreadCount uses grouped notifications unread-count endpoint", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      getApiNotificationsGroupsUnreadCount: jest.Mock;
    };

    apiClient.getApiNotificationsGroupsUnreadCount.mockResolvedValue({
      data: {
        data: {
          count: 7,
        },
      },
    });

    const count = await notificationsService.getUnreadCount("all");

    expect(apiClient.getApiNotificationsGroupsUnreadCount).toHaveBeenCalledWith({
      query: { scope: "all" },
      throwOnError: true,
    });
    expect(count).toBe(7);
  });

  test("markAllAsRead uses grouped notifications read-all endpoint", async () => {
    const apiClient = jest.requireMock("@/lib/api-client") as {
      putApiNotificationsGroupsReadAll: jest.Mock;
    };

    apiClient.putApiNotificationsGroupsReadAll.mockResolvedValue({
      data: {
        success: true,
      },
    });

    await notificationsService.markAllAsRead("selected");

    expect(apiClient.putApiNotificationsGroupsReadAll).toHaveBeenCalledWith({
      query: { scope: "selected" },
      throwOnError: true,
    });
  });
});
