import type { Dictionary } from './i18n';
import { resolveApiError } from './error-utils';

/** A generic server failure does not establish whether a billing write applied. */
export const getBillingMutationError = (error: unknown, dict: Dictionary, fallback: string): string => {
  const resolved = resolveApiError(error, dict);
  return resolved.code === 'INTERNAL_SERVER_ERROR' || resolved.code === 'DATABASE_ERROR'
    ? fallback
    : resolved.localizedMessage || fallback;
};
