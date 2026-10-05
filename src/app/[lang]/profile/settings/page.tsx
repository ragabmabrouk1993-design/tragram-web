'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileShell } from '@/components/profile/profile-shell';
import { Loader2, Trash2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { userService, UpdateProfileData, UpdatePreferencesData } from '@/services/user.service';
import { notificationsService } from '@/services/notifications.service';
import { toast } from 'react-hot-toast';
import { getLocalizedErrorMessage } from '@/lib/error-utils';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { localizePath } from '@/lib/i18n';
import { mapApiFormErrors } from '@/lib/auth-form-errors';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

type SettingsProfileField = 'firstName' | 'lastName';
type SettingsPasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

const ProfileSettingsSkeleton = () => (
  <div className="profile-settings-skeleton profile-settings-skeleton-detailed" aria-hidden="true">
    <div className="profile-settings-skeleton-title" />

    <div className="profile-settings-skeleton-panel">
      <div className="profile-settings-skeleton-header">
        <span className="profile-skeleton-circle" />
        <span className="profile-skeleton-line profile-skeleton-line-medium" />
      </div>
      <div className="profile-settings-skeleton-fields is-two-col">
        <span className="profile-settings-skeleton-input" />
        <span className="profile-settings-skeleton-input" />
      </div>
      <div className="profile-settings-skeleton-fields">
        <span className="profile-settings-skeleton-input" />
        <span className="profile-settings-skeleton-input" />
      </div>
      <span className="profile-settings-skeleton-button" />
    </div>

    <div className="profile-settings-skeleton-panel">
      <div className="profile-settings-skeleton-header">
        <span className="profile-skeleton-circle" />
        <span className="profile-skeleton-line profile-skeleton-line-medium" />
      </div>
      <div className="profile-settings-skeleton-switch-list">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`profile-settings-switch-skeleton-${index}`}
            className="profile-settings-skeleton-switch-row"
          >
            <div className="profile-skeleton-content">
              <span className="profile-skeleton-line profile-skeleton-line-medium" />
              <span className="profile-skeleton-line profile-skeleton-line-short" />
            </div>
            <span className="profile-notifications-skeleton-toggle" />
          </div>
        ))}
      </div>
    </div>

    <div className="profile-settings-skeleton-panel">
      <div className="profile-settings-skeleton-header">
        <span className="profile-skeleton-circle" />
        <span className="profile-skeleton-line profile-skeleton-line-medium" />
      </div>
      <div className="profile-settings-skeleton-fields">
        <span className="profile-settings-skeleton-input" />
        <span className="profile-settings-skeleton-input" />
        <span className="profile-settings-skeleton-input" />
      </div>
      <span className="profile-settings-skeleton-button" />
    </div>

    <div className="profile-settings-skeleton-panel is-danger">
      <div className="profile-settings-skeleton-header">
        <span className="profile-skeleton-circle" />
        <span className="profile-skeleton-line profile-skeleton-line-short" />
      </div>
      <span className="profile-skeleton-line profile-skeleton-line-wide" />
      <span className="profile-skeleton-line profile-skeleton-line-medium" />
      <span className="profile-settings-skeleton-button is-danger" />
    </div>
  </div>
);

export default function SettingsPage() {
  const router = useRouter();
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialProfile, setInitialProfile] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [performanceReports, setPerformanceReports] = useState(false);
  const [notificationRevision, setNotificationRevision] = useState<string | null>(null);
  const [reportFrequency, setReportFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileErrors, setProfileErrors] = useState<{
    firstName?: string;
    lastName?: string;
    form?: string;
  }>({});
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1200px)');
    const apply = (matches: boolean) => setIsDesktop(matches);
    apply(query.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      apply(event.matches);
    };

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange);
      return () => query.removeEventListener('change', handleChange);
    }

    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profile, preferences, notificationSettings] = await Promise.all([
          authService.getProfile(),
          userService.getPreferences(),
          notificationsService.getUserNotificationSettingsV2(),
        ]);

        if (!profile) {
          throw new Error('Profile missing');
        }

        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setEmail(profile.email ?? '');
        setPhoneNumber(profile.phoneNumber ?? '');
        setInitialProfile({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
        });

        setNotificationRevision(notificationSettings.revision);
        setNotificationsEnabled(notificationSettings.settings.notificationsEnabled);
        setEmailNotifications(preferences.emailNotifications);
        setPushNotifications(notificationSettings.settings.pushNotifications);
        setTradeAlerts(notificationSettings.settings.tradeExecutionAlerts);
        setPerformanceReports(notificationSettings.settings.performanceReports);
        setReportFrequency(preferences.reportFrequency);
      } catch (error) {
        toast.error(
          getLocalizedErrorMessage(error, intlMessages) ||
            intlMessages.profilePages.settings.loadError
        );
        router.push(localizePath(lang, '/auth/login'));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [intlMessages, lang, router]);

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    setProfileErrors({});
    try {
      const data: UpdateProfileData = {
        firstName,
        lastName,
      };

      await userService.updateProfile(data);
      const changedFields = initialProfile
        ? [
            ...(initialProfile.firstName !== firstName ? ['firstName'] : []),
            ...(initialProfile.lastName !== lastName ? ['lastName'] : []),
          ]
        : [];
      if (changedFields.length > 0) {
        trackAnalyticsEvent('profile_updated', { changed_fields: changedFields });
      }
      toast.success(intlMessages.profilePages.settings.profileUpdateSuccess);

      const profile = await authService.getProfile();
      if (profile) {
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setEmail(profile.email ?? '');
        setPhoneNumber(profile.phoneNumber ?? '');
        setInitialProfile({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
        });
      }
    } catch (error: unknown) {
      const { fieldErrors, formError, toastMessage } = mapApiFormErrors<SettingsProfileField>({
        error,
        dict: intlMessages,
        fieldAliases: {
          firstName: ['firstName', 'first name', 'name'],
          lastName: ['lastName', 'last name', 'name'],
        },
        fieldLabels: {
          firstName: intlMessages.profilePages.settings.profileSection.firstName,
          lastName: intlMessages.profilePages.settings.profileSection.lastName,
        },
        messageFieldMap: {
          'first name': 'firstName',
          lastname: 'lastName',
          'last name': 'lastName',
        },
      });

      setProfileErrors({
        firstName: fieldErrors.firstName,
        lastName: fieldErrors.lastName,
        form: formError,
      });
      toast.error(
        toastMessage || formError || intlMessages.profilePages.settings.profileUpdateError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isProfileDirty = Boolean(
    initialProfile &&
      (firstName !== initialProfile.firstName || lastName !== initialProfile.lastName)
  );

  const handlePreferencesUpdate = async (updates: UpdatePreferencesData): Promise<boolean> => {
    setIsPreferencesSaving(true);
    const { emailNotifications: email, reportFrequency, ...v2Updates } = updates;
    const v2Keys = ['notificationsEnabled', 'pushNotifications', 'tradeExecutionAlerts', 'performanceReports'];
    const hasV2Update = Object.keys(v2Updates).some((key) => v2Keys.includes(key));
    try {
      if (hasV2Update) {
        const revision = notificationRevision ?? (await notificationsService.getUserNotificationSettingsV2()).revision;
        const updated = await notificationsService.updateUserNotificationSettingsV2(revision, v2Updates);
        setNotificationRevision(updated.revision);
        setNotificationsEnabled(updated.settings.notificationsEnabled);
        setPushNotifications(updated.settings.pushNotifications);
        setTradeAlerts(updated.settings.tradeExecutionAlerts);
        setPerformanceReports(updated.settings.performanceReports);
      }
      const legacyUpdates: UpdatePreferencesData = {
        ...(typeof email === 'boolean' ? { emailNotifications: email } : {}),
        ...(reportFrequency ? { reportFrequency } : {}),
      };
      if (Object.keys(legacyUpdates).length) await userService.updatePreferences(legacyUpdates);
      toast.success(intlMessages.profilePages.settings.preferencesUpdateSuccess);
      return true;
    } catch (error: unknown) {
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) ||
          intlMessages.profilePages.settings.preferencesUpdateError
      );
      if (hasV2Update) {
        try {
          const current = await notificationsService.getUserNotificationSettingsV2();
          setNotificationRevision(current.revision);
          setNotificationsEnabled(current.settings.notificationsEnabled);
          setPushNotifications(current.settings.pushNotifications);
          setTradeAlerts(current.settings.tradeExecutionAlerts);
          setPerformanceReports(current.settings.performanceReports);
          return true;
        } catch {
          // The caller restores its last confirmed switch value below.
        }
      }
      return false;
    } finally {
      setIsPreferencesSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordErrors({});

    if (newPassword !== confirmPassword) {
      setPasswordErrors({
        confirmPassword: intlMessages.profilePages.settings.passwordMismatch,
      });
      toast.error(intlMessages.profilePages.settings.passwordMismatch);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrors({
        newPassword: intlMessages.profilePages.settings.passwordTooShort,
      });
      toast.error(intlMessages.profilePages.settings.passwordTooShort);
      return;
    }

    setIsSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success(intlMessages.profilePages.settings.passwordUpdateSuccess);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (error: unknown) {
      const { fieldErrors, formError, toastMessage } = mapApiFormErrors<SettingsPasswordField>({
        error,
        dict: intlMessages,
        fieldAliases: {
          currentPassword: ['currentPassword', 'current password', 'old password', 'password'],
          newPassword: ['newPassword', 'new password', 'password'],
          confirmPassword: ['confirmPassword', 'confirm password', 'confirmation'],
        },
        fieldLabels: {
          currentPassword: intlMessages.profilePages.settings.securitySection.currentPassword,
          newPassword: intlMessages.profilePages.settings.securitySection.newPassword,
          confirmPassword: intlMessages.profilePages.settings.securitySection.confirmPassword,
        },
        codeFieldMap: {
          AUTH_INVALID_PASSWORD: 'currentPassword',
        },
        messageFieldMap: {
          'current password is incorrect': 'currentPassword',
          'old password': 'currentPassword',
          'confirm password': 'confirmPassword',
        },
      });

      setPasswordErrors({
        currentPassword: fieldErrors.currentPassword,
        newPassword: fieldErrors.newPassword,
        confirmPassword: fieldErrors.confirmPassword,
        form: formError,
      });
      toast.error(
        toastMessage || formError || intlMessages.profilePages.settings.passwordUpdateError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const reportFrequencyLabel =
    reportFrequency === 'DAILY'
      ? intlMessages.profilePages.settings.notificationsSection.daily
      : reportFrequency === 'MONTHLY'
        ? intlMessages.profilePages.settings.notificationsSection.monthly
        : intlMessages.profilePages.settings.notificationsSection.weekly;

  const summaryItems = [
    {
      label: intlMessages.profilePages.settings.profileSection.firstName,
      value: firstName || '—',
    },
    {
      label: intlMessages.profilePages.settings.profileSection.lastName,
      value: lastName || '—',
    },
    {
      label: intlMessages.profilePages.settings.profileSection.email,
      value: email || '—',
    },
    {
      label: intlMessages.profilePages.settings.profileSection.phone,
      value: phoneNumber || '—',
    },
    {
      label: intlMessages.profilePages.settings.notificationsSection.enableTitle,
      value: notificationsEnabled
        ? intlMessages.profilePages.security.statusActive
        : intlMessages.profilePages.security.statusInactive,
    },
    {
      label: intlMessages.profilePages.settings.notificationsSection.reportsTitle,
      value: performanceReports
        ? reportFrequencyLabel
        : intlMessages.profilePages.security.statusInactive,
    },
  ];

  const notificationRows = [
    {
      key: 'notificationsEnabled',
      title: intlMessages.profilePages.settings.notificationsSection.enableTitle,
      description: intlMessages.profilePages.settings.notificationsSection.enableDescription,
      value: notificationsEnabled,
      onToggle: () => {
        const previous = notificationsEnabled;
        const next = !notificationsEnabled;
        setNotificationsEnabled(next);
        void handlePreferencesUpdate({ notificationsEnabled: next }).then((ok) => { if (!ok) setNotificationsEnabled(previous); });
      },
    },
    {
      key: 'emailNotifications',
      title: intlMessages.profilePages.settings.notificationsSection.emailTitle,
      description: intlMessages.profilePages.settings.notificationsSection.emailDescription,
      value: emailNotifications,
      onToggle: () => {
        const previous = emailNotifications;
        const next = !emailNotifications;
        setEmailNotifications(next);
        void handlePreferencesUpdate({ emailNotifications: next }).then((ok) => { if (!ok) setEmailNotifications(previous); });
      },
    },
    {
      key: 'tradeAlerts',
      title: intlMessages.profilePages.settings.notificationsSection.tradeTitle,
      description: intlMessages.profilePages.settings.notificationsSection.tradeDescription,
      value: tradeAlerts,
      onToggle: () => {
        const previous = tradeAlerts;
        const next = !tradeAlerts;
        setTradeAlerts(next);
        void handlePreferencesUpdate({ tradeExecutionAlerts: next }).then((ok) => { if (!ok) setTradeAlerts(previous); });
      },
    },
    {
      key: 'pushNotifications',
      title: intlMessages.profilePages.settings.notificationsSection.pushTitle,
      description: intlMessages.profilePages.settings.notificationsSection.pushDescription,
      value: pushNotifications,
      onToggle: () => {
        const previous = pushNotifications;
        const next = !pushNotifications;
        setPushNotifications(next);
        void handlePreferencesUpdate({ pushNotifications: next }).then((ok) => { if (!ok) setPushNotifications(previous); });
      },
    },
    {
      key: 'performanceReports',
      title: intlMessages.profilePages.settings.notificationsSection.reportsTitle,
      description: intlMessages.profilePages.settings.notificationsSection.reportsDescription,
      value: performanceReports,
      onToggle: () => {
        const previous = performanceReports;
        const next = !performanceReports;
        setPerformanceReports(next);
        void handlePreferencesUpdate({ performanceReports: next }).then((ok) => { if (!ok) setPerformanceReports(previous); });
      },
    },
  ];

  if (isLoading) {
    return (
      <ProfileShell
        title={intlMessages.profilePages.settings.title}
        backHref="/profile"
        variant={isDesktop ? 'default' : 'mobile'}
        shellClassName="profile-settings-shell"
        showSidebar={!isDesktop}
        showBreadcrumbs={!isDesktop}
      >
        <div className="profile-mobile-adaptive-layout">
          <ProfileSettingsSkeleton />
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title={intlMessages.profilePages.settings.title}
      backHref="/profile"
      variant={isDesktop ? 'default' : 'mobile'}
      shellClassName="profile-settings-shell"
      showSidebar={!isDesktop}
      showBreadcrumbs={!isDesktop}
    >
      <div className="profile-page-stage profile-settings-stage profile-mobile-adaptive-layout">
        {isDesktop && (
          <div className="profile-page-hero">
            <span className="profile-page-eyebrow">{intlMessages.profileNav.sectionAccount}</span>
            <h1 className="profile-page-title">{intlMessages.profilePages.settings.title}</h1>
          </div>
        )}

        <div className="profile-page-flow profile-settings-layout">
          <aside className="profile-page-aside profile-settings-aside">
            <div className="profile-card profile-page-support-card profile-settings-summary-card">
              <div className="profile-settings-section-heading">
                <p className="profile-panel-label">{intlMessages.profilePages.settings.title}</p>
                <p className="profile-card-text">
                  {intlMessages.profilePages.settings.profileSection.title}
                </p>
              </div>

              <div className="profile-settings-summary-grid">
                {summaryItems.map((item) => (
                  <div key={item.label} className="profile-settings-summary-tile">
                    <span className="profile-settings-summary-label">{item.label}</span>
                    <span className="profile-settings-summary-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="profile-page-main profile-settings-main">
            <div className="profile-card profile-page-panel profile-settings-section-card">
              <div className="profile-settings-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.settings.profileSection.title}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.settings.profileSection.emailNote}{' '}
                  {intlMessages.profilePages.settings.profileSection.phoneNote}
                </p>
              </div>

              <div className="profile-form">
                <div className="profile-settings-field-grid is-two-col">
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.profileSection.firstName}
                    </span>
                    <Input
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        if (profileErrors.firstName || profileErrors.form) {
                          setProfileErrors((prev) => ({
                            ...prev,
                            firstName: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      placeholder={
                        intlMessages.profilePages.settings.profileSection.firstNamePlaceholder
                      }
                      className="profile-input"
                      invalid={Boolean(profileErrors.firstName)}
                    />
                    {profileErrors.firstName && (
                      <p className="profile-error">{profileErrors.firstName}</p>
                    )}
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.profileSection.lastName}
                    </span>
                    <Input
                      value={lastName}
                      onChange={(event) => {
                        setLastName(event.target.value);
                        if (profileErrors.lastName || profileErrors.form) {
                          setProfileErrors((prev) => ({
                            ...prev,
                            lastName: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      placeholder={
                        intlMessages.profilePages.settings.profileSection.lastNamePlaceholder
                      }
                      className="profile-input"
                      invalid={Boolean(profileErrors.lastName)}
                    />
                    {profileErrors.lastName && (
                      <p className="profile-error">{profileErrors.lastName}</p>
                    )}
                  </div>
                </div>

                {profileErrors.form && <p className="profile-error">{profileErrors.form}</p>}

                <div className="profile-settings-field-grid">
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.profileSection.email}
                    </span>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="profile-input"
                      placeholder={
                        intlMessages.profilePages.settings.profileSection.emailPlaceholder
                      }
                    />
                    <p className="profile-settings-field-note">
                      {intlMessages.profilePages.settings.profileSection.emailNote}
                    </p>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.profileSection.phone}
                    </span>
                    <Input
                      value={phoneNumber}
                      disabled
                      className="profile-input"
                      placeholder={
                        intlMessages.profilePages.settings.profileSection.phonePlaceholder
                      }
                    />
                    <p className="profile-settings-field-note">
                      {intlMessages.profilePages.settings.profileSection.phoneNote}
                    </p>
                  </div>
                </div>

                <div className="profile-actions profile-settings-actions">
                  <Button
                    variant="gradient"
                    className="profile-button"
                    onClick={handleProfileUpdate}
                    disabled={isSaving || !isProfileDirty}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {intlMessages.profilePages.settings.profileSection.saving}
                      </>
                    ) : (
                      intlMessages.profilePages.settings.profileSection.save
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="profile-card profile-page-panel profile-settings-section-card">
              <div className="profile-settings-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.settings.notificationsSection.title}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.settings.notificationsSection.enableDescription}
                </p>
              </div>

              <div className="profile-settings-toggle-list">
                {notificationRows.map((row) => (
                  <div key={row.key} className="profile-settings-toggle-row">
                    <div className="profile-settings-toggle-copy">
                      <p className="profile-settings-toggle-title">{row.title}</p>
                      <p className="profile-settings-toggle-description">{row.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isPreferencesSaving || isLoading}
                      onClick={row.onToggle}
                      className={`profile-notifications-toggle${row.value ? ' is-active' : ''}`}
                      aria-pressed={row.value}
                      aria-label={row.title}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>

              {performanceReports && (
                <div className="profile-settings-frequency-block">
                  <span className="profile-field-label">
                    {intlMessages.profilePages.settings.notificationsSection.reportFrequencyLabel}
                  </span>
                  <div className="profile-settings-frequency-grid">
                    <button
                      type="button"
                      className={`profile-settings-frequency-chip${
                        reportFrequency === 'DAILY' ? ' is-active' : ''
                      }`}
                      onClick={() => {
                        setReportFrequency('DAILY');
                        void handlePreferencesUpdate({ reportFrequency: 'DAILY' });
                      }}
                    >
                      {intlMessages.profilePages.settings.notificationsSection.daily}
                    </button>
                    <button
                      type="button"
                      className={`profile-settings-frequency-chip${
                        reportFrequency === 'WEEKLY' ? ' is-active' : ''
                      }`}
                      onClick={() => {
                        setReportFrequency('WEEKLY');
                        void handlePreferencesUpdate({ reportFrequency: 'WEEKLY' });
                      }}
                    >
                      {intlMessages.profilePages.settings.notificationsSection.weekly}
                    </button>
                    <button
                      type="button"
                      className={`profile-settings-frequency-chip${
                        reportFrequency === 'MONTHLY' ? ' is-active' : ''
                      }`}
                      onClick={() => {
                        setReportFrequency('MONTHLY');
                        void handlePreferencesUpdate({ reportFrequency: 'MONTHLY' });
                      }}
                    >
                      {intlMessages.profilePages.settings.notificationsSection.monthly}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="profile-card profile-page-panel profile-settings-section-card">
              <div className="profile-settings-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.settings.securitySection.title}
                </p>
              </div>

              <div className="profile-form">
                <div className="profile-settings-field-grid">
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.securitySection.currentPassword}
                    </span>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value);
                        if (passwordErrors.currentPassword || passwordErrors.form) {
                          setPasswordErrors((prev) => ({
                            ...prev,
                            currentPassword: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      placeholder="••••••••"
                      className="profile-input"
                      invalid={Boolean(passwordErrors.currentPassword)}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="profile-error">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.securitySection.newPassword}
                    </span>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        if (passwordErrors.newPassword || passwordErrors.form) {
                          setPasswordErrors((prev) => ({
                            ...prev,
                            newPassword: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      placeholder="••••••••"
                      className="profile-input"
                      invalid={Boolean(passwordErrors.newPassword)}
                    />
                    {passwordErrors.newPassword && (
                      <p className="profile-error">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.settings.securitySection.confirmPassword}
                    </span>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (passwordErrors.confirmPassword || passwordErrors.form) {
                          setPasswordErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      placeholder="••••••••"
                      className="profile-input"
                      invalid={Boolean(passwordErrors.confirmPassword)}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="profile-error">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {passwordErrors.form && <p className="profile-error">{passwordErrors.form}</p>}

                <div className="profile-actions profile-settings-actions">
                  <Button
                    variant="gradient"
                    className="profile-button"
                    onClick={handlePasswordUpdate}
                    disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {intlMessages.profilePages.settings.securitySection.updating}
                      </>
                    ) : (
                      intlMessages.profilePages.settings.securitySection.updateButton
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="profile-card profile-page-panel profile-settings-section-card profile-settings-danger-card">
              <div className="profile-settings-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.settings.dangerZone.title}
                </p>
                <p className="profile-card-text">
                  {intlMessages.profilePages.settings.dangerZone.deleteTitle}
                </p>
              </div>

              <p className="profile-settings-danger-copy">
                {intlMessages.profilePages.settings.dangerZone.deleteDescription}
              </p>

              <div className="profile-settings-danger-actions">
                <Button variant="ghost" className="profile-button profile-button-danger" asChild>
                  <Link href={localizePath(lang, '/profile/security/delete-account')}>
                    <Trash2 className="h-4 w-4" />
                    {intlMessages.profilePages.settings.dangerZone.deleteButton}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
