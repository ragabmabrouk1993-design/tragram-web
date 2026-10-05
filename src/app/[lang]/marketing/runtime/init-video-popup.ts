function toEmbedUrl(href: string): string | null {
  try {
    const url = new URL(href, "https://tragram.app");
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
    }

    if (hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v")?.trim();
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
    }

    if (hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
    }

    return href;
  } catch {
    return null;
  }
}

export function resolveVideoEmbedUrl(href: string | null): string | null {
  return href ? toEmbedUrl(href) : null;
}

export function initVideoPopup(onOpenVideo: (href: string) => void): () => void {
  const onPopupClick = (event: MouseEvent) => {
    const trigger = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a.popup-video"
    );

    if (!trigger) {
      return;
    }

    event.preventDefault();

    const href = trigger.getAttribute("href");
    if (!href) {
      return;
    }

    onOpenVideo(href);
  };

  document.addEventListener("click", onPopupClick);

  return () => {
    document.removeEventListener("click", onPopupClick);
  };
}
