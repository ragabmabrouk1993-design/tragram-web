import Home2Image from "./marketing-image";
import { TragramBrand } from "@/components/branding/tragram-brand";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import { AnalyticsPreferencesLink } from "@/components/analytics/analytics-preferences-link";

type Home2FooterProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Footer({ copy, locale }: Home2FooterProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const footerBg = "/images/footer-bg-shape-elite.png";
  const billingDisabled = isBillingDisabledInServerEnv();

  return (
    <footer
      className="main-footer-elite bg-section dark-section"
      style={{
        backgroundImage: `url('${footerBg}')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom center",
        backgroundSize: "cover",
      }}
    >
      <div className="container">
        <div className="row">
          <div className="col-xl-4">
            <div className="about-footer-elite">
              <div className="footer-logo-elite">
                <TragramBrand size="footer" />
              </div>

              <div className="about-footer-content-elite">
                <p>{resolvedCopy.footer.about}</p>
              </div>

              <div className="footer-contact-list-elite">
                <div className="footer-contact-item-elite">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-location-accent.svg" alt="" />
                  </div>
                  <div className="footer-contact-item-content-elite">
                    <p>
                      <span>{resolvedCopy.footer.addressLabel}</span>{" "}
                      {resolvedCopy.footer.addressValue}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="col-xl-8">
            <div className="footer-links-box-elite">
              <div className="footer-links-elite">
                <h3>{resolvedCopy.footer.quickLinksTitle}</h3>
                <ul>
                  <li>
                    <a href={withLocale("/")}>{resolvedCopy.footer.quickLinkHome}</a>
                  </li>
                  <li>
                    <a href={withLocale("/about")}>{resolvedCopy.footer.quickLinkAbout}</a>
                  </li>
                  <li>
                    <a href={withLocale("/blog")}>{resolvedCopy.footer.quickLinkBlog}</a>
                  </li>
                  {!billingDisabled && (
                    <li>
                      <a href={withLocale("/pricing")}>{resolvedCopy.footer.quickLinkPricing}</a>
                    </li>
                  )}
                  <li>
                    <a href={withLocale("/features")}>{resolvedCopy.footer.quickLinkFeatures}</a>
                  </li>
                  <li>
                    <a href={withLocale("/contact")}>{resolvedCopy.footer.quickLinkContact}</a>
                  </li>
                  <li>
                    <a href={withLocale("/account-deletion")}>{resolvedCopy.footer.quickLinkAccountDeletion}</a>
                  </li>
                </ul>
              </div>

              <div className="footer-links-elite">
                <h3>{resolvedCopy.footer.supportTitle}</h3>
                <ul>
                  <li>
                    <a href={withLocale("/help-center")}>{resolvedCopy.footer.supportHelpCenter}</a>
                  </li>
                  <li>
                    <a href={withLocale("/privacy-policy")}>{resolvedCopy.footer.supportPrivacy}</a>
                  </li>
                  <li>
                    <AnalyticsPreferencesLink
                      href={withLocale("/privacy-policy")}
                      label={resolvedLocale === "ar" ? "إعدادات التحليلات" : "Analytics preferences"}
                    />
                  </li>
                  <li>
                    <a href={withLocale("/faqs")}>{resolvedCopy.footer.supportFaqs}</a>
                  </li>
                  <li>
                    <a href={withLocale("/terms-of-service")}>{resolvedCopy.footer.supportTerms}</a>
                  </li>
                  <li>
                    <a href={withLocale("/refund-policy")}>{resolvedCopy.footer.supportRefund}</a>
                  </li>
                </ul>
              </div>

              <div className="footer-links-elite footer-newsletter-form-elite">
                <h3>{resolvedCopy.footer.newsletterTitle}</h3>
                <p>{resolvedCopy.footer.newsletterBody}</p>
                <ul>
                  <li>
                    <a href={withLocale("/help-center")}>{resolvedCopy.footer.supportHelpCenter}</a>
                  </li>
                  <li>
                    <a href={withLocale("/contact")}>{resolvedCopy.footer.quickLinkContact}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-lg-12">
            <div className="footer-copyright-elite">
              <div className="footer-copyright-text-elite">
                <p>{resolvedCopy.footer.copyright}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
