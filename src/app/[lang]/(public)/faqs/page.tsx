"use client";

import { useState } from "react";
import Home2Image from "../../marketing/components/marketing-image";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { PublicPageHeader } from "@/components/marketing/public-page-header";
import "../../../styles/pages/public-faqs.css";

export default function FaqsPage() {
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const faqs = intlMessages.home2.faqs.questions.map((faq) => ({
    question: faq.q,
    answer: faq.a,
  }));
  const content = intlMessages.legacyPages.faqs;
  const categories = content.categories;
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const normalizedCategoryIndex = categories.length
    ? Math.max(0, Math.min(activeCategoryIndex, categories.length - 1))
    : 0;
  const activeCategory =
    categories[normalizedCategoryIndex] ??
    categories[0] ?? {
      id: "faq_default",
      label: content.header.breadcrumbActive,
    };
  const categorizedFaqs = categories.reduce<Record<string, typeof faqs>>((result, category) => {
    result[category.id] = [];
    return result;
  }, {});
  faqs.forEach((faq, index) => {
    const category = categories[Math.min(index, categories.length - 1)];
    if (category) {
      categorizedFaqs[category.id].push(faq);
    }
  });
  const visibleFaqs =
    activeCategory && categorizedFaqs[activeCategory.id]?.length
      ? categorizedFaqs[activeCategory.id]
      : faqs;
  const normalizedVisibleOpenFaqIndex = visibleFaqs.length
    ? Math.max(-1, Math.min(openFaqIndex, visibleFaqs.length - 1))
    : -1;

  const handleCategoryClick = (index: number) => {
    setActiveCategoryIndex(index);
    setOpenFaqIndex(faqs.length ? 0 : -1);
  };

  const handleFaqToggle = (index: number) => {
    if (index !== normalizedVisibleOpenFaqIndex) {
      trackAnalyticsEvent("faq_expanded", {
        question_id: `${activeCategory.id}-${index + 1}`,
      });
    }
    setOpenFaqIndex((current) => (current === index ? -1 : index));
  };

  return (
    <>
      <PublicPageHeader
        lang={lang}
        title={content.header.title}
        breadcrumbs={[
          { label: content.header.breadcrumbHome, href: localizePath(lang, "/") },
          { label: content.header.breadcrumbActive },
        ]}
      />

      <div className="page-faqs">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <div className="page-single-sidebar">
                <div className="page-category-list wow fadeInUp">
                  <ul>
                    {categories.map((category, index) => (
                      <li key={category.id}>
                        <a
                          href={`#${category.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            handleCategoryClick(index);
                          }}
                          className={normalizedCategoryIndex === index ? "is-active" : undefined}
                          aria-current={normalizedCategoryIndex === index ? "true" : undefined}
                        >
                          {category.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sidebar-cta-box wow fadeInUp" data-wow-delay="0.25s">
                  <div className="icon-box">
                    <Home2Image src="/brand/v1/logo-horizontal-white.svg" alt="Tragram" />
                  </div>
                  <div className="sidebar-cta-content">
                    <h3>{content.sidebar.title}</h3>
                  </div>
                  <div className="sidebar-cta-contact-list">
                    <ul>
                      <li>
                        <a href={`mailto:${content.sidebar.emailValue}`}>
                          <Home2Image src="/images/icon-mail-primary.svg" alt="" /> {content.sidebar.emailLabel}
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="page-faqs-catagery">
                <div className="page-single-faqs" id={activeCategory?.id}>
                  <div className="section-title">
                    <h2 className="text-anime-style-3" data-cursor="-opaque">
                      {activeCategory?.label}
                    </h2>
                  </div>

                  <div className="faq-accordion our-faq-accordion" id="accordion">
                    {visibleFaqs.map((faq, index) => {
                      const headingId = `heading-${index}`;
                      const collapseId = `collapse-${index}`;
                      const isOpen = index === normalizedVisibleOpenFaqIndex;
                      return (
                        <div
                          className="accordion-item wow fadeInUp"
                          data-wow-delay={index ? "0.2s" : undefined}
                          key={faq.question}
                        >
                          <h2 className="accordion-header" id={headingId}>
                            <button
                              className={`accordion-button${isOpen ? "" : " collapsed"}`}
                              type="button"
                              onClick={() => handleFaqToggle(index)}
                              aria-expanded={isOpen ? "true" : "false"}
                              aria-controls={collapseId}
                            >
                              {faq.question}
                            </button>
                          </h2>
                          <div
                            id={collapseId}
                            className={`accordion-collapse collapse${isOpen ? " show" : ""}`}
                            aria-labelledby={headingId}
                            hidden={!isOpen}
                          >
                            <div className="accordion-body">
                              <p className="faq-answer-text">{faq.answer}</p>
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
        </div>
      </div>
    </>
  );
}
