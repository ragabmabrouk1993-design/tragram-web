"use client";

import "../../../styles/pages/public-legal.css";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/marketing/public-page-header";

export default function HelpCenterPage() {
  const lang = useLocale();
    const intlMessages = useRouteMessages();
  const content = intlMessages.home2.helpCenterPage;

  return (
    <>
      <PublicPageHeader
        lang={lang}
        title={content.title}
        breadcrumbs={[
          { label: "home", href: localizePath(lang, "/") },
          { label: content.kicker },
        ]}
      />

      <div className="page-legal bg-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{content.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {content.title}
                  </h2>
                  <p className="wow fadeInUp" data-wow-delay="0.2s">
                    {content.description}
                  </p>
                </div>

                <div className="legal-section-list">
                  {content.sections.map((section) => (
                    <div className="legal-card wow fadeInUp" key={section.title}>
                      <h3>{section.title}</h3>
                      <p>{section.body}</p>
                    </div>
                  ))}
                </div>

                <div className="legal-contact">
                  <p>
                    {content.contactPrefix}{" "}
                    <Link href={localizePath(lang, "/contact")}>
                      {content.contactLinkLabel}
                    </Link>
                    {content.contactSuffix}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
