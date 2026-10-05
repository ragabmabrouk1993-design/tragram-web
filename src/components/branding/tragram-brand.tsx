import Home2Image from '@/app/[lang]/marketing/components/marketing-image';
import styles from './tragram-brand.module.css';

type TragramBrandProps = {
  size?: 'navigation' | 'footer';
};

export function TragramBrand({ size = 'navigation' }: TragramBrandProps) {
  return (
    <span className={`${styles.brand} ${size === 'footer' ? styles.footer : ''}`} dir="ltr">
      <Home2Image src="/brand/v1/symbol-gradient.svg" alt="" />
      <span className={styles.wordmark}>Tragram</span>
    </span>
  );
}
