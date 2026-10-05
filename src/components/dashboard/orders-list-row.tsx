'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type OrdersListRowProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  subtitle?: string;
  sideText?: string;
  sideTone?: 'buy' | 'sell' | 'neutral';
  entryText?: string;
  meta?: string;
  amount?: string;
  status?: string;
  pnl?: string;
  pnlTrend?: 'up' | 'down' | 'flat';
  leading?: React.ReactNode;
  swipeActionLabel?: string;
  swipeActionIcon?: React.ReactNode;
  onSwipeAction?: () => void;
  action?: React.ReactNode;
};

export function OrdersListRow({
  title,
  subtitle,
  sideText,
  sideTone = 'neutral',
  entryText,
  meta,
  amount,
  status,
  pnl,
  pnlTrend = 'flat',
  leading,
  swipeActionLabel,
  swipeActionIcon,
  onSwipeAction,
  action,
  className,
  onClick,
  onKeyDown,
  ...props
}: OrdersListRowProps) {
  const [isSwiped, setIsSwiped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const swipeEnabled = Boolean(swipeActionLabel);
  const swipeOffset = useMemo(() => (isSwiped ? '-78px' : '0px'), [isSwiped]);
  const isInteractive = typeof onClick === 'function';
  const role = isInteractive ? 'button' : undefined;
  const tabIndex = isInteractive ? 0 : undefined;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
    onKeyDown?.(event);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeEnabled) return;
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeEnabled || touchStartX === null) return;
    const deltaX = event.touches[0]?.clientX - touchStartX;
    if (deltaX < -40) setIsSwiped(true);
    if (deltaX > 20) setIsSwiped(false);
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  return (
    <div
      className={cn('dashboard-order-swipe', isSwiped && 'is-swiped', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={tabIndex}
      {...props}
    >
      {swipeEnabled && (
        <button
          type="button"
          className="dashboard-order-action-rail"
          onClick={(event) => {
            event.stopPropagation();
            onSwipeAction?.();
          }}
          aria-label={swipeActionLabel}
        >
          {swipeActionIcon ?? <i className="fa-solid fa-trash" aria-hidden="true" />}
          <span>{swipeActionLabel}</span>
        </button>
      )}
      <div
        className="dashboard-order-swipe-track"
        style={{ transform: `translateX(${swipeOffset})` }}
      >
        <div className="dashboard-order-row">
          <div className="dashboard-order-info">
            <div className="dashboard-order-title-row">
              {leading && <span className="dashboard-order-leading">{leading}</span>}
              <p className="dashboard-order-title">{title}</p>
            </div>
            {(sideText || entryText || subtitle) && (
              <p className="dashboard-order-subtitle">
                {sideText ? (
                  <span className={cn('dashboard-order-side', `is-${sideTone}`)}>{sideText}</span>
                ) : (
                  <span>{subtitle}</span>
                )}
                {entryText && <span className="dashboard-order-entry">{entryText}</span>}
              </p>
            )}
            {meta && <p className="dashboard-order-meta">{meta}</p>}
          </div>
          <div className="dashboard-order-summary">
            {status && <span className="dashboard-order-status">{status}</span>}
            {amount && <span className="dashboard-order-amount">{amount}</span>}
            {pnl && (
              <span className={cn('dashboard-order-pnl', `is-${pnlTrend}`)}>
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
                {pnl}
              </span>
            )}
            {action && <span className="dashboard-order-action">{action}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
