import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { hasLocale, localizePath, type Locale } from "@/lib/i18n";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildPublicPageMetadata,
  getSeoBlogArticle,
  getSeoUiCopy,
} from "@/lib/seo";

type BlogArticlePageProps = {
  params: Promise<{ lang: string; articleSlug: string }>;
};

const resolveLocale = (lang?: string): Locale => (hasLocale(lang) ? lang : "en");

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { lang, articleSlug } = await params;
  const locale = resolveLocale(lang);
  const article = getSeoBlogArticle(articleSlug, locale);

  if (!article) {
    return {
      title: "Page Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildPublicPageMetadata({
    locale,
    path: `/blog/${article.slug}`,
    title: article.title,
    description: article.description,
    keywords: article.keywords,
  });
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { lang, articleSlug } = await params;
  const locale = resolveLocale(lang);
  const copy = getSeoUiCopy(locale);
  const article = getSeoBlogArticle(articleSlug, locale);

  if (!article) {
    notFound();
  }

  const pagePath = `/blog/${article.slug}`;

  return (
    <>
      <JsonLd data={buildArticleJsonLd(locale, article)} />
      <JsonLd
        data={buildBreadcrumbJsonLd(locale, [
          { name: copy.home, path: "/" },
          { name: copy.blog, path: "/blog" },
          { name: article.h1, path: pagePath },
        ])}
      />

      <main className="page-blog public-blog public-blog-article">
        <section className="page-header bg-section dark-section">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="page-header-box">
                  <p className="public-blog-eyebrow">{copy.blog}</p>
                  <h1>{article.h1}</h1>
                  <p>{article.intro}</p>
                  <div className="public-blog-meta">
                    <span>{copy.updated} {article.updatedAt}</span>
                    <span>{article.keywords[0]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-blog-article-body">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-9">
                <div className="public-blog-article-stack">
                  {article.sections.map((section) => (
                    <section className="public-blog-panel" key={section.title}>
                      <h2>{section.title}</h2>
                      <p>{section.body}</p>
                      {section.bullets ? (
                        <ul>
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))}

                  {article.relatedLinks?.length ? (
                    <section className="public-blog-panel">
                      <h2>{copy.relatedGuides}</h2>
                      <ul>
                        {article.relatedLinks.map((link) => (
                          <li key={link.path}>
                            <Link href={localizePath(locale, link.path)}>{link.title}</Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section className="public-blog-panel public-blog-next-step">
                    <h2>{copy.nextStep}</h2>
                    <p>{copy.nextStepBody}</p>
                    <div className="public-blog-actions">
                      <Link className="btn-default" href={localizePath(locale, article.relatedPath)}>
                        {copy.viewRelatedProductPage}
                      </Link>
                      <Link className="btn-default btn-highlighted" href={localizePath(locale, "/blog")}>
                        {copy.backToBlog}
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
