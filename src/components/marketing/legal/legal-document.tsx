"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { localizePath, type Locale } from "@/lib/i18n";
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import { currentAccessCopy } from '@/lib/public-commercial-copy';
import { resolvePublicLocale } from '@/lib/public-locales';

type LegalSummaryCard = {
  label: string;
  value: string;
};

type LegalSubsection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type LegalSection = {
  id: string;
  title: string;
  lead?: string;
  body?: string[];
  bullets?: string[];
  callout?: string;
  subsections?: LegalSubsection[];
};

export type LegalDocumentContent = {
  kicker: string;
  title: string;
  description: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  effectiveDateLabel: string;
  effectiveDate: string;
  entityLabel: string;
  entityName: string;
  notice?: string;
  tableOfContentsTitle: string;
  summaryCards?: LegalSummaryCard[];
  sections: LegalSection[];
  contactTitle: string;
  contactBody: string;
  contactLinkLabel: string;
};

type LegalDocumentProps = {
  content: LegalDocumentContent;
  lang: Locale;
  children?: ReactNode;
};

export function LegalDocument({ content, lang, children }: LegalDocumentProps) {
  return (
    <main id="main-content" tabIndex={-1} className="page-legal bg-section">
      <div className="container">
        <article className="legal-shell" aria-labelledby="legal-title">
          <header className="legal-hero-card">
            <p className="legal-eyebrow">{content.kicker}</p>
            <h2 id="legal-title">{content.title}</h2>
            <p className="legal-description">{content.description}</p>
            {isBillingDisabledInCurrentEnv() ? <p className="legal-notice">{currentAccessCopy[resolvePublicLocale(lang)]}</p> : null}
            <p>{lang.startsWith('ar') ? 'يتوفر Tragram عبر الويب وتطبيقات iOS وAndroid. صفحات السياسات لا تفعّل الشراء. راجع سجل الدفع لتحديد قناة أي عملية شراء سابقة؛ الإلغاء والاسترداد وحذف الحساب إجراءات منفصلة.' : 'Tragram is available through the web and iOS/Android apps. Policy pages do not enable purchases. Check the payment record to identify the channel of any previous purchase; cancellation, refunds and account deletion are separate actions.'}</p>

            <dl className="legal-meta-grid" aria-label="Document information">
              <div>
                <dt>{content.lastUpdatedLabel}</dt>
                <dd>{content.lastUpdated}</dd>
              </div>
              <div>
                <dt>{content.effectiveDateLabel}</dt>
                <dd>{content.effectiveDate}</dd>
              </div>
              <div>
                <dt>{content.entityLabel}</dt>
                <dd>{content.entityName}</dd>
              </div>
            </dl>

            {content.notice ? <p className="legal-notice">{content.notice}</p> : null}
          </header>

          {content.summaryCards?.length ? (
            <section className="legal-summary-grid" aria-label="Policy summary">
              {content.summaryCards.map((card) => (
                <div className="legal-summary-card" key={`${card.label}-${card.value}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </section>
          ) : null}

          <div className="legal-layout">
            <aside className="legal-toc" aria-label={content.tableOfContentsTitle}>
              <nav>
                <h2>{content.tableOfContentsTitle}</h2>
                <ol>
                  {content.sections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>{section.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="legal-document">
              {content.sections.map((section, index) => (
                <section className="legal-section" id={section.id} key={section.id}>
                  <span className="legal-section-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{section.title}</h2>
                  {section.lead ? <p className="legal-lead">{section.lead}</p> : null}

                  {section.body?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  {section.bullets?.length ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section.subsections?.map((subsection) => (
                    <div className="legal-subsection" key={subsection.title}>
                      <h3>{subsection.title}</h3>
                      {subsection.body?.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {subsection.bullets?.length ? (
                        <ul>
                          {subsection.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}

                  {section.callout ? <p className="legal-callout">{section.callout}</p> : null}
                </section>
              ))}

              <section className="legal-contact-card" aria-labelledby="legal-contact-title">
                <div>
                  <p className="legal-eyebrow">{content.kicker}</p>
                  <h2 id="legal-contact-title">{content.contactTitle}</h2>
                  <p>{content.contactBody}</p>
                </div>
                <Link className="legal-contact-link" href={localizePath(lang, "/contact")}>
                  {content.contactLinkLabel}
                </Link>
              </section>

              {children}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
