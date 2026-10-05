import Home2Image from "../../marketing/components/marketing-image";
import Home2Faqs from "../../marketing/components/faqs";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import { type Home2Copy } from "../../marketing/marketing-copy";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { PublicPageHeader } from "@/components/marketing/public-page-header";

type FeaturesContentProps = {
  locale: Locale;
  home2Copy: Home2Copy;
  legacyPages: Dictionary["legacyPages"];
};

const benefitImages = [
  "/images/benefits-item-image-1.png",
  "/images/benefits-item-image-2.png",
  "/images/benefits-item-image-3.png",
];

const featureIcons = [
  "/images/icon-features-1.svg",
  "/images/icon-features-2.svg",
  "/images/icon-features-3.svg",
  "/images/icon-features-4.svg",
  "/images/icon-features-5.svg",
  "/images/icon-features-6.svg",
  "/images/icon-features-7.svg",
  "/images/icon-features-8.svg",
];

export default function FeaturesContent({ locale, home2Copy, legacyPages }: FeaturesContentProps) {
  const withLocale = (href: string) => localizePath(locale, href);
  const content = legacyPages.features;
  const shared = legacyPages.shared;
  const whyChoose = shared.whyChoose;
  const benefits = shared.benefits;

  return (
    <>
      <PublicPageHeader
        lang={locale}
        title={content.header.title}
        breadcrumbs={[
          { label: content.header.breadcrumbHome, href: withLocale("/") },
          { label: content.header.breadcrumbActive },
        ]}
      />

      <div className="page-features bg-section">
        <div className="container">
          <div className="row">
            {content.cards.map((item, index) => (
              <div className="col-xl-3 col-md-6" key={item.title}>
                <div className="key-features-item wow fadeInUp" data-wow-delay={`${index * 0.2}s`}>
                  <div className="icon-box">
                    <Home2Image src={featureIcons[index] ?? featureIcons[0]} alt="" />
                  </div>
                  <div className="key-features-item-content">
                    <div className="key-features-item-title">
                      <h3>{item.title}</h3>
                    </div>
                    <div className="key-features-item-btn">
                      <a href={withLocale("/contact")} className="readmore-btn">
                        {content.viewDetails}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="why-choose-us bg-section dark-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="why-choose-us-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{whyChoose.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {whyChoose.title}
                  </h2>
                </div>

                <div className="why-choose-us-btn wow fadeInUp" data-wow-delay="0.2s">
                  <AppzenCta href={withLocale("/contact")} variant="primary">
                    {whyChoose.cta}
                  </AppzenCta>
                </div>

                <div className="why-choose-us-image">
                  <figure>
                    <Home2Image src="/images/why-choose-us-image-v2.png" alt="" />
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="our-benefits bg-section">
        <div className="container">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <h3 className="wow fadeInUp">{benefits.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {benefits.title}
                </h2>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="benefits-item-list">
                {benefits.items.map((item, index) => (
                  <div
                    className="benefits-item wow fadeInUp"
                    data-wow-delay={index ? `${index * 0.2}s` : undefined}
                    key={item.title}
                  >
                    <div className="benefits-item-content">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                    <div className="benefits-item-image">
                      <figure>
                        <Home2Image src={benefitImages[index] ?? benefitImages[0]} alt="" />
                      </figure>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-12">
              <div className="section-footer-text wow fadeInUp" data-wow-delay="0.2s">
                <p>{benefits.footerText}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Home2Faqs copy={home2Copy} locale={locale} />
    </>
  );
}
