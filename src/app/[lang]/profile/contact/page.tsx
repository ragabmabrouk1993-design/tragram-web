'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileShell } from '@/components/profile/profile-shell';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { AtSign, MessageSquare, Paperclip, Send } from 'lucide-react';
import { FaTelegramPlane } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { contactService } from '@/services/contact.service';
import { getLocalizedErrorMessage } from '@/lib/error-utils';
import type { User as ApiUser } from '@/lib/api-client';
import '../../../styles/pages/contact.css';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

const CONTACT_TYPE_VALUES = [
  'GENERAL_INQUIRY',
  'TECHNICAL_SUPPORT',
  'BILLING_PAYMENTS',
  'FEATURE_REQUEST',
  'ACCOUNT_ISSUES',
  'TRADING_SIGNALS_INQUIRY',
  'OTHER',
] as const;

type ContactSubmissionType = (typeof CONTACT_TYPE_VALUES)[number];

const SUPPORTED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'tg:']);

const resolveSupportTelegramUrl = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL?.trim();
  if (!raw) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (!SUPPORTED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export default function ContactPage() {
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const typeOptions = (intlMessages.profilePages?.contact?.typeOptions ?? []) as string[];
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);

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
    let cancelled = false;

    const loadProfile = async () => {
      setIsProfileLoading(true);
      try {
        const nextProfile = await authService.getProfile();
        if (!cancelled) {
          setProfile(nextProfile ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setProfile(null);
          toast.error(
            getLocalizedErrorMessage(error, intlMessages) ||
              intlMessages.profilePages.contact.submitError
          );
        }
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [intlMessages]);

  const safeSelectedTypeIndex = selectedTypeIndex < typeOptions.length ? selectedTypeIndex : 0;
  const selectedType = typeOptions[safeSelectedTypeIndex] ?? typeOptions[0] ?? '';
  const selectedTypeValue: ContactSubmissionType =
    CONTACT_TYPE_VALUES[safeSelectedTypeIndex] ?? CONTACT_TYPE_VALUES[0];
  const canUseProfileIdentity = Boolean(
    profile?.firstName?.trim() && profile?.lastName?.trim() && profile?.email?.trim()
  );

  const handleTelegram = () => {
    const supportTelegramUrl = resolveSupportTelegramUrl();
    if (!supportTelegramUrl) {
      toast.error(intlMessages.profilePages.contact.telegramUnavailable);
      return;
    }
    window.open(supportTelegramUrl, '_blank', 'noopener,noreferrer');
  };

  const canSubmit =
    subject.trim().length > 0 &&
    message.trim().length >= 10 &&
    !isSubmitting &&
    !isProfileLoading &&
    canUseProfileIdentity;

  const handleSend = async () => {
    if (!canSubmit || !profile) {
      return;
    }

    setIsSubmitting(true);

    try {
      const pagePath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : `/${lang}/profile/contact`;

      const response = await contactService.createSubmission({
        firstName: profile.firstName?.trim() ?? '',
        lastName: profile.lastName?.trim() ?? '',
        email: profile.email?.trim() ?? '',
        phone: profile.phoneNumber ?? undefined,
        subject: subject.trim(),
        type: selectedTypeValue,
        message: message.trim(),
        locale: lang,
        pagePath,
      });

      if (!response.success) {
        throw new Error('Submission was not accepted');
      }
      trackAnalyticsEvent('contact_form_submitted', { success: true });

      setSubject('');
      setMessage('');
      toast.success(intlMessages.profilePages.contact.submitSuccess);
    } catch (error) {
      trackAnalyticsEvent('contact_form_submitted', { success: false });
      toast.error(
        getLocalizedErrorMessage(error, intlMessages) ||
          intlMessages.profilePages.contact.submitError
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProfileShell
      title={intlMessages.profilePages.contact.title}
      subtitle={intlMessages.profilePages.contact.subtitle}
      backHref="/profile"
      variant={isDesktop ? 'default' : 'mobile'}
      shellClassName="profile-contact-shell"
      showSidebar={!isDesktop}
      showBreadcrumbs={!isDesktop}
    >
      <div className="profile-page-stage contact-page-stage profile-mobile-adaptive-layout">
        {isDesktop && (
          <div className="profile-page-hero">
            <span className="profile-page-eyebrow">{intlMessages.profileNav.sectionSupport}</span>
            <h1 className="profile-page-title">{intlMessages.profilePages.contact.title}</h1>
            <p className="profile-page-copy">{intlMessages.profilePages.contact.subtitle}</p>
          </div>
        )}

        <div className="profile-page-flow contact-layout">
          <aside className="profile-page-aside contact-aside">
            <div className="profile-card profile-page-support-card contact-support-card">
              <div className="contact-support-actions">
                <button
                  type="button"
                  className="contact-channel-button"
                  onClick={() => {
                    subjectInputRef.current?.focus();
                    subjectInputRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }}
                >
                  <MessageSquare className="contact-channel-icon" />
                  <span className="contact-channel-label">
                    {intlMessages.profilePages.contact.messageButton}
                  </span>
                </button>
                <button type="button" className="contact-channel-button" onClick={handleTelegram}>
                  <FaTelegramPlane className="contact-channel-icon" />
                  <span className="contact-channel-label">
                    {intlMessages.profilePages.contact.telegramButton}
                  </span>
                </button>
              </div>

              <div className="contact-support-meta">
                <p className="profile-panel-label">{intlMessages.profilePages.contact.typeLabel}</p>
                <p className="contact-support-type">{selectedType}</p>
                {profile?.email && <p className="contact-support-profile">{profile.email}</p>}
              </div>
            </div>
          </aside>

          <div className="profile-page-main contact-main">
            <div className="profile-card profile-page-panel contact-composer-card">
              <div className="contact-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.contact.typeLabel}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.contact.subtitle}
                </p>
              </div>

              <div
                className="contact-type-grid"
                role="listbox"
                aria-label={intlMessages.profilePages.contact.typeSelectTitle}
              >
                {typeOptions.map((option, index) => (
                  <button
                    key={`${option}-${index}`}
                    type="button"
                    aria-pressed={selectedTypeIndex === index}
                    className={cn('contact-type-chip', selectedTypeIndex === index && 'is-active')}
                    onClick={() => setSelectedTypeIndex(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="contact-form-grid">
                <div className="contact-form-field">
                  <span className="contact-form-label">
                    {intlMessages.profilePages.contact.subjectPlaceholder}
                  </span>
                  <div className="contact-input-shell">
                    <Paperclip className="contact-input-shell-icon" />
                    <Input
                      ref={subjectInputRef}
                      type="text"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder={intlMessages.profilePages.contact.subjectPlaceholder}
                      className="contact-input"
                    />
                  </div>
                </div>

                <div className="contact-form-field">
                  <span className="contact-form-label">
                    {intlMessages.profilePages.contact.messagePlaceholder}
                  </span>
                  <div className="contact-input-shell contact-textarea-shell">
                    <AtSign className="contact-input-shell-icon" />
                    <textarea
                      placeholder={intlMessages.profilePages.contact.messagePlaceholder}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={7}
                      className="contact-textarea"
                    />
                  </div>
                </div>
              </div>

              <div className="contact-footer">
                <div className="contact-footer-meta">
                  <span className="contact-footer-type">{selectedType}</span>
                  {!canUseProfileIdentity && !isProfileLoading && profile?.email && (
                    <span className="contact-footer-status">{profile.email}</span>
                  )}
                </div>
                <Button
                  variant="gradient"
                  className="profile-button profile-button-full contact-send"
                  onClick={handleSend}
                  disabled={!canSubmit}
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting
                    ? intlMessages.profilePages.contact.submitting
                    : intlMessages.profilePages.contact.send}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
