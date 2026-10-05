import {
  chunkTelegramCatalogPeers,
  registerTelegramCatalogPeersInBatches,
} from './telegram-catalog-registration';

describe('chunkTelegramCatalogPeers', () => {
  test('deduplicates peers while preserving order and keeps every batch within the API bound', () => {
    const peers = Array.from({ length: 205 }, (_, index) => `peer-${index}`);
    const result = chunkTelegramCatalogPeers([...peers, 'peer-0', 'peer-204']);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(100);
    expect(result[2]).toEqual(['peer-200', 'peer-201', 'peer-202', 'peer-203', 'peer-204']);
    expect(result.flat()).toEqual(peers);
  });

  test('removes empty identifiers without producing empty batches', () => {
    expect(chunkTelegramCatalogPeers(['', '  ', 'peer-1', 'peer-1'])).toEqual([['peer-1']]);
  });

  test('registers every batch sequentially and exposes the batch index for idempotency keys', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    const peers = Array.from({ length: 205 }, (_, index) => `peer-${index}`);

    await registerTelegramCatalogPeersInBatches(peers, register);

    expect(register).toHaveBeenCalledTimes(3);
    expect(register.mock.calls[0]).toEqual([peers.slice(0, 100), 0, 3]);
    expect(register.mock.calls[1]).toEqual([peers.slice(100, 200), 1, 3]);
    expect(register.mock.calls[2]).toEqual([peers.slice(200), 2, 3]);
  });
});
