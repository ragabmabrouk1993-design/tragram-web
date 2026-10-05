import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";

type Home2DigitalCompanionProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2DigitalCompanion({ copy, locale }: Home2DigitalCompanionProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  return (
    <div className="digital-companion-elite bg-section dark-section">
      <div className="container">
        <div className="row">
          <div className="col-xl-6">
            <div className="digital-companion-content-elite">
              <div className="section-title">
                <h3 className="wow fadeInUp">{resolvedCopy.digitalCompanion.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.digitalCompanion.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.digitalCompanion.body}
                </p>
              </div>

              <div className="digital-companion-body-elite wow fadeInUp" data-wow-delay="0.4s">
                <ul>
                  <li>{resolvedCopy.digitalCompanion.listItem1}</li>
                  <li>{resolvedCopy.digitalCompanion.listItem2}</li>
                  <li>{resolvedCopy.digitalCompanion.listItem3}</li>
                  <li>{resolvedCopy.digitalCompanion.listItem4}</li>
                </ul>
              </div>

              <div className="digital-companion-items-list-elite wow fadeInUp" data-wow-delay="0.6s">
                <div className="digital-companion-item-elite">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-digital-companion-item-1-elite.svg" alt="" />
                  </div>
                  <div className="digital-companion-item-content-elite">
                    <h3>{resolvedCopy.digitalCompanion.item1Title}</h3>
                    <p>{resolvedCopy.digitalCompanion.item1Body}</p>
                  </div>
                </div>

                <div className="digital-companion-item-elite">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-digital-companion-item-2-elite.svg" alt="" />
                  </div>
                  <div className="digital-companion-item-content-elite">
                    <h3>{resolvedCopy.digitalCompanion.item2Title}</h3>
                    <p>{resolvedCopy.digitalCompanion.item2Body}</p>
                  </div>
                </div>
              </div>

              <div className="digital-companion-btn-elite wow fadeInUp" data-wow-delay="0.8s">
                <AppzenCta href={withLocale("/about")} variant="primary">
                  {resolvedCopy.digitalCompanion.cta}
                </AppzenCta>
              </div>
            </div>
          </div>
          <div className="col-xl-6">
            <div className="digital-companion-image-elite">
              <figure>
                <Home2Image src="/images/digital-companion-image-elite.png" alt="" />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
