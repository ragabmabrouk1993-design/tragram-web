const getApiUsersActivityMock = jest.fn();
const getApiTradesMock = jest.fn();
const getApiTradesOrdersCountsMock = jest.fn();
const getApiUsersDashboardChecklistMock = jest.fn();
const getApiUsersDashboardSummaryMock = jest.fn();
const getApiUsersPreferencesMock = jest.fn();
const patchApiUsersPreferencesMock = jest.fn();
const patchApiUsersProfileMock = jest.fn();
const getApiUsersAccountDeletionStatusMock = jest.fn();
const postApiUsersAccountDeletionCancelMock = jest.fn();
const postApiUsersAccountDeletionConfirmMock = jest.fn();
const postApiUsersAccountDeletionRequestMock = jest.fn();
const clientGetMock = jest.fn();
const clientPostMock = jest.fn();

jest.mock("@/lib/api-client", () => ({
    getApiTrades: getApiTradesMock,
    getApiTradesOrdersCounts: getApiTradesOrdersCountsMock,
    getApiUsersActivity: getApiUsersActivityMock,
    getApiUsersDashboardChecklist: getApiUsersDashboardChecklistMock,
    getApiUsersDashboardSummary: getApiUsersDashboardSummaryMock,
    getApiUsersPreferences: getApiUsersPreferencesMock,
    patchApiUsersPreferences: patchApiUsersPreferencesMock,
    patchApiUsersProfile: patchApiUsersProfileMock,
    getApiUsersAccountDeletionStatus: getApiUsersAccountDeletionStatusMock,
    postApiUsersAccountDeletionCancel: postApiUsersAccountDeletionCancelMock,
    postApiUsersAccountDeletionConfirm: postApiUsersAccountDeletionConfirmMock,
    postApiUsersAccountDeletionRequest: postApiUsersAccountDeletionRequestMock,
}));

jest.mock("@/lib/api-client/client.gen", () => ({
    client: {
        get: clientGetMock,
        post: clientPostMock,
    },
}));

jest.mock("@/lib/api-client-setup", () => ({
    initApiClient: jest.fn(),
}));

import { userService } from "./user.service";

describe("userService account deletion APIs", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("requestAccountDeletion sends reason payload", async () => {
        postApiUsersAccountDeletionRequestMock.mockResolvedValue({
            data: { success: true, message: "ok", expiresIn: 300, requestId: "req-1", availableModes: ["IMMEDIATE", "SCHEDULED"] },
        });

        const payload = {
            reasonCode: "OTHER" as const,
            reasonDetails: "Test details",
        };

        const result = await userService.requestAccountDeletion(payload);

        expect(postApiUsersAccountDeletionRequestMock).toHaveBeenCalledWith(expect.objectContaining({
            body: payload,
            throwOnError: true,
        }));
        expect(result).toEqual({ success: true, message: "ok", expiresIn: 300, requestId: "req-1", availableModes: ["IMMEDIATE", "SCHEDULED"] });
    });

    test("confirmAccountDeletion sends secure verification payload", async () => {
        postApiUsersAccountDeletionConfirmMock.mockResolvedValue({
            data: { success: true, message: "deactivated", mode: "IMMEDIATE", status: "EXECUTED", requestId: "req-1" },
        });

        const payload = {
            requestId: "req-1",
            phoneNumber: "+201234567890",
            otpCode: "123456",
            password: "Secret123!",
            verificationSessionToken: "S".repeat(43),
            mode: "IMMEDIATE" as const,
        };

        const result = await userService.confirmAccountDeletion(payload);

        expect(postApiUsersAccountDeletionConfirmMock).toHaveBeenCalledWith(expect.objectContaining({
            body: payload,
            throwOnError: true,
        }));
        expect(result).toEqual({ success: true, message: "deactivated", mode: "IMMEDIATE", status: "EXECUTED", requestId: "req-1" });
    });

    test("getAccountDeletionStatus loads the current lifecycle state", async () => {
        getApiUsersAccountDeletionStatusMock.mockResolvedValue({
            data: {
                success: true,
                deletedAt: null,
                deletionScheduledFor: "2026-04-18T10:00:00.000Z",
                request: {
                    id: "req-1",
                    mode: "SCHEDULED",
                    status: "SCHEDULED",
                    reasonCode: "OTHER",
                },
            },
        });

        const result = await userService.getAccountDeletionStatus();

        expect(getApiUsersAccountDeletionStatusMock).toHaveBeenCalledWith(expect.objectContaining({
            throwOnError: true,
        }));
        expect(result.deletionScheduledFor).toBe("2026-04-18T10:00:00.000Z");
    });

    test("cancelAccountDeletion posts the request id", async () => {
        postApiUsersAccountDeletionCancelMock.mockResolvedValue({
            data: {
                success: true,
                message: "cancelled",
                status: "CANCELLED",
                requestId: "req-1",
            },
        });

        const result = await userService.cancelAccountDeletion("req-1");

        expect(postApiUsersAccountDeletionCancelMock).toHaveBeenCalledWith(expect.objectContaining({
            body: { requestId: "req-1" },
            throwOnError: true,
        }));
        expect(result.status).toBe("CANCELLED");
    });
});

describe("userService dashboard APIs", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("getUserTrades uses the canonical trades SDK method with query params", async () => {
        const payload = {
            success: true,
            metricsScope: "SELECTED_ACCOUNT",
            metricsAccountId: "mt-1",
            data: {
                items: [],
                pagination: {
                    mode: "offset",
                    limit: 20,
                    offset: 0,
                    page: 1,
                    total: 0,
                    totalPages: 0,
                    hasMore: false,
                    nextCursor: null,
                    previousCursor: null,
                },
            },
        };
        getApiTradesMock.mockResolvedValue({ data: payload });

        const result = await userService.getUserTrades({
            status: "open",
            page: 1,
            limit: 20,
            symbol: "XAUUSD",
        });

        expect(getApiTradesMock).toHaveBeenCalledWith({
            query: {
                status: "open",
                page: 1,
                limit: 20,
                symbol: "XAUUSD",
            },
            throwOnError: true,
        });
        expect(result).toBe(payload);
    });

    test("getUserStats uses the generated dashboard summary SDK method", async () => {
        const payload = {
            balance: 1000,
            pnl: 15,
        };
        getApiUsersDashboardSummaryMock.mockResolvedValue({ data: payload });

        const result = await userService.getUserStats();

        expect(getApiUsersDashboardSummaryMock).toHaveBeenCalledWith({
            throwOnError: true,
        });
        expect(clientGetMock).not.toHaveBeenCalled();
        expect(result).toBe(payload);
    });

    test("getDashboardOrdersPage uses the canonical trades SDK method with query params", async () => {
        const payload = {
            success: true,
            status: "closed",
            counts: { open: 1, pending: 2, closed: 3 },
            data: {
                items: [],
                pagination: {
                    mode: "offset",
                    limit: 10,
                    offset: 10,
                    page: 2,
                    total: 3,
                    totalPages: 1,
                    hasMore: false,
                    nextCursor: null,
                    previousCursor: null,
                },
            },
        };
        getApiTradesMock.mockResolvedValue({ data: payload });

        const result = await userService.getDashboardOrdersPage({
            status: "closed",
            page: 2,
            limit: 10,
        });

        expect(getApiTradesMock).toHaveBeenCalledWith({
            query: {
                status: "closed",
                page: 2,
                limit: 10,
            },
            throwOnError: true,
        });
        expect(clientGetMock).not.toHaveBeenCalled();
        expect(result).toBe(payload);
    });

    test("getDashboardOrdersCounts uses the generated trades counts SDK method", async () => {
        const payload = {
            success: true,
            counts: { open: 1, pending: 2, closed: 3 },
            metricsScope: "SELECTED_ACCOUNT",
            metricsAccountId: "mt-1",
        };
        getApiTradesOrdersCountsMock.mockResolvedValue({ data: payload });

        const result = await userService.getDashboardOrdersCounts({ symbol: "XAUUSD" });

        expect(getApiTradesOrdersCountsMock).toHaveBeenCalledWith({
            query: { symbol: "XAUUSD" },
            throwOnError: true,
        });
        expect(clientGetMock).not.toHaveBeenCalled();
        expect(result).toBe(payload);
    });
});
