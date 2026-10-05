export type BrandVariant = "symbol" | "horizontal" | "stacked" | "wordmark";
export type BrandTone = "color" | "navy" | "white";

export type BrandAsset = {
  src: string;
  width: number;
  height: number;
  label: string;
};

const assets = {
  symbol: {
    color: { src: "/brand/v1/symbol-gradient.svg", width: 420, height: 321, label: "Tragram" },
    navy: { src: "/brand/v1/symbol-navy.svg", width: 420, height: 325, label: "Tragram" },
    white: { src: "/brand/v1/symbol-white.svg", width: 420, height: 324, label: "Tragram" },
  },
  horizontal: {
    color: { src: "/brand/v1/logo-horizontal-color.svg", width: 420, height: 82, label: "Tragram" },
    navy: { src: "/brand/v1/logo-horizontal-navy.svg", width: 420, height: 74, label: "Tragram" },
    white: { src: "/brand/v1/logo-horizontal-white.svg", width: 420, height: 71, label: "Tragram" },
  },
  stacked: {
    color: { src: "/brand/v1/logo-stacked-color.svg", width: 420, height: 285, label: "Tragram" },
  },
  wordmark: {
    navy: { src: "/brand/v1/wordmark-navy.svg", width: 420, height: 51, label: "Tragram" },
  },
} satisfies Record<string, Record<string, BrandAsset>>;

export type BrandAssetKey =
  | { variant?: "symbol"; tone?: BrandTone }
  | { variant: "horizontal"; tone?: BrandTone }
  | { variant: "stacked"; tone?: "color" }
  | { variant: "wordmark"; tone?: "navy" };

export function getBrandAsset({ variant = "symbol", tone = "color" }: BrandAssetKey = {}): BrandAsset {
  if (variant === "stacked") return assets.stacked.color;
  if (variant === "wordmark") return assets.wordmark.navy;
  return assets[variant][tone];
}

export const brandAssets = assets;
