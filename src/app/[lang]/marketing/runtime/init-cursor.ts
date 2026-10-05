import { gsap } from "gsap";

const interactiveSelector = "a,input,textarea,button";

function shouldEnableCursor(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function isLeavingElement(event: MouseEvent, element: Element): boolean {
  const related = event.relatedTarget;
  return !(related instanceof Node) || !element.contains(related);
}

export function initCursor(): () => void {
  if (!shouldEnableCursor()) {
    return () => {};
  }

  const publicRouteRoot = document.getElementById("public-route-root");
  if (!publicRouteRoot) {
    return () => {};
  }

  const existingCursor = document.querySelector<HTMLElement>(
    ".cb-cursor[data-tg-public-cursor='true']"
  );

  if (existingCursor) {
    return () => {};
  }

  const cursorElement = document.createElement("div");
  cursorElement.className = "cb-cursor";
  cursorElement.dataset.tgPublicCursor = "true";

  const textElement = document.createElement("div");
  textElement.className = "cb-cursor-text";
  cursorElement.appendChild(textElement);
  publicRouteRoot.appendChild(cursorElement);

  let stickTarget: HTMLElement | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let visible = false;
  const moveSpeed = 0.7;
  const moveEase = "expo.out";
  const visibleTimeoutMs = 300;
  let pos = {
    x: -window.innerWidth,
    y: -window.innerHeight,
  };

  const move = (x?: number, y?: number, duration?: number) => {
    gsap.to(cursorElement, {
      x: x ?? pos.x,
      y: y ?? pos.y,
      force3D: true,
      overwrite: true,
      ease: moveEase,
      duration: visible ? duration ?? moveSpeed : 0,
    });
  };

  const show = () => {
    if (visible) {
      return;
    }
    if (hideTimeout) clearTimeout(hideTimeout);
    cursorElement.classList.add("-visible");
    hideTimeout = setTimeout(() => {
      visible = true;
      hideTimeout = null;
    });
  };

  const hide = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    cursorElement.classList.remove("-visible");
    hideTimeout = setTimeout(() => {
      visible = false;
      hideTimeout = null;
    }, visibleTimeoutMs);
  };

  const setCursorText = (value: string) => {
    textElement.textContent = value;
    cursorElement.classList.add("-text");
  };

  const clearCursorText = () => {
    textElement.textContent = "";
    cursorElement.classList.remove("-text");
  };

  const onMouseMove = (event: MouseEvent) => {
    const x = event.clientX;
    const y = event.clientY;

    if (stickTarget) {
      const rect = stickTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      pos = {
        x: centerX - (centerX - x) * 0.15,
        y: centerY - (centerY - y) * 0.15,
      };
    } else {
      pos = { x, y };
    }

    move();
    show();
  };

  const onMouseOver = (event: MouseEvent) => {
    const eventTarget = event.target as Element | null;
    if (!eventTarget) {
      return;
    }

    const interactive = eventTarget.closest(interactiveSelector);
    if (interactive) {
      cursorElement.classList.add("-pointer");
    }

    const iframeTarget = eventTarget.closest("iframe");
    if (iframeTarget) {
      hide();
    }

    const cursorTarget = eventTarget.closest<HTMLElement>("[data-cursor]");
    const cursorState = cursorTarget?.getAttribute("data-cursor");
    if (cursorState) {
      cursorElement.classList.add(cursorState);
    }

    const textTarget = eventTarget.closest<HTMLElement>("[data-cursor-text]");
    const cursorText = textTarget?.getAttribute("data-cursor-text");
    if (cursorText) {
      setCursorText(cursorText);
    }

    const stickAttrTarget = eventTarget.closest<HTMLElement>("[data-cursor-stick]");
    const stickSelector = stickAttrTarget?.getAttribute("data-cursor-stick");
    if (stickSelector) {
      const target = document.querySelector<HTMLElement>(stickSelector);
      stickTarget = target ?? stickAttrTarget ?? null;
      if (stickTarget) {
        const rect = stickTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        pos = { x: centerX, y: centerY };
        move(centerX, centerY, 5);
      }
    }
  };

  const onMouseOut = (event: MouseEvent) => {
    const eventTarget = event.target as Element | null;
    if (!eventTarget) {
      return;
    }

    const interactive = eventTarget.closest(interactiveSelector);
    if (interactive && isLeavingElement(event, interactive)) {
      cursorElement.classList.remove("-pointer");
    }

    const iframeTarget = eventTarget.closest("iframe");
    if (iframeTarget && isLeavingElement(event, iframeTarget)) {
      show();
    }

    const cursorTarget = eventTarget.closest<HTMLElement>("[data-cursor]");
    const cursorState = cursorTarget?.getAttribute("data-cursor");
    if (cursorState && cursorTarget && isLeavingElement(event, cursorTarget)) {
      cursorElement.classList.remove(cursorState);
    }

    const textTarget = eventTarget.closest<HTMLElement>("[data-cursor-text]");
    if (textTarget && isLeavingElement(event, textTarget)) {
      clearCursorText();
    }

    const stickAttrTarget = eventTarget.closest<HTMLElement>("[data-cursor-stick]");
    if (stickAttrTarget && isLeavingElement(event, stickAttrTarget)) {
      stickTarget = null;
    }
  };

  const onMouseDown = () => {
    cursorElement.classList.add("-active");
  };

  const onMouseUp = () => {
    cursorElement.classList.remove("-active");
  };

  const onMouseEnterDocument = () => {
    show();
  };

  const onMouseLeaveDocument = () => {
    hide();
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseover", onMouseOver);
  document.addEventListener("mouseout", onMouseOut);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mouseenter", onMouseEnterDocument);
  document.addEventListener("mouseleave", onMouseLeaveDocument);

  move(-window.innerWidth, -window.innerHeight, 0);

  return () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("mouseout", onMouseOut);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mouseenter", onMouseEnterDocument);
    document.removeEventListener("mouseleave", onMouseLeaveDocument);

    gsap.killTweensOf(cursorElement);
    cursorElement.remove();
  };
}
