import en from '../messages/en/common.json';
import ar from '../messages/ar/common.json';
import type { Dictionary } from '@/lib/i18n';
import { getTradeActionErrorMessage } from './trade-action-error';

const enDictionary = en as unknown as Dictionary;
const arDictionary = ar as unknown as Dictionary;

describe('getTradeActionErrorMessage', () => {
  it('localizes the market-closed reason from the generated SDK returned-error shape', () => {
    expect(
      getTradeActionErrorMessage(
        {
          error: {
            code: 'TRADE_ACTION_MARKET_HOURS_BLOCKED',
            reasonCode: 'TRADE_SESSION_CLOSED',
            reasonMessage: 'Market is closed for trading.',
          },
        },
        enDictionary,
        'close',
      ),
    ).toBe('Market is closed for trading.');
  });

  it('preserves the unknown-session distinction for thrown Axios errors', () => {
    expect(
      getTradeActionErrorMessage(
        {
          response: {
            data: {
              code: 'TRADE_ACTION_MARKET_HOURS_BLOCKED',
              reasonCode: 'TRADE_SESSION_UNKNOWN',
              reasonMessage: 'provider supplied text',
            },
          },
        },
        enDictionary,
        'close',
      ),
    ).toBe('Trading hours are currently unavailable for this symbol.');
  });

  it('does not expose unrecognized provider text and uses the localized action fallback', () => {
    expect(
      getTradeActionErrorMessage(
        { error: { error: 'broker secret detail', code: 'UNKNOWN_FAILURE' } },
        arDictionary,
        'delete',
      ),
    ).toBe('تعذر إلغاء هذا الأمر المعلّق الآن. حاول مرة أخرى.');
  });

  it('shows a synchronization message when the broker already closed the trade', () => {
    expect(
      getTradeActionErrorMessage(
        { error: { code: 'TRADE_ALREADY_CLOSED_AT_BROKER' } },
        enDictionary,
        'close',
      ),
    ).toBe('This trade is already closed at the broker. Its status is syncing.');
  });
});
