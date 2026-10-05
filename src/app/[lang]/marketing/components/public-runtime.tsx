"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { initCounters } from "../runtime/init-counters";
import { initReveal } from "../runtime/init-reveal";
import { initSwipers } from "../runtime/init-swipers";
import { initTextAnimeStyleThree } from "../runtime/init-text-anime";
import { initVideoPopup, resolveVideoEmbedUrl } from "../runtime/init-video-popup";
import { initWowReveal } from "../runtime/init-wow";
import { shouldDisablePublicVisualRuntime } from "@/lib/public-route-runtime";

export function PublicRuntime() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const intlMessages = useRouteMessages();
  const pathname = usePathname();
  const runtimeDisabled = shouldDisablePublicVisualRuntime(pathname ?? "/");
  const [activeVideo, setActiveVideo] = useState<{
    href: string;
    path: string;
  } | null>(null);

  const activeVideoEmbedUrl = useMemo(
    () =>
      activeVideo && activeVideo.path === pathname
        ? resolveVideoEmbedUrl(activeVideo.href)
        : null,
    [activeVideo, pathname]
  );

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveVideo(null);
      }
      if (event.key === 'Tab') {
        const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), iframe, a[href]') ?? []);
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };

    if (!activeVideoEmbedUrl) {
      return undefined;
    }

    document.addEventListener("keydown", onEscape);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [activeVideoEmbedUrl]);

  useEffect(() => {
    if (runtimeDisabled) {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanupFns = [
      ...(!reducedMotion ? [
      initSwipers(),
      initWowReveal(),
      initReveal(),
      initTextAnimeStyleThree(),
      initCounters(),
      ] : []),
      initVideoPopup((href) => {
        setActiveVideo({
          href,
          path: pathname,
        });
      }),
    ];

    const onTopLinkClick = (event: MouseEvent) => {
      const trigger = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href="#top"]'
      );

      if (!trigger) {
        return;
      }

      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    };

    document.addEventListener("click", onTopLinkClick);

    return () => {
      document.removeEventListener("click", onTopLinkClick);
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [pathname, runtimeDisabled]);

  if (runtimeDisabled || !activeVideoEmbedUrl) {
    return null;
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={intlMessages.ui.videoPlayer} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <button
        type="button"
        aria-label={intlMessages.ui.closeVideo}
        tabIndex={-1}
        className="absolute inset-0"
        onClick={() => setActiveVideo(null)}
      />
      <div className="relative z-[1] w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-2xl">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setActiveVideo(null)}
          className="absolute right-3 top-3 z-[2] rounded-md bg-black/60 px-3 py-1 text-sm text-white"
        >
          {intlMessages.ui.close}
        </button>
        <div className="aspect-video w-full">
          <iframe
            src={activeVideoEmbedUrl}
            title={intlMessages.ui.videoPlayer}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
