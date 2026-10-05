"use client";

import { useEffect, useRef, type RefObject } from "react";

type UseSheetFocusLockOptions = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusSelector?: string;
};

const TABBABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const focusElement = (element: HTMLElement | null) => {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

const isTabbable = (element: HTMLElement): boolean => {
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  if (element.hasAttribute("hidden")) return false;
  if (element.getAttribute("tabindex") === "-1") return false;
  if (element instanceof HTMLInputElement && element.type === "hidden") return false;
  return element.getClientRects().length > 0;
};

const getTabbables = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(isTabbable);

export function useSheetFocusLock({
  open,
  containerRef,
  onClose,
  initialFocusSelector,
}: UseSheetFocusLockOptions) {
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const initialFocus =
      (initialFocusSelector ? container.querySelector<HTMLElement>(initialFocusSelector) : null) ??
      getTabbables(container)[0] ??
      null;
    focusElement(initialFocus);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const tabbables = getTabbables(container);
      if (tabbables.length === 0) return;

      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!active || !container.contains(active)) {
        event.preventDefault();
        focusElement(first);
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        focusElement(last);
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const previousFocusedElement = previousFocusRef.current;
      if (previousFocusedElement && document.contains(previousFocusedElement)) {
        focusElement(previousFocusedElement);
      }
    };
  }, [open, containerRef, initialFocusSelector]);
}
