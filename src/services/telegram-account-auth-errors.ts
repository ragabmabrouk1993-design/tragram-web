export const getTelegramRetryAfterSeconds = (error: unknown): number => {
  if (!error || typeof error !== 'object') return 0;
  const value = error as {
    data?: { retryAfterSeconds?: unknown };
    response?: { data?: { retryAfterSeconds?: unknown } };
  };
  const raw = value.response?.data?.retryAfterSeconds ?? value.data?.retryAfterSeconds;
  const seconds = Number(raw);
  return Number.isInteger(seconds) && seconds > 0 && seconds <= 300 ? seconds : 0;
};

export const getTelegramRequestCooldownMessage = (
  seconds: number,
  template: string
): string | null => {
  if (!Number.isInteger(seconds) || seconds <= 0) return null;
  return template.replace("{seconds}", String(seconds));
};

export const isTelegramAccountConnected = (status: unknown): boolean =>
  Boolean(status && typeof status === 'object'
    && (status as { isConnected?: unknown }).isConnected === true);
