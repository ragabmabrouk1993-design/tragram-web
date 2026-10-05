'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProfileShell } from '@/components/profile/profile-shell';
import { useLocale } from 'next-intl';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { localeCookieName, localizePath, stripLocaleFromPathname, type Locale } from '@/lib/i18n';
import { userService } from '@/services/user.service';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

export default function LanguagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const languages: Array<{ label: string; tag: Locale; flag: string }> = [
    { label: intlMessages.profilePages.language.options.en, tag: 'en', flag: '🇬🇧' },
    { label: intlMessages.profilePages.language.options.ar, tag: 'ar', flag: '🇪🇬' },
  ];
  const [selectedOverride, setSelectedOverride] = useState<Locale | null>(null);
  const selected = selectedOverride ?? lang;
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    const targetLocale = selected;
    const preferredLanguage = targetLocale.startsWith('ar') ? 'ar' : 'en';
    setIsSaving(true);
    try {
      await userService.updatePreferences({ preferredLanguage });
    } catch (error) {
      console.warn('Failed to persist preferred language preference', error);
    }
    trackAnalyticsEvent('language_changed', { from: lang, to: targetLocale });
    if (typeof document !== 'undefined') {
      document.cookie = `${localeCookieName}=${targetLocale}; path=/; max-age=31536000`;
    }
	    const basePath = stripLocaleFromPathname(pathname);
	    router.push(localizePath(targetLocale, basePath));
	    setSelectedOverride(null);
	    setIsSaving(false);
  };
  const currentLanguage = languages.find((language) => language.tag === lang) ?? languages[0];
  const selectedLanguage =
    languages.find((language) => language.tag === selected) ?? currentLanguage;
  const hasPendingChange = selected !== lang;

  return (
    <ProfileShell
      title={intlMessages.profilePages.language.title}
      subtitle={intlMessages.profilePages.language.subtitle}
      backHref="/profile"
      variant={isDesktop ? 'default' : 'mobile'}
      shellClassName="profile-language-shell"
      showSidebar={!isDesktop}
      showBreadcrumbs={!isDesktop}
    >
      <div className="profile-page-stage profile-language-stage profile-mobile-adaptive-layout">
        {isDesktop && (
          <div className="profile-page-hero">
            <span className="profile-page-eyebrow">{intlMessages.profileNav.sectionAccount}</span>
            <h1 className="profile-page-title">{intlMessages.profilePages.language.title}</h1>
            <p className="profile-page-copy">{intlMessages.profilePages.language.subtitle}</p>
          </div>
        )}

        <div className="profile-page-flow profile-language-layout">
          <aside className="profile-page-aside profile-language-aside">
            <div className="profile-card profile-page-support-card profile-language-card profile-language-summary-card">
              <div className="profile-language-summary-head">
                <div>
                  <p className="profile-panel-label">
                    {intlMessages.profilePages.language.current}
                  </p>
                  <p className="profile-language-current-label">
                    {currentLanguage.flag} {currentLanguage.label}
                  </p>
                </div>
                {hasPendingChange && (
                  <span className="profile-language-pending-badge">
                    {selectedLanguage.flag} {selectedLanguage.label}
                  </span>
                )}
              </div>
              <p className="profile-card-text profile-language-summary-copy">
                {intlMessages.profilePages.language.subtitle}
              </p>
            </div>
          </aside>

          <div className="profile-page-main profile-language-main">
            <div className="profile-card profile-page-panel profile-language-card">
              <div className="profile-language-section-heading">
                <p className="profile-page-section-label">
                  {intlMessages.profilePages.language.choose}
                </p>
                <p className="profile-page-section-copy">
                  {intlMessages.profilePages.language.subtitle}
                </p>
              </div>

              <div
                className="profile-language-option-grid"
                role="listbox"
                aria-label={intlMessages.profilePages.language.choose}
              >
                {languages.map((language) => {
                  const isSelected = selected === language.tag;
                  const isCurrent = lang === language.tag;

                  return (
                    <button
                      key={language.tag}
                      type="button"
                      aria-pressed={isSelected}
                      className={`profile-language-choice${isSelected ? ' is-active' : ''}`}
	                  onClick={() => setSelectedOverride(language.tag)}
                    >
                      <div className="profile-language-choice-main">
                        <span className="profile-language-choice-flag">{language.flag}</span>
                        <div className="profile-language-choice-copy">
                          <span className="profile-language-choice-label">{language.label}</span>
                          <span className="profile-language-choice-meta">
                            {language.tag.toUpperCase()}
                            {isCurrent ? ` • ${intlMessages.profilePages.language.current}` : ''}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`profile-language-radio${isSelected ? ' is-selected' : ''}`}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="profile-card profile-page-support-card profile-language-card profile-language-action-card">
              <div className="profile-language-action-copy">
                <p className="profile-more-label">{intlMessages.profilePages.language.choose}</p>
                <p className="profile-more-sub">
                  {selectedLanguage.flag} {selectedLanguage.label}
                </p>
              </div>
              <Button
                variant="gradient"
                className="profile-button profile-button-full profile-language-save"
                onClick={handleSave}
                disabled={!hasPendingChange || isSaving}
              >
                {intlMessages.profilePages.language.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
