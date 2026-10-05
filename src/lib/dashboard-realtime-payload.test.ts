import {
  decodeRealtimeTransportEvent,
  normalizeRealtimeDashboardSummary,
  normalizeRealtimeNotificationCreated,
} from './dashboard-realtime-payload';

describe('dashboard realtime payload normalizers', () => {
  test('decodes compact rt dashboard summary events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'as',
        d: {
          b: 241.14,
          e: 260.55,
          p: -202.19,
          fp: 14.25,
          ps: 'VERIFIED',
          pa: '2026-07-22T16:00:00.000Z',
          px: 'BROKER_REALIZATION_LEDGER',
          ut: 2,
          rv: 9,
        },
      })
    ).toEqual({
      event: 'account:summary',
      payload: {
        b: 241.14,
        e: 260.55,
        p: -202.19,
        fp: 14.25,
        ps: 'VERIFIED',
        pa: '2026-07-22T16:00:00.000Z',
        px: 'BROKER_REALIZATION_LEDGER',
        ut: 2,
        rv: 9,
      },
    });
  });

  test('retains durable identity on compact signal lifecycle events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'slc',
        d: {
          eventId: 'signal-pipeline:event-1:user-1',
          sourceVersion: 7,
          transition: 'TRADE_MODIFIED',
          aggregateId: 'trade-1',
          lifecycleVersion: 7,
          deliveryKey: 'signal-pipeline:TRADE_MODIFIED:trade-1:7:user-1',
        },
      })
    ).toEqual({
      event: 'signal-lifecycle',
      eventId: 'signal-pipeline:event-1:user-1',
      sourceVersion: 7,
      payload: {
        eventId: 'signal-pipeline:event-1:user-1',
        sourceVersion: 7,
        transition: 'TRADE_MODIFIED',
        aggregateId: 'trade-1',
        lifecycleVersion: 7,
        deliveryKey: 'signal-pipeline:TRADE_MODIFIED:trade-1:7:user-1',
      },
    });
  });

  test('decodes compact rt order count and order:created events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'ok',
        d: { ts: 1777923631271, c: { o: 1, p: 2, c: 3 }, ma: 'acc-primary' },
      })
    ).toEqual({
      event: 'orders:counts',
      payload: {
        snapshotAt: 1777923631271,
        counts: { open: 1, pending: 2, closed: 3 },
        metricsAccountId: 'acc-primary',
      },
    });

    expect(
      decodeRealtimeTransportEvent({
        e: 'oc',
        d: {
          ts: 1777923631272,
          a: 'n',
          sp: {
            XAUUSDm: { s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 },
          },
          o: {
            id: 'trade-1',
            userId: 'user-1',
            mtAccountId: 'acc-primary',
            signalId: 'signal-1',
            orderId: '1001',
            ticketId: '1001',
            symbol: 'XAUUSDm',
            side: 'BUY',
            orderType: 'MARKET',
            status: 'open',
            entryPrice: 4520,
            currentPrice: 4525,
            stopLoss: 4510,
            priceDigits: 2,
            takeProfitTargets: [{ level: 1, price: 4530, percentage: null, status: 'REMAINING' }],
            profit: 10,
            commission: -1,
            swap: -0.2,
            netProfit: 8.8,
            executionDelayMs: 1240,
            accountNumber: '123456',
            accountPlatform: 'MT5',
            channelTitle: 'Gold Signals',
            channelUsername: 'goldsignals',
            channelPhotoUrl: 'https://cdn.test/gold.jpg',
            marketHours: {
              isTradeSessionOpen: true,
              source: 'MT5_SYMBOL_SESSIONS',
            },
            recordType: 'TP_PARTIAL_CLOSE',
            parentTradeId: 'parent-trade-1',
            tpExecutionId: 'exec-1',
            tpSliceId: 'slice-1',
          },
        },
      })
    ).toEqual({
      event: 'order:created',
      payload: {
        snapshotAt: 1777923631272,
        action: 'created',
        symbolPrices: {
          XAUUSDm: { s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 },
        },
        order: {
          id: 'trade-1',
          userId: 'user-1',
          mtAccountId: 'acc-primary',
          signalId: 'signal-1',
          orderId: '1001',
          ticketId: '1001',
          symbol: 'XAUUSDm',
          side: 'BUY',
          orderType: 'MARKET',
          status: 'open',
          entryPrice: 4520,
          currentPrice: 4525,
          stopLoss: 4510,
          priceDigits: 2,
          takeProfitTargets: [{ level: 1, price: 4530, percentage: null, status: 'REMAINING' }],
          profit: 10,
          commission: -1,
          swap: -0.2,
          netProfit: 8.8,
          executionDelayMs: 1240,
          accountNumber: '123456',
          accountPlatform: 'MT5',
          channelTitle: 'Gold Signals',
          channelUsername: 'goldsignals',
          channelPhotoUrl: 'https://cdn.test/gold.jpg',
          marketHours: {
            isTradeSessionOpen: true,
            source: 'MT5_SYMBOL_SESSIONS',
          },
          recordType: 'TP_PARTIAL_CLOSE',
          parentTradeId: 'parent-trade-1',
          tpExecutionId: 'exec-1',
          tpSliceId: 'slice-1',
        },
      },
    });
  });

  test('decodes compact rt order lifecycle update events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'olc',
        d: {
          ts: 1777923631272,
          a: 'u',
          ps: 'P',
          ma: 'acc-primary',
          o: { i: 'trade-1', oid: '1001', s: 'XAUUSDm', sd: 'B', st: 'O', ep: 4520, ed: 850 },
        },
      })
    ).toEqual({
      event: 'orders:lifecycle',
      payload: {
        snapshotAt: 1777923631272,
        action: 'updated',
        previousStatus: 'pending',
        metricsAccountId: 'acc-primary',
        order: {
          id: 'trade-1',
          orderId: '1001',
          symbol: 'XAUUSDm',
          side: 'BUY',
          status: 'open',
          entryPrice: 4520,
          executionDelayMs: 850,
        },
      },
    });
  });

  test('decodes compact closed order broker close fields', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'olc',
        d: {
          ts: 1777923631272,
          a: 'x',
          ps: 'O',
          ma: 'acc-primary',
          o: {
            i: 'trade-1',
            oid: '1001',
            s: 'XAUUSDm',
            sd: 'B',
            st: 'C',
            ep: 4520,
            cp: 4532.5,
            cl: '2026-05-07T01:30:00.000Z',
            bp: 124.75,
            p: 126,
          },
        },
      })
    ).toEqual({
      event: 'orders:lifecycle',
      payload: {
        snapshotAt: 1777923631272,
        action: 'closed',
        previousStatus: 'open',
        metricsAccountId: 'acc-primary',
        order: {
          id: 'trade-1',
          orderId: '1001',
          symbol: 'XAUUSDm',
          side: 'BUY',
          status: 'closed',
          entryPrice: 4520,
          closePrice: 4532.5,
          closeTime: '2026-05-07T01:30:00.000Z',
          brokerPnl: 124.75,
          profit: 126,
        },
      },
    });
  });

  test('decodes compact rt dashboard checklist events without labels or metrics', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'ak',
        d: {
          s: [
            ['account', 1],
            ['mt', 1, 2],
            ['channels', 0, 0],
          ],
          c: 2,
          t: 4,
          d: 0,
        },
      })
    ).toEqual({
      event: 'account:checklist',
      payload: {
        steps: [
          { key: 'account', completed: true },
          { key: 'mt', completed: true, count: 2 },
          { key: 'channels', completed: false, count: 0 },
        ],
        completed: 2,
        total: 4,
        isCompleted: false,
      },
    });
  });

  test('decodes compact rt channel events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'cs',
        d: {
          ts: 1777923631271,
          si: 'sub-1',
          ch: {
            i: 'sub-1',
            cid: '3297819833',
            t: 'Tragram Test Signals',
            u: null,
            m: 1,
            ph: 'https://cdn.test/channel.jpg',
          },
          pf: {
            v: -46107.15,
            f: -46107.15,
            r: -46.53,
            c: 'USD',
            t: 'down',
          },
          st: {
            sv: 2,
            s: 'READY',
            ca: '2026-06-14T00:00:00.000Z',
            sa: '2026-06-14T00:05:00.000Z',
            sg: { o: 30, e: 1 },
            ex: { t: 30, e: 26 },
            tr: { o: 22, c: 22 },
            rl: {
              t: 27,
              w: 7,
              l: 7,
              b: 13,
              gp: 38037.81,
              gl: 109.57,
              n: 37928.24,
              pf: 347.15,
              wr: 50,
              aw: 5433.97,
              al: 15.65,
              cr: { TP: { c: 5, n: 51.92 } },
              bs: { TRADE_CLOSE: { c: 22, n: 37876.32 } },
            },
            ed: { a: 1234, s: 26, l: 1200 },
          },
        },
      })
    ).toEqual({
      event: 'channel:summary',
      payload: {
        snapshotAt: 1777923631271,
        subscriptionId: 'sub-1',
        success: true,
        channel: {
          id: 'sub-1',
          channelId: '3297819833',
          title: 'Tragram Test Signals',
          username: null,
          members: 1,
          photoUrl: 'https://cdn.test/channel.jpg',
        },
        performance: {
          value: -46107.15,
          financialResult: -46107.15,
          returnPercent: -46.53,
          currency: 'USD',
          trend: 'down',
        },
        stats: expect.objectContaining({
          schemaVersion: 2,
          status: 'READY',
          calculatedAt: '2026-06-14T00:00:00.000Z',
          staleAfter: '2026-06-14T00:05:00.000Z',
          signals: expect.objectContaining({ observed: 30, executedFinal: 1 }),
          executions: expect.objectContaining({ total: 30, executed: 26 }),
          trades: expect.objectContaining({ opened: 22, closed: 22 }),
          realized: expect.objectContaining({
            total: 27,
            wins: 7,
            losses: 7,
            breakeven: 13,
            grossProfit: 38037.81,
            grossLoss: 109.57,
            netProfit: 37928.24,
            byCloseReason: expect.objectContaining({ TP: { count: 5, netProfit: 51.92 } }),
            bySource: expect.objectContaining({
              TRADE_CLOSE: { count: 22, netProfit: 37876.32 },
            }),
          }),
          executionDelay: { avgMs: 1234, samples: 26, lastMs: 1200 },
        }),
      },
    });

    expect(
      decodeRealtimeTransportEvent({
        e: 'cs',
        d: {
          si: 'sub-1',
          ch: { i: 'sub-1', m: 1 },
          pf: { v: -46107.15 },
        },
      })
    ).toEqual({
      event: 'channel:summary',
      payload: {
        subscriptionId: 'sub-1',
        success: true,
        channel: {
          id: 'sub-1',
          members: 1,
        },
        performance: {
          value: -46107.15,
          financialResult: -46107.15,
        },
      },
    });

    expect(decodeRealtimeTransportEvent({ e: 'cc', d: {} })).toBeNull();
  });

  test('normalizes compact dashboard summary payloads', () => {
    expect(
      normalizeRealtimeDashboardSummary({
        b: 241.14,
        e: 260.55,
        p: -202.19,
        fp: 14.25,
      })
    ).toEqual({
      balance: 241.14,
      equity: 260.55,
      pnl: -202.19,
      realizedPnl: -202.19,
      floatingPnl: 14.25,
    });
  });

  test('ignores removed compact batched dashboard price ticks', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'dps',
        d: {
          t: [
            { s: 'XAUUSDm', t: 1777923631271, b: 4525.564, a: 4525.872 },
            { s: 'NZDUSDm', t: 1777923631272, b: 0.59383, a: 0.59393 },
          ],
        },
      })
    ).toBeNull();
  });

  test('ignores removed compact price bootstrap events', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'dpc',
        d: { t: [{ s: 'XAUUSDm', t: 1777923631271, b: 4525.564, a: 4525.872 }] },
      })
    ).toBeNull();
  });

  test('ignores removed legacy compact price ticks', () => {
    expect(
      decodeRealtimeTransportEvent({
        e: 'dp',
        d: { s: 'XAUUSDm', t: 1777923631271, b: 4525.564, a: 4525.872 },
      })
    ).toBeNull();
  });

  test('normalizes full dashboard summary two-value payloads', () => {
    expect(
      normalizeRealtimeDashboardSummary({
        balance: 241.14,
        equity: 260.55,
        pnl: -202.19,
        brokerFloatingPnl: 14.25,
        snapshotAt: '2026-05-05T00:00:00.000Z',
      })
    ).toEqual({
      balance: 241.14,
      equity: 260.55,
      pnl: -202.19,
      realizedPnl: -202.19,
      floatingPnl: null,
      brokerFloatingPnl: 14.25,
      snapshotAt: '2026-05-05T00:00:00.000Z',
    });
  });

  test('prefers broker-verified realized and Tragram floating PnL', () => {
    expect(
      normalizeRealtimeDashboardSummary({
        pnl: 999,
        realizedPnl: -12.5,
        floatingPnl: 3.25,
        brokerFloatingPnl: 800,
        pnlStatus: 'VERIFIED',
        pnlAsOf: '2026-07-22T16:00:00.000Z',
        pnlSource: 'BROKER_REALIZATION_LEDGER',
      })
    ).toMatchObject({
      pnl: -12.5,
      realizedPnl: -12.5,
      floatingPnl: 3.25,
      pnlStatus: 'VERIFIED',
      pnlAsOf: '2026-07-22T16:00:00.000Z',
      pnlSource: 'BROKER_REALIZATION_LEDGER',
    });
  });

  test('keeps unavailable syncing PnL null instead of manufacturing zero', () => {
    expect(normalizeRealtimeDashboardSummary({ pnlStatus: 'SYNCING' })).toMatchObject({
      pnl: null,
      realizedPnl: null,
      floatingPnl: null,
      pnlStatus: 'SYNCING',
    });
  });

  test('normalizes notification-created account-filter signals', () => {
    expect(normalizeRealtimeNotificationCreated({
      v: 1,
      s: 't',
      e: 'nev1:event-1',
      c: 'nev1:event-1',
      k: 'm',
      m: 'acc-primary',
      g: 'ng1.bXQ6YWNjLXByaW1hcnk6c2lnbmFsOnNpZ25hbC0x',
    })).toEqual({
      v: 1,
      s: 't',
      e: 'nev1:event-1',
      c: 'nev1:event-1',
      k: 'm',
      m: 'acc-primary',
      g: 'ng1.bXQ6YWNjLXByaW1hcnk6c2lnbmFsOnNpZ25hbC0x',
      mtAccountId: 'acc-primary',
    });
  });

  test('normalizes global notification-created signals', () => {
    expect(normalizeRealtimeNotificationCreated({
      v: 1,
      s: 't',
      e: 'nev1:event-2',
      c: 'nev1:event-2',
      k: 'g',
      g: 'ng1.Z2xvYmFsOnRocmVhZDp0ZWxlZ3JhbTp1c2VyLTI',
    })).toEqual({
      v: 1,
      s: 't',
      e: 'nev1:event-2',
      c: 'nev1:event-2',
      k: 'g',
      g: 'ng1.Z2xvYmFsOnRocmVhZDp0ZWxlZ3JhbTp1c2VyLTI',
      mtAccountId: null,
    });
  });

  test('rejects legacy or copy-bearing notification payloads', () => {
    expect(normalizeRealtimeNotificationCreated({ s: 't', m: 'acc-primary' })).toBeNull();
    expect(normalizeRealtimeNotificationCreated({
      v: 1,
      s: 't',
      e: 'nev1:event-3',
      c: 'nev1:event-3',
      k: 'm',
      m: 'acc-primary',
      g: 'ng1.bXQ6YWNjLXByaW1hcnk6c2lnbmFsOnNpZ25hbC0x',
      title: 'Order Issue',
    })).toBeNull();
  });

  test('rejects malformed compact notification transport events before dispatch', () => {
    expect(decodeRealtimeTransportEvent({
      e: 'dn',
      d: {
        v: 1,
        s: 't',
        e: 'nev1:event-3',
        c: 'nev1:event-3',
        k: 'm',
        // Account scope requires the compact account field.
        g: 'ng1.bXQ6YWNjLXByaW1hcnk6c2lnbmFsOnNpZ25hbC0x',
      },
    })).toBeNull();

    expect(decodeRealtimeTransportEvent({
      e: 'dn',
      d: {
        v: 1,
        s: 't',
        e: 'nev1:event-3',
        c: 'nev1:event-3',
        k: 'm',
        m: 'acc-primary',
        g: 'ng1.bXQ6YWNjLXByaW1hcnk6c2lnbmFsOnNpZ25hbC0x',
        title: 'Order Issue',
      },
    })).toBeNull();
  });
});
