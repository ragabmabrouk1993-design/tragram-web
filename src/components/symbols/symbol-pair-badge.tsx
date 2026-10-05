import { cn } from "@/lib/utils";
import { FLAGS_SPRITE_PATH } from "./flags-sprite-manifest";
import {
  normalizeSymbolKeyForTestId,
  resolveSymbolIconLayout,
  type ResolvedSymbolIconLayout,
} from "./symbol-sprite-resolver";
import styles from "./symbol-pair-badge.module.css";

type SymbolBadgeSize = "sm" | "md";

type SymbolPairBadgeProps = {
  symbol: string;
  base?: string | null;
  quote?: string | null;
  baseCountry?: string | null;
  quoteCountry?: string | null;
  size?: SymbolBadgeSize;
  className?: string;
};

const buildFallbackTitle = (resolved: ResolvedSymbolIconLayout): string =>
  resolved.fallbackLabel ?? resolved.normalizedSymbol;

const renderIcon = (
  icon: ResolvedSymbolIconLayout["icons"][number],
  index: number
) => {
  const slotClass =
    icon.slot === "quote" || icon.slot === "base"
      ? styles.symbolPairBadgeQuote
      : styles.symbolPairBadgeSingle;

  return (
    <svg
      key={`${icon.id}-${icon.slot}-${index}`}
      className={cn(styles.symbolPairBadgeIcon, slotClass)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${FLAGS_SPRITE_PATH}#${icon.id}`} />
    </svg>
  );
};

export const SymbolPairBadge = (props: SymbolPairBadgeProps) => {
  const { symbol, base, quote, size = "md", className } = props;
  const resolved = resolveSymbolIconLayout({ symbol, base, quote });
  const dataTestId = `icon-${normalizeSymbolKeyForTestId(symbol)}`;
  const sizeClass = size === "sm" ? styles.symbolPairBadgeSm : styles.symbolPairBadgeMd;

  return (
    <span
      className={cn(styles.symbolPairBadgeRoot, sizeClass, className)}
      data-testid={dataTestId}
    >
      {resolved.icons.length > 0 ? (
        resolved.icons.map((icon, index) => renderIcon(icon, index))
      ) : (
        <span
          className={cn(
            styles.symbolPairBadgeIcon,
            styles.symbolPairBadgeSingle,
            styles.symbolPairBadgeFallback
          )}
          title={buildFallbackTitle(resolved)}
        >
          <span className={styles.symbolPairBadgeFallbackText}>
            {resolved.fallbackLabel ?? "?"}
          </span>
        </span>
      )}
    </span>
  );
};
