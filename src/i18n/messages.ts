export const messageNamespaces = [
  "common",
  "home",
  "features",
  "pricing",
  "contact",
  "public-pages",
  "auth",
  "dashboard",
  "channels",
  "channel-settings",
  "profile",
  "reports",
  "onboarding",
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];

type UnionToIntersection<Type> = (
  Type extends unknown ? (value: Type) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

export type CommonMessages = typeof import("@/messages/en/common.json");
export type HomeMessages = typeof import("@/messages/en/home.json");
export type FeaturesMessages = typeof import("@/messages/en/features.json");
export type PricingMessages = typeof import("@/messages/en/pricing.json");
export type ContactMessages = typeof import("@/messages/en/contact.json");
export type PublicPagesMessages = typeof import("@/messages/en/public-pages.json");
export type AuthMessages = typeof import("@/messages/en/auth.json");
export type DashboardMessages = typeof import("@/messages/en/dashboard.json");
export type ChannelsMessages = typeof import("@/messages/en/channels.json");
export type ChannelSettingsMessages = typeof import("@/messages/en/channel-settings.json");
export type ProfileMessages = typeof import("@/messages/en/profile.json");
export type ReportsMessages = typeof import("@/messages/en/reports.json");
export type OnboardingMessages = typeof import("@/messages/en/onboarding.json");

export type NamespaceMessagesMap = {
  common: CommonMessages;
  home: HomeMessages;
  features: FeaturesMessages;
  pricing: PricingMessages;
  contact: ContactMessages;
  "public-pages": PublicPagesMessages;
  auth: AuthMessages;
  dashboard: DashboardMessages;
  channels: ChannelsMessages;
  "channel-settings": ChannelSettingsMessages;
  profile: ProfileMessages;
  reports: ReportsMessages;
  onboarding: OnboardingMessages;
};

export type MessagesForNamespaces<Namespaces extends readonly MessageNamespace[]> =
  UnionToIntersection<NamespaceMessagesMap[Namespaces[number]]>;

export type AppMessages = MessagesForNamespaces<typeof messageNamespaces>;
