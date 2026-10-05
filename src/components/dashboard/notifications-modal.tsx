'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCheck } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { cn } from '@/lib/utils';
import { resolveNotificationOriginLabel } from './notifications-origin';
import styles from './notifications-modal.module.css';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

export type DashboardNotification = {
  id: string;
  threadId?: string;
  signalId?: string;
  mtAccountId?: string | null;
  title: string;
  message: string;
  createdAt: string; // ISO string
  type?: string;
  source?: string;
  avatarUrl?: string;
  referenceLabel?: string;
  eventLabel?: string;
  what?: string;
  why?: string;
  possibleIssue?: string;
  read?: boolean;
};

export type DashboardNotificationThread = {
  threadId: string;
  groupKey?: string;
  threadKind: string;
  scopeKind?: 'MT_ACCOUNT' | 'GLOBAL';
  scopeKey?: string;
  signalId?: string;
  mtAccountId?: string | null;
  updatedAt: string;
  unreadCount: number;
  hasUnread: boolean;
  sourceLabel?: string;
  journeyLabel?: string;
  previewText?: string;
  latestNotification: DashboardNotification;
  notifications: DashboardNotification[];
  eventCursor?: string | null;
  eventsHasMore?: boolean;
};

type GroupedThreads = Record<string, DashboardNotificationThread[]>;

type NotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  threads: DashboardNotificationThread[];
  title?: string;
  selectedContextLabel?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isMarkingAllRead?: boolean;
  canMarkAllRead?: boolean;
  onLoadMore?: () => void;
  onMarkAllRead?: () => void;
  onOpenThread?: (threadId: string) => void;
  loadingThreadIds?: string[];
  onLoadMoreThreadEvents?: (threadId: string) => void;
  loadingThreadEventIds?: string[];
  mtAccountNumbersById?: Readonly<Record<string, string>>;
};

const toDomSafeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '-');

export function NotificationsModal({
  open,
  onClose,
  threads,
  title,
  selectedContextLabel,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  isMarkingAllRead = false,
  canMarkAllRead = false,
  onLoadMore,
  onMarkAllRead,
  onOpenThread,
  loadingThreadIds = [],
  onLoadMoreThreadEvents,
  loadingThreadEventIds = [],
  mtAccountNumbersById = {},
}: NotificationsModalProps) {
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardPage.notificationsModal;
  const [expandedThreadIdState, setExpandedThreadIdState] = useState<string | null>(null);
  const [markAllConfirmOpen, setMarkAllConfirmOpen] = useState(false);
  const trackedOpen = useRef(false);
  const expandedThreadId = useMemo(
    () =>
      open && expandedThreadIdState && threads.some((thread) => thread.threadId === expandedThreadIdState)
        ? expandedThreadIdState
        : null,
    [expandedThreadIdState, open, threads]
  );

  useEffect(() => {
    if (!open) {
      trackedOpen.current = false;
      return;
    }
    if (trackedOpen.current) return;
    trackedOpen.current = true;
    trackAnalyticsEvent('notifications_viewed', {
      unread_count: threads.reduce((total, thread) => total + Math.max(0, thread.unreadCount), 0),
    });
  }, [open, threads]);

  const handleClose = useCallback(() => {
    setExpandedThreadIdState(null);
    setMarkAllConfirmOpen(false);
    onClose();
  }, [onClose]);

  const handleMarkAllClick = useCallback(() => {
    if (!onMarkAllRead || !canMarkAllRead || isMarkingAllRead) {
      return;
    }
    setMarkAllConfirmOpen(true);
  }, [canMarkAllRead, isMarkingAllRead, onMarkAllRead]);

  const handleDismissMarkAllConfirm = useCallback(() => {
    setMarkAllConfirmOpen(false);
  }, []);

  const handleConfirmMarkAllRead = useCallback(() => {
    setMarkAllConfirmOpen(false);
    onMarkAllRead?.();
  }, [onMarkAllRead]);

  const handleToggleThread = useCallback(
    (threadId: string) => {
      const isOpening = expandedThreadId !== threadId;
      setExpandedThreadIdState(isOpening ? threadId : null);
      if (isOpening) {
        onOpenThread?.(threadId);
      }
    },
    [expandedThreadId, onOpenThread]
  );

  const parseSafeDate = useCallback((value: string): Date => {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
    return new Date();
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [lang]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    [lang]
  );

  const buildSectionLabel = useCallback(
    (date: Date): string => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const isSame = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      if (isSame(date, today)) return t.today;
      if (isSame(date, yesterday)) return t.yesterday;
      return dateFormatter.format(date);
    },
    [dateFormatter, t.today, t.yesterday]
  );

  const formatDateTime = (date: Date) => `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;

  const grouped = useMemo(() => {
    const groups: GroupedThreads = {};
    threads
      .slice()
      .sort((a, b) => parseSafeDate(b.updatedAt).getTime() - parseSafeDate(a.updatedAt).getTime())
      .forEach((thread) => {
        const date = parseSafeDate(thread.updatedAt);
        const label = buildSectionLabel(date);
        groups[label] = groups[label] ? [...groups[label], thread] : [thread];
      });
    return groups;
  }, [buildSectionLabel, parseSafeDate, threads]);

  if (!open) return null;

  return (
    <div className={cn("dashboard-sheet-backdrop", styles.backdrop)} onClick={handleClose}>
      <div
        className={cn("dashboard-accounts-sheet", styles.sheet)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t.title}
      >
        <div className={styles.hero}>
          <div className={styles.heroBar}>
            <BackButton
              ariaLabel={t.closeAria}
              className={styles.backButton}
              onClick={handleClose}
            />
            <h2 className={styles.title}>{title ?? t.title}</h2>
            <button
              type="button"
              className={styles.markAllButton}
              aria-label={isMarkingAllRead ? t.markAllReadLoadingAria : t.markAllReadAria}
              title={t.markAllReadAria}
              onClick={handleMarkAllClick}
              disabled={!onMarkAllRead || !canMarkAllRead || isMarkingAllRead}
            >
              <CheckCheck className={styles.markAllIcon} size={18} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.heroContext}>
            <span className={styles.contextChip}>
              {selectedContextLabel
                ? t.accountContext.replace("{account}", selectedContextLabel)
                : t.system}
            </span>
            <span className={styles.contextHint}>{t.globalHint}</span>
          </div>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.skeleton} aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`notification-skeleton-${index}`} className={styles.skeletonItem}>
                  <div className={styles.skeletonAvatar} />
                  <div className={styles.skeletonBody}>
                    <div className={cn(styles.skeletonLine, styles.skeletonLineMedium)} />
                    <div className={cn(styles.skeletonLine, styles.skeletonLineWide)} />
                    <div className={cn(styles.skeletonLine, styles.skeletonLineShort)} />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className={styles.empty}>
              <p>{t.empty}</p>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([label, items]) => (
                <div key={label} className={styles.section}>
                  <p className={styles.sectionLabel}>
                    {label}
                    {t.sectionSuffix}
                  </p>
                  <div className="space-y-3">
                    {items.map((thread) => {
                      const latest = thread.latestNotification;
                      const date = parseSafeDate(thread.updatedAt);
                      const isExpanded = expandedThreadId === thread.threadId;
                      const isThreadLoading = loadingThreadIds.includes(thread.threadId);
                      const isThreadEventsLoading = loadingThreadEventIds.includes(thread.threadId);
                      const sourceLabel = thread.sourceLabel ?? latest.source ?? t.system;
                      const journeyLabel =
                        thread.journeyLabel ?? latest.referenceLabel ?? latest.title;
                      const previewText = thread.previewText ?? latest.message;
                      const isGlobalThread = !thread.mtAccountId;
                      const originLabel = resolveNotificationOriginLabel(
                        {
                          mtAccountId: thread.mtAccountId ?? latest.mtAccountId,
                          scopeKind: thread.scopeKind,
                        },
                        mtAccountNumbersById,
                        {
                          originAccount: t.originAccount,
                          retainedAccount: t.retainedAccount,
                        },
                      );
                      const domSafeId = toDomSafeId(thread.threadId);
                      const triggerId = `dashboard-notification-thread-trigger-${domSafeId}`;
                      const panelId = `dashboard-notification-thread-panel-${domSafeId}`;
                      const dateLabel = dateFormatter.format(date);
                      const timeLabel = timeFormatter.format(date);

                      return (
                        <article
                          className={cn(
                            styles.cardItem,
                            isExpanded && styles.cardItemExpanded,
                            thread.hasUnread && styles.cardItemUnread,
                            isGlobalThread && styles.cardItemSystem,
                          )}
                          key={thread.threadId}
                        >
                          <button
                            type="button"
                            className={styles.cardTrigger}
                            onClick={() => handleToggleThread(thread.threadId)}
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            id={triggerId}
                          >
                            <div className={styles.cardHead}>
                              <div className={styles.cardOrigin}>
                                <div className={styles.avatar}>
                                  {latest.avatarUrl ? (
                                    <Image
                                      src={latest.avatarUrl}
                                      alt={sourceLabel}
                                      width={20}
                                      height={20}
                                    />
                                  ) : (
                                    <div className={styles.avatarFallback}>
                                      <i className="fa-solid fa-bell" aria-hidden />
                                    </div>
                                  )}
                                </div>
                                <p className={styles.cardSource}>
                                  {sourceLabel}
                                </p>
                                {thread.hasUnread ? (
                                  <span
                                    className={styles.threadDot}
                                    aria-label={t.unreadUpdates}
                                  />
                                ) : null}
                              </div>
                              <div className={styles.cardMeta}>
                                <time
                                  className={styles.cardDate}
                                  dateTime={date.toISOString()}
                                  aria-label={formatDateTime(date)}
                                >
                                  <span className={styles.cardDatePart}>{dateLabel}</span>
                                  <span className={styles.cardTimePart}>{timeLabel}</span>
                                </time>
                                <span className={styles.cardChevron} aria-hidden="true" />
                              </div>
                            </div>
                            {latest.eventLabel || originLabel ? (
                              <div className={styles.cardStatusRow}>
                                {originLabel ? <span className={styles.eventChip}>{originLabel}</span> : null}
                                {latest.eventLabel ? (
                                  <span className={styles.eventChip}>{latest.eventLabel}</span>
                                ) : null}
                              </div>
                            ) : null}
                            <p className={styles.cardTitle}>{journeyLabel}</p>
                            <p className={styles.cardPreview}>{previewText}</p>
                          </button>
                          <div
                            className={styles.cardPanel}
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId}
                            hidden={!isExpanded}
                          >
                            {isThreadLoading ? (
                              <p className={styles.cardMessage}>{t.loading}</p>
                            ) : thread.notifications.length === 0 ? (
                              <p className={styles.cardMessage}>{latest.message}</p>
                            ) : (
                              <div className={styles.threadTimeline}>
                                {thread.notifications.map((notification) => {
                                  const eventDate = parseSafeDate(notification.createdAt);
                                  return (
                                    <article key={notification.id} className={styles.threadItem}>
                                      <div className={styles.threadItemMeta}>
                                        <time dateTime={eventDate.toISOString()}>
                                          {timeFormatter.format(eventDate)}
                                        </time>
                                        <span className={styles.threadItemEvent}>
                                          {notification.eventLabel ?? notification.title}
                                        </span>
                                      </div>
                                      <p className={styles.cardMessage}>{notification.message}</p>
                                      {notification.why ? (
                                        <p className={styles.cardMessage}>{notification.why}</p>
                                      ) : null}
                                      {notification.possibleIssue ? (
                                        <p className={styles.cardMessage}>
                                          {notification.possibleIssue}
                                        </p>
                                      ) : null}
                                    </article>
                                  );
                                })}
                              </div>
                            )}
                            {thread.eventsHasMore && onLoadMoreThreadEvents ? (
                              <button
                                type="button"
                                className={styles.loadMore}
                                onClick={() => onLoadMoreThreadEvents(thread.threadId)}
                                disabled={isThreadEventsLoading}
                              >
                                {isThreadEventsLoading ? t.loadingMore : t.loadMore}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
              {hasMore && onLoadMore && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.loadMore}
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? t.loadingMore : t.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {markAllConfirmOpen ? (
        <div
          className={styles.confirmBackdrop}
          onClick={(event) => {
            event.stopPropagation();
            handleDismissMarkAllConfirm();
          }}
        >
          <div
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-label={t.markAllReadConfirmTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.confirmTitle}>{t.markAllReadConfirmTitle}</p>
            <p className={styles.confirmMessage}>{t.markAllReadConfirmMessage}</p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={handleDismissMarkAllConfirm}
                disabled={isMarkingAllRead}
              >
                {t.markAllReadConfirmCancel}
              </button>
              <button
                type="button"
                className={styles.confirmAccept}
                onClick={handleConfirmMarkAllRead}
                disabled={isMarkingAllRead}
              >
                {isMarkingAllRead ? t.markAllReadConfirmPending : t.markAllReadConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
