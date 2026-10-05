"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Home2Image from "./marketing-image";
import { defaultHome2Copy, getHome2Copy, type Home2Copy } from "../marketing-copy";
import { stripLocaleFromPathname } from "@/lib/i18n";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { shouldDisablePublicVisualRuntime } from "@/lib/public-route-runtime";

const FADE_OUT_DURATION_MS = 300;
const MAX_VISIBLE_DURATION_MS = 6000;

type Home2PreloaderProps = {
  copy?: Home2Copy;
};

export default function Home2Preloader({ copy }: Home2PreloaderProps) {
  const intlMessages = useRouteMessages();
  const resolvedCopy = copy ?? getHome2Copy(intlMessages ?? undefined) ?? defaultHome2Copy;
  const pathname = usePathname();
  const normalizedPath = stripLocaleFromPathname(pathname ?? "/");
  const disablePreloaderPrefixes = [
    "/dashboard",
    "/channels",
    "/reports",
    "/profile",
    "/auth",
    "/onboarding",
    "/restricted",
  ];
  const shouldShowPreloader = !disablePreloaderPrefixes.some((prefix) =>
    normalizedPath.startsWith(prefix)
  ) && !shouldDisablePublicVisualRuntime(pathname ?? "/");
  const [isFading, setIsFading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxVisibleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeStartedRef = useRef(false);
  const [initialPath] = useState(() => pathname ?? "/");
  const hasPathChanged = (pathname ?? "/") !== initialPath;

  useEffect(() => {
    if (!shouldShowPreloader) {
      return;
    }

    const startFadeOut = () => {
      if (fadeStartedRef.current) {
        return;
      }
      fadeStartedRef.current = true;
      setIsFading(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = setTimeout(() => {
        setIsHidden(true);
        hideTimeoutRef.current = null;
      }, FADE_OUT_DURATION_MS);
    };

    maxVisibleTimeoutRef.current = setTimeout(startFadeOut, MAX_VISIBLE_DURATION_MS);

    if (document.readyState === "complete") {
      startFadeOut();
    } else {
      window.addEventListener("load", startFadeOut);
    }

    return () => {
      fadeStartedRef.current = false;
      window.removeEventListener("load", startFadeOut);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      if (maxVisibleTimeoutRef.current) {
        clearTimeout(maxVisibleTimeoutRef.current);
        maxVisibleTimeoutRef.current = null;
      }
    };
  }, [shouldShowPreloader]);

  if (!shouldShowPreloader || hasPathChanged || isHidden) {
    return null;
  }

  return (
    <div
      className="preloader"
      style={{
        opacity: isFading ? 0 : 1,
        pointerEvents: isFading ? "none" : "auto",
        transition: `opacity ${FADE_OUT_DURATION_MS}ms ease`,
      }}
    >
      <div className="loading-container">
        <div className="loading"></div>
        <div id="loading-icon">
          <Home2Image src="/brand/v1/symbol-gradient.svg" alt={resolvedCopy.preloader.alt} />
        </div>
      </div>
    </div>
  );
}
