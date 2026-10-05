export type { PublicLocale } from '@/lib/public-locales';
export type { PublicPageIdentity } from './route-manifest';
export type PublicFaq = {
  id: string;
  topic: 'getting-started' | 'telegram' | 'mt-accounts' | 'execution' | 'access' | 'mobile' | 'account-security';
  question: string;
  answer: string;
  relatedPath?: string;
};
export type PublicImage = { src: string; alt: string; width: number; height: number };
export type PublicPageCopy = {
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: Array<{
    id: string;
    title: string;
    body: string;
    bullets?: string[];
    steps?: Array<{ title: string; body: string }>;
    example?: { input: string; output: string; note: string };
    table?: { columns: string[]; rows: string[][] };
    image?: PublicImage;
  }>;
  faqs: PublicFaq[];
  relatedPaths: string[];
  updatedAt?: string;
  publishedAt?: string;
  image: PublicImage;
  socialImage?: PublicImage;
};
