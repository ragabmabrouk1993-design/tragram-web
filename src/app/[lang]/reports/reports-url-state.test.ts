import {
  defaultReportsUrlFilterState,
  parseReportsUrlState,
  serializeReportsUrlState,
} from "./reports-url-state";

describe("reports URL state", () => {
  it("parses tab, filters, and custom date state from query params", () => {
    const parsed = parseReportsUrlState(
      new URLSearchParams(
        "tab=History&account=mt-1&range=custom&channels=one,two&symbols=XAUUSD,EURUSD&side=buy&result=win&reportType=WEEKLY&from=2026-05-01&to=2026-05-21"
      )
    );

    expect(parsed.activeTab).toBe("History");
    expect(parsed.filters).toEqual({
      mtAccountId: "mt-1",
      selectedChannels: ["one", "two"],
      selectedSymbols: ["XAUUSD", "EURUSD"],
      timeRange: "custom",
      tradeType: "buy",
      resultType: "win",
      reportType: "WEEKLY",
      customStartDate: "2026-05-01",
      customEndDate: "2026-05-21",
    });
  });

  it("falls back to performance/today for invalid query values", () => {
    expect(parseReportsUrlState(new URLSearchParams("tab=Bad&range=bad&side=hold")).filters).toEqual(
      defaultReportsUrlFilterState()
    );
    expect(parseReportsUrlState(new URLSearchParams("tab=Bad")).activeTab).toBe("Performance");
  });

  it("omits default filters when serializing", () => {
    expect(serializeReportsUrlState("Performance", defaultReportsUrlFilterState())).toBe("");
  });

  it("serializes only active report filters", () => {
    expect(
      serializeReportsUrlState("Compare", {
        mtAccountId: "mt-1",
        selectedChannels: ["channel-a"],
        selectedSymbols: ["XAUUSD"],
        timeRange: "all",
        tradeType: "sell",
        resultType: "loss",
        reportType: "MONTHLY",
        customStartDate: "",
        customEndDate: "",
      })
    ).toBe(
      "tab=Compare&account=mt-1&range=all&channels=channel-a&symbols=XAUUSD&side=sell&result=loss&reportType=MONTHLY"
    );
  });
});
