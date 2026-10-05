"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ChannelAvatarProps = {
  imageUrl?: string | null;
  className?: string;
  imgClassName?: string;
};

const normalizeImageUrl = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function ChannelAvatar({ imageUrl, className, imgClassName }: ChannelAvatarProps) {
  const normalizedImageUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const canRenderImage = Boolean(normalizedImageUrl) && failedImageUrl !== normalizedImageUrl;

  return (
    <div className={cn("channels-avatar", className)} aria-hidden="true">
      {canRenderImage && normalizedImageUrl ? (
        // Intentionally using native img to avoid Next.js remote image host restrictions for dynamic Telegram URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizedImageUrl}
          alt=""
          className={imgClassName}
          loading="lazy"
          onError={() => setFailedImageUrl(normalizedImageUrl)}
        />
      ) : (
        <i className="fa-brands fa-telegram channels-avatar-icon" aria-hidden="true" />
      )}
    </div>
  );
}
