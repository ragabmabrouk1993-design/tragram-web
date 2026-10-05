import Image from "next/image";
import type { ImgHTMLAttributes } from "react";

const home2ImageSizes = {
  "/images/about-us-image-1-elite.jpg": { width: 340, height: 270 },
  "/images/about-us-image-2-elite.jpg": { width: 540, height: 700 },
  "/images/about-us-image.jpg": { width: 705, height: 660 },
  "/images/404-error-img.png": { width: 750, height: 436 },
  "/images/404-error-img-1.png": { width: 750, height: 436 },
  "/images/arrow-primary.svg": { width: 24, height: 24 },
  "/images/author-1.jpg": { width: 50, height: 50 },
  "/images/author-2.jpg": { width: 50, height: 50 },
  "/images/author-3.jpg": { width: 50, height: 50 },
  "/images/author-4.jpg": { width: 50, height: 50 },
  "/images/benefit-image-2-elite.jpg": { width: 500, height: 403 },
  "/images/benefit-image-3-elite.jpg": { width: 376, height: 182 },
  "/images/benefit-item-box-image-elite.png": { width: 378, height: 234 },
  "/images/company-logo-1-elite.svg": { width: 170, height: 41 },
  "/images/contact-us-circle.svg": { width: 140, height: 140 },
  "/images/contact-us-image.jpg": { width: 578, height: 750 },
  "/images/cta-box-img-elite.png": { width: 548, height: 514 },
  "/images/digital-companion-image-elite.png": { width: 1581, height: 1953 },
  "/images/hero-image-elite.png": { width: 736, height: 520 },
  "/images/icon-about-us-item-1-elite.svg": { width: 24, height: 24 },
  "/images/icon-about-us-item-2-elite.svg": { width: 24, height: 24 },
  "/images/icon-app-store.svg": { width: 180, height: 60 },
  "/images/icon-clock-primary.svg": { width: 30, height: 30 },
  "/images/app-download-circle.svg": { width: 161, height: 160 },
  "/images/icon-download-primary.svg": { width: 30, height: 30 },
  "/images/icon-headphone.svg": { width: 30, height: 30 },
  "/images/icon-headset.svg": { width: 40, height: 40 },
  "/images/icon-benefit-item-1-elite.svg": { width: 30, height: 30 },
  "/images/icon-digital-companion-item-1-elite.svg": {
    width: 24,
    height: 24,
  },
  "/images/icon-digital-companion-item-2-elite.svg": {
    width: 24,
    height: 24,
  },
  "/images/icon-download-accent.svg": { width: 20, height: 20 },
  "/images/icon-download-white.svg": { width: 15, height: 15 },
  "/images/icon-features-1-elite.svg": { width: 24, height: 24 },
  "/images/icon-features-1.svg": { width: 30, height: 30 },
  "/images/icon-features-2-elite.svg": { width: 24, height: 24 },
  "/images/icon-features-2.svg": { width: 30, height: 30 },
  "/images/icon-features-3-elite.svg": { width: 24, height: 24 },
  "/images/icon-features-3.svg": { width: 30, height: 30 },
  "/images/icon-features-4-elite.svg": { width: 24, height: 24 },
  "/images/icon-features-4.svg": { width: 30, height: 30 },
  "/images/icon-features-5.svg": { width: 30, height: 30 },
  "/images/icon-features-6.svg": { width: 30, height: 30 },
  "/images/icon-features-7.svg": { width: 30, height: 30 },
  "/images/icon-features-8.svg": { width: 30, height: 30 },
  "/images/icon-location-accent.svg": { width: 24, height: 24 },
  "/images/icon-location-primary.svg": { width: 30, height: 30 },
  "/images/icon-mail-accent.svg": { width: 24, height: 24 },
  "/images/icon-mail-primary.svg": { width: 32, height: 32 },
  "/images/icon-phone-accent.svg": { width: 24, height: 24 },
  "/images/icon-phone-primary.svg": { width: 32, height: 32 },
  "/images/icon-play-store.svg": { width: 180, height: 60 },
  "/images/icon-pricing-1-elite.svg": { width: 30, height: 30 },
  "/images/icon-pricing-1.svg": { width: 30, height: 30 },
  "/images/icon-pricing-2-elite.svg": { width: 30, height: 30 },
  "/images/icon-pricing-2.svg": { width: 30, height: 30 },
  "/images/icon-pricing-3-elite.svg": { width: 30, height: 30 },
  "/images/icon-pricing-3.svg": { width: 30, height: 30 },
  "/images/icon-pricing-benefit-1.svg": { width: 20, height: 20 },
  "/images/icon-pricing-benefit-2.svg": { width: 20, height: 20 },
  "/images/icon-pricing-benefit-3.svg": { width: 20, height: 20 },
  "/images/icon-why-choose-item-1-elite.svg": { width: 30, height: 30 },
  "/images/icon-why-choose-item-2-elite.svg": { width: 30, height: 30 },
  "/images/icon-why-choose-item-3-elite.svg": { width: 30, height: 30 },
  "/images/loader.svg": { width: 50, height: 38 },
  "/images/logo.svg": { width: 165, height: 32 },
  "/brand/v1/symbol-gradient.svg": { width: 50, height: 38 },
  "/brand/v1/logo-horizontal-color.svg": { width: 165, height: 32 },
  "/brand/v1/logo-horizontal-white.svg": { width: 189, height: 32 },
  "/images/our-tool-app-image-elite.png": { width: 1620, height: 250 },
  "/images/our-tools-bg-shape-elite.png": { width: 1920, height: 809 },
  "/images/our-tools-figure-elite.png": { width: 4860, height: 750 },
  "/images/post-1.jpg": { width: 1366, height: 768 },
  "/images/post-2.jpg": { width: 1366, height: 768 },
  "/images/post-3.jpg": { width: 1366, height: 768 },
  "/images/smart-management-image-elite.png": { width: 323, height: 295 },
  "/images/testimonial-cta-image-elite.png": { width: 480, height: 262 },
  "/images/testimonial-quote-elite.svg": { width: 40, height: 40 },
  "/images/sidebar-logo.svg": { width: 189, height: 32 },
  "/images/why-choose-us-image-elite.png": { width: 604, height: 679 },
  "/images/why-choose-us-image-v2.png": { width: 2766, height: 1158 },
  "/images/benefits-item-image-1.png": { width: 380, height: 769 },
  "/images/benefits-item-image-2.png": { width: 380, height: 769 },
  "/images/benefits-item-image-3.png": { width: 380, height: 769 },
  "/images/company-supports-logo-1.svg": { width: 159, height: 40 },
  "/images/company-supports-logo-2.svg": { width: 158, height: 40 },
  "/images/company-supports-logo-3.svg": { width: 172, height: 37 },
  "/images/company-supports-logo-4.svg": { width: 199, height: 40 },
  "/images/company-supports-logo-5.svg": { width: 133, height: 40 },
  "/images/google-logo.svg": { width: 122, height: 40 },
  "/images/how-it-work-image-1.png": { width: 1059, height: 1959 },
  "/images/how-it-work-image-2.png": { width: 1059, height: 2100 },
  "/images/icon-about-body-item-1.svg": { width: 30, height: 30 },
  "/images/icon-about-body-item-2.svg": { width: 30, height: 30 },
  "/images/icon-approach-1.svg": { width: 30, height: 30 },
  "/images/icon-approach-2.svg": { width: 30, height: 30 },
  "/images/icon-approach-3.svg": { width: 30, height: 30 },
  "/images/icon-approach-4.svg": { width: 30, height: 30 },
  "/images/icon-mission.svg": { width: 30, height: 30 },
  "/images/icon-social-app-1.svg": { width: 80, height: 80 },
  "/images/icon-social-app-2.svg": { width: 80, height: 80 },
  "/images/icon-social-app-3.svg": { width: 80, height: 80 },
  "/images/icon-social-app-4.svg": { width: 80, height: 80 },
  "/images/icon-social-app-5.svg": { width: 80, height: 80 },
  "/images/icon-social-app-6.svg": { width: 80, height: 80 },
  "/images/icon-vision.svg": { width: 30, height: 30 },
  "/images/team-1.jpg": { width: 400, height: 446 },
  "/images/team-2.jpg": { width: 400, height: 446 },
  "/images/team-3.jpg": { width: 400, height: 446 },
  "/images/team-4.jpg": { width: 400, height: 446 },
  "/images/testimonial-image.png": { width: 456, height: 494 },
  "/images/why-choose-us-image.png": { width: 922, height: 386 },
  "/assets/orders-empty.svg": { width: 164, height: 130 },
  "/assets/delete-channel-icon.svg": { width: 132, height: 144 },
  "/assets/close-order.svg": { width: 132, height: 144 },
} as const;

type Home2ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> & {
  alt: string;
  width?: number;
  height?: number;
};

export default function Home2Image({
  src,
  width,
  height,
  alt = "",
  loading,
  decoding,
  ...rest
}: Home2ImageProps) {
  const size =
    typeof src === "string" ? home2ImageSizes[src as keyof typeof home2ImageSizes] : undefined;
  const resolvedWidth = width ?? size?.width;
  const resolvedHeight = height ?? size?.height;

  if (!resolvedWidth || !resolvedHeight) {
    throw new Error(`Missing dimensions for image: ${String(src)}`);
  }

  return (
    <Image
      src={String(src)}
      width={resolvedWidth}
      height={resolvedHeight}
      alt={alt}
      loading={loading ?? "lazy"}
      decoding={decoding ?? "async"}
      {...rest}
    />
  );
}
