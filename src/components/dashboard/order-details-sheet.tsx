'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SymbolPairBadge } from '@/components/symbols';
import { formatExecutionDuration } from '@/lib/execution-delay-format';
import { formatTradePrice } from '@/lib/trade-price-format';
import {
  formatTradeOrderLocalDateTime,
  formatTradeTakeProfitTargets,
  normalizeTradeTakeProfitTargets,
  resolveTradeCloseReasonBadge,
  resolveTradeCloseReasonLabel,
} from '@/lib/trade-order-ui';

export type OrderDetailsSheetRecord = {
  id?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
  symbol?: string | null;
  side?: string | null;
  volume?: number | null;
  orderType?: string | null;
  entryPrice?: number | null;
  brokerOpenPrice?: number | null;
  currentPrice?: number | null;
  closePrice?: number | null;
  stopLoss?: number | null;
  priceDigits?: number | null;
  takeProfitTargets?: unknown;
  status?: string | null;
  profit?: number | null;
  commission?: number | null;
  swap?: number | null;
  netProfit?: number | null;
  brokerPnl?: number | null;
  executionDelayMs?: number | null;
  openTime?: Date | string | null;
  closeTime?: Date | string | null;
  createdAt?: Date | string | null;
  accountNumber?: string | null;
  accountPlatform?: string | null;
  channelTitle?: string | null;
  channelUsername?: string | null;
  closeReason?: string | null;
  closeTpLevel?: number | null;
};

export type OrderDetailsSheetLabels = {
  sheetFallback: string;
  closeAction: string;
  lotLabel: string;
  atLabel: string;
  ticketLabel: string;
  accountLabel: string;
  channelLabel: string;
  openTimeLabel: string;
  closeTimeLabel: string;
  currentPriceLabel: string;
  closePriceLabel: string;
  entryLabel: string;
  stopLossLabel: string;
  takeProfitLabel: string;
  takenTpLabel: string;
  remainingTpLabel: string;
  notAllocatedTpLabel: string;
  commissionLabel: string;
  swapLabel: string;
  netPnlLabel: string;
  executionSpeedLabel: string;
  executionSpeedPrefix: string;
  sideValues: { buy: string; sell: string };
  orderTypeValues: { market: string; limit: string; stop: string; stopLimit: string };
  statusValues: { open: string; pending: string; closed: string; cancelled: string; limit: string };
  closeReasonValues?: { sl?: string; tp?: string; manual?: string };
};

type OrderDetailsSheetProps = {
  order: OrderDetailsSheetRecord;
  labels: OrderDetailsSheetLabels;
  locale: string;
  currency?: string;
  channelFallback?: string;
  dialogLabel?: string;
  backdropClassName?: string;
  sheetClassName?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionReason?: string | null;
  action?: ReactNode;
  onAction?: () => void;
  onClose: () => void;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const formatTimeLabel = (value: Date | string | null | undefined, locale: string): string => {
  return formatTradeOrderLocalDateTime(value, locale);
};

const formatMoney = (value: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatLotsLabel = (value: number | undefined, locale: string): string => {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPriceLabel = (
  value: number | null | undefined,
  locale: string,
  priceDigits?: number | null
): string => formatTradePrice(value ?? undefined, { locale, priceDigits: priceDigits ?? undefined });

const translateSide = (side: string | null | undefined, labels: OrderDetailsSheetLabels) => {
  const normalized = side?.toUpperCase();
  if (normalized === 'BUY') return labels.sideValues.buy;
  if (normalized === 'SELL') return labels.sideValues.sell;
  return side ?? '';
};

const translateOrderType = (
  orderType: string | null | undefined,
  labels: OrderDetailsSheetLabels
): string => {
  const normalized = orderType?.toUpperCase();
  if (normalized === 'MARKET') return labels.orderTypeValues.market;
  if (normalized === 'LIMIT') return labels.orderTypeValues.limit;
  if (normalized === 'STOP') return labels.orderTypeValues.stop;
  if (normalized === 'STOP_LIMIT') return labels.orderTypeValues.stopLimit;
  return orderType ?? '—';
};

const translateOrderStatus = (
  status: string | null | undefined,
  orderType: string | null | undefined,
  labels: OrderDetailsSheetLabels
): string => {
  const normalized = status?.toLowerCase();
  const normalizedType = orderType?.toUpperCase();
  if (normalized === 'open') return labels.statusValues.open;
  if (normalized === 'pending') {
    return normalizedType === 'MARKET' ? labels.statusValues.pending : labels.statusValues.limit;
  }
  if (normalized === 'closed') return labels.statusValues.closed;
  if (normalized === 'cancelled') return labels.statusValues.cancelled;
  return status ?? '—';
};

const resolveTopPrice = (order: OrderDetailsSheetRecord): number | undefined =>
  order.status === 'open'
    ? (toFiniteNumber(order.currentPrice) ?? toFiniteNumber(order.entryPrice))
    : toFiniteNumber(order.entryPrice);

const resolvePnlValue = (order: OrderDetailsSheetRecord): number | undefined =>
  order.status === 'pending'
    ? undefined
    : toFiniteNumber(order.brokerPnl) ?? toFiniteNumber(order.netProfit) ?? toFiniteNumber(order.profit);

const resolveSideTone = (side: string | null | undefined): 'buy' | 'sell' | 'neutral' => {
  const normalized = side?.toUpperCase();
  if (normalized === 'BUY') return 'buy';
  if (normalized === 'SELL') return 'sell';
  return 'neutral';
};

export function OrderDetailsSheet({
  order,
  labels,
  locale,
  currency = 'USD',
  channelFallback = '—',
  dialogLabel,
  backdropClassName,
  sheetClassName,
  actionLabel,
  actionDisabled,
  actionReason,
  action,
  onAction,
  onClose,
}: OrderDetailsSheetProps) {
  const sideLabel = translateSide(order.side, labels);
  const sideTone = resolveSideTone(order.side);
  const statusLabel = translateOrderStatus(order.status, order.orderType, labels);
  const orderTypeLabel = translateOrderType(order.orderType, labels);
  const closeReasonLabel = resolveTradeCloseReasonLabel({
    closeReason: order.closeReason,
    closeTpLevel: order.closeTpLevel,
    labels: labels.closeReasonValues,
  });
  const closeReasonBadge = resolveTradeCloseReasonBadge({
    closeReason: order.closeReason,
    closeTpLevel: order.closeTpLevel,
    labels: labels.closeReasonValues,
  });
  const takeProfitTargets = normalizeTradeTakeProfitTargets(order.takeProfitTargets);
  const takeProfitLabel = takeProfitTargets.length
    ? takeProfitTargets
        .map((target) => formatPriceLabel(target.price, locale, order.priceDigits))
        .join(', ')
    : '—';
  const takenTpLabel = formatTradeTakeProfitTargets(takeProfitTargets, 'TAKEN', (price) =>
    formatPriceLabel(price, locale, order.priceDigits)
  );
  const remainingTpLabel = formatTradeTakeProfitTargets(takeProfitTargets, 'REMAINING', (price) =>
    formatPriceLabel(price, locale, order.priceDigits)
  );
  const notAllocatedTpLabel = formatTradeTakeProfitTargets(
    takeProfitTargets,
    'NOT_ALLOCATED',
    (price) => formatPriceLabel(price, locale, order.priceDigits)
  );
  const pnl = resolvePnlValue(order);
  const pnlTrend = pnl === undefined ? undefined : pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat';
  const pnlLabel =
    pnl === undefined
      ? null
      : `${pnl >= 0 ? '+' : '-'}${formatMoney(Math.abs(pnl), currency, locale)}`;
  const topPrice = resolveTopPrice(order);
  const ticket = order.ticketId ?? order.orderId ?? order.id ?? '—';
  const accountLabel = order.accountNumber
    ? `#${order.accountNumber}${order.accountPlatform ? ` (${order.accountPlatform})` : ''}`
    : (order.accountPlatform ?? '—');
  const channelLabel = order.channelTitle ?? order.channelUsername ?? channelFallback;
  const showCurrentPrice = order.status === 'open' || order.status === 'pending';
  const showClosePrice = order.status === 'closed' || order.status === 'cancelled';
  const executionDuration = formatExecutionDuration(order.executionDelayMs, locale);
  const executionSpeedLabel = executionDuration
    ? `${labels.executionSpeedPrefix} ${executionDuration}`
    : null;

  return (
    <div className={cn('dashboard-sheet-backdrop', backdropClassName)} onClick={onClose}>
      <div
        className={cn('dashboard-order-sheet', sheetClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel ?? labels.sheetFallback}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-sheet-handle" aria-hidden="true" />
        <div className="dashboard-order-sheet-header">
          <div>
            <div className="dashboard-order-sheet-title-row">
              <SymbolPairBadge
                symbol={order.symbol ?? ''}
                size="sm"
                className="dashboard-order-sheet-icon"
              />
              <p className="dashboard-order-sheet-title">{order.symbol ?? labels.sheetFallback}</p>
            </div>
            <p className="dashboard-order-sheet-subtitle">
              {sideLabel || '—'}{' '}
              {order.volume !== undefined && order.volume !== null
                ? `${formatLotsLabel(order.volume, locale)} ${labels.lotLabel}`
                : labels.lotLabel}{' '}
              {labels.atLabel} {formatPriceLabel(order.entryPrice, locale, order.priceDigits)}
            </p>
            <div className="dashboard-order-sheet-tags">
              <span className="dashboard-order-sheet-tag">{statusLabel}</span>
              <span className={cn('dashboard-order-sheet-tag', `is-${sideTone}`)}>
                {sideLabel || '—'}
              </span>
              <span className="dashboard-order-sheet-tag">{orderTypeLabel}</span>
              {closeReasonBadge && closeReasonLabel !== '—' ? (
                <span
                  className={cn(
                    'dashboard-order-sheet-tag',
                    'is-close-reason',
                    `is-close-${closeReasonBadge.tone}`
                  )}
                >
                  {closeReasonLabel}
                </span>
              ) : null}
              {executionSpeedLabel ? (
                <span className="dashboard-order-sheet-tag is-execution-speed">
                  {executionSpeedLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="dashboard-order-sheet-side">
            <button
              type="button"
              className="dashboard-order-sheet-close"
              aria-label={labels.closeAction}
              onClick={onClose}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <div className="dashboard-order-sheet-header-summary">
              <span
                className={cn(
                  'dashboard-order-sheet-pnl-hero',
                  pnlTrend ? `is-${pnlTrend}` : undefined
                )}
              >
                {pnlLabel ? (
                  <>
                    <i
                      className={cn(
                        'fa-solid',
                        pnlTrend === 'down'
                          ? 'fa-arrow-trend-down'
                          : pnlTrend === 'up'
                            ? 'fa-arrow-trend-up'
                            : 'fa-minus'
                      )}
                      aria-hidden="true"
                    />
                    {pnlLabel}
                  </>
                ) : (
                  '—'
                )}
              </span>
              <span className="dashboard-order-sheet-amount">
                {topPrice !== undefined
                  ? formatPriceLabel(topPrice, locale, order.priceDigits)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="dashboard-order-sheet-grid">
          <div>
            <p className="dashboard-order-sheet-label">{labels.ticketLabel}</p>
            <p className="dashboard-order-sheet-value">{ticket}</p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.accountLabel}</p>
            <p className="dashboard-order-sheet-value">{accountLabel}</p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.channelLabel}</p>
            <p className="dashboard-order-sheet-value">{channelLabel}</p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.openTimeLabel}</p>
            <p className="dashboard-order-sheet-value">
              {formatTimeLabel(order.openTime ?? order.createdAt, locale)}
            </p>
          </div>
          {executionSpeedLabel ? (
            <div>
              <p className="dashboard-order-sheet-label">{labels.executionSpeedLabel}</p>
              <p className="dashboard-order-sheet-value">{executionSpeedLabel}</p>
            </div>
          ) : null}
          <div>
            <p className="dashboard-order-sheet-label">{labels.closeTimeLabel}</p>
            <p className="dashboard-order-sheet-value">{formatTimeLabel(order.closeTime, locale)}</p>
          </div>
          {showCurrentPrice ? (
            <div>
              <p className="dashboard-order-sheet-label">{labels.currentPriceLabel}</p>
              <p className="dashboard-order-sheet-value">
                {formatPriceLabel(order.currentPrice, locale, order.priceDigits)}
              </p>
            </div>
          ) : null}
          {showClosePrice ? (
            <div>
              <p className="dashboard-order-sheet-label">{labels.closePriceLabel}</p>
              <p className="dashboard-order-sheet-value">
                {formatPriceLabel(order.closePrice ?? order.currentPrice, locale, order.priceDigits)}
              </p>
            </div>
          ) : null}
          <div>
            <p className="dashboard-order-sheet-label">{labels.entryLabel}</p>
            <p className="dashboard-order-sheet-value">
              {formatPriceLabel(order.entryPrice, locale, order.priceDigits)}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.stopLossLabel}</p>
            <p className="dashboard-order-sheet-value">
              {formatPriceLabel(order.stopLoss, locale, order.priceDigits)}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.takeProfitLabel}</p>
            <p className="dashboard-order-sheet-value">{takeProfitLabel}</p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.takenTpLabel}</p>
            <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-taken">
              {takenTpLabel}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.remainingTpLabel}</p>
            <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-remaining">
              {remainingTpLabel}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.notAllocatedTpLabel}</p>
            <p className="dashboard-order-sheet-value dashboard-order-sheet-value-tp-progress is-not-allocated">
              {notAllocatedTpLabel}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.commissionLabel}</p>
            <p className="dashboard-order-sheet-value">
              {order.commission !== undefined && order.commission !== null
                ? formatMoney(order.commission, currency, locale)
                : '—'}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.swapLabel}</p>
            <p className="dashboard-order-sheet-value">
              {order.swap !== undefined && order.swap !== null
                ? formatMoney(order.swap, currency, locale)
                : '—'}
            </p>
          </div>
          <div>
            <p className="dashboard-order-sheet-label">{labels.netPnlLabel}</p>
            <p
              className={cn(
                'dashboard-order-sheet-value',
                pnlTrend ? 'dashboard-order-pnl dashboard-order-sheet-pnl' : undefined,
                pnlTrend ? `is-${pnlTrend}` : undefined
              )}
            >
              {pnlLabel ? (
                <>
                  <i
                    className={cn(
                      'fa-solid',
                      pnlTrend === 'down'
                        ? 'fa-arrow-trend-down'
                        : pnlTrend === 'up'
                          ? 'fa-arrow-trend-up'
                          : 'fa-minus'
                    )}
                    aria-hidden="true"
                  />
                  {pnlLabel}
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
        {action ?? (
          actionLabel ? (
            <>
              <button
                type="button"
                className="dashboard-order-sheet-action"
                onClick={onAction}
                disabled={actionDisabled}
              >
                {actionLabel}
              </button>
              {actionReason ? (
                <p className="dashboard-order-sheet-action-reason">{actionReason}</p>
              ) : null}
            </>
          ) : null
        )}
      </div>
    </div>
  );
}
