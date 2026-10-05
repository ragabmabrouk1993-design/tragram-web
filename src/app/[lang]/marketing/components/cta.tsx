import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import AppStoreButtons from "@/components/marketing/app-store-buttons";

type Home2CtaProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Cta({ copy, locale }: Home2CtaProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const workflowMarkers =
    resolvedLocale === "ar" ? ["تل", "MT", "قو", "م"] : ["TG", "MT", "RL", "GO"];
  return (
    <div className="cta-box-elite bg-section dark-section">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-xl-7">
            <div className="cta-box-content-elite">
              <div className="section-title">
                <h3 className="wow fadeInUp">{resolvedCopy.cta.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.cta.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.cta.body}
                </p>
              </div>

              <div className="app-download-buttons-elite wow fadeInUp" data-wow-delay="0.4s">
                <AppStoreButtons locale={resolvedLocale} />
              </div>
            </div>
          </div>
          <div className="col-xl-5">
            <div className="cta-box-image-box-elite">
              <div className="cta-rating-box-elite">
                <div className="cta-rating-header-elite">
                  <p>{resolvedCopy.cta.downloadsLabel}</p>
                  <h2>{resolvedLocale === "ar" ? "تجهيز" : "Setup"}</h2>
                </div>

                <div className="cta-rating-body-elite">
                  <div className="satisfy-client-images">
                    {workflowMarkers.map((marker) => (
                      <div className="satisfy-client-image" key={marker}>
                        <figure className="image-anime">
                          <span className="marketing-placeholder-avatar">{marker}</span>
                        </figure>
                      </div>
                    ))}
                  </div>
                  <div className="cta-rating-icon-box-elite">
                    <a href={withLocale("/auth/signup")} aria-label={resolvedCopy.hero.ctaPrimary}>
                      <Home2Image src="/images/icon-download-white.svg" alt="" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="cta-box-image-elite">
                <figure>
                  <Home2Image src="/images/cta-box-img-elite.png" alt="" />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
