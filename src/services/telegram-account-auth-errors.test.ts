import {
  getTelegramRequestCooldownMessage,
  getTelegramRetryAfterSeconds,
  isTelegramAccountConnected,
} from './telegram-account-auth-errors';

describe('Telegram account auth response helpers', () => {
  test.each([
    [{ response: { data: { retryAfterSeconds: 42 } } }, 42],
    [{ data: { retryAfterSeconds: '12' } }, 12],
    [{ data: { retryAfterSeconds: 301 } }, 0],
    [new Error('temporary failure'), 0],
  ])('reads a bounded retry delay from %p', (error, expected) => {
    expect(getTelegramRetryAfterSeconds(error)).toBe(expected);
  });

  test('only treats an explicit durable connected status as success', () => {
    expect(isTelegramAccountConnected({ isConnected: true })).toBe(true);
    expect(isTelegramAccountConnected({ isConnected: false })).toBe(false);
    expect(isTelegramAccountConnected(null)).toBe(false);
  });

  test('formats an explanation only while a request-code cooldown is active', () => {
    const template = 'You can request another code in {seconds} seconds.';

    expect(getTelegramRequestCooldownMessage(42, template)).toBe(
      'You can request another code in 42 seconds.'
    );
    expect(getTelegramRequestCooldownMessage(0, template)).toBeNull();
    expect(getTelegramRequestCooldownMessage(-1, template)).toBeNull();
  });
});
