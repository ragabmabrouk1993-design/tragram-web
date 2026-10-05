import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";

type Home2TestimonialsProps = {
  copy?: Home2Copy;
};

export default function Home2Testimonials({ copy }: Home2TestimonialsProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  return (
    <div className="our-testimonial-elite bg-section dark-section">
      <div className="container">
        <div className="row section-row">
          <div className="col-lg-12">
            <div className="section-title section-title-center">
              <h3 className="wow fadeInUp">{resolvedCopy.testimonials.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {resolvedCopy.testimonials.title}
              </h2>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-8">
            <div className="testimonial-slider-elite">
              <div className="swiper">
                <div className="swiper-wrapper" data-cursor-text={resolvedCopy.testimonials.dragLabel}>
                  <div className="swiper-slide">
                    <div className="testimonial-item-elite">
                      <div className="testimonial-company-logo-elite">
                        <Home2Image src="/images/company-logo-1-elite.svg" alt="" />
                      </div>
                      <div className="testimonial-item-body-elite">
                        <div className="testimonial-item-content-elite">
                          <h3>
                            “ {resolvedCopy.testimonials.slide1Quote} ”
                          </h3>
                        </div>
                        <div className="testimonial-item-footer-elite">
                          <div className="testimonial-author-content-elite">
                            <h3>{resolvedCopy.testimonials.slide1Name}</h3>
                            <p>{resolvedCopy.testimonials.slide1Role}</p>
                          </div>
                          <div className="testimonial-quote-elite">
                            <Home2Image src="/images/testimonial-quote-elite.svg" alt="" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="swiper-slide">
                    <div className="testimonial-item-elite">
                      <div className="testimonial-company-logo-elite">
                        <Home2Image src="/images/company-logo-1-elite.svg" alt="" />
                      </div>
                      <div className="testimonial-item-body-elite">
                        <div className="testimonial-item-content-elite">
                          <h3>
                            “ {resolvedCopy.testimonials.slide2Quote} ”
                          </h3>
                        </div>
                        <div className="testimonial-item-footer-elite">
                          <div className="testimonial-author-content-elite">
                            <h3>{resolvedCopy.testimonials.slide2Name}</h3>
                            <p>{resolvedCopy.testimonials.slide2Role}</p>
                          </div>
                          <div className="testimonial-quote-elite">
                            <Home2Image src="/images/testimonial-quote-elite.svg" alt="" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="swiper-slide">
                    <div className="testimonial-item-elite">
                      <div className="testimonial-company-logo-elite">
                        <Home2Image src="/images/company-logo-1-elite.svg" alt="" />
                      </div>
                      <div className="testimonial-item-body-elite">
                        <div className="testimonial-item-content-elite">
                          <h3>
                            “ {resolvedCopy.testimonials.slide3Quote} ”
                          </h3>
                        </div>
                        <div className="testimonial-item-footer-elite">
                          <div className="testimonial-author-content-elite">
                            <h3>{resolvedCopy.testimonials.slide3Name}</h3>
                            <p>{resolvedCopy.testimonials.slide3Role}</p>
                          </div>
                          <div className="testimonial-quote-elite">
                            <Home2Image src="/images/testimonial-quote-elite.svg" alt="" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-4">
            <div className="testimonial-cta-box-elite wow fadeInUp" data-wow-delay="0.2s">
              <div className="testimonial-cta-content-elite">
                <h3>{resolvedCopy.testimonials.ctaTitle}</h3>
                <p>
                  {resolvedCopy.testimonials.ctaBody}
                </p>
              </div>
              <div className="testimonial-cta-image-elite">
                <figure>
                  <Home2Image src="/images/testimonial-cta-image-elite.png" alt="" />
                </figure>
              </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="section-footer-text section-satisfy-img wow fadeInUp" data-wow-delay="0.4s">
              <div className="satisfy-client-images">
                <div className="satisfy-client-image">
                  <figure className="image-anime">
                    <Home2Image src="/images/author-4.jpg" alt="" />
                  </figure>
                </div>
                <div className="satisfy-client-image add-more">
                  <Home2Image src="/images/icon-phone-primary.svg" alt="" />
                </div>
              </div>
              <p>
                {resolvedCopy.testimonials.footerText}
              </p>
              <p>{resolvedCopy.testimonials.footerReviews}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
