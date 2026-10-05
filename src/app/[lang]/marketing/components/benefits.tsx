import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";

type Home2BenefitsProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Benefits({ copy, locale }: Home2BenefitsProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  return (
    <div className="our-benefits-elite">
      <div className="container">
        <div className="row section-row align-items-center">
          <div className="col-xl-7">
            <div className="section-title">
              <h3 className="wow fadeInUp">{resolvedCopy.benefits.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {resolvedCopy.benefits.title}
              </h2>
            </div>
          </div>
          <div className="col-xl-5">
            <div className="section-content-btn">
              <div className="section-title-content wow fadeInUp" data-wow-delay="0.2s">
                <p>
                  {resolvedCopy.benefits.body}
                </p>
              </div>

              <div className="section-btn wow fadeInUp" data-wow-delay="0.4s">
                <AppzenCta href={withLocale("/contact")} variant="secondary">
                  {resolvedCopy.benefits.cta}
                </AppzenCta>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-5">
            <div className="benefit-item-box-elite wow fadeInUp">
              <div className="benefit-item-elite">
                <div className="icon-box">
                  <Home2Image src="/images/icon-benefit-item-1-elite.svg" alt="" />
                </div>
                <div className="benefit-item-content-elite">
                  <h3>{resolvedCopy.benefits.feature1Title}</h3>
                  <p>
                    {resolvedCopy.benefits.feature1Body}
                  </p>
                </div>
              </div>

              <div className="benefit-item-box-image-elite">
                <Home2Image src="/images/benefit-item-box-image-elite.png" alt="" />
              </div>
            </div>
          </div>
          <div className="col-xl-7">
            <div className="benefit-item-list-elite">
              <div className="total-sales-image-elite wow fadeInUp">
                <figure>
                  <Home2Image src="/images/benefit-image-2-elite.jpg" alt="" />
                </figure>
              </div>

              <div className="customize-dashboard-box-elite wow fadeInUp" data-wow-delay="0.2s">
                <div className="customize-dashboard-image-elite">
                  <figure>
                    <Home2Image src="/images/benefit-image-3-elite.jpg" alt="" />
                  </figure>
                </div>

                <div className="benefit-item-content-elite">
                  <h3>{resolvedCopy.benefits.feature2Title}</h3>
                  <p>
                    {resolvedCopy.benefits.feature2Body}
                  </p>
                </div>
              </div>

              <div className="smart-management-box-elite dark-section wow fadeInUp" data-wow-delay="0.4s">
                <div className="smart-management-content-elite benefit-item-content-elite">
                  <h3>{resolvedCopy.benefits.feature3Title}</h3>
                  <p>
                    {resolvedCopy.benefits.feature3Body}
                  </p>
                  <ul>
                    <li>{resolvedCopy.benefits.feature3ListItem1}</li>
                    <li>{resolvedCopy.benefits.feature3ListItem2}</li>
                  </ul>
                </div>

                <div className="smart-management-image-elite">
                  <figure>
                    <Home2Image src="/images/smart-management-image-elite.png" alt="" />
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
