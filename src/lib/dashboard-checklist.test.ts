import {
  buildDashboardChecklistItems,
  resolveDashboardChecklistStatus,
  type DashboardChecklist,
} from "./dashboard-checklist";

describe("dashboard checklist helpers", () => {
  const defaults = {
    account: "Create account",
    telegram: "Connect Telegram",
    mt: "Connect MT",
    channels: "Join channels",
  };

  const copy = {
    connected: "Connected",
    notConnected: "Not connected",
    multipleAccounts: "{count} accounts",
    singleAccount: "{count} account",
    channelsCount: "{count} channels",
    noChannels: "No channels",
    ready: "Ready",
  };

  const translateLabel = (
    label?: string,
    key?: string,
    localizedDefaults = defaults
  ): string => {
    if (key && key in localizedDefaults) {
      return localizedDefaults[key as keyof typeof localizedDefaults];
    }
    return label ?? "";
  };

  test("uses API completion for mt status even when count is present", () => {
    expect(
      resolveDashboardChecklistStatus(
        {
          key: "mt",
          label: "Connect MT4/MT5",
          completed: false,
          count: 1,
        },
        copy
      )
    ).toBe("Not connected");
  });

  test("builds checklist items from API-provided counts and completion", () => {
    const checklist: DashboardChecklist = {
      steps: [
        { key: "account", label: "Create Tragram account", completed: true },
        { key: "telegram", label: "Connect Telegram account", completed: true },
        { key: "mt", label: "Connect MT4/MT5", completed: true, count: 1 },
        { key: "channels", label: "Join or enable channels", completed: true, count: 2 },
      ],
      completed: 4,
      total: 4,
      isCompleted: true,
      metricsScope: "SELECTED_ACCOUNT",
      metricsAccountId: "acc-1",
    };

    expect(buildDashboardChecklistItems(checklist, defaults, copy, translateLabel)).toEqual([
      {
        key: "account",
        label: "Create account",
        completed: true,
        chevron: false,
        status: "Ready",
      },
      {
        key: "telegram",
        label: "Connect Telegram",
        completed: true,
        chevron: true,
        status: "Connected",
      },
      {
        key: "mt",
        label: "Connect MT",
        completed: true,
        chevron: true,
        status: "1 account",
      },
      {
        key: "channels",
        label: "Join channels",
        completed: true,
        chevron: true,
        status: "2 channels",
      },
    ]);
  });
});
