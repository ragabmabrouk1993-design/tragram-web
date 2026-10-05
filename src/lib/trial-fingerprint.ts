"use client";

import { useCallback, useContext } from 'react';
import { FingerprintContext } from '@fingerprint/react';

export const TRIAL_FINGERPRINT_CHALLENGE_TAG = 'tragram_trial_challenge';

type FingerprintEventResult = { event_id?: string };
type FingerprintDataGetter = (options: {
  tag: Record<string, string>;
}) => Promise<FingerprintEventResult>;

export const createTrialFingerprintCollector = (getData: FingerprintDataGetter) => async (
  nonce: string,
): Promise<string> => {
  const result = await getData({
    tag: { [TRIAL_FINGERPRINT_CHALLENGE_TAG]: nonce },
  });
  if (typeof result.event_id !== 'string' || result.event_id.length === 0) {
    throw new Error('Fingerprint did not return an event identifier');
  }
  return result.event_id;
};

export const useTrialFingerprint = () => {
  const { getVisitorData } = useContext(FingerprintContext);
  const collectTrialFingerprintEvent = useCallback(
    async (nonce: string) =>
      createTrialFingerprintCollector(getVisitorData as FingerprintDataGetter)(nonce),
    [getVisitorData],
  );
  return { collectTrialFingerprintEvent };
};
