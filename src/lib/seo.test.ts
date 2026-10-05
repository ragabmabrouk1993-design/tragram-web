import {
  buildLanguageAlternates,
  buildPublicPageMetadata,
  buildSoftwareApplicationJsonLd,
  buildPublicIdentityJsonLd,
  buildSitemapEntries,
  getAllPublicSeoRoutes,
  getSeoBlogArticle,
  getSeoLandingPage,
  getSeoUiCopy,
  privateSeoPathPrefixes,
  type SeoRelatedLink,
  seoBlogArticles,
  seoLandingPages,
} from "./seo";
import { defaultLocale } from "@/i18n/routing-config";
import { publicLocales } from "./public-locales";

describe("seo registry", () => {
  test('shared public identity omits phone contact and retains native downloads', () => {
    const identity = buildPublicIdentityJsonLd('ar');
    expect(JSON.stringify(identity)).not.toContain('telephone');
    expect(JSON.stringify(identity)).not.toContain('+201553979684');
    expect(JSON.stringify(identity)).not.toContain('+201277075770');
    const app = buildSoftwareApplicationJsonLd('en','/',{billingDisabled:true});
    expect(app.downloadUrl).toHaveLength(2);
    expect(app.operatingSystem).toContain('iOS');
    expect(app).not.toHaveProperty('offers');
  });
  const phase7LandingPaths = [
    "/best-telegram-signal-copier",
  ];
  const phase7ArticlePaths = [
    "/blog/low-latency-telegram-trade-copier",
    "/blog/telegram-signal-updates-close-sl-tp",
    "/blog/multi-account-telegram-copier-checklist",
    "/blog/broker-symbol-mapping-telegram-signals",
    "/blog/telegram-pending-orders-mt4-mt5",
    "/blog/telegram-to-mt4-mt5-copier-troubleshooting",
    "/blog/telegram-copier-supported-platforms",
    "/blog/copy-telegram-signals-from-phone",
  ];

  test("commercial landing page slugs are unique", () => {
    const slugs = seoLandingPages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("blog article slugs are unique and linked to commercial pages", () => {
    const slugs = seoBlogArticles.map((article) => article.slug);
    const publicPaths = new Set(getAllPublicSeoRoutes().map((route) => route.path));

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of seoBlogArticles) {
      expect(article.description.length).toBeGreaterThan(90);
      expect(article.sections.length).toBeGreaterThanOrEqual(3);
      expect(publicPaths.has(article.relatedPath)).toBe(true);
    }
  });

  test("commercial landing pages have plain titles, descriptions, and FAQs", () => {
    for (const page of seoLandingPages) {
      expect(page.title).toMatch(/Telegram|Risk|Copy/);
      expect(page.title.length).toBeLessThanOrEqual(70);
      expect(page.description.length).toBeGreaterThan(90);
      expect(page.description.length).toBeLessThanOrEqual(170);
      expect(page.description).not.toMatch(/best-in-class|revolutionary|guaranteed profits/i);
      expect(page.faqs.length).toBeGreaterThanOrEqual(3);
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("language alternates include only translated public locales and x-default", () => {
    const alternates = buildLanguageAlternates("/telegram-signal-copier");

    expect(Object.keys(alternates).sort()).toEqual(['ar', 'en', 'x-default']);
    for (const locale of publicLocales) {
      expect(alternates[locale]).toContain(`/${locale}/telegram-signal-copier`);
    }
    expect(alternates["x-default"]).toContain(`/${defaultLocale}/telegram-signal-copier`);
  });

  test("public sitemap source excludes private app paths", () => {
    const routes = getAllPublicSeoRoutes();

    for (const route of routes) {
      expect(
        privateSeoPathPrefixes.some(
          (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`),
        ),
      ).toBe(false);
    }
  });

  test("sitemap entries include localized alternates", () => {
    const entries = buildSitemapEntries();
    const signalCopierEntry = entries.find((entry) =>
      entry.url.endsWith("/en/telegram-signal-copier"),
    );
    const blogEntry = entries.find((entry) =>
      entry.url.endsWith("/en/blog/what-is-a-telegram-signal-copier"),
    );
    const blogIndexEntry = entries.find((entry) => entry.url.endsWith("/en/blog"));

    expect(signalCopierEntry).toBeDefined();
    expect(blogEntry).toBeDefined();
    expect(blogIndexEntry).toBeDefined();
    expect(signalCopierEntry?.alternates?.languages?.ar).toContain(
      "/ar/telegram-signal-copier",
    );
    expect(signalCopierEntry?.priority).toBeGreaterThanOrEqual(0.8);
  });

  test("free Basic mode removes pricing from the sitemap and application offers", () => {
    const entries = buildSitemapEntries({ billingDisabled: true });
    const application = buildSoftwareApplicationJsonLd(
      "en",
      "/telegram-signal-copier",
      { billingDisabled: true },
    );

    expect(entries.some((entry) => entry.url.endsWith("/pricing"))).toBe(false);
    expect(application).not.toHaveProperty("offers");
    expect(
      seoBlogArticles.some((article) => String(article.relatedPath) === "/pricing"),
    ).toBe(false);
  });

  test("standard billing mode retains pricing discovery metadata", () => {
    const entries = buildSitemapEntries({ billingDisabled: false });
    const application = buildSoftwareApplicationJsonLd(
      "en",
      "/telegram-signal-copier",
      { billingDisabled: false },
    );

    expect(entries.some((entry) => entry.url.endsWith("/en/pricing"))).toBe(true);
    expect(application).toHaveProperty("offers.category", "Subscription");
    expect(application).toHaveProperty("offers.url");
  });

  test("metadata helper returns canonical and alternate language URLs", () => {
    const metadata = buildPublicPageMetadata({
      locale: "en",
      path: "/telegram-to-mt5-copier",
      title: "Telegram to MT5 Copier",
      description:
        "Copy Telegram signals to MetaTrader 5 with user-defined rules, symbol filters, approval controls, and visible execution logs.",
    });

    expect(metadata.alternates?.canonical).toContain("/en/telegram-to-mt5-copier");
    expect(metadata.alternates?.languages?.["x-default"]).toContain(
      "/en/telegram-to-mt5-copier",
    );
  });

  test("phase 7 keyword-intent pages are registered and sitemap-visible", () => {
    const publicPaths = new Set(getAllPublicSeoRoutes().map((route) => route.path));

    for (const path of [...phase7LandingPaths, ...phase7ArticlePaths]) {
      expect(publicPaths.has(path)).toBe(true);
    }
  });

  test("phase 7 keyword-intent pages have incoming contextual internal links", () => {
    const incomingLinkCounts = new Map<string, number>();
    const addIncoming = (path: string) => {
      incomingLinkCounts.set(path, (incomingLinkCounts.get(path) ?? 0) + 1);
    };
    const getRelatedLinks = (entry: unknown) =>
      (entry as { relatedLinks?: readonly SeoRelatedLink[] }).relatedLinks ?? [];

    for (const page of seoLandingPages) {
      for (const link of getRelatedLinks(page)) {
        addIncoming(link.path);
      }
    }

    for (const article of seoBlogArticles) {
      addIncoming(article.relatedPath);
      for (const link of getRelatedLinks(article)) {
        addIncoming(link.path);
      }
    }

    for (const path of [...phase7LandingPaths, ...phase7ArticlePaths]) {
      expect(incomingLinkCounts.get(path) ?? 0).toBeGreaterThan(0);
    }
  });

  test("arabic SEO landing pages use localized public copy", () => {
    const page = getSeoLandingPage("best-telegram-signal-copier", "ar");

    expect(page).toBeDefined();
    expect(page?.title).toContain("ناسخ");
    expect(page?.h1).toContain("تيليجرام");
    expect(page?.intro).not.toContain("There is no single best");
    expect(page?.sections[0]?.body).toContain("تيليجرام");
    expect(page?.faqs[0]?.question).toContain("ما");
  });

  test("arabic blog articles and UI labels use localized copy", () => {
    const article = getSeoBlogArticle("low-latency-telegram-trade-copier", "ar-EG");
    const copy = getSeoUiCopy("ar-SA");

    expect(article).toBeDefined();
    expect(article?.title).toContain("منخفض التأخير");
    expect(article?.intro).not.toContain("Low latency is not just");
    expect(article?.sections[0]?.body).toContain("تيليجرام");
    expect(copy.blog).toBe("المدونة");
    expect(copy.readGuide).toBe("اقرأ الدليل");
  });
});
