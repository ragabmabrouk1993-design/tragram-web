import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";

type Home2HeroProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Hero({ copy, locale }: Home2HeroProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const setupLabel = resolvedLocale.startsWith("ar") ? "تعرّف على خطوات الإعداد" : "See how setup works";
  const workflowMarkers =
    resolvedLocale === "ar" ? ["تل", "MT", "قو", "إي"] : ["TG", "MT", "RL", "PA"];
  return (
    <div className="hero-elite bg-section dark-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="hero-content-elite">
              <div className="section-title">
                <h3 className="wow fadeInUp">{resolvedCopy.hero.kicker}</h3>
                <h1 className="text-anime-style-3" data-cursor="-opaque">
                  {resolvedCopy.hero.title}
                </h1>
                <p className="wow fadeInUp" data-wow-delay="0.2s">
                  {resolvedCopy.hero.subtitle}
                </p>
              </div>

              <div className="hero-content-body-elite wow fadeInUp" data-wow-delay="0.4s">
                <div className="hero-btn-elite">
                  <AppzenCta href={withLocale("/auth/signup")} variant="primary">
                    {resolvedCopy.hero.ctaPrimary}
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

            <div className="hero-image-box-elite">
              <div className="hero-circle-progress-box-elite">
                <div className="hero-circle-progress-header-elite">
                  <h3>{resolvedLocale.startsWith("ar") ? "من الإشارة إلى النتيجة" : "From signal to result"}</h3>
                  <p>{resolvedLocale.startsWith("ar") ? "رسالة تيليجرام ← تحليل الإشارة ← قواعدك ← نتيجة الوسيط" : "Telegram message → parsed signal → your rules → broker result"}</p>
                </div>
              </div>

              <div className="hero-client-box-elite">
                <div className="hero-client-header-elite">
                  <p>{resolvedCopy.hero.engagedUsers}</p>
                  <h2>{resolvedLocale === "ar" ? "معاينة" : "Preview"}</h2>
                </div>

                <div className="hero-client-body-elite">
                  <div className="satisfy-client-images">
                    {workflowMarkers.map((marker) => (
                      <div className="satisfy-client-image" key={marker}>
                        <figure className="image-anime">
                          <span className="marketing-placeholder-avatar">{marker}</span>
                        </figure>
                      </div>
                    ))}
                  </div>
                  <div className="hero-client-icon-box-elite">
                    <a href={withLocale("/contact")} aria-label={resolvedCopy.footer.quickLinkContact}>
                      <Home2Image src="/images/icon-download-accent.svg" alt="" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="hero-image-elite">
                <figure>
                  <Home2Image src="/images/hero-image-elite.png" alt={resolvedLocale.startsWith("ar") ? "رسم توضيحي لواجهة Tragram" : "Illustration of the Tragram interface"} />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
