'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileShell } from '@/components/profile/profile-shell';
import { authService } from '@/services/auth.service';
import { connectionsService } from '@/services/connections.service';
import { emailService } from '@/services/email.service';
import { toast } from 'react-hot-toast';
import type { User as ApiUser } from '@/lib/api-client';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { localizePath } from '@/lib/i18n';
import { mapApiFormErrors } from '@/lib/auth-form-errors';
import { LtrContent } from '@/components/ui/ltr-content';

type UserExtras = ApiUser & {
  lastLoginAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

type SecurityField = 'verificationCode' | 'oldEmailCode' | 'newEmail' | 'newEmailCode';

const SecurityPageSkeleton = () => (
  <div className="profile-page-stage profile-security-stage profile-mobile-adaptive-layout" aria-hidden="true">
    <div className="profile-page-hero profile-security-skeleton-hero">
      <span className="profile-skeleton-line profile-security-skeleton-eyebrow" />
      <span className="profile-skeleton-line profile-security-skeleton-title" />
      <span className="profile-skeleton-line profile-skeleton-line-wide" />
    </div>

    <div className="profile-page-flow profile-security-layout profile-security-skeleton">
      <aside className="profile-page-aside profile-security-aside">
        <div className="profile-card profile-page-support-card profile-security-skeleton-summary">
          <div className="profile-security-skeleton-summary-head">
            <div className="profile-security-skeleton-summary-copy">
              <span className="profile-skeleton-line profile-skeleton-line-short" />
              <span className="profile-skeleton-line profile-skeleton-line-medium" />
            </div>
          </div>

          <div className="profile-security-skeleton-highlights">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`profile-security-highlight-skeleton-${index}`}
                className="profile-security-skeleton-tile"
              >
                <span className="profile-skeleton-line profile-skeleton-line-short" />
                <span className="profile-skeleton-line profile-security-skeleton-value" />
              </div>
            ))}
          </div>

          <div className="profile-security-skeleton-summary-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`profile-security-summary-row-skeleton-${index}`}
                className="profile-security-skeleton-summary-row"
              >
                <span className="profile-skeleton-line profile-skeleton-line-short" />
                <span className="profile-skeleton-line profile-security-skeleton-value" />
              </div>
            ))}
          </div>

          <div className="profile-actions profile-security-skeleton-actions">
            <span className="profile-security-skeleton-button" />
            <span className="profile-security-skeleton-button" />
          </div>
        </div>
      </aside>

      <div className="profile-page-main profile-security-main">
        <div className="profile-card profile-page-panel profile-security-skeleton-panel">
          <span className="profile-skeleton-line profile-skeleton-line-short" />
          <span className="profile-skeleton-line profile-skeleton-line-wide" />
          <div className="profile-security-skeleton-form">
            <span className="profile-security-skeleton-input" />
            <span className="profile-security-skeleton-input" />
            <div className="profile-security-skeleton-actions-row">
              <span className="profile-security-skeleton-button is-small" />
              <span className="profile-security-skeleton-button is-small" />
            </div>
          </div>
        </div>

        <div className="profile-card profile-page-panel profile-security-skeleton-panel">
          <span className="profile-skeleton-line profile-skeleton-line-short" />
          <span className="profile-skeleton-line profile-skeleton-line-wide" />
          <div className="profile-security-skeleton-form">
            <span className="profile-security-skeleton-input" />
            <span className="profile-security-skeleton-input" />
            <div className="profile-security-skeleton-actions-row">
              <span className="profile-security-skeleton-button is-small" />
              <span className="profile-security-skeleton-button is-small" />
            </div>
            <span className="profile-security-skeleton-input" />
            <span className="profile-security-skeleton-input" />
            <div className="profile-security-skeleton-actions-row">
              <span className="profile-security-skeleton-button is-small" />
              <span className="profile-security-skeleton-button is-small" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function SecurityPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mtAccounts, setMtAccounts] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null);
  const [mtConnected, setMtConnected] = useState<boolean | null>(null);
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [isRequestingOld, setIsRequestingOld] = useState(false);
  const [isConfirmingOld, setIsConfirmingOld] = useState(false);
  const [isRequestingNew, setIsRequestingNew] = useState(false);
  const [isConfirmingNew, setIsConfirmingNew] = useState(false);
  const [oldEmailVerified, setOldEmailVerified] = useState(false);
  const [oldCodeExpiresAt, setOldCodeExpiresAt] = useState<string | null>(null);
  const [newCodeExpiresAt, setNewCodeExpiresAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [fieldErrors, setFieldErrors] = useState<{
    verificationCode?: string;
    verificationForm?: string;
    oldEmailCode?: string;
    newEmail?: string;
    newEmailCode?: string;
    form?: string;
  }>({});
  const lang = useLocale();
  const intlMessages = useRouteMessages();

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
    const loadData = async () => {
      setIsLoading(true);
      try {
        const profile = await authService.getProfile();
        setUser(profile ?? null);
        const [telegramStatus, accounts] = await Promise.all([
          connectionsService.getTelegramStatus(),
          connectionsService.getMtAccounts(),
        ]);
        setTelegramConnected(Boolean(telegramStatus?.isConnected));
        setMtAccounts(accounts.length);
        setMtConnected(
          accounts.length
            ? accounts.some((account) => account.connectionStatus === 'CONNECTED')
            : false
        );
      } catch {
        toast.error(intlMessages.profilePages.security.toastLoadError);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [intlMessages]);

  const formatDate = (value?: string | Date | null) => {
    if (!value) {
      return '—';
    }
    const date = typeof value === 'string' ? new Date(value) : value;
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(lang);
  };

  const connectionStatus = (connected: boolean | null) => {
    if (connected === null) {
      return <span className="profile-summary-value">—</span>;
    }
    return (
      <span className={`profile-status ${connected ? 'is-connected' : 'is-disconnected'}`}>
        {connected
          ? intlMessages.profilePages.security.connected
          : intlMessages.profilePages.security.disconnected}
      </span>
    );
  };

  const fullName =
    [user?.firstName, user?.lastName].filter((value) => Boolean(value)).join(' ') || '—';
  const roleLabel = user?.role
    ? (intlMessages.profilePages.security.roles?.[user.role] ?? user.role)
    : '—';
  const statusLabel = user
    ? user.isActive
      ? intlMessages.profilePages.security.statusActive
      : intlMessages.profilePages.security.statusInactive
    : '—';
  const emailVerifiedLabel = user
    ? user.emailVerified
      ? intlMessages.profilePages.security.statusVerified
      : intlMessages.profilePages.security.statusUnverified
    : '—';
  const userExtras = user as UserExtras | null;
  const summaryItems = [
    {
      label: intlMessages.profilePages.security.labels.accountId,
      value: `#${user?.id ?? '—'}`,
      ltr: true,
    },
    { label: intlMessages.profilePages.security.labels.fullName, value: fullName },
    {
      label: intlMessages.profilePages.security.labels.email,
      value: user?.email ?? '—',
      ltr: true,
    },
    {
      label: intlMessages.profilePages.security.labels.phone,
      value: user?.phoneNumber ?? '—',
      ltr: true,
    },
    { label: intlMessages.profilePages.security.labels.role, value: roleLabel },
    { label: intlMessages.profilePages.security.labels.status, value: statusLabel },
    { label: intlMessages.profilePages.security.labels.emailVerified, value: emailVerifiedLabel },
    {
      label: intlMessages.profilePages.security.labels.telegram,
      value: telegramConnected === null ? '—' : telegramConnected ? 'CONNECTED' : 'DISCONNECTED',
      status: telegramConnected,
    },
    {
      label: intlMessages.profilePages.security.labels.telegramId,
      value: user?.telegramUserId ?? '—',
      ltr: true,
    },
    {
      label: intlMessages.profilePages.security.labels.mt,
      value: mtConnected === null ? '—' : mtConnected ? 'CONNECTED' : 'DISCONNECTED',
      status: mtConnected,
    },
    {
      label: intlMessages.profilePages.security.labels.mtAccounts,
      value: mtAccounts.toString(),
      ltr: true,
    },
    {
      label: intlMessages.profilePages.security.labels.createdAt,
      value: formatDate(user?.createdAt),
      ltr: true,
    },
    {
      label: intlMessages.profilePages.security.labels.lastLogin,
      value: formatDate(userExtras?.lastLoginAt),
      ltr: true,
    },
    {
      label: intlMessages.profilePages.security.labels.updatedAt,
      value: formatDate(userExtras?.updatedAt),
      ltr: true,
    },
  ];
  const desktopSummaryHighlights = summaryItems.filter((item) =>
    [
      intlMessages.profilePages.security.labels.status,
      intlMessages.profilePages.security.labels.emailVerified,
      intlMessages.profilePages.security.labels.telegram,
      intlMessages.profilePages.security.labels.mt,
    ].includes(item.label)
  );
  const desktopSummaryDetails = summaryItems.filter(
    (item) => !desktopSummaryHighlights.some((highlight) => highlight.label === item.label)
  );
  const isAccountEmailVerified = Boolean(user?.emailVerified);
  const toExpiryMs = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const verificationExpiryMs = toExpiryMs(verificationExpiresAt);
  const oldCodeExpiryMs = toExpiryMs(oldCodeExpiresAt);
  const newCodeExpiryMs = toExpiryMs(newCodeExpiresAt);
  const isVerificationActive = verificationExpiryMs !== null && verificationExpiryMs > nowMs;
  const isVerificationExpired = verificationExpiryMs !== null && verificationExpiryMs <= nowMs;
  const isOldCodeActive = oldCodeExpiryMs !== null && oldCodeExpiryMs > nowMs;
  const isNewCodeActive = newCodeExpiryMs !== null && newCodeExpiryMs > nowMs;
  const isOldCodeExpired = oldCodeExpiryMs !== null && oldCodeExpiryMs <= nowMs;
  const isNewCodeExpired = newCodeExpiryMs !== null && newCodeExpiryMs <= nowMs;
  const verificationInputEnabled = !isAccountEmailVerified && isVerificationActive;
  const oldCodeInputEnabled = isOldCodeActive;
  const newCodeInputEnabled = oldEmailVerified && isNewCodeActive;
  const changeEmailDisabled = !isAccountEmailVerified;
  const formatRemaining = (expiryMs: number): string => {
    const remainingMs = Math.max(0, expiryMs - nowMs);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  const securityFieldAliases: Record<SecurityField, readonly string[]> = {
    verificationCode: ['verificationCode', 'email verification code', 'account email code'],
    oldEmailCode: [
      'oldEmailCode',
      'old email code',
      'current email code',
      'verification code',
      'code',
    ],
    newEmail: ['newEmail', 'new email', 'email'],
    newEmailCode: ['newEmailCode', 'new email code', 'verification code', 'code'],
  };

  useEffect(() => {
    if (!isVerificationActive && !isOldCodeActive && !isNewCodeActive) return;
    const timer = window.setInterval(() => {
      const nextNowMs = Date.now();
      setNowMs(nextNowMs);
      if (verificationExpiryMs !== null && verificationExpiryMs <= nextNowMs) {
        setVerificationCode('');
      }
      if (oldCodeExpiryMs !== null && oldCodeExpiryMs <= nextNowMs) {
        setOldEmailCode('');
      }
      if (newCodeExpiryMs !== null && newCodeExpiryMs <= nextNowMs) {
        setNewEmailCode('');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    isVerificationActive,
    isOldCodeActive,
    isNewCodeActive,
    verificationExpiryMs,
    oldCodeExpiryMs,
    newCodeExpiryMs,
  ]);

  if (isLoading) {
    return (
      <ProfileShell
        title={intlMessages.profilePages.security.title}
        subtitle={intlMessages.profilePages.security.subtitle}
        backHref="/profile"
        variant={isDesktop ? 'default' : 'mobile'}
        shellClassName="profile-security-shell"
        showSidebar={!isDesktop}
      >
        <SecurityPageSkeleton />
      </ProfileShell>
    );
  }

  const handleRequestEmailVerification = async () => {
    setFieldErrors((prev) => ({
      ...prev,
      verificationCode: undefined,
      verificationForm: undefined,
    }));
    setIsRequestingVerification(true);
    try {
      const response = await emailService.requestEmailVerification();
      if (isAccountEmailVerified) {
        toast.success(response.message || intlMessages.profilePages.security.emailAlreadyVerified);
        return;
      }

      if (!response.expiresAt && response.message?.toLowerCase().includes('already verified')) {
        setVerificationExpiresAt(null);
        setVerificationCode('');
        setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
        toast.success(response.message || intlMessages.profilePages.security.emailAlreadyVerified);
        return;
      }

      const nextVerificationExpiryMs = response.expiresAt
        ? Date.parse(response.expiresAt)
        : Number.NaN;
      if (Number.isNaN(nextVerificationExpiryMs)) {
        setVerificationExpiresAt(null);
        setVerificationCode('');
        setFieldErrors((prev) => ({
          ...prev,
          verificationForm: intlMessages.profilePages.security.emailVerificationFailed,
        }));
        toast.error(intlMessages.profilePages.security.emailVerificationFailed);
        return;
      }

      setVerificationExpiresAt(new Date(nextVerificationExpiryMs).toISOString());
      setVerificationCode('');
      setNowMs(Date.now());
      toast.success(response.message || intlMessages.profilePages.security.emailVerificationSent);
    } catch (error) {
      const {
        fieldErrors: mappedFieldErrors,
        formError,
        toastMessage,
      } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
        fieldLabels: {
          verificationCode: intlMessages.profilePages.security.verificationCodeLabel,
        },
        codeFieldMap: {
          AUTH_OTP_INVALID: 'verificationCode',
        },
        messageFieldMap: {
          'invalid or expired verification code': 'verificationCode',
        },
      });

      setFieldErrors((prev) => ({
        ...prev,
        verificationCode: mappedFieldErrors.verificationCode,
        verificationForm: formError,
      }));
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailVerificationFailed
      );
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleConfirmEmailVerification = async () => {
    setFieldErrors((prev) => ({
      ...prev,
      verificationCode: undefined,
      verificationForm: undefined,
    }));
    setIsConfirmingVerification(true);
    try {
      const response = await emailService.confirmEmailVerification(verificationCode);
      toast.success(
        response.message || intlMessages.profilePages.security.emailVerificationSuccess
      );
      setVerificationCode('');
      setVerificationExpiresAt(null);
      setFieldErrors((prev) => ({
        ...prev,
        verificationCode: undefined,
        verificationForm: undefined,
      }));
      setUser((prev) =>
        prev
          ? {
              ...prev,
              emailVerified: true,
            }
          : prev
      );
    } catch (error) {
      const {
        fieldErrors: mappedFieldErrors,
        formError,
        toastMessage,
      } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
        fieldLabels: {
          verificationCode: intlMessages.profilePages.security.verificationCodeLabel,
        },
        codeFieldMap: {
          AUTH_OTP_INVALID: 'verificationCode',
        },
        messageFieldMap: {
          'invalid or expired verification code': 'verificationCode',
        },
      });

      setFieldErrors((prev) => ({
        ...prev,
        verificationCode: mappedFieldErrors.verificationCode,
        verificationForm: formError,
      }));
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailVerificationFailed
      );
    } finally {
      setIsConfirmingVerification(false);
    }
  };

  const handleRequestOldEmail = async () => {
    if (changeEmailDisabled) {
      const message = intlMessages.profilePages.security.verifyEmailBeforeChange;
      setFieldErrors((prev) => ({ ...prev, form: message }));
      toast.error(message);
      return;
    }
    setFieldErrors((prev) => ({ ...prev, oldEmailCode: undefined, form: undefined }));
    setIsRequestingOld(true);
    try {
      const response = await emailService.requestChangeOld();
      const nextOldExpiryMs = response.expiresAt ? Date.parse(response.expiresAt) : Number.NaN;
      if (Number.isNaN(nextOldExpiryMs)) {
        setOldCodeExpiresAt(null);
        setOldEmailCode('');
        setFieldErrors((prev) => ({
          ...prev,
          form: intlMessages.profilePages.security.emailChangeOldFailed,
        }));
        toast.error(intlMessages.profilePages.security.emailChangeOldFailed);
        return;
      }
      setOldCodeExpiresAt(new Date(nextOldExpiryMs).toISOString());
      setOldEmailCode('');
      setOldEmailVerified(false);
      setNewCodeExpiresAt(null);
      setNewEmailCode('');
      setNowMs(Date.now());
      setFieldErrors((prev) => ({ ...prev, form: undefined }));
      toast.success(response.message || intlMessages.profilePages.security.emailChangeOldSent);
    } catch (error) {
      const { formError, toastMessage } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
      });
      setFieldErrors((prev) => ({ ...prev, form: formError }));
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailChangeOldFailed
      );
    } finally {
      setIsRequestingOld(false);
    }
  };

  const handleConfirmOldEmail = async () => {
    setFieldErrors((prev) => ({ ...prev, oldEmailCode: undefined, form: undefined }));
    setIsConfirmingOld(true);
    try {
      const response = await emailService.confirmChangeOld(oldEmailCode);
      toast.success(response.message || intlMessages.profilePages.security.emailChangeOldVerified);
      setOldEmailVerified(true);
      setOldCodeExpiresAt(null);
      setOldEmailCode('');
      setNewCodeExpiresAt(null);
      setNewEmailCode('');
    } catch (error) {
      const {
        fieldErrors: mappedFieldErrors,
        formError,
        toastMessage,
      } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
        fieldLabels: {
          oldEmailCode: intlMessages.profilePages.security.currentEmailCodeLabel,
        },
        codeFieldMap: {
          USER_EMAIL_CHANGE_OLD_CODE_INVALID: 'oldEmailCode',
          USER_EMAIL_CHANGE_REQUEST_EXPIRED: 'oldEmailCode',
        },
        messageFieldMap: {
          'invalid or expired verification code': 'oldEmailCode',
          'request expired': 'oldEmailCode',
        },
      });

      setFieldErrors((prev) => ({
        ...prev,
        oldEmailCode: mappedFieldErrors.oldEmailCode,
        form: formError,
      }));
      setOldEmailVerified(false);
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailChangeOldFailed
      );
    } finally {
      setIsConfirmingOld(false);
    }
  };

  const handleRequestNewEmail = async () => {
    setFieldErrors((prev) => ({
      ...prev,
      newEmail: undefined,
      newEmailCode: undefined,
      form: undefined,
    }));
    setIsRequestingNew(true);
    try {
      const response = await emailService.requestChangeNew(newEmail);
      const nextNewExpiryMs = response.expiresAt ? Date.parse(response.expiresAt) : Number.NaN;
      if (Number.isNaN(nextNewExpiryMs)) {
        setNewCodeExpiresAt(null);
        setNewEmailCode('');
        setFieldErrors((prev) => ({
          ...prev,
          form: intlMessages.profilePages.security.emailChangeNewFailed,
        }));
        toast.error(intlMessages.profilePages.security.emailChangeNewFailed);
        return;
      }
      setNewCodeExpiresAt(new Date(nextNewExpiryMs).toISOString());
      setNewEmailCode('');
      setNowMs(Date.now());
      toast.success(response.message || intlMessages.profilePages.security.emailChangeNewSent);
    } catch (error) {
      const {
        fieldErrors: mappedFieldErrors,
        formError,
        toastMessage,
      } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
        fieldLabels: {
          newEmail: intlMessages.profilePages.security.newEmailLabel,
        },
        codeFieldMap: {
          USER_EMAIL_CHANGE_SAME_AS_CURRENT: 'newEmail',
          USER_EMAIL_ALREADY_IN_USE: 'newEmail',
        },
        messageFieldMap: {
          'new email must be different': 'newEmail',
          'email already in use': 'newEmail',
        },
      });

      setFieldErrors((prev) => ({
        ...prev,
        newEmail: mappedFieldErrors.newEmail,
        form: formError,
      }));
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailChangeNewFailed
      );
    } finally {
      setIsRequestingNew(false);
    }
  };

  const handleConfirmNewEmail = async () => {
    setFieldErrors((prev) => ({ ...prev, newEmailCode: undefined, form: undefined }));
    setIsConfirmingNew(true);
    try {
      const response = await emailService.confirmChangeNew(newEmailCode);
      toast.success(response.message || intlMessages.profilePages.security.emailChangeSuccess);
      setNewEmail('');
      setNewEmailCode('');
      setOldEmailCode('');
      setOldEmailVerified(false);
      setOldCodeExpiresAt(null);
      setNewCodeExpiresAt(null);
      setFieldErrors({});
      setUser((prev) => (prev ? { ...prev, email: newEmail, emailVerified: true } : prev));
    } catch (error) {
      const {
        fieldErrors: mappedFieldErrors,
        formError,
        toastMessage,
      } = mapApiFormErrors<SecurityField>({
        error,
        dict: intlMessages,
        fieldAliases: securityFieldAliases,
        fieldLabels: {
          newEmailCode: intlMessages.profilePages.security.newEmailCodeLabel,
        },
        codeFieldMap: {
          USER_EMAIL_CHANGE_NEW_CODE_INVALID: 'newEmailCode',
        },
        messageFieldMap: {
          'invalid or expired verification code': 'newEmailCode',
        },
      });
      setFieldErrors((prev) => ({
        ...prev,
        newEmailCode: mappedFieldErrors.newEmailCode,
        form: formError,
      }));
      toast.error(
        toastMessage || formError || intlMessages.profilePages.security.emailChangeNewFailed
      );
    } finally {
      setIsConfirmingNew(false);
    }
  };

  return (
    <ProfileShell
      title={intlMessages.profilePages.security.title}
      subtitle={intlMessages.profilePages.security.subtitle}
      backHref="/profile"
      variant={isDesktop ? 'default' : 'mobile'}
      shellClassName="profile-security-shell"
      showSidebar={!isDesktop}
      showBreadcrumbs={!isDesktop}
    >
      <div className="profile-page-stage profile-security-stage profile-mobile-adaptive-layout">
        {isDesktop && (
          <div className="profile-page-hero">
            <span className="profile-page-eyebrow">{intlMessages.profileNav.sectionAccount}</span>
            <h1 className="profile-page-title">{intlMessages.profilePages.security.title}</h1>
            <p className="profile-page-copy">{intlMessages.profilePages.security.subtitle}</p>
          </div>
        )}

        <div className="profile-page-flow profile-security-layout">
          <aside className="profile-page-aside profile-security-aside">
            <div className="profile-card profile-page-support-card profile-summary profile-security-summary-card">
              <div className="profile-security-summary-header">
                <div>
                  <p className="profile-panel-label">{intlMessages.profilePages.security.title}</p>
                  <p className="profile-card-text profile-security-summary-copy">
                    {intlMessages.profilePages.security.subtitle}
                  </p>
                </div>
              </div>

              {isDesktop ? (
                <>
                  <div className="profile-security-summary-highlights">
                    {desktopSummaryHighlights.map((item) => (
                      <div
                        key={item.label}
                        className={`profile-security-summary-tile profile-security-summary-highlight${
                          item.status === true
                            ? ' is-connected'
                            : item.status === false
                              ? ' is-disconnected'
                              : ''
                        }`}
                      >
                        <span className="profile-security-summary-label">{item.label}</span>
                        {typeof item.status === 'boolean' ? (
                          connectionStatus(item.status)
                        ) : item.ltr ? (
                          <LtrContent className="profile-summary-value">{item.value}</LtrContent>
                        ) : (
                          <span className="profile-summary-value">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="profile-security-summary-list">
                    {desktopSummaryDetails.map((item) => (
                      <div className="profile-security-summary-row" key={item.label}>
                        <span className="profile-security-summary-row-label">{item.label}</span>
                        {typeof item.status === 'boolean' ? (
                          connectionStatus(item.status)
                        ) : item.ltr ? (
                          <LtrContent className="profile-security-summary-row-value">
                            {item.value}
                          </LtrContent>
                        ) : (
                          <span className="profile-security-summary-row-value">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="profile-security-summary-grid">
                  {summaryItems.map((item) => (
                    <div
                      key={item.label}
                      className={`profile-security-summary-tile${
                        item.status === true
                          ? ' is-connected'
                          : item.status === false
                            ? ' is-disconnected'
                            : ''
                      }`}
                    >
                      <span className="profile-security-summary-label">{item.label}</span>
                      {typeof item.status === 'boolean' ? (
                        connectionStatus(item.status)
                      ) : item.ltr ? (
                        <LtrContent className="profile-summary-value">{item.value}</LtrContent>
                      ) : (
                        <span className="profile-summary-value">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="profile-actions profile-security-primary-actions">
                <Button
                  variant="ghost"
                  className="profile-button profile-button-outline profile-button-full"
                  asChild
                >
                  <Link href={localizePath(lang, '/profile/security/change-password')}>
                    {intlMessages.profilePages.security.changePassword}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="profile-button profile-button-danger profile-button-full"
                  asChild
                >
                  <Link href={localizePath(lang, '/profile/security/delete-account')}>
                    {intlMessages.profilePages.security.deleteAccount}
                  </Link>
                </Button>
              </div>
            </div>
          </aside>

          <div className="profile-page-main profile-security-main">
            <div className="profile-card profile-page-panel profile-security-section-card">
              <div className="profile-security-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.security.emailVerificationTitle}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.security.emailVerificationDescription}
                </p>
              </div>
              {isAccountEmailVerified && (
                <p className="profile-card-text">
                  {intlMessages.profilePages.security.emailAlreadyVerified}
                </p>
              )}
              <div className="profile-form">
                <div className="profile-field">
                  <span className="profile-field-label">
                    {intlMessages.profilePages.security.emailLabel}
                  </span>
                  <Input value={user?.email ?? ''} disabled className="profile-input" />
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">
                    {intlMessages.profilePages.security.verificationCodeLabel}
                  </span>
                  <Input
                    value={verificationCode}
                    onChange={(event) => {
                      setVerificationCode(event.target.value);
                      if (fieldErrors.verificationCode || fieldErrors.verificationForm) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          verificationCode: undefined,
                          verificationForm: undefined,
                        }));
                      }
                    }}
                    className="profile-input"
                    placeholder={intlMessages.profilePages.security.verificationCodePlaceholder}
                    disabled={!verificationInputEnabled}
                    invalid={Boolean(fieldErrors.verificationCode)}
                  />
                  {fieldErrors.verificationCode && (
                    <p className="profile-error">{fieldErrors.verificationCode}</p>
                  )}
                  {isVerificationActive && verificationExpiryMs !== null && (
                    <p className="text-xs text-gray-400">
                      {intlMessages.profilePages.security.codeExpiresIn.replace(
                        '{time}',
                        formatRemaining(verificationExpiryMs)
                      )}
                    </p>
                  )}
                  {isVerificationExpired && (
                    <p className="profile-error">
                      {intlMessages.profilePages.security.codeExpired}
                    </p>
                  )}
                </div>
                <div className="profile-actions profile-security-form-actions">
                  <Button
                    variant="ghost"
                    className="profile-button profile-button-outline"
                    onClick={handleRequestEmailVerification}
                    disabled={isAccountEmailVerified || isRequestingVerification}
                  >
                    {isRequestingVerification
                      ? intlMessages.profilePages.security.sending
                      : intlMessages.profilePages.security.sendVerificationCode}
                  </Button>
                  <Button
                    variant="gradient"
                    className="profile-button"
                    onClick={handleConfirmEmailVerification}
                    disabled={
                      isAccountEmailVerified ||
                      !verificationInputEnabled ||
                      !verificationCode ||
                      isConfirmingVerification
                    }
                  >
                    {isConfirmingVerification
                      ? intlMessages.profilePages.security.verifying
                      : intlMessages.profilePages.security.verifyEmail}
                  </Button>
                </div>
                {fieldErrors.verificationForm && (
                  <p className="profile-error">{fieldErrors.verificationForm}</p>
                )}
              </div>
            </div>

            <div className="profile-card profile-page-panel profile-security-section-card">
              <div className="profile-security-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.security.changeEmailTitle}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.security.changeEmailDescription}
                </p>
              </div>
              {changeEmailDisabled && (
                <p className="profile-error">
                  {intlMessages.profilePages.security.verifyEmailBeforeChange}
                </p>
              )}
              <fieldset
                disabled={changeEmailDisabled}
                className={`m-0 min-w-0 border-0 p-0 ${changeEmailDisabled ? 'opacity-70' : ''}`}
              >
                <div className="profile-form">
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.security.currentEmailLabel}
                    </span>
                    <Input value={user?.email ?? ''} disabled className="profile-input" />
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.security.currentEmailCodeLabel}
                    </span>
                    <Input
                      value={oldEmailCode}
                      onChange={(event) => {
                        setOldEmailCode(event.target.value);
                        if (fieldErrors.oldEmailCode || fieldErrors.form) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            oldEmailCode: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className="profile-input"
                      placeholder={intlMessages.profilePages.security.verificationCodePlaceholder}
                      disabled={!oldCodeInputEnabled}
                      invalid={Boolean(fieldErrors.oldEmailCode)}
                    />
                    {fieldErrors.oldEmailCode && (
                      <p className="profile-error">{fieldErrors.oldEmailCode}</p>
                    )}
                    {isOldCodeActive && oldCodeExpiryMs !== null && (
                      <p className="text-xs text-gray-400">
                        {intlMessages.profilePages.security.codeExpiresIn.replace(
                          '{time}',
                          formatRemaining(oldCodeExpiryMs)
                        )}
                      </p>
                    )}
                    {isOldCodeExpired && (
                      <p className="profile-error">
                        {intlMessages.profilePages.security.codeExpired}
                      </p>
                    )}
                  </div>
                  <div className="profile-actions profile-security-form-actions">
                    <Button
                      variant="ghost"
                      className="profile-button profile-button-outline"
                      onClick={handleRequestOldEmail}
                      disabled={changeEmailDisabled || isRequestingOld}
                    >
                      {isRequestingOld
                        ? intlMessages.profilePages.security.sending
                        : intlMessages.profilePages.security.sendOldEmailCode}
                    </Button>
                    <Button
                      variant="gradient"
                      className="profile-button"
                      onClick={handleConfirmOldEmail}
                      disabled={
                        changeEmailDisabled ||
                        !oldCodeInputEnabled ||
                        !oldEmailCode ||
                        isConfirmingOld
                      }
                    >
                      {isConfirmingOld
                        ? intlMessages.profilePages.security.verifying
                        : intlMessages.profilePages.security.verifyOldEmail}
                    </Button>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.security.newEmailLabel}
                    </span>
                    <Input
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                        if (fieldErrors.newEmail || fieldErrors.form) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            newEmail: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className="profile-input"
                      placeholder={intlMessages.profilePages.security.newEmailPlaceholder}
                      disabled={changeEmailDisabled || !oldEmailVerified}
                      invalid={Boolean(fieldErrors.newEmail)}
                    />
                    {fieldErrors.newEmail && (
                      <p className="profile-error">{fieldErrors.newEmail}</p>
                    )}
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">
                      {intlMessages.profilePages.security.newEmailCodeLabel}
                    </span>
                    <Input
                      value={newEmailCode}
                      onChange={(event) => {
                        setNewEmailCode(event.target.value);
                        if (fieldErrors.newEmailCode || fieldErrors.form) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            newEmailCode: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className="profile-input"
                      placeholder={intlMessages.profilePages.security.verificationCodePlaceholder}
                      disabled={!newCodeInputEnabled}
                      invalid={Boolean(fieldErrors.newEmailCode)}
                    />
                    {fieldErrors.newEmailCode && (
                      <p className="profile-error">{fieldErrors.newEmailCode}</p>
                    )}
                    {isNewCodeActive && newCodeExpiryMs !== null && (
                      <p className="text-xs text-gray-400">
                        {intlMessages.profilePages.security.codeExpiresIn.replace(
                          '{time}',
                          formatRemaining(newCodeExpiryMs)
                        )}
                      </p>
                    )}
                    {isNewCodeExpired && (
                      <p className="profile-error">
                        {intlMessages.profilePages.security.codeExpired}
                      </p>
                    )}
                  </div>
                  <div className="profile-actions profile-security-form-actions">
                    <Button
                      variant="ghost"
                      className="profile-button profile-button-outline"
                      onClick={handleRequestNewEmail}
                      disabled={
                        changeEmailDisabled || !oldEmailVerified || !newEmail || isRequestingNew
                      }
                    >
                      {isRequestingNew
                        ? intlMessages.profilePages.security.sending
                        : intlMessages.profilePages.security.sendNewEmailCode}
                    </Button>
                    <Button
                      variant="gradient"
                      className="profile-button"
                      onClick={handleConfirmNewEmail}
                      disabled={
                        changeEmailDisabled ||
                        !newCodeInputEnabled ||
                        !newEmailCode ||
                        isConfirmingNew
                      }
                    >
                      {isConfirmingNew
                        ? intlMessages.profilePages.security.verifying
                        : intlMessages.profilePages.security.confirmNewEmail}
                    </Button>
                  </div>
                  {fieldErrors.form && <p className="profile-error">{fieldErrors.form}</p>}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
