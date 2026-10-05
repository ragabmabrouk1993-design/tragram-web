"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  href?: string;
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
};

const buttonBaseClasses =
  "tragram-back-button inline-grid h-12 w-12 place-items-center rounded-full border border-white/85 bg-[rgba(7,11,21,0.22)] text-[21px] text-white transition-colors duration-200 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300";

export function BackButton({ href, ariaLabel, className, onClick }: BackButtonProps) {
  const router = useRouter();
  const lang = useLocale();
  const isRtl = lang.toLowerCase().startsWith("ar");
  const label = ariaLabel ?? (isRtl ? "رجوع" : "Back");
  const iconClassName = isRtl ? "fa-arrow-right" : "fa-arrow-left";

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (!href) {
      router.back();
    }
  };

  const content = <i className={cn("fa-solid", iconClassName)} aria-hidden="true" />;

  if (href) {
    return (
      <Link href={href} className={cn(buttonBaseClasses, className)} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(buttonBaseClasses, className)}
      aria-label={label}
    >
      {content}
    </button>
  );
}
