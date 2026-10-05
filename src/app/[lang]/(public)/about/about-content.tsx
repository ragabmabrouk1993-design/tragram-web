import Home2Image from "../../marketing/components/marketing-image";
import Home2Faqs from "../../marketing/components/faqs";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import { type Home2Copy } from "../../marketing/marketing-copy";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { PublicPageHeader } from "@/components/marketing/public-page-header";
import AppStoreButtons from "@/components/marketing/app-store-buttons";

type AboutContentProps = {
  locale: Locale;
  home2Copy: Home2Copy;
  legacyPages: Dictionary["legacyPages"];
};

const benefitImages = [
  "/images/benefits-item-image-1.png",
  "/images/benefits-item-image-2.png",
  "/images/benefits-item-image-3.png",
];

const aboutItemIcons = [
  "/images/icon-about-body-item-1.svg",
  "/images/icon-about-body-item-2.svg",
];

const socialAppCards = [
  "/images/about-integrations/card-01.png",
  "/images/about-integrations/card-02.png",
  "/images/about-integrations/card-03.png",
  "/images/about-integrations/card-04.png",
  "/images/about-integrations/card-05.png",
  "/images/about-integrations/card-06.png",
  "/images/about-integrations/card-07.png",
  "/images/about-integrations/card-08.png",
  "/images/about-integrations/card-09.png",
  "/images/about-integrations/card-10.png",
  "/images/about-integrations/card-11.png",
  "/images/about-integrations/card-12.png",
  "/images/about-integrations/card-13.png",
  "/images/about-integrations/card-14.png",
  "/images/about-integrations/card-15.png",
  "/images/about-integrations/card-16.png",
  "/images/about-integrations/card-17.png",
  "/images/about-integrations/card-18.png",
  "/images/about-integrations/card-19.png",
  "/images/about-integrations/card-20.png",
  "/images/about-integrations/card-21.png",
] as const;

export default function AboutContent({ locale, home2Copy, legacyPages }: AboutContentProps) {
  const withLocale = (href: string) => localizePath(locale, href);
  const content = legacyPages.about;
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

      <div className="about-us bg-section">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="about-us-image-box wow fadeInUp" data-wow-delay="0.2s">
                <div className="about-us-image">
                  <figure className="image-anime">
                    <Home2Image src="/images/about-us-image.jpg" alt="" />
                  </figure>
                </div>

                <div className="customer-support-box">
                  <div className="customer-support-content">
                    <div className="customer-support-title">
                      <h3>{content.hero.supportTitle}</h3>
                    </div>
                    <div className="icon-box">
                      <Home2Image src="/images/icon-headset.svg" alt="" />
                    </div>
                  </div>
                </div>

                <div className="app-download-circle-box">
                  <div className="app-download-circle">
                    <a
                      href={withLocale("/contact")}
                      aria-label={content.hero.downloadBadgeLabel}
                    >
                      <Home2Image src="/images/app-download-circle.svg" alt="" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-6">
              <div className="about-us-content-box">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{content.hero.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {content.hero.title}
                  </h2>
                  <p className="wow fadeInUp" data-wow-delay="0.2s">
                    {content.hero.body}
                  </p>
                </div>

                <div className="about-us-body wow fadeInUp" data-wow-delay="0.4s">
                  {content.hero.items.map((item, index) => (
                    <div className="about-us-body-item" key={item.title}>
                      <div className="icon-box">
                        <Home2Image src={aboutItemIcons[index] ?? aboutItemIcons[0]} alt="" />
                      </div>
                      <div className="about-us-body-item-content">
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="about-us-actions wow fadeInUp" data-wow-delay="0.6s">
                  <div className="about-us-btn">
                    <AppzenCta href={withLocale("/contact")} variant="secondary">
                      {content.hero.ctaLabel}
                    </AppzenCta>
                  </div>
                  <AppStoreButtons
                    locale={locale}
                    labels={{
                      appStore: content.socialApps.appStoreLabel,
                      googlePlay: content.socialApps.playStoreLabel,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="our-approach bg-section dark-section">
        <div className="container">
          <div className="row">
            <div className="col-xl-4">
              <div className="approach-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{content.approach.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {content.approach.title}
                  </h2>
                  <p className="wow fadeInUp" data-wow-delay="0.2s">
                    {content.approach.body}
                  </p>
                </div>

                <div className="approach-content-list wow fadeInUp" data-wow-delay="0.4s">
                  <ul>
                    {content.approach.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="approach-btn wow fadeInUp" data-wow-delay="0.6s">
                  <AppzenCta href={withLocale("/contact")} variant="secondary">
                    {content.approach.ctaLabel}
                  </AppzenCta>
                </div>
              </div>
            </div>

            <div className="col-xl-8">
              <div className="mission-vision-list">
                <div className="mission-vision-item wow fadeInUp">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-mission.svg" alt="" />
                  </div>
                  <div className="mission-vision-item-content">
                    <h3>{content.mission.title}</h3>
                    <p>{content.mission.body}</p>
                    <ul>
                      {content.mission.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mission-vision-item wow fadeInUp" data-wow-delay="0.2s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-vision.svg" alt="" />
                  </div>
                  <div className="mission-vision-item-content">
                    <h3>{content.vision.title}</h3>
                    <p>{content.vision.body}</p>
                    <ul>
                      {content.vision.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-12">
              <div className="approach-footer-list">
                {content.platforms.items.map((item, index) => (
                  <div
                    className="approach-footer-item wow fadeInUp"
                    data-wow-delay={index ? `${index * 0.2}s` : undefined}
                    key={item.title}
                  >
                    <div className="approach-footer-item-content">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                    <div className="approach-footer-item-body">
                      {item.ctaLabel ? (
                        <AppzenCta href={withLocale("/contact")} variant="secondary">
                          {item.ctaLabel}
                        </AppzenCta>
                      ) : (
                        [
                          "/images/icon-approach-1.svg",
                          "/images/icon-approach-2.svg",
                          "/images/icon-approach-3.svg",
                          "/images/icon-approach-4.svg",
                        ]
                          .slice(index * 2, index * 2 + 2)
                          .map((src) => (
                            <div className="icon-box" key={src}>
                              <Home2Image src={src} alt="" />
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                ))}
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

      <div className="our-social-apps bg-section dark-section">
        <div className="container-fluid">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <h3 className="wow fadeInUp">{content.socialApps.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {content.socialApps.title}
                </h2>
              </div>
            </div>
          </div>

          <div className="row no-gutters">
            <div className="col-lg-12">
              <div className="social-app-slider">
                  <div className="swiper">
                    <div className="swiper-wrapper">
                    {socialAppCards.map((src, index) => (
                      <div className="swiper-slide" key={`${src}-${index}`}>
                        <div className="social-app-item">
                          <div className="icon-box">
                            <Home2Image src={src} alt="" width={240} height={243} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="social-app-footer">
                <div className="section-footer-text wow fadeInUp" data-wow-delay="0.2s">
                  <p>{content.socialApps.footerText}</p>
                </div>

                <div className="social-app-download-copy wow fadeInUp" data-wow-delay="0.3s">
                  <p>{content.socialApps.downloadLead}</p>
                  <div className="social-app-download-meta">
                    {content.socialApps.downloadHighlights.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>

                <div className="app-download-buttons wow fadeInUp" data-wow-delay="0.4s">
                  <AppStoreButtons
                    locale={locale}
                    labels={{
                      appStore: content.socialApps.appStoreLabel,
                      googlePlay: content.socialApps.playStoreLabel,
                    }}
                  />
                </div>
              </div>
            </div>
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

      <div className="how-it-work bg-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-6">
              <div className="how-it-work-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{content.howItWorks.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {content.howItWorks.title}
                  </h2>
                </div>

                <div className="how-it-works-Item-List">
                  {content.howItWorks.steps.map((step, index) => (
                    <div
                      className="how-work-item wow fadeInUp"
                      data-wow-delay={`${index * 0.2}s`}
                      key={step.title}
                    >
                      <div className="how-it-work-number">
                        <h3>{String(index + 1).padStart(2, "0")}</h3>
                      </div>
                      <div className="how-work-item-content">
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-xl-6">
              <div className="how-it-work-image-box wow fadeInUp" data-wow-delay="0.2s">
                <div className="how-it-work-image box-1">
                  <figure>
                    <Home2Image src="/images/how-it-work-image-1.png" alt="" />
                  </figure>
                </div>
                <div className="how-it-work-image box-2">
                  <figure>
                    <Home2Image src="/images/how-it-work-image-2.png" alt="" />
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Home2Faqs copy={home2Copy} locale={locale} />
    </>
  );
}
