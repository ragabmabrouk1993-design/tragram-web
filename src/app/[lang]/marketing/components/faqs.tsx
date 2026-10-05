"use client";

import { useState } from "react";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type Home2FaqsProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Faqs({ copy, locale }: Home2FaqsProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const questions = resolvedCopy.faqs.questions ?? [];
  const [openFaqIndex, setOpenFaqIndex] = useState(questions.length ? 0 : -1);
  const normalizedOpenFaqIndex =
    questions.length === 0 ? -1 : openFaqIndex < 0 ? -1 : Math.min(openFaqIndex, questions.length - 1);

  const handleFaqToggle = (index: number) => {
    if (index !== normalizedOpenFaqIndex) {
      trackAnalyticsEvent("faq_expanded", { question_id: `faq-${index + 1}` });
    }
    setOpenFaqIndex((current) => (current === index ? -1 : index));
  };

  return (
    <div className="our-faqs">
      <div className="container">
        <div className="row">
          <div className="col-xl-5">
            <div className="faqs-content-box">
              <div className="faqs-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{resolvedCopy.faqs.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {resolvedCopy.faqs.title}
                  </h2>
                  <p className="wow fadeInUp faq-description-text" data-wow-delay="0.2s">
                    {resolvedCopy.faqs.body}
                  </p>
                </div>

                <div className="faq-btn wow fadeInUp" data-wow-delay="0.4s">
                  <AppzenCta href={withLocale("/faqs")} variant="secondary">
                    {resolvedCopy.faqs.cta}
                  </AppzenCta>
                </div>
              </div>

              <div className="faqs-cta-box wow fadeInUp" data-wow-delay="0.6s">
                <div className="faqs-cta-box-header">
                  <div className="faqs-cta-box-counter-content">
                    <p className="faq-rating-label">{resolvedCopy.faqs.ratingLabel}</p>
                  </div>
                </div>

                <div className="faqs-cta-body">
                  <div className="faqs-cta-body-content">
                    <p className="faq-satisfaction-label">{resolvedCopy.faqs.ratingBody}</p>
                    <p className="faq-satisfaction-label">{resolvedCopy.faqs.satisfactionLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-7">
            <div className="faq-accordion" id="accordion">
              {questions.map((question, index) => {
                const headingId = `home2-faq-heading-${index}`;
                const panelId = `home2-faq-panel-${index}`;
                const isOpen = index === normalizedOpenFaqIndex;
                return (
                  <div
                    className="accordion-item wow fadeInUp"
                    data-wow-delay={index ? `${(index * 0.2).toFixed(1)}s` : undefined}
                    key={question.q}
                  >
                    <h2 className="accordion-header" id={headingId}>
                      <button
                        className={`accordion-button${isOpen ? "" : " collapsed"}`}
                        type="button"
                        onClick={() => handleFaqToggle(index)}
                        aria-expanded={isOpen ? "true" : "false"}
                        aria-controls={panelId}
                      >
                        {question.q}
                      </button>
                    </h2>
                    <div
                      id={panelId}
                      className={`accordion-collapse collapse${isOpen ? " show" : ""}`}
                      aria-labelledby={headingId}
                      hidden={!isOpen}
                    >
                      <div className="accordion-body">
                        <p className="faq-answer-text">{question.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
