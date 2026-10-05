"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { localeCookieName, localizePath, stripLocaleFromPathname, type Locale } from "@/lib/i18n";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { useAdaptiveDropdownPosition } from "@/components/ui/use-adaptive-dropdown-position";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

interface LanguageSwitchProps {
  className?: string;
  showLabel?: boolean;
  variant?: "pill" | "dropdown";
}

const options: Array<{ locale: Locale; label: string; flag: string }> = [
  { locale: "en", label: "English", flag: "🇬🇧" },
  { locale: "ar", label: "العربية", flag: "🇸🇦" },
];

const normalizeSwitchLocale = (value: string): Locale => {
  return value.toLowerCase().startsWith("ar") ? "ar" : "en";
};

export function LanguageSwitch({
  className,
  showLabel = false,
  variant = "pill",
}: LanguageSwitchProps) {
  const lang = useLocale();
    const intlMessages = useRouteMessages();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<{
    menuTheme: "auth" | "header" | "default";
    portalTarget: HTMLElement | null;
  }>({
    menuTheme: "default",
    portalTarget: null,
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeLocale = normalizeSwitchLocale(lang);
  const { style: menuStyle, placement } = useAdaptiveDropdownPosition({
    open: isOpen,
    triggerRef,
    align: "auto",
    gap: 10,
    minWidth: 210,
    preferredHeight: 280,
    minHeight: 140,
  });

  const switchTo = (target: Locale) => {
    if (target === activeLocale) return;
    trackAnalyticsEvent("language_changed", { from: activeLocale, to: target });
    if (typeof document !== "undefined") {
      // eslint-disable-next-line react-hooks/immutability
      document.cookie = `${localeCookieName}=${target}; path=/; max-age=31536000`;
    }
    setIsOpen(false);
    const basePath = stripLocaleFromPathname(pathname);
    router.replace(localizePath(target, basePath));
    router.refresh();
  };

  const buttonClass = (active: boolean) =>
    cn(
      "language-switch-btn rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition",
      active ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
    );

  const resolveDropdownContext = () => {
    const wrapper = wrapperRef.current;
    const menuTheme = wrapper?.closest("#auth-route-root")
      ? "auth"
      : wrapper?.closest(".header-actions")
        ? "header"
        : "default";
    const portalTarget =
      typeof document !== "undefined"
        ? ((wrapper?.closest("#public-route-root, #auth-route-root") as HTMLElement | null) ??
          document.body)
        : null;
    setDropdownContext({ menuTheme, portalTarget });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  if (variant === "dropdown") {
    const current = options.find((option) => option.locale === activeLocale) ?? options[0];
    const { menuTheme, portalTarget } = dropdownContext;

    return (
      <div
        className={cn("language-switch language-switch--dropdown", className)}
        ref={wrapperRef}
      >
        <button
          ref={triggerRef}
          type="button"
          className="language-switch-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => {
            if (!isOpen) {
              resolveDropdownContext();
            }
            setIsOpen((prev) => !prev);
          }}
        >
          <span className="language-switch-flag" aria-hidden="true">
            {current.flag}
          </span>
          <ChevronDown className={cn("language-switch-caret", isOpen && "is-open")} />
        </button>
        {isOpen && menuStyle && portalTarget
          ? createPortal(
              <div
                ref={menuRef}
                className="language-switch-menu"
                role="listbox"
                data-placement={placement}
                data-theme={menuTheme}
                style={menuStyle}
              >
                {options.map((option) => {
                  const isActive = option.locale === activeLocale;
                  return (
                    <button
                      key={option.locale}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={cn("language-switch-option", isActive && "is-active")}
                      onClick={() => {
                        switchTo(option.locale);
                        setIsOpen(false);
                      }}
                    >
                      <span className="language-switch-flag" aria-hidden="true">
                        {option.flag}
                      </span>
                      <span className="language-switch-option-label">{option.label}</span>
                      {isActive && <span className="language-switch-check">✓</span>}
                    </button>
                  );
                })}
              </div>,
              portalTarget
            )
          : null}
      </div>
    );
  }

  return (
    <div className={cn("language-switch flex items-center gap-3", className)}>
      {showLabel ? (
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
          <Globe className="h-4 w-4 text-white/50" />
          {intlMessages.profileNav.language.title}
        </span>
      ) : (
        <Globe className="h-4 w-4 text-white/50" />
      )}
      <div className="language-switch-shell flex items-center rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => switchTo("en")}
          className={buttonClass(activeLocale === "en")}
          aria-pressed={activeLocale === "en"}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => switchTo("ar")}
          className={buttonClass(activeLocale === "ar")}
          aria-pressed={activeLocale === "ar"}
        >
          AR
        </button>
      </div>
    </div>
  );
}
