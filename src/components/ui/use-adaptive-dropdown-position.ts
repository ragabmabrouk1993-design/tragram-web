"use client";

import { type CSSProperties, type RefObject, useCallback, useEffect, useMemo, useState } from "react";

export type AdaptiveDropdownPlacement = "top" | "bottom";
export type AdaptiveDropdownAlign = "start" | "end" | "auto";

type AdaptiveDropdownPosition = {
  placement: AdaptiveDropdownPlacement;
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

type UseAdaptiveDropdownPositionOptions = {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  align?: AdaptiveDropdownAlign;
  gap?: number;
  viewportPadding?: number;
  minWidth?: number;
  maxWidth?: number;
  preferredHeight?: number;
  minHeight?: number;
};

const DEFAULT_GAP = 10;
const DEFAULT_VIEWPORT_PADDING = 12;
const DEFAULT_MIN_WIDTH = 160;
const DEFAULT_PREFERRED_HEIGHT = 280;
const DEFAULT_MIN_HEIGHT = 120;
const FLIP_THRESHOLD_PX = 220;

const resolveAlign = (align: AdaptiveDropdownAlign): Exclude<AdaptiveDropdownAlign, "auto"> => {
  if (align === "start" || align === "end") {
    return align;
  }
  if (typeof document === "undefined") {
    return "end";
  }
  return document.documentElement.dir === "rtl" ? "start" : "end";
};

export function useAdaptiveDropdownPosition({
  open,
  triggerRef,
  align = "auto",
  gap = DEFAULT_GAP,
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth,
  preferredHeight = DEFAULT_PREFERRED_HEIGHT,
  minHeight = DEFAULT_MIN_HEIGHT,
}: UseAdaptiveDropdownPositionOptions) {
  const [position, setPosition] = useState<AdaptiveDropdownPosition | null>(null);

  const updatePosition = useCallback(() => {
    if (typeof window === "undefined" || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const horizontalAlign = resolveAlign(align);

    const maxAllowedWidth = Math.max(140, viewportWidth - viewportPadding * 2);
    const boundedMaxWidth = maxWidth ? Math.min(maxWidth, maxAllowedWidth) : maxAllowedWidth;
    const width = Math.min(Math.max(minWidth, rect.width), boundedMaxWidth);

    let left = horizontalAlign === "start" ? rect.left : rect.right - width;
    left = Math.min(
      Math.max(viewportPadding, left),
      Math.max(viewportPadding, viewportWidth - viewportPadding - width)
    );

    const spaceBelow = viewportHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove =
      spaceBelow < Math.min(FLIP_THRESHOLD_PX, preferredHeight) && spaceAbove > spaceBelow;

    const availableHeight = Math.max(
      minHeight,
      (shouldOpenAbove ? spaceAbove : spaceBelow) - gap
    );
    const maxHeightValue = Math.min(preferredHeight, availableHeight);

    const next: AdaptiveDropdownPosition = shouldOpenAbove
      ? {
          placement: "top",
          left,
          width,
          bottom: viewportHeight - rect.top + gap,
          maxHeight: maxHeightValue,
        }
      : {
          placement: "bottom",
          left,
          width,
          top: rect.bottom + gap,
          maxHeight: maxHeightValue,
        };

    setPosition((current) => {
      if (
        current &&
        current.placement === next.placement &&
        Math.abs(current.left - next.left) < 1 &&
        Math.abs(current.width - next.width) < 1 &&
        Math.abs(current.maxHeight - next.maxHeight) < 1 &&
        Math.abs((current.top ?? -1) - (next.top ?? -1)) < 1 &&
        Math.abs((current.bottom ?? -1) - (next.bottom ?? -1)) < 1
      ) {
        return current;
      }
      return next;
    });
  }, [
    triggerRef,
    align,
    gap,
    maxWidth,
    minHeight,
    minWidth,
    preferredHeight,
    viewportPadding,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleReposition = () => {
      window.requestAnimationFrame(updatePosition);
    };

    handleReposition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    window.visualViewport?.addEventListener("resize", handleReposition);
    window.visualViewport?.addEventListener("scroll", handleReposition);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      window.visualViewport?.removeEventListener("resize", handleReposition);
      window.visualViewport?.removeEventListener("scroll", handleReposition);
    };
  }, [open, updatePosition]);

  const style = useMemo<CSSProperties | null>(() => {
    if (!open || !position) {
      return null;
    }

    return {
      left: position.left,
      width: position.width,
      maxHeight: position.maxHeight,
      ...(position.placement === "top"
        ? { bottom: position.bottom }
        : { top: position.top }),
    };
  }, [open, position]);

  return {
    style,
    placement: position?.placement ?? "bottom",
    updatePosition,
  };
}
