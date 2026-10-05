import Image from "next/image";
import { PublicPageHeader } from "@/components/marketing/public-page-header";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { localizePath, type Locale } from "@/lib/i18n";
import { type Home2Copy } from "../marketing/marketing-copy";

type PublicNotFoundContentProps = {
  locale: Locale;
  copy: Home2Copy;
};

export default function PublicNotFoundContent({
  locale,
  copy,
}: PublicNotFoundContentProps) {
  const content = copy.notFound;
  const withLocale = (href: string) => localizePath(locale, href);

  return (
    <>
      <PublicPageHeader
        lang={locale}
        animateTitle={false}
        title={content.title}
        breadcrumbs={[
          { label: content.breadcrumbHome, href: withLocale("/") },
          { label: content.breadcrumbActive },
        ]}
      />

      <main id="main-content" tabIndex={-1} className="error-page bg-section" aria-labelledby="public-not-found-title">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="error-page-image">
                <Image
                  src="/images/404-error-img.png"
                  alt=""
                  width={700}
                  height={430}
                  style={{ height: "auto" }}
                  loading="lazy"
                />
              </div>
              <div className="error-page-content">
                <div className="section-title">
                  <h2 id="public-not-found-title">{content.errorTitle}</h2>
                  <p>{content.errorBody}</p>
                </div>
                <AppzenCta href={withLocale("/")} variant="primary">
                  {content.backHome}
                </AppzenCta>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
