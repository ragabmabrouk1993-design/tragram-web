import { createTrialFingerprintCollector } from './trial-fingerprint';

describe('trial fingerprint collector', () => {
  test('collects a fresh event tagged with the server challenge nonce', async () => {
    const getData = jest.fn().mockResolvedValue({ event_id: 'event-123' });
    const collect = createTrialFingerprintCollector(getData);

    await expect(collect('nonce-123')).resolves.toBe('event-123');
    expect(getData).toHaveBeenCalledWith({
      tag: { tragram_trial_challenge: 'nonce-123' },
    });
  });

  test('does not treat a missing provider event id as valid proof', async () => {
    const getData = jest.fn().mockResolvedValue({});
    const collect = createTrialFingerprintCollector(getData);

    await expect(collect('nonce-123')).rejects.toThrow('Fingerprint did not return an event identifier');
  });
});
