import type { AnalyticsRuntimeConfig } from "./config";
import type { MixpanelEventArgs, SupportedMixpanelEventName } from "./types";

type EventItem = { name: SupportedMixpanelEventName; properties?: Record<string, unknown>; distinctId: string | null };
type MixpanelInstance = typeof import("mixpanel-browser").default;

let instance: MixpanelInstance | null = null;
let initialization: Promise<boolean> | null = null;
let activeIdentity: string | null = null;
let activeTarget = "";
let collectionAllowed = false;
const queue: EventItem[] = [];
const MAX_QUEUE_SIZE = 50;

function isSafeEventName(name: string): name is SupportedMixpanelEventName {
  return name === "screen_viewed" || name === "onboarding_viewed" || name === "onboarding_slide_viewed" ||
    name === "onboarding_skipped" || name === "onboarding_completed" || name === "signup_started" ||
    name === "signup_submitted" || name === "signup_failed" || name === "signup_completed" ||
    name === "otp_sent" || name === "otp_resent" || name === "otp_verified" || name === "otp_failed" ||
    name === "login_submitted" || name === "login_completed" || name === "login_failed" || name === "logout" ||
    name === "forgot_password_started" || name === "password_reset_completed" || name === "password_changed" ||
    name === "paywall_viewed" || name === "billing_cycle_changed" || name === "plan_selected" ||
    name === "purchase_started" || name === "my_subscription_viewed" || name === "account_deletion_requested" ||
    name === "referrals_viewed" || name === "referral_link_copied" || name === "referral_link_shared" || name === "notifications_viewed" ||
    name === "notifications_marked_read" || name === "referral_status_tab_changed" ||
    name === "checklist_item_clicked" ||
    name === "symbol_added" || name === "symbol_removed" || name === "profile_updated" ||
    name === "language_changed" || name === "live_chat_opened" || name === "more_item_clicked" ||
    name === "contact_form_submitted" ||
    name === "faq_expanded" ||
    name === "telegram_connect_started" || name === "telegram_code_requested" || name === "telegram_code_verified" ||
    name === "telegram_2fa_submitted" || name === "telegram_connected" || name === "telegram_connect_failed" ||
    name === "channels_browsed" || name === "channel_selected" || name === "channels_registered" ||
    name === "channel_subscription_toggled" || name === "channel_subscription_deleted" ||
    name === "channel_profile_viewed" || name === "channel_chart_range_changed" || name === "channel_orders_tab_changed" ||
    name === "order_details_viewed" || name === "order_close_clicked" || name === "order_close_failed" ||
    name === "trades_tab_changed" ||
    name === "mt_connect_started" || name === "mt_server_searched" || name === "mt_server_selected" ||
    name === "mt_account_connected" || name === "mt_connect_failed" || name === "mt_account_switched" || name === "mt_account_deleted" ||
    name === "channel_settings_viewed" || name === "channel_settings_saved" || name === "channel_settings_save_failed";
}

function flushQueue() {
  if (!instance || !collectionAllowed) return;
  while (queue.length) {
    const item = queue.shift()!;
    if (item.distinctId && item.distinctId !== instance.get_distinct_id()) {
      instance.identify(item.distinctId);
    } else if (!item.distinctId && activeIdentity && instance.get_distinct_id() === activeIdentity) {
      instance.reset();
    }
    instance.track(item.name, item.properties);
  }
}

async function initialize(config: AnalyticsRuntimeConfig): Promise<boolean> {
  if (!config.enabled || !config.token || !config.projectId || !config.apiHost || typeof window === "undefined") return false;
  const target = `${config.environment}:${config.projectId}:${config.apiHost}`;
  if (instance && activeTarget !== target) {
    collectionAllowed = false;
    queue.length = 0;
    window.location.reload();
    return false;
  }
  if (instance) return true;
  if (initialization) return initialization;

  initialization = (async () => {
    try {
      const sdk = await import("mixpanel-browser");
      const client = sdk.default;
      client.init(config.token!, {
        api_host: config.apiHost!,
        autocapture: false,
        track_pageview: false,
        track_marketing: false,
        store_google: false,
        stop_utm_persistence: true,
        save_referrer: false,
        property_blacklist: ["$current_url", "$referrer", "$initial_referrer", "current_url_search"],
        record_sessions_percent: 0,
        record_heatmap_data: false,
        opt_out_tracking_by_default: true,
        persistence: "localStorage",
        persistence_name: `tragram_${config.environment}_${config.projectId}`,
        cross_subdomain_cookie: false,
        secure_cookie: window.location.protocol === "https:",
        ip: false,
        debug: config.environment === "local" && process.env.NODE_ENV === "development",
      } as Parameters<typeof client.init>[1]);
      instance = client;
      activeTarget = target;
      return true;
    } catch {
      instance = null;
      initialization = null;
      return false;
    }
  })();

  return initialization;
}

export function updateAnalyticsIdentity(distinctId: string | null) {
  if (distinctId === activeIdentity) return;
  if (!distinctId && activeIdentity) {
    // A pending explicit logout should remain attributed to the prior user.
    // Discard every other old-session event so a new identity never inherits it.
    const pendingLogout = queue.filter((item) => item.name === "logout" && item.distinctId === activeIdentity);
    queue.length = 0;
    queue.push(...pendingLogout);
  } else {
    queue.length = 0;
  }
  if (instance && collectionAllowed) {
    if (distinctId) instance.identify(distinctId);
    else instance.reset();
  }
  activeIdentity = distinctId;
}

export async function enableAnalytics(config: AnalyticsRuntimeConfig, distinctId: string | null) {
  collectionAllowed = true;
  activeIdentity = distinctId;
  const ready = await initialize(config);
  if (!ready || !collectionAllowed) return false;
  instance?.opt_in_tracking({
    track: () => undefined,
    track_event_name: "",
    track_properties: {},
    secure_cookie: window.location.protocol === "https:",
  });
  const currentIdentity = activeIdentity;
  if (currentIdentity) instance?.identify(currentIdentity);
  flushQueue();
  return true;
}

export function disableAnalytics() {
  collectionAllowed = false;
  queue.length = 0;
  if (instance) {
    const optOutOptions = { delete_user: false, clear_persistence: true } as unknown as Parameters<typeof instance.opt_out_tracking>[0];
    instance.opt_out_tracking(optOutOptions);
    instance.reset();
    instance.opt_out_tracking(optOutOptions);
  }
  activeIdentity = null;
}

export function trackAnalyticsEvent<K extends SupportedMixpanelEventName>(...args: MixpanelEventArgs<K>) {
  if (!collectionAllowed) return;
  const [name, properties] = args;
  if (!isSafeEventName(name)) return;
  const item: EventItem = {
    name,
    properties: properties as Record<string, unknown> | undefined,
    distinctId: activeIdentity,
  };
  if (instance) {
    if (item.distinctId && item.distinctId !== instance.get_distinct_id()) instance.identify(item.distinctId);
    else if (!item.distinctId && activeIdentity && instance.get_distinct_id() === activeIdentity) instance.reset();
    instance.track(item.name, item.properties);
    return;
  }
  if (queue.length < MAX_QUEUE_SIZE) queue.push(item);
}
