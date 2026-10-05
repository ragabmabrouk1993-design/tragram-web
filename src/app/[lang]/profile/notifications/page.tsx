"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileShell } from "@/components/profile/profile-shell";
import { MobileSaveBar } from "@/components/profile/mobile-save-bar";
import {
  notificationsService,
  type V2NotificationSettings,
} from "@/services/notifications.service";
import { toast } from "react-hot-toast";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NotificationToggleKey = keyof V2NotificationSettings["categories"];

const notificationOptionOrder: NotificationToggleKey[] = [
  "orderExecuted",
  "orderClosed",
  "breakeven",
  "tpHit",
  "stopLossHit",
  "signalRejection",
  "duplicated",
  "outOfMarketPrice",
  "outOfTolerance",
  "excludedSymbol",
  "insufficientBalance",
  "allowTradesWithoutSlTp",
  "allowForwardedSignals",
  "useBrokerMinimumLot",
  "limitOrderPlaced",
  "limitOrderExecuted",
  "limitOrderExpiration",
  "signalReceived",
  "signalCancelled",
  "serviceAlerts",
];

const NotificationsSkeleton = () => (
  <div className="profile-notifications-skeleton" aria-hidden="true">
    <div className="profile-notifications-card profile-notifications-skeleton-card">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={`profile-notifications-row-skeleton-${index}`} className="profile-notifications-item">
          <span className="profile-skeleton-line profile-skeleton-line-medium" />
          <span className="profile-notifications-skeleton-toggle" />
        </div>
      ))}
    </div>

    <span className="profile-notifications-skeleton-button" />
  </div>
);

export default function NotificationsPage() {
  const intlMessages = useRouteMessages();
  const copy = intlMessages.profilePages.notifications;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [toggles, setToggles] = useState<V2NotificationSettings["categories"] | null>(null);
  const [initialToggles, setInitialToggles] = useState<V2NotificationSettings["categories"] | null>(null);
  const [revision, setRevision] = useState<string | null>(null);

  const notificationOptions = useMemo(
    () => notificationOptionOrder.map(id => ({ id, label: copy.options[id] })),
    [copy.options]
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1200px)");
    const apply = (matches: boolean) => setIsDesktop(matches);
    apply(query.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      apply(event.matches);
    };

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleChange);
      return () => query.removeEventListener("change", handleChange);
    }

    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await notificationsService.getUserNotificationSettingsV2();
        if (!cancelled) {
          setRevision(response.revision);
          setToggles(response.settings.categories);
          setInitialToggles(response.settings.categories);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              intlMessages.profilePages.notifications.toastLoadError
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [intlMessages]);
  const enabledCount = useMemo(
    () =>
      toggles
        ? notificationOptionOrder.reduce(
            (count, key) => count + (toggles[key] ? 1 : 0),
            0
          )
        : 0,
    [toggles]
  );

  const handleToggle = (key: NotificationToggleKey) => {
    setToggles((current) => (current ? { ...current, [key]: !current[key] } : current));
  };

  const handleSave = async () => {
    if (!toggles || !initialToggles) {
      return;
    }

    const updates = Object.fromEntries(
      notificationOptionOrder
        .filter((key) => toggles[key] !== initialToggles[key])
        .map((key) => [key, toggles[key]])
    ) as Partial<V2NotificationSettings["categories"]>;

    if (Object.keys(updates).length === 0 || !revision) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await notificationsService.updateUserNotificationSettingsV2(revision, { categories: updates });
      setRevision(response.revision);
      setToggles(response.settings.categories);
      setInitialToggles(response.settings.categories);
      toast.success(intlMessages.profilePages.notifications.toastSaveSuccess);
    } catch (error) {
      try {
        const latest = await notificationsService.getUserNotificationSettingsV2();
        setRevision(latest.revision);
        setToggles(latest.settings.categories);
        setInitialToggles(latest.settings.categories);
      } catch {
        setToggles(initialToggles);
      }
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) ||
          intlMessages.profilePages.notifications.toastSaveError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    Boolean(toggles && initialToggles) &&
    notificationOptionOrder.some((key) => toggles?.[key] !== initialToggles?.[key]);

  if (isLoading) {
    return (
      <ProfileShell
        title={intlMessages.profilePages.notifications.title}
        subtitle={intlMessages.profilePages.notifications.subtitle}
        backHref="/profile"
        variant={isDesktop ? "default" : "mobile"}
        shellClassName="profile-notifications-shell"
        showSidebar={!isDesktop}
        showBreadcrumbs={!isDesktop}
      >
        <NotificationsSkeleton />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title={intlMessages.profilePages.notifications.title}
      subtitle={intlMessages.profilePages.notifications.subtitle}
      backHref="/profile"
      variant={isDesktop ? "default" : "mobile"}
      shellClassName="profile-notifications-shell"
      showSidebar={!isDesktop}
      showBreadcrumbs={!isDesktop}
    >
      <div className="profile-page-stage profile-notifications-stage profile-mobile-adaptive-layout">
        {isDesktop && (
          <div className="profile-page-hero">
            <span className="profile-page-eyebrow">{intlMessages.profileNav.sectionAccount}</span>
            <h1 className="profile-page-title">{intlMessages.profilePages.notifications.title}</h1>
            <p className="profile-page-copy">{intlMessages.profilePages.notifications.subtitle}</p>
          </div>
        )}

        <div className="profile-page-flow profile-notifications-layout">
          <aside className="profile-page-aside profile-notifications-aside">
            <div className="profile-card profile-page-support-card profile-notifications-card profile-notifications-summary-card">
              <div className="profile-notifications-summary-head">
                <div className="profile-notifications-summary-copy">
                  <p className="profile-panel-label">{copy.globalSettings}</p>
                  <p className="profile-notifications-current-label">
                    {copy.allMtAccounts}
                  </p>
                </div>
                <span className="profile-notifications-enabled-badge">
                  {enabledCount}/{notificationOptionOrder.length}
                </span>
              </div>

              <div className="profile-notifications-stat-grid">
                <div className="profile-notifications-stat-tile">
                  <span className="profile-page-section-label">{copy.enabledAlerts}</span>
                  <span className="profile-notifications-stat-value">{enabledCount}</span>
                </div>
                <div className="profile-notifications-stat-tile">
                  <span className="profile-page-section-label">{copy.scope}</span>
                  <span className="profile-notifications-stat-value">
                    {copy.globalScope}
                  </span>
                </div>
              </div>

              <p className="profile-page-section-copy">
                {copy.globalPreferencesDescription}
              </p>
            </div>
          </aside>

          <div className="profile-page-main profile-notifications-main">
            <div className="profile-card profile-page-panel profile-notifications-card">
              <div className="profile-notifications-section-heading">
                <p className="profile-page-section-label">{copy.alertDelivery}</p>
                <p className="profile-page-section-copy">
                  {copy.alertDeliveryDescription}
                </p>
              </div>

              {toggles ? (
                <div className="profile-notifications-list">
                  {notificationOptions.map((option) => {
                    const isActive = toggles[option.id];

                    return (
                      <div className="profile-notifications-item" key={option.id}>
                        <div className="profile-notifications-item-copy">
                          <span className="profile-notifications-item-label">{option.label}</span>
                          <span className="profile-notifications-item-status">
                            {isActive
                              ? intlMessages.profilePages.notifications.statusEnabled
                              : intlMessages.profilePages.notifications.statusDisabled}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isSaving || isLoading}
                          className={cn("profile-notifications-toggle", isActive && "is-active")}
                          aria-label={option.label}
                          aria-pressed={isActive}
                          onClick={() => handleToggle(option.id)}
                        >
                          <span />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="profile-notifications-empty">
                  {copy.settingsUnavailable}
                </div>
              )}
            </div>

            {isDesktop ? (
              <div className="profile-card profile-page-support-card profile-notifications-card profile-notifications-action-card">
                <div className="profile-notifications-action-copy">
                  <p className="profile-more-label">{intlMessages.profilePages.notifications.save}</p>
                  <p className="profile-more-sub">
                    {isDirty
                      ? copy.unsavedChanges
                      : copy.upToDate}
                  </p>
                </div>
                <Button
                  variant="gradient"
                  className="profile-button profile-button-full profile-notifications-save"
                  onClick={handleSave}
                  disabled={isSaving || !isDirty || !toggles}
                >
                  {isSaving
                    ? intlMessages.profilePages.notifications.saving
                    : intlMessages.profilePages.notifications.save}
                </Button>
              </div>
            ) : (
              <MobileSaveBar
                label={intlMessages.profilePages.notifications.save}
                loadingLabel={intlMessages.profilePages.notifications.saving}
                isLoading={isSaving}
                disabled={isSaving || !isDirty || !toggles}
                onClick={handleSave}
                className="profile-mobile-save-bar--profile-forms"
              />
            )}
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
