import "server-only";

import type { Locale } from "@/i18n/routing";
import { resolveCatalogLocale, type CatalogLocale } from "@/i18n/catalog";
import type {
  MessageNamespace,
  MessagesForNamespaces,
  NamespaceMessagesMap,
} from "@/i18n/messages";

type MessageLoader<Namespace extends MessageNamespace> = () => Promise<NamespaceMessagesMap[Namespace]>;

const createLoaders = (
  catalogLocale: CatalogLocale,
): { [Namespace in MessageNamespace]: MessageLoader<Namespace> } => ({
  common: () => import(`@/messages/${catalogLocale}/common.json`).then((module) => module.default),
  home: () => import(`@/messages/${catalogLocale}/home.json`).then((module) => module.default),
  features: () => import(`@/messages/${catalogLocale}/features.json`).then((module) => module.default),
  pricing: () => import(`@/messages/${catalogLocale}/pricing.json`).then((module) => module.default),
  contact: () => import(`@/messages/${catalogLocale}/contact.json`).then((module) => module.default),
  "public-pages": () =>
    import(`@/messages/${catalogLocale}/public-pages.json`).then((module) => module.default),
  auth: () => import(`@/messages/${catalogLocale}/auth.json`).then((module) => module.default),
  dashboard: () => import(`@/messages/${catalogLocale}/dashboard.json`).then((module) => module.default),
  channels: () => import(`@/messages/${catalogLocale}/channels.json`).then((module) => module.default),
  "channel-settings": () =>
    import(`@/messages/${catalogLocale}/channel-settings.json`).then((module) => module.default),
  profile: () => import(`@/messages/${catalogLocale}/profile.json`).then((module) => module.default),
  reports: () => import(`@/messages/${catalogLocale}/reports.json`).then((module) => module.default),
  onboarding: () =>
    import(`@/messages/${catalogLocale}/onboarding.json`).then((module) => module.default),
});

export const loadMessages = async <Namespaces extends readonly MessageNamespace[]>(
  locale: Locale,
  namespaces: Namespaces,
): Promise<MessagesForNamespaces<Namespaces>> => {
  const catalogLocale = resolveCatalogLocale(locale);
  const loaders = createLoaders(catalogLocale);
  const loaded = await Promise.all(namespaces.map((namespace) => loaders[namespace]()));

  return loaded.reduce<Record<string, unknown>>((accumulator, current) => {
    Object.assign(accumulator, current);
    return accumulator;
  }, {}) as MessagesForNamespaces<Namespaces>;
};
