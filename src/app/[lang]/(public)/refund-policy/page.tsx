"use client";

import "../../../styles/pages/public-legal.css";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { LegalDocument } from "@/components/marketing/legal/legal-document";
import { PublicPageHeader } from "@/components/marketing/public-page-header";

export default function RefundPolicyPage() {
  const lang = useLocale();
  const intlMessages = useRouteMessages();
  const content = intlMessages.refundPage;

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

      <LegalDocument content={content} lang={lang} />
    </>
  );
}
