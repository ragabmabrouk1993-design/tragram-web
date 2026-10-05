import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { hasLocale, localizePath, type Locale } from "@/lib/i18n";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPublicPageMetadata,
  buildSoftwareApplicationJsonLd,
  getSeoLandingPage,
  getSeoUiCopy,
  localizedPath,
} from "@/lib/seo";

type SeoLandingPageProps = {
  params: Promise<{ lang: string; seoSlug: string }>;
};

export const dynamic = "force-dynamic";

const resolveLocale = (lang?: string): Locale => (hasLocale(lang) ? lang : "en");

export async function generateMetadata({
  params,
}: SeoLandingPageProps): Promise<Metadata> {
  const { lang, seoSlug } = await params;
  const locale = resolveLocale(lang);
  const page = getSeoLandingPage(seoSlug, locale);

  if (!page) {
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
    path: `/${page.slug}`,
    title: page.title,
    description: page.description,
    keywords: page.keywords,
  });
}

export default async function SeoLandingPage({ params }: SeoLandingPageProps) {
  const { lang, seoSlug } = await params;
  const locale = resolveLocale(lang);
  const copy = getSeoUiCopy(locale);
  const page = getSeoLandingPage(seoSlug, locale);
  const billingDisabled = isBillingDisabledInServerEnv();

  if (!page) {
    notFound();
  }

  const pagePath = `/${page.slug}`;
  const breadcrumbs = [
    { name: copy.home, path: "/" },
    { name: page.h1, path: pagePath },
  ];

  const relatedLinks = page.relatedLinks?.filter(
    (link) => !billingDisabled || link.path !== "/pricing",
  );

  return (
    <>
      <JsonLd
        data={buildSoftwareApplicationJsonLd(locale, pagePath, { billingDisabled })}
      />
      <JsonLd data={buildFaqJsonLd(page.faqs)} />
      <JsonLd data={buildBreadcrumbJsonLd(locale, breadcrumbs)} />

      <main className="seo-main">
        <section>
          <div>
            <div>
              <nav className="seo-breadcrumb" aria-label="Breadcrumb">
                <Link href={localizedPath(locale, "/")}>{copy.home}</Link>
                <span aria-hidden="true"> / </span>
                <span>{page.h1}</span>
              </nav>

              <div className="seo-hero">
                <h1>{page.h1}</h1>
                <p className="seo-intro">{page.intro}</p>
              </div>

              <div className="seo-summary-grid">
                {page.keywords.slice(0, 3).map((keyword) => (
                  <div className="seo-summary-card" key={keyword}>
                    <span>{copy.searchIntent}</span>
                    <strong>{keyword}</strong>
                  </div>
                ))}
              </div>

              <div className="seo-section-list">
                {page.sections.map((section) => (
                  <section className="seo-card" key={section.title}>
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
              </div>

              <section className="seo-card">
                <h2>{copy.simpleWorkflowTitle}</h2>
                <ol>
                  {copy.simpleWorkflowSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              <section className="seo-card">
                <h2>{copy.commonQuestions}</h2>
                <div className="seo-section-list">
                  {page.faqs.map((faq) => (
                    <article key={faq.question}>
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                    </article>
                  ))}
                </div>
              </section>

              {relatedLinks?.length ? (
                <section className="seo-card">
                  <h2>{copy.relatedGuides}</h2>
                  <div className="seo-section-list">
                    {relatedLinks.map((link) => (
                      <article key={link.path}>
                        <h3>
                          <Link href={localizePath(locale, link.path)}>{link.title}</Link>
                        </h3>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="seo-contact">
                <h2>{copy.startTitle}</h2>
                <p>{copy.startBody}</p>
                <div className="seo-actions">
                  <Link className="seo-button seo-button-primary" href={localizePath(locale, "/auth/signup")}>
                    {page.primaryCta}
                  </Link>
                  <Link className="seo-button" href={localizePath(locale, "/features")}>
                    {page.secondaryCta}
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
