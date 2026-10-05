import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import styles from "./app-store-buttons.module.css";

import { APP_STORE_LINKS } from '@/lib/mobile-app-links';
export { APP_STORE_LINKS } from '@/lib/mobile-app-links';

export type AppStoreButtonLabels = {
  appStore: string;
  googlePlay: string;
};

type AppStoreButtonsProps = {
  locale?: Locale;
  labels?: Partial<AppStoreButtonLabels>;
  className?: string;
};

const getDefaultLabels = (locale?: Locale): AppStoreButtonLabels =>
  locale?.startsWith("ar")
    ? {
        appStore: "نزّله من App Store",
        googlePlay: "احصل عليه على Google Play",
      }
    : {
        appStore: "Download on the App Store",
        googlePlay: "Get it on Google Play",
      };

export default function AppStoreButtons({
  locale,
  labels,
  className,
}: AppStoreButtonsProps) {
  const resolvedLabels = { ...getDefaultLabels(locale), ...labels };
  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <a
        href={APP_STORE_LINKS.appStore}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
        data-store="app-store"
        aria-label={resolvedLabels.appStore}
      >
        <Image
          src="/images/icon-app-store.svg"
          width={180}
          height={60}
          alt=""
          className={styles.badge}
        />
      </a>

      <a
        href={APP_STORE_LINKS.googlePlay}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
        data-store="google-play"
        aria-label={resolvedLabels.googlePlay}
      >
        <Image
          src="/images/icon-play-store.svg"
          width={180}
          height={60}
          alt=""
          className={styles.badge}
        />
      </a>
    </div>
  );
}
