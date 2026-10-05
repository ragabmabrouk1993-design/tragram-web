import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { hasLocale, localizePath, type Locale } from "@/lib/i18n";
import { getPublicPageCopy } from '@/content/public/catalog';
import { resolvePublicLocale } from '@/lib/public-locales';
import {
  buildBreadcrumbJsonLd,
  buildPublicPageMetadata,
  getSeoBlogArticles,
  getSeoUiCopy,
  localizedUrl,
} from "@/lib/seo";

type BlogPageProps = {
  params: Promise<{ lang: string }>;
};

const resolveLocale = (lang?: string): Locale => (hasLocale(lang) ? lang : "en");

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getSeoUiCopy(locale);

  return buildPublicPageMetadata({
    locale,
    path: "/blog",
    title: copy.blogIndexTitle,
    description: copy.blogIndexDescription,
    keywords: [
      "telegram signal copier guides",
      "telegram to mt4 copier guide",
      "telegram to mt5 copier guide",
      "telegram signal parser guide",
    ],
  });
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getSeoUiCopy(locale);
  const articles = getSeoBlogArticles(locale);
  const pageCopy = getPublicPageCopy(resolvePublicLocale(locale), '/blog')!;
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.blogIndexTitle,
    itemListElement: articles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: localizedUrl(locale, `/blog/${article.slug}`),
    })),
  };

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale, [
          { name: copy.home, path: "/" },
          { name: copy.blog, path: "/blog" },
        ])}
      />
      <JsonLd data={itemListJsonLd} />

      <main id="main-content" tabIndex={-1} className="page-blog public-blog">
        <section className="page-header bg-section dark-section">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="page-header-box">
                  <h1>{pageCopy.h1}</h1>
                  <p>{pageCopy.intro}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-blog-list">
          <div className="container">
            <section className="public-blog-panel">
              <h2>{locale.startsWith('ar') ? 'ابدأ من هنا' : 'Start here'}</h2>
              <p>{locale.startsWith('ar') ? 'ابدأ بفهم سير العمل، ثم اختر دليل منصتك واختبر الإعدادات على حساب تجريبي. الأدلة من Tragram وتشرح السلوك المدعوم، لا نتائج تداول مضمونة.' : 'Understand the workflow, choose your platform guide, then test the configuration on demo. These Tragram product guides explain supported behavior, not guaranteed trading outcomes.'}</p>
              <ol>{['what-is-a-telegram-signal-copier','telegram-to-mt4-copier-guide','telegram-to-mt5-copier-setup','telegram-to-mt4-mt5-copier-troubleshooting'].map(slug => <li key={slug}><Link href={localizePath(locale, `/blog/${slug}`)}>{articles.find(article=>article.slug===slug)?.title}</Link></li>)}</ol>
            </section>
            <div className="row section-row">
              <div className="col-lg-12">
                <div className="section-title section-title-center">
                  <h3>{copy.blogIndexKicker}</h3>
                  <h2>{copy.blogIndexSectionTitle}</h2>
                </div>
              </div>
            </div>

            <div className="row public-blog-grid">
              {articles.map((article) => (
                <div className="col-xl-4 col-md-6" key={article.slug}>
                  <article className="post-item public-blog-card">
                    <div className="post-item-body">
                      <div className="post-item-content">
                        <span className="public-blog-kicker">{article.keywords[0]}</span>
                        <h2>
                          <Link href={localizePath(locale, `/blog/${article.slug}`)}>
                            {article.title}
                          </Link>
                        </h2>
                        <p>{article.description}</p>
                      </div>

                      <div className="post-item-btn public-blog-card-footer">
                        <span>{copy.updated} {article.updatedAt}</span>
                        <Link
                          className="readmore-btn"
                          href={localizePath(locale, `/blog/${article.slug}`)}
                        >
                          {copy.readGuide}
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
