import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";

type Home2OurToolsProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2OurTools({ copy, locale }: Home2OurToolsProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const setupLabel = resolvedLocale.startsWith("ar") ? "تعرّف على خطوات الإعداد" : "See how setup works";
  return (
    <div className="our-tools-elite bg-section dark-section">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <div className="tools-content-elite">
              <div className="section-title section-title-center">
                <h3 className="wow fadeInUp">{resolvedCopy.tools.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.tools.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.tools.body}
                </p>
              </div>

              <div className="tools-features-list-elite wow fadeInUp" data-wow-delay="0.4s">
                <ul>
                  <li>{resolvedCopy.tools.featureItem1}</li>
                  <li>{resolvedCopy.tools.featureItem2}</li>
                  <li>{resolvedCopy.tools.featureItem3}</li>
                </ul>
              </div>

              <div className="tools-content-footer-elite wow fadeInUp" data-wow-delay="0.6s">
                <div className="tools-btn-elite">
                  <AppzenCta href={withLocale("/contact")} variant="primary">
                    {resolvedCopy.tools.cta}
                  </AppzenCta>
                </div>

                <div className="video-play-button bg-effect">
                  <a
                    href={withLocale("/help-center")}
                    aria-label={setupLabel}
                  >
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </a>
                  <h3>{setupLabel}</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="tools-image-elite">
              <figure>
                <Home2Image src="/images/our-tools-figure-elite.png" alt="" />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
