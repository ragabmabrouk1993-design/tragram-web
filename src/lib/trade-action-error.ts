import type { Dictionary } from '@/lib/i18n';
import { getLocalizedErrorMessage } from './error-utils';

export type TradeAction = 'close' | 'delete';

type TradeActionErrorPayload = {
  code?: unknown;
  reasonCode?: unknown;
  errorCode?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getPayload = (error: unknown): TradeActionErrorPayload | undefined => {
  if (!isObject(error)) return undefined;

  // Generated SDK calls return { data } on success and { error } on failure.
  if (isObject(error.error)) return error.error as TradeActionErrorPayload;

  // Thrown Axios errors keep the same API payload under response.data.
  if (isObject(error.response) && isObject(error.response.data)) {
    return error.response.data as TradeActionErrorPayload;
  }

  // Some callers already pass the API error body directly.
  if ('code' in error || 'errorCode' in error || 'reasonCode' in error) {
    return error as TradeActionErrorPayload;
  }
  return undefined;
};

const apiErrorsFor = (dict: Dictionary): Record<string, string> =>
  dict.apiErrors as Record<string, string>;

export const getTradeActionErrorMessage = (
  error: unknown,
  dict: Dictionary,
  action: TradeAction,
): string => {
  const payload = getPayload(error);
  const apiErrors = apiErrorsFor(dict);

  if (payload?.code === 'TRADE_ACTION_MARKET_HOURS_BLOCKED') {
    if (payload.reasonCode === 'TRADE_SESSION_CLOSED') {
      return apiErrors.TRADE_SESSION_CLOSED;
    }
    if (payload.reasonCode === 'TRADE_SESSION_UNKNOWN') {
      return apiErrors.TRADE_SESSION_UNKNOWN;
    }
    return apiErrors.TRADE_ACTION_MARKET_HOURS_BLOCKED;
  }

  const errorForLocalization = isObject(error) && 'error' in error
    ? { response: { data: error.error } }
    : error;
  const localized = getLocalizedErrorMessage(errorForLocalization, dict);
  if (localized) return localized;

  return action === 'delete'
    ? apiErrors.TRADE_DELETE_FAILED
    : apiErrors.TRADE_CLOSE_FAILED;
};
