import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("DashboardPageClient API contract", () => {
    const source = readFileSync(join(__dirname, "dashboard-page-client.tsx"), "utf8");
    const staleDashboardSymbolPrice = ["dashboard", "symbol-price"].join(":");
    const staleDashboardSymbolPriceV2 = `${staleDashboardSymbolPrice}-v2`;
    const staleDashboardSymbolPricesV3 = ["dashboard", "symbol-prices-v3"].join(":");
    const staleDashboardSubscribe = ["dashboard", "subscribe"].join(":");
    const staleDashboardOrderUpdate = ["dashboard", "order-update"].join(":");
    const staleDashboardOrderPatch = ["dashboard", "order-patch"].join(":");

    test("loads dashboard orders through userService instead of a raw generated-client instance URL", () => {
        expect(source).toContain("userService.getDashboardOrdersPage");
        expect(source).toContain("orders:lifecycle");
        expect(source).toContain("order:created");
        expect(source).toContain("socket.on('opg', handleCompactOrdersPage)");
        expect(source).not.toContain(`socket.on('${staleDashboardOrderUpdate}'`);
        expect(source).not.toContain(`socket.on('${staleDashboardOrderPatch}'`);
        expect(source).not.toContain(`case '${staleDashboardSymbolPrice}':`);
        expect(source).not.toContain(`socket.on('${staleDashboardSymbolPrice}'`);
        expect(source).not.toContain(`socket.on('${staleDashboardSymbolPriceV2}'`);
        expect(source).not.toContain(`case '${staleDashboardSymbolPriceV2}':`);
        expect(source).toContain("symbol:specs");
        expect(source).not.toContain("includeOrdersPage: true");
        expect(source).toContain("rt: 3");
        expect(source).not.toContain(`case '${staleDashboardSymbolPricesV3}':`);
        expect(source).not.toContain("case 'dashboard:price-context-v3':");
        expect(source).toContain("socket.on('spt', handleCompactSymbolPrice)");
        expect(source).toContain("socket.on('oc', handleCompactOrderCreated)");
        expect(source).not.toContain("socket.on('rt'");
        expect(source).not.toContain("socket.on('dps'");
        expect(source).not.toContain("socket.on('dpc'");
        expect(source).toContain("userService.getDashboardSymbolSpecs");
        expect(source).toContain("normalizeDashboardSummary(statsResult.value)");
        expect(source).toContain("setSummary({");
        expect(source).not.toContain("includeExternal: true");
        expect(source).not.toContain("openOrdersForEquity");
        expect(source).toContain("filter(hasStoredDashboardOrderId)");
        expect(source).toContain("const shouldDisplayOrder = hasStoredDashboardOrderId(nextOrder)");
        expect(source).toContain("'currentPrice'");
        expect(source).toContain("'brokerOpenPrice'");
        expect(source).toContain("'closePrice'");
        expect(source).toContain("'brokerPnl'");
        expect(source).toContain("'takeProfitTargets'");
        expect(source).toContain("'accountNumber'");
        expect(source).toContain("'channelPhotoUrl'");
        const removedPath = ["/api", "/users", "/dashboard", "/orders-summary"].join("");
        expect(source).not.toContain(`client.instance.get('${removedPath}'`);
        expect(source).not.toContain(`client.instance.get("${removedPath}"`);
    });

    test("renders broker equity with verified realized PnL and live broker floating PnL", () => {
        expect(source).toContain("const displayEquity = summary?.equity ?? null");
        expect(source).toContain("summary?.realizedPnl ?? summary?.pnl");
        expect(source).toContain("const displayBrokerFloatingPnl =");
        expect(source).toContain("summary.equity - summary.balance");
        expect(source).toContain("label: t.pnl.brokerFloating");
        expect(source).not.toContain("const displayFloatingPnl = summary?.floatingPnl");
        expect(source).not.toContain("meta={[pnlStatusLabel, pnlAsOfLabel]");
        expect(source).not.toContain("openOrdersPnl");
        expect(source).not.toContain("(summary?.balance ?? 0) +");
    });

    test("groups closed dashboard orders by channel like open and pending orders", () => {
        expect(source).not.toContain("const isClosedTab = activeTabKey === 'closed'");
        expect(source).not.toContain("isClosedTab ? dateLabel : channelLabel");
        expect(source).not.toContain("activeTab !== 'closed'");
        expect(source).toContain("const groupLabel = channelLabel");
        expect(source).toContain("const groupKey = `channel:${channelLabel}`");
    });

    test("seeds dashboard prices from REST orders before websocket ticks", () => {
        expect(source).toContain("symbolPrices?: DashboardSymbolQuoteMap");
        expect(source).toContain("normalizeDashboardSymbolPrices(record.symbolPrices)");
        expect(source).toContain("seedDashboardSymbolPrices(normalized.symbolPrices)");
        expect(source).toContain("applyCachedDashboardSymbolPrices(normalized.orders)");
        expect(source).toContain("recomputeDashboardRowsFromCachedPrices()");
        expect(source).toContain("socket.on('spt', handleCompactSymbolPrice)");
    });

    test("seeds lifecycle prices and prices new realtime orders from cached quotes", () => {
        expect(source).toContain("symbolPrices?: DashboardSymbolQuoteMap");
        expect(source).toContain("action?: 'created' | 'updated' | 'closed'");
        expect(source).toContain("record.action === 'created' || record.action === 'updated' || record.action === 'closed'");
        expect(source).toContain("symbolPrices: normalizeDashboardSymbolPrices(record.symbolPrices)");
        expect(source).toContain("seedDashboardSymbolPrices(normalized.symbolPrices)");
        expect(source).toContain("refreshDashboardSymbolSpecsForMissingSymbols([normalized.order.symbol])");
        expect(source).toContain("symbolSpecsLoadedRef.current = false");
        expect(source).toContain("const mergedOrder = mergeDashboardLifecycleOrder(existingOrder, normalized.order)");
        expect(source).toContain("const nextOrder = applyCachedDashboardSymbolPrices([mergedOrder])[0] ?? mergedOrder");
        expect(source).toContain("adjustCounts: normalized.action !== 'updated' && !isDuplicateCreatedOrder");
    });

    test("does not use lifecycle broker balance hints for dashboard equity", () => {
        expect(source).not.toContain("accountBalance?: number");
        expect(source).not.toContain("parseOptionalNumber(record.accountBalance)");
        expect(source).not.toContain("normalized.accountBalance");
        expect(source).toContain("equity: normalized.equity ?? current?.equity ?? null");
    });

    test("applies dashboard summary realtime updates urgently outside React transitions", () => {
        const summaryHandlerStart = source.indexOf("const handleSummary = (payload: unknown) => {");
        const checklistHandlerStart = source.indexOf("const handleChecklist = (payload: DashboardChecklist) => {");

        expect(summaryHandlerStart).toBeGreaterThanOrEqual(0);
        expect(checklistHandlerStart).toBeGreaterThan(summaryHandlerStart);

        const summaryHandler = source.slice(summaryHandlerStart, checklistHandlerStart);
        expect(summaryHandler).toContain("setSummary((current) => {");
        expect(summaryHandler).not.toContain("applyRealtimeUpdate");
        expect(source.slice(checklistHandlerStart)).toContain("applyRealtimeUpdate(() => {");
    });

    test("recovers revision gaps without presenting them as websocket transport outages", () => {
        expect(source).toContain("resolveDashboardRealtimeErrorAction");
        expect(source).toContain("action === 'revision-gap'");
        expect(source).toContain("scheduleDashboardRefresh().catch(() => undefined)");

        const errorHandlerStart = source.indexOf("const handleDashboardError = (payload: unknown) => {");
        const notificationHandlerStart = source.indexOf("const handleNotificationCreated = (payload: unknown) => {");
        const errorHandler = source.slice(errorHandlerStart, notificationHandlerStart);
        const revisionGapStart = errorHandler.indexOf("if (action === 'revision-gap') {");
        const transportErrorStart = errorHandler.indexOf("setWsStatus('error')");
        expect(revisionGapStart).toBeGreaterThanOrEqual(0);
        expect(transportErrorStart).toBeGreaterThan(revisionGapStart);
        expect(errorHandler.slice(revisionGapStart, transportErrorStart)).toContain("return;");
    });

    test("refreshes user notifications without account-context filtering", () => {
        expect(source).not.toContain("resolveNotificationRealtimeContext");
        expect(source).not.toContain("pendingNotificationContextRefreshRef");
        expect(source).not.toContain("notificationAccountContextReadyRef");
        expect(source).toContain("notificationRefreshCoalescerRef.current");
    });

    test("deduplicates durable lifecycle redelivery and recovers the authoritative snapshot", () => {
        expect(source).toContain("createRealtimeEventDedupe()");
        expect(source).toContain("lifecycleDedupe.shouldApply");
        expect(source).toContain("scheduleDashboardRefresh().catch(() => undefined)");
        expect(source).toContain("socket.on('slc', handleCompactSignalLifecycle)");
        expect(source).toContain("socket.off('slc', handleCompactSignalLifecycle)");
        expect(source).toContain("case 'signal-lifecycle':");
    });

    test("keeps the REST recovery cursors monotonic", () => {
        expect(source).toContain("const revisionIsFresh =");
        expect(source).toContain("Math.max(summarySnapshotMsRef.current, nextTimestamp)");
        expect(source).toContain("Math.max(summaryRevisionRef.current, normalized.pnlRevision)");
    });

    test("does not reset dashboard symbol-price subscriptions on tab visibility changes", () => {
        const visibilityHandlerStart = source.indexOf("const handleVisibilityChange = () => {");
        const visibilityListenerStart = source.indexOf("document.addEventListener('visibilitychange'");

        expect(visibilityHandlerStart).toBeGreaterThanOrEqual(0);
        expect(visibilityListenerStart).toBeGreaterThan(visibilityHandlerStart);

        const visibilityHandler = source.slice(visibilityHandlerStart, visibilityListenerStart);
        expect(visibilityHandler).not.toContain(`socket.emit('${staleDashboardSubscribe}'`);
        expect(visibilityHandler).not.toContain("sp: isVisible ? 1 : 0");
        expect(source).toContain("socket.on('connect', () => {");
        expect(source).toContain("socket.emit('symbol:prices:subscribe'");
    });
});
