import { reduceDeletionFlow } from './account-deletion-flow';

describe('public account deletion flow', () => {
  it('keeps the verification session in memory and enters OTP directly', () => {
    const credentials = reduceDeletionFlow({ step: 'DISCLOSURE' }, { type: 'START_CREDENTIALS', phone: '+905551234567' });
    const otp = reduceDeletionFlow(credentials, {
      type: 'DELIVERY',
      sessionToken: 'session-secret',
      delivery: { channel: 'telegram_gateway', status: 'otp_sent', expiresIn: 300 },
      expiresAt: '2026-08-15T12:15:00.000Z',
    });
    expect(otp).toMatchObject({ step: 'OTP', sessionToken: 'session-secret', deliveryStatus: 'otp_sent' });
  });

  it('represents recovery pending without fabricating a receipt', () => {
    expect(
      reduceDeletionFlow({ step: 'CONFIRM', sessionToken: 'session-secret', mode: 'IMMEDIATE' }, {
        type: 'RECOVERY_PENDING',
        requestId: 'request-1',
        retryAfterSeconds: 7,
      })
    ).toEqual({ step: 'RECOVERY_PENDING', requestId: 'request-1', retryAfterSeconds: 7 });
  });

  it('enters OTP directly for Gateway delivery_pending and preserves the expiry', () => {
    const state = reduceDeletionFlow({ step: 'CREDENTIALS', phone: '+905551234567' }, {
      type: 'DELIVERY',
      sessionToken: 'session-secret',
      delivery: { channel: 'telegram_gateway', status: 'delivery_pending', expiresIn: 300 },
      expiresAt: '2026-08-15T12:15:00.000Z',
    });

    expect(state).toEqual({
      step: 'OTP',
      sessionToken: 'session-secret',
      expiresAt: '2026-08-15T12:15:00.000Z',
      deliveryStatus: 'delivery_pending',
    });
  });
});
