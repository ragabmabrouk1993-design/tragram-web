import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";

type Home2BlogProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Blog({ copy, locale }: Home2BlogProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const insightsHref = withLocale("/blog");
  return (
    <div className="our-blog">
      <div className="container">
        <div className="row section-row">
          <div className="col-lg-12">
            <div className="section-title section-title-center">
              <h3 className="wow fadeInUp">{resolvedCopy.blog.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {resolvedCopy.blog.title}
              </h2>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-4 col-md-6">
            <div className="post-item wow fadeInUp">
              <div className="post-featured-image">
                <a href={insightsHref} data-cursor-text={resolvedCopy.blog.viewLabel}>
                  <figure className="image-anime">
                    <Home2Image src="/images/post-1.jpg" alt="" />
                  </figure>
                </a>
              </div>

              <div className="post-item-body">
                <div className="post-item-content">
                  <h2>
                    <a href={insightsHref}>{resolvedCopy.blog.post1Title}</a>
                  </h2>
                  <p>{resolvedCopy.blog.post1Body}</p>
                </div>

                <div className="post-item-btn">
                  <a href={insightsHref} className="readmore-btn">{resolvedCopy.blog.readMore}</a>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-md-6">
            <div className="post-item wow fadeInUp" data-wow-delay="0.2s">
              <div className="post-featured-image">
                <a href={insightsHref} data-cursor-text={resolvedCopy.blog.viewLabel}>
                  <figure className="image-anime">
                    <Home2Image src="/images/post-2.jpg" alt="" />
                  </figure>
                </a>
              </div>

              <div className="post-item-body">
                <div className="post-item-content">
                  <h2>
                    <a href={insightsHref}>{resolvedCopy.blog.post2Title}</a>
                  </h2>
                  <p>{resolvedCopy.blog.post2Body}</p>
                </div>

                <div className="post-item-btn">
                  <a href={insightsHref} className="readmore-btn">{resolvedCopy.blog.readMore}</a>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-md-6">
            <div className="post-item wow fadeInUp" data-wow-delay="0.4s">
              <div className="post-featured-image">
                <a href={insightsHref} data-cursor-text={resolvedCopy.blog.viewLabel}>
                  <figure className="image-anime">
                    <Home2Image src="/images/post-3.jpg" alt="" />
                  </figure>
                </a>
              </div>

              <div className="post-item-body">
                <div className="post-item-content">
                  <h2>
                    <a href={insightsHref}>{resolvedCopy.blog.post3Title}</a>
                  </h2>
                  <p>{resolvedCopy.blog.post3Body}</p>
                </div>

                <div className="post-item-btn">
                  <a href={insightsHref} className="readmore-btn">{resolvedCopy.blog.readMore}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
