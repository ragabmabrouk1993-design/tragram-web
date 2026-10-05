import {
  applyDashboardSymbolPrice,
  applyDashboardSymbolPrices,
  calculateDashboardOrderPnl,
  mergeDashboardSymbolSpecs,
  type DashboardSymbolPriceTick,
  type DashboardSymbolSpecMap,
} from './dashboard-symbol-prices';

describe('dashboard symbol price helpers', () => {
  const quoteMap = (ticks: DashboardSymbolPriceTick[]) =>
    Object.fromEntries(ticks.map((tick) => [tick.s, tick]));

  const specs: DashboardSymbolSpecMap = {
    XAUUSDm: {
      contractSize: 100,
      pointSize: 0.001,
      profitCurrency: 'USD',
      accountCurrency: 'USD',
    },
  };

  it('calculates exact same-currency PnL and points from contract size metadata', () => {
    expect(
      calculateDashboardOrderPnl(
        {
          symbol: 'XAUUSDm',
          side: 'BUY',
          entryPrice: 4520,
          volume: 0.2,
        },
        specs,
        quoteMap([{ s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 }])
      )
    ).toMatchObject({
      currentPrice: 4525.5,
      profit: 110,
      netProfit: 110,
      points: 5500,
    });
  });

  it('adds active order commission and swap to calculated net profit', () => {
    expect(
      calculateDashboardOrderPnl(
        {
          symbol: 'XAUUSDm',
          side: 'BUY',
          entryPrice: 4520,
          volume: 0.2,
          commission: -1.5,
          swap: -0.2,
        },
        specs,
        quoteMap([{ s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 }])
      )
    ).toMatchObject({
      currentPrice: 4525.5,
      profit: 110,
      netProfit: 108.3,
      points: 5500,
    });
  });

  it('uses Exness-style direct conversion pricing for cross-currency rows', () => {
    const result = calculateDashboardOrderPnl(
      {
        symbol: 'EURNZDm',
        side: 'BUY',
        entryPrice: 1.97515,
        volume: 0.62,
      },
      {
        EURNZDm: {
          contractSize: 100000,
          pointSize: 0.00001,
          profitCurrency: 'NZD',
          accountCurrency: 'USD',
          conversionSymbol: 'NZDUSDm',
          conversionMode: 'DIRECT_ASK',
        },
      },
      quoteMap([
        { s: 'EURNZDm', t: 1777923631271, b: 1.97505, a: 1.97509 },
        { s: 'NZDUSDm', t: 1777923631272, b: 0.5937, a: 0.59373 },
      ])
    );

    expect(result).toMatchObject({
      currentPrice: 1.97505,
      profit: -3.68,
      netProfit: -3.68,
      points: -10,
    });
  });

  it('uses inverse conversion pricing with one over bid', () => {
    const rows = applyDashboardSymbolPrice(
      [
        {
          id: '1',
          symbol: 'EURJPYm',
          status: 'OPEN',
          side: 'SELL',
          entryPrice: 164.2,
          volume: 1,
        },
      ],
      { s: 'USDJPYm', t: 1777923631272, b: 149.9, a: 149.95 },
      {
        EURJPYm: {
          contractSize: 100000,
          pointSize: 0.001,
          profitCurrency: 'JPY',
          accountCurrency: 'USD',
          conversionSymbol: 'USDJPYm',
          conversionMode: 'INVERSE_1_OVER_BID',
        },
      },
      quoteMap([
        { s: 'EURJPYm', t: 1777923631271, b: 164.1, a: 164.12 },
        { s: 'USDJPYm', t: 1777923631272, b: 149.9, a: 149.95 },
      ])
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 164.12,
      profit: 53.37,
      netProfit: 53.37,
      points: 80,
    });
  });

  it('uses the newly arrived trade-symbol tick with the last cached conversion tick', () => {
    const rows = applyDashboardSymbolPrice(
      [
        {
          id: '1',
          symbol: 'EURNZDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 1.97515,
          volume: 0.62,
        },
      ],
      { s: 'EURNZDm', t: 1777923631273, b: 1.97505, a: 1.97509 },
      {
        EURNZDm: {
          contractSize: 100000,
          pointSize: 0.00001,
          profitCurrency: 'NZD',
          accountCurrency: 'USD',
          conversionSymbol: 'NZDUSDm',
          conversionMode: 'DIRECT_ASK',
        },
      },
      quoteMap([{ s: 'NZDUSDm', t: 1777923631272, b: 0.5937, a: 0.59373 }])
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 1.97505,
      profit: -3.68,
      netProfit: -3.68,
      points: -10,
    });
  });

  it('uses the newly arrived conversion tick with the last cached trade-symbol tick', () => {
    const rows = applyDashboardSymbolPrice(
      [
        {
          id: '1',
          symbol: 'EURNZDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 1.97515,
          volume: 0.62,
        },
      ],
      { s: 'NZDUSDm', t: 1777923631273, b: 0.5937, a: 0.59373 },
      {
        EURNZDm: {
          contractSize: 100000,
          pointSize: 0.00001,
          profitCurrency: 'NZD',
          accountCurrency: 'USD',
          conversionSymbol: 'NZDUSDm',
          conversionMode: 'DIRECT_ASK',
        },
      },
      quoteMap([{ s: 'EURNZDm', t: 1777923631272, b: 1.97505, a: 1.97509 }])
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 1.97505,
      profit: -3.68,
      netProfit: -3.68,
      points: -10,
    });
  });

  it('preserves broker fallback PnL until the required conversion tick is available', () => {
    const rows = applyDashboardSymbolPrice(
      [
        {
          id: '1',
          symbol: 'EURNZDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 1.97515,
          volume: 0.62,
          profit: 12,
          netProfit: 10,
        },
      ],
      { s: 'EURNZDm', t: 1777923631271, b: 1.97505, a: 1.97509 },
      {
        EURNZDm: {
          contractSize: 100000,
          pointSize: 0.00001,
          profitCurrency: 'NZD',
          accountCurrency: 'USD',
          conversionSymbol: 'NZDUSDm',
          conversionMode: 'DIRECT_ASK',
        },
      },
      quoteMap([{ s: 'EURNZDm', t: 1777923631271, b: 1.97505, a: 1.97509 }])
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 1.97505,
      points: -10,
      profit: 12,
      netProfit: 10,
    });
  });

  it('uses existing broker PnL as a temporary multiplier when symbol contract size metadata is missing', () => {
    const rows = applyDashboardSymbolPrice(
      [
        {
          id: '1',
          symbol: 'BTCUSD',
          status: 'OPEN',
          side: 'SELL',
          entryPrice: 100,
          currentPrice: 102,
          volume: 2,
          profit: -20,
          netProfit: -21,
        },
      ],
      { s: 'BTCUSD', t: 1777923631271, b: 102.5, a: 103 },
      {
        BTCUSD: {
          profitCurrency: 'USD',
          accountCurrency: 'USD',
        },
      },
      quoteMap([{ s: 'BTCUSD', t: 1777923631271, b: 102.5, a: 103 }])
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 103,
      profit: -30,
      netProfit: -31,
    });
  });

  it('updates only active rows for the tick symbol and does not calculate pending-order PnL', () => {
    const rows = applyDashboardSymbolPrice(
      [
        { id: '1', symbol: 'XAUUSDm', status: 'OPEN', side: 'BUY', entryPrice: 4520, volume: 0.2 },
        { id: '2', symbol: 'XAUUSDm', status: 'PENDING', side: 'BUY', entryPrice: 4520, volume: 0.2 },
        { id: '3', symbol: 'EURUSDm', status: 'OPEN', side: 'BUY', entryPrice: 1.1, volume: 1 },
        { id: '4', symbol: 'XAUUSDm', status: 'CLOSED', side: 'BUY', entryPrice: 4520, volume: 0.2 },
      ],
      { s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 },
      specs,
      quoteMap([{ s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 }])
    );

    expect(rows[0]).toMatchObject({ currentPrice: 4525.5, profit: 110 });
    expect(rows[1]).toMatchObject({ currentPrice: 4525.5, points: 5500 });
    expect(rows[1]).not.toHaveProperty('profit');
    expect(rows[1]).not.toHaveProperty('netProfit');
    expect(rows[2]).not.toHaveProperty('currentPrice');
    expect(rows[3]).not.toHaveProperty('currentPrice');
  });

  it('applies REST bootstrap symbol prices before any websocket tick arrives', () => {
    const rows = applyDashboardSymbolPrices(
      [
        {
          id: '1',
          symbol: 'XAUUSDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 4520,
          volume: 0.2,
        },
      ],
      quoteMap([{ s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 }]),
      specs
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 4525.5,
      profit: 110,
      netProfit: 110,
      points: 5500,
    });
  });

  it('recomputes bootstrap-priced rows after symbol specs arrive', () => {
    const prices = quoteMap([{ s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 }]);
    const rowsWithoutSpecs = applyDashboardSymbolPrices(
      [
        {
          id: '1',
          symbol: 'XAUUSDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 4520,
          volume: 0.2,
          profit: 12,
          netProfit: 12,
        },
      ],
      prices,
      {}
    );

    expect(rowsWithoutSpecs[0]).toMatchObject({ currentPrice: 4525.5 });
    expect(rowsWithoutSpecs[0]).toMatchObject({
      profit: 12,
      netProfit: 12,
    });

    const rowsWithSpecs = applyDashboardSymbolPrices(rowsWithoutSpecs, prices, specs);

    expect(rowsWithSpecs[0]).toMatchObject({
      currentPrice: 4525.5,
      profit: 110,
      netProfit: 110,
    });
  });

  it('lets later spt websocket ticks override REST bootstrap prices', () => {
    const bootstrapPrices = quoteMap([
      { s: 'XAUUSDm', t: 1777923631271, b: 4525.5, a: 4525.8 },
    ]);
    const bootstrappedRows = applyDashboardSymbolPrices(
      [
        {
          id: '1',
          symbol: 'XAUUSDm',
          status: 'OPEN',
          side: 'BUY',
          entryPrice: 4520,
          volume: 0.2,
        },
      ],
      bootstrapPrices,
      specs
    );
    const nextTick = { s: 'XAUUSDm', t: 1777923632271, b: 4526, a: 4526.3 };

    const rows = applyDashboardSymbolPrice(
      bootstrappedRows,
      nextTick,
      specs,
      { ...bootstrapPrices, [nextTick.s]: nextTick }
    );

    expect(rows[0]).toMatchObject({
      currentPrice: 4526,
      profit: 120,
      netProfit: 120,
      points: 6000,
    });
  });

  it('merges symbol specs without dropping existing cached symbols', () => {
    expect(
      mergeDashboardSymbolSpecs(
        { EURUSDm: { contractSize: 100000 } },
        { symbols: { XAUUSDm: { contractSize: 100 } } }
      )
    ).toEqual({
      EURUSDm: { contractSize: 100000 },
      XAUUSDm: { contractSize: 100 },
    });
  });
});
