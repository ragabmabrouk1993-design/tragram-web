declare global {
  interface Window {
    __APPZEN_DISABLE_SPLITTEXT__?: boolean;
  }
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function isRtlDocument(): boolean {
  return document.documentElement.dir.toLowerCase() === "rtl";
}

function shouldSkipSplitText(element: HTMLElement): boolean {
  if (element.hasAttribute("data-no-split-text")) {
    return true;
  }

  if (element.closest("#auth-route-root, [data-no-split-root='true']")) {
    return true;
  }

  if (isRtlDocument()) {
    return true;
  }

  if (isArabicText(element.textContent ?? "")) {
    return true;
  }

  const directLang = element.getAttribute("lang") ?? "";
  let parentLang = "";
  if (!directLang && element.closest) {
    const langContainer = element.closest("[lang]");
    parentLang = langContainer?.getAttribute("lang") ?? "";
  }

  const resolvedLang = (directLang || parentLang).toLowerCase();
  if (resolvedLang.startsWith("ar")) {
    return true;
  }

  const directDir = element.getAttribute("dir") ?? "";
  let parentDir = "";
  if (!directDir && element.closest) {
    const dirContainer = element.closest("[dir]");
    parentDir = dirContainer?.getAttribute("dir") ?? "";
  }

  return (directDir || parentDir).toLowerCase() === "rtl";
}

type TextTween = {
  kill: () => void;
  scrollTrigger?: {
    kill: () => void;
  } | null;
};

type GsapLike = {
  registerPlugin: (...plugins: unknown[]) => void;
  set: (target: unknown, vars: Record<string, unknown>) => void;
  to: (target: unknown, vars: Record<string, unknown>) => TextTween;
};

type SplitTypeLike = {
  chars: HTMLElement[];
  revert: () => void;
};

type SplitTypeConstructor = new (
  target: HTMLElement,
  options: {
    types: string;
  }
) => SplitTypeLike;

export function initTextAnimeStyleThree(): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.__APPZEN_DISABLE_SPLITTEXT__ || isRtlDocument()) {
    return () => {};
  }

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(".text-anime-style-3")
  );

  if (elements.length === 0) {
    return () => {};
  }

  let disposed = false;
  const cleanupFns: Array<() => void> = [];

  const start = async () => {
    const [gsapModule, scrollTriggerModule, splitTypeModule] = await Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("split-type"),
    ]);

    if (disposed) {
      return;
    }

    const gsap = (gsapModule.gsap ?? gsapModule.default) as GsapLike;
    const ScrollTrigger = (scrollTriggerModule.ScrollTrigger ??
      scrollTriggerModule.default) as unknown;
    const SplitType = splitTypeModule.default as SplitTypeConstructor;

    gsap.registerPlugin(ScrollTrigger);

    elements.forEach((element) => {
      if (shouldSkipSplitText(element)) {
        return;
      }

      const accessibleLabel = element.getAttribute('aria-label');
      const originalText = element.textContent ?? '';
      const split = new SplitType(element, { types: "words,chars" });
      element.setAttribute('aria-label', accessibleLabel ?? originalText);
      split.chars.forEach(character => character.setAttribute('aria-hidden', 'true'));

      gsap.set(element, { perspective: 400 });
      gsap.set(split.chars, {
        opacity: 0,
        x: 50,
      });

      const tween = gsap.to(split.chars, {
        scrollTrigger: {
          trigger: element,
          start: "top 90%",
        },
        x: 0,
        y: 0,
        rotateX: 0,
        opacity: 1,
        duration: 1,
        ease: "back.out(1.7)",
        stagger: 0.02,
      });

      cleanupFns.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
        split.revert();
        if (accessibleLabel === null) element.removeAttribute('aria-label');
        else element.setAttribute('aria-label', accessibleLabel);
        element.style.removeProperty("perspective");
      });
    });
  };

  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      if (!disposed) {
        void start();
      }
    });
  } else {
    void start();
  }

  return () => {
    disposed = true;
    cleanupFns.forEach((cleanup) => cleanup());
  };
}
