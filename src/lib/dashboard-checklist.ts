export type DashboardChecklistMetricsReasonCode =
  | "PRIMARY_NOT_CONFIGURED"
  | "PRIMARY_NOT_ACTIVE"
  | "PRIMARY_NOT_CONNECTED"
  | "PRIMARY_BLOCKED";

export type DashboardChecklistStep = {
  key: string;
  label: string;
  completed: boolean;
  count?: number | null;
};

export type DashboardChecklist = {
  steps: DashboardChecklistStep[];
  completed: number;
  total: number;
  isCompleted: boolean;
  metricsScope?: "SELECTED_ACCOUNT";
  metricsAccountId?: string | null;
  metricsReasonCode?: DashboardChecklistMetricsReasonCode;
  subscriptionPaused?: boolean;
  subscriptionPauseReason?:
    | "NO_SUBSCRIPTION"
    | "SUBSCRIPTION_EXPIRED"
    | "SUBSCRIPTION_INACTIVE"
    | "FEATURE_NOT_INCLUDED"
    | "MT_ACCOUNT_LIMIT"
    | "TELEGRAM_CHANNEL_LIMIT"
    | null;
  subscriptionPauseMessage?: string | null;
};

export type DashboardChecklistDefaults = {
  account: string;
  telegram: string;
  mt: string;
  channels: string;
};

export type DashboardChecklistStatusCopy = {
  connected: string;
  notConnected: string;
  multipleAccounts: string;
  singleAccount: string;
  channelsCount: string;
  noChannels: string;
  ready: string;
};

export type DashboardChecklistItemView = {
  key: string;
  label: string;
  completed: boolean;
  chevron?: boolean;
  status?: string;
};

const normalizeChecklistCount = (value?: number | null): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
};

export const resolveDashboardChecklistStatus = (
  step: DashboardChecklistStep,
  copy: DashboardChecklistStatusCopy
): string | undefined => {
  switch (step.key) {
    case "telegram":
      return step.completed ? copy.connected : copy.notConnected;
    case "mt": {
      if (!step.completed) {
        return copy.notConnected;
      }
      const count = normalizeChecklistCount(step.count) || 1;
      return count > 1
        ? copy.multipleAccounts.replace("{count}", String(count))
        : copy.singleAccount.replace("{count}", String(count));
    }
    case "channels": {
      const count = normalizeChecklistCount(step.count);
      return count > 0
        ? copy.channelsCount.replace("{count}", String(count))
        : copy.noChannels;
    }
    case "account":
      return step.completed ? copy.ready : undefined;
    default:
      return undefined;
  }
};

export const buildDashboardChecklistItems = (
  checklist: DashboardChecklist | null,
  defaults: DashboardChecklistDefaults,
  copy: DashboardChecklistStatusCopy,
  translateLabel: (label?: string, key?: string, defaults?: DashboardChecklistDefaults) => string
): DashboardChecklistItemView[] => {
  if (!checklist?.steps?.length) {
    return [];
  }

  return checklist.steps.map((step) => ({
    key: step.key,
    label: translateLabel(step.label, step.key, defaults),
    completed: Boolean(step.completed),
    chevron: step.key !== "account",
    status: resolveDashboardChecklistStatus(step, copy),
  }));
};
