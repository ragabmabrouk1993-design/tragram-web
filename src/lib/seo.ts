import type { Metadata, MetadataRoute } from "next";
import { defaultLocale, type Locale } from "@/i18n/routing-config";
import { publicLocales, resolvePublicLocale } from "@/lib/public-locales";
import { getPublicPageCopy } from "@/content/public/catalog";
import { publicRouteManifest } from "@/content/public/route-manifest";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import { publicTrust } from '@/content/public/trust';
import { APP_STORE_LINKS } from '@/lib/mobile-app-links';

export const siteName = "Tragram";
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://tragram.app"
).replace(/\/+$/, "");

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type SeoRelatedLink = {
  title: string;
  path: string;
};

export type SeoLandingPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  sections: SeoSection[];
  faqs: SeoFaq[];
  primaryCta: string;
  secondaryCta: string;
  updatedAt: string;
  relatedLinks?: SeoRelatedLink[];
};

export type SeoBlogArticle = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  sections: SeoSection[];
  relatedPath: string;
  relatedLinks?: SeoRelatedLink[];
  updatedAt: string;
};

export type SeoUiCopy = {
  home: string;
  blog: string;
  features: string;
  pricing: string;
  faqs: string;
  getStarted: string;
  contact: string;
  privacy: string;
  terms: string;
  footerText: string;
  searchIntent: string;
  simpleWorkflowTitle: string;
  simpleWorkflowSteps: string[];
  commonQuestions: string;
  relatedGuides: string;
  startTitle: string;
  startBody: string;
  blogIndexTitle: string;
  blogIndexDescription: string;
  blogIndexKicker: string;
  blogIndexSectionTitle: string;
  readGuide: string;
  updated: string;
  nextStep: string;
  nextStepBody: string;
  viewRelatedProductPage: string;
  backToBlog: string;
};

export const privateSeoPathPrefixes = [
  "/auth",
  "/channels",
  "/dashboard",
  "/onboarding",
  "/profile",
  "/ref",
  "/referrals",
  "/reports",
  "/restricted",
] as const;

export const publicBaseRoutes = ([
  {
    "path": "/",
    "priority": 1,
    "changeFrequency": "weekly"
  },
  {
    "path": "/features",
    "priority": 0.9,
    "changeFrequency": "monthly"
  },
  {
    "path": "/pricing",
    "priority": 0.8,
    "changeFrequency": "weekly"
  },
  {
    "path": "/faqs",
    "priority": 0.75,
    "changeFrequency": "monthly"
  },
  {
    "path": "/blog",
    "priority": 0.78,
    "changeFrequency": "weekly"
  },
  {
    "path": "/about",
    "priority": 0.7,
    "changeFrequency": "monthly"
  },
  {
    "path": "/contact",
    "priority": 0.6,
    "changeFrequency": "monthly"
  },
  {
    "path": "/account-deletion",
    "priority": 0.45,
    "changeFrequency": "yearly"
  },
  {
    "path": "/help-center",
    "priority": 0.65,
    "changeFrequency": "monthly"
  },
  {
    "path": "/privacy-policy",
    "priority": 0.35,
    "changeFrequency": "yearly"
  },
  {
    "path": "/refund-policy",
    "priority": 0.35,
    "changeFrequency": "yearly"
  },
  {
    "path": "/terms-of-service",
    "priority": 0.35,
    "changeFrequency": "yearly"
  }
] as const).map(route => ({
  ...route,
  title: getPublicPageCopy('en', route.path)!.title,
  description: getPublicPageCopy('en', route.path)!.description,
}));

export const seoLandingPages: SeoLandingPage[] = publicRouteManifest
  .filter(route => route.kind === 'landing')
  .map(route => {
    const copy = getPublicPageCopy('en', route.path)!;
    return { ...copy, slug: route.path.slice(1), keywords: [], primaryCta: 'Create account', secondaryCta: 'Explore features', updatedAt: copy.updatedAt ?? '',
      relatedLinks: copy.relatedPaths.map(path => ({ path, title: getPublicPageCopy('en', path)?.title ?? path })) };
  });

export const seoBlogArticles: SeoBlogArticle[] = publicRouteManifest
  .filter(route => route.kind === 'article')
  .map(route => {
    const copy = getPublicPageCopy('en', route.path)!;
    return { ...copy, slug: route.path.slice('/blog/'.length), keywords: [], relatedPath: copy.relatedPaths[0] ?? '/help-center', updatedAt: copy.updatedAt ?? '',
      relatedLinks: copy.relatedPaths.map(path => ({ path, title: getPublicPageCopy('en', path)?.title ?? path })) };
  });

export const seoUiCopyByLocale = {
  en: {
    home: "Home",
    blog: "Blog",
    features: "Features",
    pricing: "Pricing",
    faqs: "FAQs",
    getStarted: "Get Started",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
    footerText:
      "Tragram helps users copy Telegram signals with their own rules and review controls.",
    searchIntent: "Search intent",
    simpleWorkflowTitle: "Simple end-to-end workflow",
    simpleWorkflowSteps: [
      "Connect Telegram.",
      "Choose the channels Tragram should follow.",
      "Connect the MT4 or MT5 account that should receive eligible trades.",
      "Set channel execution rules, symbols, sizing, and entry controls.",
      "Review incoming signals and execution history from the dashboard.",
      "Pause a channel or change rules when you need more control.",
    ],
    commonQuestions: "Common questions",
    relatedGuides: "Related guides",
    startTitle: "Start with rules you can review",
    startBody:
      "Tragram is for user-controlled signal automation. You choose the signal sources, account connection, and rules. Tragram does not provide trading advice or sell signals.",
    blogIndexTitle: "Telegram Signal Copier Guides",
    blogIndexDescription:
      "Practical guides for copying Telegram signals with Tragram. Learn how channel selection, parsing, selected-account routing, execution rules and broker outcomes work together.",
    blogIndexKicker: "Blog",
    blogIndexSectionTitle: "Guides for safer signal automation",
    readGuide: "Read guide",
    updated: "Updated",
    nextStep: "Next step",
    nextStepBody:
      "See the product page connected to this guide and review how the workflow works inside Tragram.",
    viewRelatedProductPage: "View related product page",
    backToBlog: "Back to Blog",
  },
  ar: {
    home: "الرئيسية",
    blog: "المدونة",
    features: "المميزات",
    pricing: "الأسعار",
    faqs: "الأسئلة الشائعة",
    getStarted: "ابدأ الآن",
    contact: "تواصل",
    privacy: "الخصوصية",
    terms: "الشروط",
    footerText:
      "يساعد Tragram المستخدمين على نسخ إشارات تيليجرام بقواعدهم الخاصة وضوابط مراجعة واضحة.",
    searchIntent: "نية البحث",
    simpleWorkflowTitle: "سير عمل بسيط من البداية إلى التنفيذ",
    simpleWorkflowSteps: [
      "اربط تيليجرام.",
      "اختر القنوات التي يجب أن يتابعها Tragram.",
      "اربط حساب MT4 أو MT5 الذي يجب أن يستقبل الصفقات المؤهلة.",
      "حدد قواعد تنفيذ القناة والرموز والحجم وضوابط المخاطر.",
      "راجع الإشارات الواردة وسجل التنفيذ من لوحة التحكم.",
      "أوقف قناة أو غيّر القواعد عندما تحتاج إلى تحكم أكبر.",
    ],
    commonQuestions: "أسئلة شائعة",
    relatedGuides: "أدلة ذات صلة",
    startTitle: "ابدأ بقواعد يمكنك مراجعتها",
    startBody:
      "Tragram مخصص لأتمتة الإشارات التي يتحكم بها المستخدم. أنت تختار مصادر الإشارات، وربط الحساب، والقواعد. Tragram لا يقدم نصائح تداول ولا يبيع إشارات.",
    blogIndexTitle: "أدلة ناسخ إشارات تيليجرام",
    blogIndexDescription:
      "أدلة عربية حول نسخ إشارات تيليجرام باستخدام Tragram: اختيار القنوات وتحليل الإشارات وتوجيه الحساب المحدد وقواعد التنفيذ وضوابط المخاطر والإيقاف.",
    blogIndexKicker: "المدونة",
    blogIndexSectionTitle: "أدلة لأتمتة إشارات أكثر وضوحًا",
    readGuide: "اقرأ الدليل",
    updated: "آخر تحديث",
    nextStep: "الخطوة التالية",
    nextStepBody:
      "راجع صفحة المنتج المرتبطة بهذا الدليل وافهم كيف يعمل سير العمل داخل Tragram.",
    viewRelatedProductPage: "عرض صفحة المنتج المرتبطة",
    backToBlog: "العودة إلى المدونة",
  },
} satisfies Record<"en" | "ar", SeoUiCopy>;

export const getSeoUiCopy = (locale: Locale): SeoUiCopy =>
  locale.startsWith("ar") ? seoUiCopyByLocale.ar : seoUiCopyByLocale.en;

const localizeSeoLandingPage = (page: SeoLandingPage, locale: Locale): SeoLandingPage => {
  if (!locale.startsWith("ar")) {
    return page;
  }
  const copy = getPublicPageCopy('ar', `/${page.slug}`);
  return copy ? { ...page, ...copy, slug: page.slug, updatedAt: page.updatedAt } : page;
};

const localizeSeoBlogArticle = (article: SeoBlogArticle, locale: Locale): SeoBlogArticle => {
  if (!locale.startsWith("ar")) {
    return article;
  }
  const copy = getPublicPageCopy('ar', `/blog/${article.slug}`);
  return copy
    ? {
        ...article,
        ...copy,
        slug: article.slug,
        relatedPath: article.relatedPath,
        updatedAt: article.updatedAt,
      }
    : article;
};

const buildAbsoluteUrl = (path: string): string => {
  const normalizedPath = path === "/" ? "" : path;
  return `${siteUrl}${normalizedPath}`;
};

export const localizedPath = (locale: Locale, path: string): string =>
  path === "/" ? `/${locale}` : `/${locale}${path}`;

export const localizedUrl = (locale: Locale, path: string): string =>
  buildAbsoluteUrl(localizedPath(locale, path));

export const buildLanguageAlternates = (path: string): Record<string, string> => {
  const alternates = Object.fromEntries(
    publicLocales.map((locale) => [locale, localizedUrl(locale, path)]),
  );
  return {
    ...alternates,
    "x-default": localizedUrl(defaultLocale, path),
  };
};

export const getSeoLandingPage = (
  slug: string,
  locale: Locale = defaultLocale,
): SeoLandingPage | undefined => {
  const page = seoLandingPages.find((entry) => entry.slug === slug);
  if (!page) return undefined;
  const copy = getPublicPageCopy(resolvePublicLocale(locale), `/${slug}`);
  return copy ? { ...localizeSeoLandingPage(page, locale), ...copy, updatedAt: copy.updatedAt ?? page.updatedAt } : localizeSeoLandingPage(page, locale);
};

export const getSeoBlogArticle = (
  slug: string,
  locale: Locale = defaultLocale,
): SeoBlogArticle | undefined => {
  const article = seoBlogArticles.find((entry) => entry.slug === slug);
  if (!article) return undefined;
  const copy = getPublicPageCopy(resolvePublicLocale(locale), `/blog/${slug}`);
  return copy ? { ...localizeSeoBlogArticle(article, locale), ...copy, updatedAt: copy.updatedAt ?? article.updatedAt } : localizeSeoBlogArticle(article, locale);
};

export const getSeoBlogArticles = (locale: Locale = defaultLocale): SeoBlogArticle[] =>
  seoBlogArticles.map((article) => getSeoBlogArticle(article.slug, locale)!);

export const getPublicBaseRoute = (path: string) =>
  publicBaseRoutes.find((route) => route.path === path);

export const getAllPublicSeoRoutes = () => [
  ...publicBaseRoutes.map((route) => ({
    path: route.path,
    title: route.title,
    description: route.description,
    priority: route.priority,
    changeFrequency: route.changeFrequency,
  })),
  ...seoLandingPages.map((page) => ({
    path: `/${page.slug}`,
    title: page.title,
    description: page.description,
    priority: 0.85,
    changeFrequency: "monthly" as const,
  })),
  ...seoBlogArticles.map((article) => ({
    path: `/blog/${article.slug}`,
    title: article.title,
    description: article.description,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  })),
];

export const buildPublicPageMetadata = ({
  locale,
  path,
  title,
  description,
  keywords = [],
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  keywords?: readonly string[];
}): Metadata => {
  const content = getPublicPageCopy(resolvePublicLocale(locale), path);
  const localizedTitle = content?.title ?? title;
  const localizedDescription = content?.description ?? description;
  const image = content?.socialImage ?? {
    src: resolvePublicLocale(locale) === "ar" ? "/brand/v1/social-ar.png" : "/brand/v1/social-en.png",
    width: 1200,
    height: 630,
    alt: resolvePublicLocale(locale) === "ar" ? "شعار Tragram" : "Tragram logo",
  };
  const images = image ? [{ url: buildAbsoluteUrl(image.src), width: image.width, height: image.height, alt: image.alt }] : undefined;
  return ({
  title: { absolute: localizedTitle },
  description: localizedDescription,
  keywords: [...keywords],
  alternates: {
    canonical: localizedUrl(locale, path),
    languages: buildLanguageAlternates(path),
  },
  openGraph: {
    type: path.startsWith('/blog/') ? "article" : "website",
    siteName,
    title: localizedTitle,
    description: localizedDescription,
    images,
    url: localizedUrl(locale, path),
    locale,
  },
  twitter: {
    card: "summary_large_image",
    title: localizedTitle,
    description: localizedDescription,
    images,
  },
  });
};

type CommercialSeoOptions = {
  billingDisabled?: boolean;
};

export const buildSitemapEntries = ({
  billingDisabled = isBillingDisabledInServerEnv(),
}: CommercialSeoOptions = {}): MetadataRoute.Sitemap => {
  const publicRoutes = getAllPublicSeoRoutes().filter(
    (route) => !billingDisabled || route.path !== "/pricing",
  );
  return publicRoutes.flatMap((route) =>
    publicLocales.map((locale) => ({
      url: localizedUrl(locale, route.path),
      lastModified: getPublicPageCopy(locale, route.path)?.updatedAt,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: buildLanguageAlternates(route.path),
      },
    })),
  );
};

export const buildSoftwareApplicationJsonLd = (
  locale: Locale,
  path: string,
  { billingDisabled = isBillingDisabledInServerEnv() }: CommercialSeoOptions = {},
) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  downloadUrl: Object.values(APP_STORE_LINKS),
  url: localizedUrl(locale, path),
  description: resolvePublicLocale(locale) === 'ar'
    ? 'يربط Tragram إشارات تيليجرام بحساب MT4 أو MT5 المحدد وفق قواعدك، مع ضوابط الدخول وسجل التنفيذ. التنفيذ والنتائج يعتمدان على الأهلية والوسيط.'
    : 'Tragram connects Telegram signals to the selected MT4 or MT5 account using configured rules, entry controls and execution history. Execution and outcomes depend on eligibility and the broker.',
  ...(!billingDisabled
    ? {
        offers: {
          "@type": "Offer",
          category: "Subscription",
          url: localizedUrl(locale, "/pricing"),
        },
      }
    : {}),
});

export const buildPublicIdentityJsonLd = (locale: Locale) => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: siteName,
      legalName: publicTrust.entity, url: siteUrl, logo: `${siteUrl}/brand/v1/logo-horizontal-color.svg`,
    },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: siteName,
      url: localizedUrl(locale, '/'), inLanguage: resolvePublicLocale(locale),
      publisher: { '@id': `${siteUrl}/#organization` } },
  ],
});

export const buildFaqJsonLd = (faqs: readonly SeoFaq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const buildBreadcrumbJsonLd = (
  locale: Locale,
  items: ReadonlyArray<{ name: string; path: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: localizedUrl(locale, item.path),
  })),
});

export const buildArticleJsonLd = (
  locale: Locale,
  article: SeoBlogArticle,
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.h1,
  description: article.description,
  dateModified: article.updatedAt || undefined,
  datePublished: getPublicPageCopy(resolvePublicLocale(locale), `/blog/${article.slug}`)?.publishedAt,
  author: {
    "@type": "Organization",
    name: siteName,
  },
  publisher: {
    "@type": "Organization",
    name: siteName,
  },
  mainEntityOfPage: localizedUrl(locale, `/blog/${article.slug}`),
});
