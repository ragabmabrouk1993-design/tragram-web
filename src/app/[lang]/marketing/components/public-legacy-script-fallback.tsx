import Script from "next/script";

const legacyRuntimeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_APPZEN_LEGACY_RUNTIME === "1";

const legacyScriptSources = [
  "/js/jquery-3.7.1.min.js",
  "/js/circle-progress.min.js",
  "/js/bootstrap.min.js",
  "/js/validator.min.js",
  "/js/jquery.slicknav.js",
  "/js/swiper-bundle.min.js",
  "/js/jquery.waypoints.min.js",
  "/js/jquery.counterup.min.js",
  "/js/jquery.magnific-popup.min.js",
  "/js/SmoothScroll.js",
  "/js/parallaxie.js",
  "/js/gsap.min.js",
  "/js/ScrollTrigger.min.js",
  "/js/jquery.mb.YTPlayer.min.js",
  "/js/wow.min.js",
] as const;

export function PublicLegacyScriptFallback() {
  if (!legacyRuntimeEnabled) {
    return null;
  }

  return (
    <>
      {legacyScriptSources.map((src) => (
        <Script key={src} src={src} strategy="afterInteractive" />
      ))}
    </>
  );
}
