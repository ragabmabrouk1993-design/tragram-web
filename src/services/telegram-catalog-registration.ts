const DEFAULT_REGISTRATION_BATCH_SIZE = 100;

/** Keep canonical peer registration requests below the gateway service bound. */
export const chunkTelegramCatalogPeers = (
  peerIds: string[],
  batchSize = DEFAULT_REGISTRATION_BATCH_SIZE
): string[][] => {
  const size = Math.max(1, Math.min(Math.floor(batchSize), DEFAULT_REGISTRATION_BATCH_SIZE));
  const uniquePeerIds = Array.from(
    new Set(peerIds.map((peerId) => String(peerId).trim()).filter(Boolean))
  );
  const batches: string[][] = [];
  for (let index = 0; index < uniquePeerIds.length; index += size) {
    batches.push(uniquePeerIds.slice(index, index + size));
  }
  return batches;
};

export type TelegramCatalogPeerBatchRegistrar = (
  peerIds: string[],
  batchIndex: number,
  batchCount: number
) => Promise<void> | void;

/** Register batches in order so capacity and access verification stay bounded. */
export const registerTelegramCatalogPeersInBatches = async (
  peerIds: string[],
  registerBatch: TelegramCatalogPeerBatchRegistrar
): Promise<void> => {
  const batches = chunkTelegramCatalogPeers(peerIds);
  for (let index = 0; index < batches.length; index += 1) {
    await registerBatch(batches[index], index, batches.length);
  }
};
