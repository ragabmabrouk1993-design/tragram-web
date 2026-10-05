'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import type { MtAccountSubscribedChannel } from '@/lib/api-client';
import { AccountChannelStack } from '@/components/dashboard/account-channel-stack';

type AccountChip = {
  label: string;
  tone: 'accent' | 'muted' | 'online' | 'error';
};

type MtAccountSheetCardProps = {
  accountNumber: string;
  amountLabel: string;
  pnlLabel: string;
  pnlTrend?: 'up' | 'down' | null;
  chips: AccountChip[];
  channels?: Array<MtAccountSubscribedChannel> | null;
  isSelected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onDisconnect?: () => void;
  onDelete?: () => void;
  setPrimaryLabel?: string;
  selectedLabel?: string;
  disconnectLabel: string;
  deleteLabel: string;
  disconnectAriaLabel?: string;
  deleteAriaLabel?: string;
};

const SWIPE_ACTION_WIDTH = 92;

export function MtAccountSheetCard({
  accountNumber,
  amountLabel,
  pnlLabel,
  pnlTrend,
  chips,
  channels,
  isSelected = false,
  disabled = false,
  onSelect,
  onDisconnect,
  onDelete,
  setPrimaryLabel,
  selectedLabel,
  disconnectLabel,
  deleteLabel,
  disconnectAriaLabel,
  deleteAriaLabel,
}: MtAccountSheetCardProps) {
  const [swipeSide, setSwipeSide] = useState<'start' | 'end' | null>(null);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const [gestureStartSide, setGestureStartSide] = useState<'start' | 'end' | null>(null);
  const [desktopActionsEnabled, setDesktopActionsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const updateMode = () => setDesktopActionsEnabled(mediaQuery.matches);

    updateMode();
    mediaQuery.addEventListener('change', updateMode);

    return () => {
      mediaQuery.removeEventListener('change', updateMode);
    };
  }, []);

  const swipeEnabled = !desktopActionsEnabled && Boolean(onDisconnect || onDelete);
  const cardSelectable = !desktopActionsEnabled && Boolean(onSelect);
  const hasInlineActions = Boolean(onSelect || onDisconnect || onDelete);

  const swipeOffset = useMemo(() => {
    if (swipeSide === 'start') {
      return `${SWIPE_ACTION_WIDTH}px`;
    }
    if (swipeSide === 'end') {
      return `-${SWIPE_ACTION_WIDTH}px`;
    }
    return '0px';
  }, [swipeSide]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || disabled) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    setPointerStartX(event.clientX);
    setGestureStartSide(swipeSide);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || disabled || pointerStartX === null) {
      return;
    }
    const deltaX = event.clientX - pointerStartX;

    if (gestureStartSide === 'start') {
      if (deltaX <= -40) {
        setSwipeSide(null);
      } else if (deltaX >= 16) {
        setSwipeSide('start');
      }
      return;
    }

    if (gestureStartSide === 'end') {
      if (deltaX >= 40) {
        setSwipeSide(null);
      } else if (deltaX <= -16) {
        setSwipeSide('end');
      }
      return;
    }

    if (deltaX <= -40 && onDelete) {
      setSwipeSide('end');
      return;
    }
    if (deltaX >= 40 && onDisconnect) {
      setSwipeSide('start');
      return;
    }
    if (Math.abs(deltaX) < 16) {
      setSwipeSide(null);
    }
  };

  const handlePointerEnd = () => {
    setPointerStartX(null);
    setGestureStartSide(null);
  };

  const handleActivate = () => {
    if (disabled) {
      return;
    }
    if (swipeSide) {
      setSwipeSide(null);
      return;
    }
    onSelect?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      className={cn(
        'dashboard-account-swipe',
        swipeSide === 'start' && 'is-swiped-start',
        swipeSide === 'end' && 'is-swiped-end'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
    >
      {onDisconnect && (
        <button
          type="button"
          className="dashboard-account-action-rail dashboard-account-action-rail-start"
          onClick={(event) => {
            event.stopPropagation();
            onDisconnect();
          }}
          aria-label={disconnectAriaLabel ?? disconnectLabel}
          disabled={disabled}
        >
          <Image
            src="/assets/icons/disconnect-account.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
            className="dashboard-account-action-rail-icon"
          />
          <span>{disconnectLabel}</span>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          className="dashboard-account-action-rail dashboard-account-action-rail-end"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={deleteAriaLabel ?? deleteLabel}
          disabled={disabled}
        >
          <Image
            src="/assets/icons/delete-account.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
            className="dashboard-account-action-rail-icon"
          />
          <span>{deleteLabel}</span>
        </button>
      )}

      <div
        className="dashboard-account-swipe-track"
        style={{ transform: `translateX(${swipeOffset})` }}
      >
        <div
          className={cn('dashboard-account-card', isSelected && 'is-selected')}
          role={cardSelectable ? 'button' : undefined}
          tabIndex={cardSelectable && !disabled ? 0 : undefined}
          onClick={cardSelectable ? handleActivate : undefined}
          onKeyDown={cardSelectable ? handleKeyDown : undefined}
        >
          <div className="dashboard-account-card-main">
            <div className="dashboard-account-card-row">
              <div className="dashboard-account-meta">
                <p className="dashboard-account-number">#{accountNumber}</p>
              </div>
              <div className="dashboard-account-balance">
                <span className="dashboard-account-balance-value">{amountLabel}</span>
                <span
                  className={cn(
                    'dashboard-account-pnl',
                    pnlTrend === 'up' && 'is-up',
                    pnlTrend === 'down' && 'is-down',
                    pnlTrend === null && 'is-flat'
                  )}
                >
                  {pnlTrend && (
                    <i
                      className={cn(
                        'fa-solid',
                        pnlTrend === 'down' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {pnlLabel}
                </span>
              </div>
            </div>

            <div className="dashboard-account-card-row dashboard-account-card-row-footer">
              <div className="dashboard-account-card-presence">
                <div className="dashboard-account-chips">
                  {chips.map((chip) => (
                    <span
                      key={`${chip.tone}-${chip.label}`}
                      className={cn(
                        'dashboard-tag',
                        chip.tone === 'accent' && 'dashboard-tag-accent',
                        chip.tone === 'muted' && 'dashboard-tag-muted',
                        chip.tone === 'online' && 'dashboard-tag-online',
                        chip.tone === 'error' && 'dashboard-tag-error'
                      )}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
                <AccountChannelStack channels={channels} />
              </div>
              {hasInlineActions && (
                <div className="dashboard-account-card-actions">
                  {onSelect && (
                    <button
                      type="button"
                      className={cn(
                        'dashboard-account-inline-action',
                        'is-select',
                        isSelected && 'is-current'
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!isSelected) {
                          onSelect();
                        }
                      }}
                      disabled={disabled || isSelected}
                    >
                      {isSelected ? selectedLabel ?? setPrimaryLabel : setPrimaryLabel}
                    </button>
                  )}
                  {onDisconnect && (
                    <button
                      type="button"
                      className="dashboard-account-inline-action is-disconnect"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDisconnect();
                      }}
                      disabled={disabled}
                      aria-label={disconnectAriaLabel ?? disconnectLabel}
                    >
                      <Image
                        src="/assets/icons/disconnect-account.svg"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="dashboard-account-action-rail-icon"
                      />
                      <span>{disconnectLabel}</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="dashboard-account-inline-action is-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                      }}
                      disabled={disabled}
                      aria-label={deleteAriaLabel ?? deleteLabel}
                    >
                      <Image
                        src="/assets/icons/delete-account.svg"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="dashboard-account-action-rail-icon"
                      />
                      <span>{deleteLabel}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
