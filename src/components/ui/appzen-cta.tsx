import Link from "next/link";
import { cn } from "@/lib/utils";

type AppzenCtaVariant = "primary" | "secondary" | "neutral" | "danger";

type AppzenCtaBaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: AppzenCtaVariant;
  showArrow?: boolean;
  disabled?: boolean;
};

type AppzenCtaLinkProps = AppzenCtaBaseProps & {
  href: string;
  target?: string;
  rel?: string;
  type?: never;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

type AppzenCtaButtonProps = AppzenCtaBaseProps & {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

type AppzenCtaProps = AppzenCtaLinkProps | AppzenCtaButtonProps;

export function AppzenCta({
  children,
  className,
  variant = "secondary",
  showArrow = true,
  disabled = false,
  ...rest
}: AppzenCtaProps) {
  const classes = cn(
    "appzen-cta",
    `appzen-cta--${variant}`,
    !showArrow && "appzen-cta--no-arrow",
    disabled && "is-disabled",
    className
  );

  if ("href" in rest && typeof rest.href === "string") {
    return (
      <Link
        href={rest.href}
        target={rest.target}
        rel={rest.rel}
        onClick={rest.onClick}
        className={classes}
        aria-disabled={disabled}
      >
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button
      type={rest.type ?? "button"}
      onClick={rest.onClick}
      className={classes}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  );
}
