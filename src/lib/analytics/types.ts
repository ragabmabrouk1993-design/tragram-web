export const MIXPANEL_EVENT_NAMES = [
  "app_opened", "screen_viewed", "splash_routed", "maintenance_shown", "country_restricted",
  "update_app_prompt_shown", "update_app_clicked", "update_app_dismissed", "push_notification_received",
  "push_notification_opened", "push_permission_result", "onboarding_viewed", "onboarding_slide_viewed",
  "onboarding_skipped", "onboarding_completed", "signup_started", "signup_submitted", "signup_failed",
  "signup_completed", "otp_sent", "otp_resent", "otp_verified", "otp_failed", "login_submitted",
  "login_completed", "login_failed", "forgot_password_started", "password_reset_completed", "password_changed",
  "biometric_prompt_shown", "biometric_enabled", "biometric_skipped", "biometric_setting_toggled", "logout",
  "checklist_item_clicked", "checklist_completed", "telegram_connect_started", "telegram_code_requested",
  "telegram_code_verified", "telegram_2fa_submitted", "telegram_connected", "telegram_connect_failed",
  "mt_connect_started", "mt_server_searched", "mt_server_selected", "mt_account_connected", "mt_connect_failed",
  "mt_account_switched", "mt_account_deleted", "channels_browsed", "channel_selected", "channels_registered",
  "channel_profile_viewed", "channel_chart_range_changed", "channel_orders_tab_changed", "channel_subscription_toggled",
  "channel_subscription_deleted", "channel_settings_viewed", "channel_settings_saved", "channel_settings_save_failed",
  "symbol_added", "symbol_removed", "trades_tab_changed", "order_details_viewed", "order_close_clicked",
  "order_closed", "order_close_failed", "pending_order_cancelled", "ticket_copied", "paywall_viewed",
  "billing_cycle_changed", "plan_selected", "purchase_started", "purchase_cancelled", "purchase_store_failed",
  "purchase_verify_failed", "purchase_completed", "restore_purchases_clicked", "restore_purchases_completed",
  "payment_status_viewed", "limit_reached_shown", "limit_reached_upgrade_clicked", "subscription_alert_shown",
  "subscription_alert_clicked", "my_subscription_viewed", "manage_subscription_clicked", "transaction_id_copied",
  "referrals_viewed", "referral_link_copied", "referral_link_shared", "referral_status_tab_changed", "news_event_viewed",
  "notifications_viewed", "notification_group_expanded", "notifications_marked_read", "notification_setting_toggled",
  "more_item_clicked", "profile_updated", "language_changed", "faq_expanded", "contact_form_submitted",
  "live_chat_opened", "account_deletion_requested",
] as const;

export type MixpanelEventName = (typeof MIXPANEL_EVENT_NAMES)[number];
export type MoreItemKey =
  | "profile" | "notifications" | "my_subscription" | "referrals" | "language" | "security"
  | "biometric_settings" | "delete_account" | "privacy" | "terms" | "faqs" | "contact" | "live_chat" | "logout";
export type ChecklistItemKey = "create_account" | "connect_telegram" | "connect_mt";

export type MixpanelPayloads = {
  screen_viewed: { screen_name: string; previous_screen?: string };
  onboarding_viewed: undefined;
  onboarding_slide_viewed: { slide_index: number };
  onboarding_skipped: { slide_index: number };
  onboarding_completed: { slide_index: number };
  signup_started: undefined;
  signup_submitted: { has_referral_code: boolean; referral_code?: string; country_code?: string };
  signup_failed: { error_code?: string; error_message?: string };
  signup_completed: { referral_code?: string; signup_platform: "WEB" | "IOS" | "ANDROID" };
  otp_sent: { flow: "register" | "login" | "forgotPassword"; expires_in: number };
  otp_resent: { flow: "register" | "login" | "forgotPassword" };
  otp_verified: { flow: "register" | "login" | "forgotPassword" };
  otp_failed: { flow: "register" | "login" | "forgotPassword"; error_code?: string };
  login_submitted: { method: "password" | "biometric" };
  login_completed: { method: "password" | "biometric" };
  login_failed: { method: "password" | "biometric"; error_code?: string; error_message?: string };
  logout: undefined;
  forgot_password_started: undefined;
  password_reset_completed: undefined;
  password_changed: undefined;
  checklist_item_clicked: { item: ChecklistItemKey };
  paywall_viewed: { source: "other" | "my_subscription" };
  billing_cycle_changed: { billing_cycle: "MONTHLY" | "YEARLY" };
  plan_selected: {
    plan_code: string;
    billing_cycle: "MONTHLY" | "YEARLY";
    is_recommended: boolean;
    has_trial_offer: boolean;
  };
  purchase_started: { plan_code: string; billing_cycle: "MONTHLY" | "YEARLY" };
  my_subscription_viewed: undefined;
  account_deletion_requested: { has_details: boolean; is_resend: boolean };
  referrals_viewed: { total_referrals: number; paid_referrals: number; current_level?: number; total_earnings: number };
  referral_link_copied: { referral_code?: string };
  referral_link_shared: { referral_code?: string; share_activity?: string };
  notifications_viewed: { unread_count: number };
  notifications_marked_read: { count: number };
  referral_status_tab_changed: { tab: string };
  symbol_added: { channel_id: string; symbol: string };
  symbol_removed: { channel_id: string; symbol: string };
  profile_updated: { changed_fields: string[] };
  language_changed: { from: string; to: string };
  more_item_clicked: { item: MoreItemKey };
  live_chat_opened: undefined;
  contact_form_submitted: { success: boolean };
  faq_expanded: { question_id: string };
  telegram_connect_started: { source: string };
  telegram_code_requested: undefined;
  telegram_code_verified: { requires_2fa: boolean };
  telegram_2fa_submitted: { success: boolean };
  telegram_connected: undefined;
  telegram_connect_failed: { step: "request_code" | "verify_code" | "2fa"; error_code?: string; error_message?: string };
  channels_browsed: { state: "available" | "registered"; channels_count: number };
  channel_selected: { channel_id: string; channel_title: string; participants_count: number };
  channels_registered: { channel_ids: string[]; channels_count: number; mt_account_id: string };
  channel_subscription_toggled: { channel_id: string; subscription_id: string; enabled: boolean };
  channel_subscription_deleted: { channel_id: string; subscription_id: string };
  channel_profile_viewed: { channel_id: string; subscription_id: string; return_percent?: number; trend?: "flat" | "up" | "down" };
  channel_chart_range_changed: { subscription_id: string; range: "Week" | "Month" | "3Month" | "Year" | "All" };
  channel_orders_tab_changed: { channel_id: string; subscription_id: string; tab: string };
  order_details_viewed: { order_id: string; symbol: string; side: "BUY" | "SELL"; status: string; channel_id?: string };
  order_close_clicked: { order_id: string; symbol: string; side: "BUY" | "SELL"; profit: number | null };
  order_close_failed: { order_id: string; error_code?: string; error_message?: string };
  trades_tab_changed: { tab: "open" | "pending" | "closed" | "limit" };
  mt_connect_started: { source: string };
  mt_server_searched: { platform: "MT4" | "MT5"; query_length: number; results_count: number };
  mt_server_selected: { platform: "MT4" | "MT5"; server: string; company?: string };
  mt_account_connected: { platform: "MT4" | "MT5"; account_type?: string; server: string; currency?: string; leverage?: number; balance_bucket?: string };
  mt_connect_failed: { platform: "MT4" | "MT5"; server: string; error_code?: string; error_message?: string };
  mt_account_switched: { mt_account_id: string; platform: string; account_type: string };
  mt_account_deleted: { mt_account_id: string; platform: string; subscribed_channels_count: number };
  channel_settings_saved: {
    channel_id: string;
    subscription_id?: string;
    risk_mode: string;
    lot_rounding_mode?: string;
    break_even_enabled: boolean;
    break_even_mode?: string;
    trailing_stop_enabled: boolean;
    trailing_stop_mode?: string;
    tp_execution_mode?: string;
    allow_execution_without_sl_tp: boolean;
    allow_forwarded_signals: boolean;
    max_active_orders: number;
    max_daily_trades: number;
    allowed_symbols_count: number;
    changed_fields: string[];
  };
  channel_settings_viewed: { channel_id: string; subscription_id: string };
  channel_settings_save_failed: { channel_id: string; subscription_id?: string; error_code?: string; error_message?: string };
};

type RequiredNames = keyof MixpanelPayloads;
export type SupportedMixpanelEventName = RequiredNames;
export type MixpanelEventArgs<K extends SupportedMixpanelEventName> = MixpanelPayloads[K] extends undefined
  ? [name: K]
  : [name: K, properties: MixpanelPayloads[K]];
