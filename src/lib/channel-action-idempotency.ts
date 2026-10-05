export type ChannelActionKeyStore = Map<string, string>;
export type ChannelActionKeySuffixFactory = () => string;

let fallbackSequence = 0;

const createDefaultSuffix: ChannelActionKeySuffixFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
};

export const getOrCreateChannelActionKey = (
  store: ChannelActionKeyStore,
  action: string,
  subscriptionId: string,
  createSuffix: ChannelActionKeySuffixFactory = createDefaultSuffix,
): string => {
  const mapKey = `${action}:${subscriptionId}`;
  const existing = store.get(mapKey);
  if (existing) return existing;

  const generated = `${mapKey}:${createSuffix()}`;
  store.set(mapKey, generated);
  return generated;
};

export const clearChannelActionKey = (
  store: ChannelActionKeyStore,
  action: string,
  subscriptionId: string,
): void => {
  store.delete(`${action}:${subscriptionId}`);
};
