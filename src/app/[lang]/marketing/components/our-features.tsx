import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";

type Home2OurFeaturesProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2OurFeatures({ copy, locale }: Home2OurFeaturesProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  return (
    <div className="our-features-elite bg-section">
      <div className="container">
        <div className="row section-row">
          <div className="col-lg-12">
            <div className="section-title section-title-center">
              <h3 className="wow fadeInUp">{resolvedCopy.features.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {resolvedCopy.features.title}
              </h2>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-3 col-md-6">
            <div className="features-item-elite wow fadeInUp">
              <div className="features-item-content-elite">
                <div className="features-item-header-elite">
                  <div className="features-item-title-elite">
                    <h3>{resolvedCopy.features.item1Title}</h3>
                  </div>
                  <div className="icon-box">
                    <Home2Image src="/images/icon-features-1-elite.svg" alt="" />
                  </div>
                </div>

                <div className="features-item-body-elite">
                  <p>{resolvedCopy.features.item1Body}</p>
                </div>
              </div>

              <div className="features-item-tag-list-elite">
                <ul>
                  <li>{resolvedCopy.features.item1Tag}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="features-item-elite wow fadeInUp" data-wow-delay="0.2s">
              <div className="features-item-content-elite">
                <div className="features-item-header-elite">
                  <div className="features-item-title-elite">
                    <h3>{resolvedCopy.features.item2Title}</h3>
                  </div>
                  <div className="icon-box">
                    <Home2Image src="/images/icon-features-2-elite.svg" alt="" />
                  </div>
                </div>

                <div className="features-item-body-elite">
                  <p>{resolvedCopy.features.item2Body}</p>
                </div>
              </div>

              <div className="features-item-tag-list-elite">
                <ul>
                  <li>{resolvedCopy.features.item2Tag}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="features-item-elite wow fadeInUp" data-wow-delay="0.4s">
              <div className="features-item-content-elite">
                <div className="features-item-header-elite">
                  <div className="features-item-title-elite">
                    <h3>{resolvedCopy.features.item3Title}</h3>
                  </div>
                  <div className="icon-box">
                    <Home2Image src="/images/icon-features-3-elite.svg" alt="" />
                  </div>
                </div>

                <div className="features-item-body-elite">
                  <p>{resolvedCopy.features.item3Body}</p>
                </div>
              </div>

              <div className="features-item-tag-list-elite">
                <ul>
                  <li>{resolvedCopy.features.item3Tag}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="features-item-elite wow fadeInUp" data-wow-delay="0.6s">
              <div className="features-item-content-elite">
                <div className="features-item-header-elite">
                  <div className="features-item-title-elite">
                    <h3>{resolvedCopy.features.item4Title}</h3>
                  </div>
                  <div className="icon-box">
                    <Home2Image src="/images/icon-features-4-elite.svg" alt="" />
                  </div>
                </div>

                <div className="features-item-body-elite">
                  <p>{resolvedCopy.features.item4Body}</p>
                </div>
              </div>

              <div className="features-item-tag-list-elite">
                <ul>
                  <li>{resolvedCopy.features.item4Tag}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="features-footer-elite wow fadeInUp" data-wow-delay="0.4s">
              <div className="features-footer-list-elite">
                <ul>
                  <li>{resolvedCopy.features.footerTag1}</li>
                  <li>{resolvedCopy.features.footerTag2}</li>
                  <li>{resolvedCopy.features.footerTag3}</li>
                  <li>{resolvedCopy.features.footerTag4}</li>
                </ul>
              </div>

              <div className="section-footer-text">
                <p>
                  {resolvedCopy.features.footerText}{" "}
                  <a href={withLocale("/contact")}>{resolvedCopy.features.footerLink}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
