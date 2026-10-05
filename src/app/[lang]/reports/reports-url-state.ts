export type ReportsTabId = "Performance" | "Compare" | "History";

export type ReportsFilterOption = "today" | "week" | "month" | "all" | "custom";

export type ReportsFilterChoice = "sell" | "buy";

export type ReportsResultChoice = "win" | "loss";

export type ReportsGeneratedReportType = "DAILY" | "WEEKLY" | "MONTHLY";

export type ReportsUrlFilterState = {
  mtAccountId: string | null;
  selectedChannels: string[];
  selectedSymbols: string[];
  timeRange: ReportsFilterOption;
  tradeType: ReportsFilterChoice | null;
  resultType: ReportsResultChoice | null;
  reportType: ReportsGeneratedReportType | null;
  customStartDate: string;
  customEndDate: string;
};

export const defaultReportsUrlFilterState = (): ReportsUrlFilterState => ({
  mtAccountId: null,
  selectedChannels: [],
  selectedSymbols: [],
  timeRange: "today",
  tradeType: null,
  resultType: null,
  reportType: null,
  customStartDate: "",
  customEndDate: "",
});

const splitCsvParam = (value: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const filterToQueryValue = (value: string[]): string | null =>
  value.length > 0 ? value.join(",") : null;

export const isReportsTabId = (value: string | null): value is ReportsTabId =>
  value === "Performance" || value === "Compare" || value === "History";

const isReportsGeneratedReportType = (
  value: string | null
): value is ReportsGeneratedReportType =>
  value === "DAILY" || value === "WEEKLY" || value === "MONTHLY";

export const parseReportsUrlState = (
  searchParams: URLSearchParams
): { activeTab: ReportsTabId; filters: ReportsUrlFilterState } => {
  const range = searchParams.get("range");
  const side = searchParams.get("side");
  const result = searchParams.get("result");
  const tab = searchParams.get("tab");
  const reportType = searchParams.get("reportType");

  return {
    activeTab: isReportsTabId(tab) ? tab : "Performance",
    filters: {
      mtAccountId: searchParams.get("account"),
      selectedChannels: splitCsvParam(searchParams.get("channels")),
      selectedSymbols: splitCsvParam(searchParams.get("symbols")),
      timeRange:
        range === "week" || range === "month" || range === "all" || range === "custom"
          ? range
          : "today",
      tradeType: side === "buy" || side === "sell" ? side : null,
      resultType: result === "win" || result === "loss" ? result : null,
      reportType: isReportsGeneratedReportType(reportType) ? reportType : null,
      customStartDate: searchParams.get("from") ?? "",
      customEndDate: searchParams.get("to") ?? "",
    },
  };
};

export const serializeReportsUrlState = (
  activeTab: ReportsTabId,
  filters: ReportsUrlFilterState
): string => {
  const params = new URLSearchParams();
  if (activeTab !== "Performance") params.set("tab", activeTab);
  if (filters.mtAccountId) params.set("account", filters.mtAccountId);
  if (filters.timeRange !== "today") params.set("range", filters.timeRange);

  const channels = filterToQueryValue(filters.selectedChannels);
  const symbols = filterToQueryValue(filters.selectedSymbols);
  if (channels) params.set("channels", channels);
  if (symbols) params.set("symbols", symbols);
  if (filters.tradeType) params.set("side", filters.tradeType);
  if (filters.resultType) params.set("result", filters.resultType);
  if (filters.reportType) params.set("reportType", filters.reportType);
  if (filters.customStartDate) params.set("from", filters.customStartDate);
  if (filters.customEndDate) params.set("to", filters.customEndDate);

  return params.toString();
};
