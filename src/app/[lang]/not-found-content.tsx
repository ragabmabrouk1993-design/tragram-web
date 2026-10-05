import { defaultHome2Copy, type Home2Copy } from "./marketing/marketing-copy";
import { isLocale, localizePath, type Locale } from "@/lib/i18n";
import Link from "next/link";
import Image from "next/image";
import styles from "./not-found-content.module.css";

type NotFoundContentProps = {
  lang?: string;
  copy?: Home2Copy;
  standalone?: boolean;
};

function getPreferredLang(lang?: string) {
  if (lang) {
    return lang.toLowerCase();
  }
  return "en";
}

export default function NotFoundContent({ lang, copy, standalone = false }: NotFoundContentProps) {
  const preferredLang = getPreferredLang(lang);
  const resolvedLocale: Locale = isLocale(preferredLang) ? preferredLang : "en";
  const resolvedCopy = copy ?? defaultHome2Copy;
  const content = resolvedCopy.notFound;
  const withLocale = (href: string) => localizePath(resolvedLocale, href);

  return (
    <main
      lang={preferredLang}
      data-no-split-root="true"
      className={`${styles.shell} ${standalone ? styles.standalone : ""}`}
    >
      <div className={styles.content}>
        <div className={styles.imageWrap}>
          <Image
            src="/images/404-error-img.png"
            alt=""
            width={700}
            height={430}
            className={styles.image}
            style={{ height: "auto" }}
            priority
          />
        </div>

        <section className={styles.copy} aria-labelledby="not-found-title">
          <h1 id="not-found-title" className={styles.title}>
            {content.errorTitle}
          </h1>
          <p className={styles.body}>{content.errorBody}</p>

          <div className={styles.actions}>
            <Link href={withLocale("/")} className={styles.primaryAction}>
              {content.backHome}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
