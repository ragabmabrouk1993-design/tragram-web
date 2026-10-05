"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import type { CountryCode } from "libphonenumber-js";
import { buildCountryOptions } from "@/lib/phone";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";

interface CountrySelectProps {
    value: CountryCode;
    onChange: (value: CountryCode) => void;
    policy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null;
    disabled?: boolean;
    className?: string;
    tone?: "dark";
}

type DropdownPlacement = "top" | "bottom";

type DropdownPosition = {
    placement: DropdownPlacement;
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
};

const DROPDOWN_GAP = 12;
const VIEWPORT_PADDING = 12;
const MIN_DROPDOWN_WIDTH = 288;
const TARGET_DROPDOWN_HEIGHT = 320;
const MIN_DROPDOWN_HEIGHT = 140;

export function CountrySelect({
    value,
    onChange,
    policy,
    disabled,
    className,
}: CountrySelectProps) {
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const isRtl = lang === "ar";
    const t = intlMessages.commonPhone;
    const options = useMemo(() => buildCountryOptions(policy), [policy]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

    const selected = options.find((option) => option.code === value) ?? options[0];

    const filteredOptions = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return options;
        return options.filter((option) => {
            const nameMatch = option.name.toLowerCase().includes(trimmed);
            const codeMatch = option.code.toLowerCase().includes(trimmed);
            const callingCodeMatch = option.callingCode.includes(trimmed);
            return nameMatch || codeMatch || callingCodeMatch;
        });
    }, [options, query]);

    const closeDropdown = useCallback(() => {
        setOpen(false);
        setQuery("");
        setDropdownPosition(null);
    }, []);

    const updateDropdownPosition = useCallback(() => {
        if (typeof window === "undefined" || !triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const maxAvailableWidth = Math.max(160, viewportWidth - VIEWPORT_PADDING * 2);
        const width = Math.min(
            Math.max(MIN_DROPDOWN_WIDTH, rect.width),
            maxAvailableWidth
        );
        const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - width);
        const anchorLeft = isRtl ? rect.right - width : rect.left;
        const left = Math.min(
            Math.max(VIEWPORT_PADDING, anchorLeft),
            maxLeft
        );

        const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING;
        const spaceAbove = rect.top - VIEWPORT_PADDING;
        const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

        const availableHeight = Math.max(
            MIN_DROPDOWN_HEIGHT,
            (shouldOpenAbove ? spaceAbove : spaceBelow) - DROPDOWN_GAP
        );
        const maxHeight = Math.min(TARGET_DROPDOWN_HEIGHT, availableHeight);

        setDropdownPosition((current) => {
            const next: DropdownPosition = shouldOpenAbove
                ? {
                      placement: "top",
                      left,
                      width,
                      bottom: viewportHeight - rect.top + DROPDOWN_GAP,
                      maxHeight,
                  }
                : {
                      placement: "bottom",
                      left,
                      width,
                      top: rect.bottom + DROPDOWN_GAP,
                      maxHeight,
                  };

            if (
                current &&
                current.placement === next.placement &&
                Math.abs(current.left - next.left) < 1 &&
                Math.abs(current.width - next.width) < 1 &&
                Math.abs((current.top ?? -1) - (next.top ?? -1)) < 1 &&
                Math.abs((current.bottom ?? -1) - (next.bottom ?? -1)) < 1 &&
                Math.abs(current.maxHeight - next.maxHeight) < 1
            ) {
                return current;
            }

            return next;
        });
    }, [isRtl]);

    useEffect(() => {
        if (!open) return;

        const handleClick = (event: MouseEvent) => {
            const targetNode = event.target as Node;
            if (
                !containerRef.current?.contains(targetNode) &&
                !dropdownRef.current?.contains(targetNode)
            ) {
                closeDropdown();
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeDropdown();
        };
        const handleReposition = () => {
            window.requestAnimationFrame(updateDropdownPosition);
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);
        window.visualViewport?.addEventListener("resize", handleReposition);
        window.visualViewport?.addEventListener("scroll", handleReposition);

        handleReposition();
        const focusTimer = window.setTimeout(() => {
            searchRef.current?.focus();
        }, 0);

        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
            window.visualViewport?.removeEventListener("resize", handleReposition);
            window.visualViewport?.removeEventListener("scroll", handleReposition);
            window.clearTimeout(focusTimer);
        };
    }, [closeDropdown, open, updateDropdownPosition]);

    const handleSelect = (nextValue: CountryCode) => {
        onChange(nextValue);
        closeDropdown();
    };

    const panelStyle: CSSProperties | null = dropdownPosition
        ? {
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
              ...(dropdownPosition.placement === "top"
                  ? { bottom: dropdownPosition.bottom }
                  : { top: dropdownPosition.top }),
          }
        : null;

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (open) {
                        closeDropdown();
                        return;
                    }
                    setOpen(true);
                }}
                className={cn(
                    "auth-round flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                    "border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] hover:bg-[var(--surface-panel-strong)]",
                    disabled && "cursor-not-allowed opacity-60 hover:bg-[var(--input-bg)]"
                )}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="text-base">{selected.flag}</span>
                <span>{selected.callingCode}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 transition-transform",
                        "text-[var(--text-secondary)]",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open && dropdownPosition && panelStyle && typeof document !== "undefined"
                ? createPortal(
                      <div
                          ref={dropdownRef}
                          style={panelStyle}
                          className={cn(
                              "fixed z-[110] flex flex-col rounded-2xl border border-border-subtle bg-[var(--surface-elevated)] p-3 text-text-primary shadow-[0_20px_50px_rgba(6,12,26,0.28)]",
                              dropdownPosition.placement === "top" ? "origin-bottom" : "origin-top"
                          )}
                      >
                          <div className="flex items-center gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                              <Search className="h-4 w-4 text-[var(--input-placeholder)]" />
                              <input
                                  ref={searchRef}
                                  value={query}
                                  onChange={(event) => setQuery(event.target.value)}
                                  placeholder={t.searchPlaceholder}
                                  className="w-full bg-transparent text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none"
                              />
                          </div>
                          <div
                              className={cn(
                                  "mt-3 min-h-0 flex-1 overflow-y-auto",
                                  isRtl ? "pl-1" : "pr-1"
                              )}
                              style={{
                                  WebkitOverflowScrolling: "touch",
                                  touchAction: "pan-y",
                                  overscrollBehavior: "contain",
                              }}
                          >
                              {filteredOptions.length === 0 ? (
                                  <div className="px-2 py-3 text-sm text-text-secondary">
                                      {t.noMatches}
                                  </div>
                              ) : (
                                  filteredOptions.map((option) => (
                                      <button
                                          key={option.code}
                                          type="button"
                                          onClick={() => handleSelect(option.code)}
                                          disabled={option.restricted}
                                          aria-disabled={option.restricted}
                                          className={cn(
                                              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start text-sm transition-colors",
                                              option.restricted
                                                  ? "cursor-not-allowed text-[var(--text-faint)]"
                                                  : "text-text-secondary hover:bg-[var(--surface-panel)] hover:text-text-primary"
                                          )}
                                      >
                                          <span className="text-base">{option.flag}</span>
                                          <span className="flex-1">{option.name}</span>
                                          <span className="text-xs text-text-muted">
                                              {option.restricted ? t.restricted : option.callingCode}
                                          </span>
                                      </button>
                                  ))
                              )}
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </div>
    );
}
