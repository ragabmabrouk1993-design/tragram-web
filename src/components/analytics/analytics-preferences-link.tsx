"use client";

type AnalyticsPreferencesLinkProps = {
  href: string;
  label: string;
};

export function AnalyticsPreferencesLink({ href, label }: AnalyticsPreferencesLinkProps) {
  return (
    <a
      href={href}
      role="button"
      aria-haspopup="dialog"
      onClick={(event) => {
        event.preventDefault();
        window.dispatchEvent(new Event("tragram:analytics-open-preferences"));
      }}
      onKeyDown={(event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        window.dispatchEvent(new Event("tragram:analytics-open-preferences"));
      }}
    >
      {label}
    </a>
  );
}
