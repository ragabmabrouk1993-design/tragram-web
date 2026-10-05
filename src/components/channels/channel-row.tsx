"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChannelAvatar } from "@/components/channels/channel-avatar";

export type ChannelRowProps = {
  title: string;
  subtitle?: React.ReactNode;
  imageUrl?: string | null;
  enabled?: boolean;
  toggleDisabled?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  href?: string;
  onOpen?: () => void;
  trend?: "up" | "down" | "flat";
  performanceLabel?: string;
  deleteLabel?: string;
  deleteAriaLabel?: string;
  enableAriaLabel?: string;
  disableAriaLabel?: string;
  toggleDisabledAriaLabel?: string;
  statusAction?: {
    label: string;
    ariaLabel?: string;
    onClick: () => void;
    disabled?: boolean;
  };
};

export function ChannelRow({
  title,
  subtitle,
  imageUrl,
  enabled,
  toggleDisabled = false,
  onToggle,
  onDelete,
  href,
  onOpen,
  trend,
  performanceLabel,
  deleteLabel = "Delete",
  deleteAriaLabel = "Delete channel",
  enableAriaLabel = "Enable channel",
  disableAriaLabel = "Disable channel",
  toggleDisabledAriaLabel = "Channel toggle is unavailable",
  statusAction,
}: ChannelRowProps) {
  const [isSwiped, setIsSwiped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const swipeEnabled = typeof onDelete === "function";
  const swipeOffset = useMemo(() => (isSwiped ? "-78px" : "0px"), [isSwiped]);

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
      className={cn("channels-swipe", isSwiped && "is-swiped")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {swipeEnabled && (
        <button
          type="button"
          className="channels-action-rail"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
          aria-label={deleteAriaLabel}
          aria-hidden={!isSwiped}
          tabIndex={isSwiped ? 0 : -1}
        >
          <i className="fa-solid fa-trash" aria-hidden="true" />
          <span>{deleteLabel}</span>
        </button>
      )}
      <div className="channels-swipe-track" style={{ transform: `translateX(${swipeOffset})` }}>
        <div className="channels-row">
          {href ? (
            <Link href={href} className="channels-row-button">
              <div className="channels-row-info">
                <ChannelAvatar imageUrl={imageUrl} />
                <div>
                  <p className="channels-row-title">{title}</p>
                  {subtitle && <p className="channels-row-subtitle">{subtitle}</p>}
                  {performanceLabel && (
                    <p className={cn("channels-row-subtitle", "channels-row-performance", trend)}>
                      <i
                        className={cn(
                          "fa-solid",
                          trend === "down"
                            ? "fa-arrow-trend-down"
                            : trend === "up"
                            ? "fa-arrow-trend-up"
                            : "fa-minus"
                        )}
                        aria-hidden="true"
                      />
                      {performanceLabel}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ) : onOpen ? (
            <button type="button" className="channels-row-button" onClick={onOpen}>
              <div className="channels-row-info">
                <ChannelAvatar imageUrl={imageUrl} />
                <div>
                  <p className="channels-row-title">{title}</p>
                  {subtitle && <p className="channels-row-subtitle">{subtitle}</p>}
                  {performanceLabel && (
                    <p className={cn("channels-row-subtitle", "channels-row-performance", trend)}>
                      <i
                        className={cn(
                          "fa-solid",
                          trend === "down"
                            ? "fa-arrow-trend-down"
                            : trend === "up"
                            ? "fa-arrow-trend-up"
                            : "fa-minus"
                        )}
                        aria-hidden="true"
                      />
                      {performanceLabel}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ) : (
            <div className="channels-row-info">
              <ChannelAvatar imageUrl={imageUrl} />
              <div>
                <p className="channels-row-title">{title}</p>
                {subtitle && <p className="channels-row-subtitle">{subtitle}</p>}
                {performanceLabel && (
                  <p className={cn("channels-row-subtitle", "channels-row-performance", trend)}>
                    <i
                      className={cn(
                        "fa-solid",
                        trend === "down"
                          ? "fa-arrow-trend-down"
                          : trend === "up"
                          ? "fa-arrow-trend-up"
                          : "fa-minus"
                      )}
                      aria-hidden="true"
                    />
                    {performanceLabel}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="channels-row-actions">
            {statusAction && (
              <button
                type="button"
                className="channels-status-action"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  statusAction.onClick();
                }}
                disabled={statusAction.disabled}
                aria-label={statusAction.ariaLabel ?? statusAction.label}
              >
                {statusAction.label}
              </button>
            )}
            {swipeEnabled && (
              <button
                type="button"
                className="channels-delete-icon"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete?.();
                }}
                aria-label={deleteAriaLabel}
              >
                <i className="fa-solid fa-trash" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className={cn("channels-toggle", enabled && "is-active", toggleDisabled && "is-disabled")}
              onClick={onToggle}
              disabled={toggleDisabled}
              aria-pressed={enabled}
              aria-label={
                toggleDisabled ? toggleDisabledAriaLabel : enabled ? disableAriaLabel : enableAriaLabel
              }
            >
              <span />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
