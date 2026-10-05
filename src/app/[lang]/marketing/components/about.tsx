import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import AppStoreButtons from "@/components/marketing/app-store-buttons";

type Home2AboutProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2About({ copy, locale }: Home2AboutProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const counterPlaceholders =
    resolvedLocale === "ar" ? ["قائمة", "تل", "MT4/5"] : ["Queue", "TG", "MT4/5"];
  return (
    <div className="about-us-elite">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-xl-6">
            <div className="about-us-content-elite">
              <div className="section-title">
                <h3 className="wow fadeInUp">{resolvedCopy.about.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.about.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.about.body}
                </p>
              </div>

              <div className="about-us-items-list-elite wow fadeInUp" data-wow-delay="0.4s">
                <div className="about-us-item-elite">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-about-us-item-1-elite.svg" alt="" />
                  </div>
                  <div className="about-us-item-content-elite">
                    <h3>{resolvedCopy.about.item1Title}</h3>
                    <p>{resolvedCopy.about.item1Body}</p>
                  </div>
                </div>

                <div className="about-us-item-elite">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-about-us-item-2-elite.svg" alt="" />
                  </div>
                  <div className="about-us-item-content-elite">
                    <h3>{resolvedCopy.about.item2Title}</h3>
                    <p>{resolvedCopy.about.item2Body}</p>
                  </div>
                </div>
              </div>

              <div className="about-us-counter-list-elite wow fadeInUp">
                <div className="about-us-counter-item-elite">
                  <h2>{counterPlaceholders[0]}</h2>
                  <p>{resolvedCopy.about.counter1Label}</p>
                </div>

                <div className="about-us-counter-item-elite">
                  <h2>{counterPlaceholders[1]}</h2>
                  <p>{resolvedCopy.about.counter2Label}</p>
                </div>

                <div className="about-us-counter-item-elite">
                  <h2>{counterPlaceholders[2]}</h2>
                  <p>{resolvedCopy.about.counter3Label}</p>
                </div>
              </div>

              <div className="app-download-buttons-elite wow fadeInUp" data-wow-delay="0.2s">
                <AppStoreButtons locale={resolvedLocale} />
              </div>
            </div>
          </div>
          <div className="col-xl-6">
            <div className="about-us-image-box-elite wow fadeInUp" data-wow-delay="0.2s">
              <div className="about-us-image-box-1-elite">
                <div className="about-us-image-elite">
                  <figure className="image-anime">
                    <Home2Image src="/images/about-us-image-1-elite.jpg" alt="" />
                  </figure>
                </div>
              </div>

              <div className="about-us-image-box-2-elite">
                <div className="Contact-us-circle-elite">
                  <a href={withLocale("/contact")}>
                    <Home2Image src="/images/contact-us-circle.svg" alt="" />
                  </a>
                </div>

                <div className="about-us-image-elite">
                  <figure className="image-anime">
                    <Home2Image src="/images/about-us-image-2-elite.jpg" alt="" />
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
