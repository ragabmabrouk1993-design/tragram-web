import Image from "next/image";
import { getBrandAsset, type BrandAssetKey } from "@/lib/brand";

type TragramLogoProps = BrandAssetKey & {
    className?: string;
    decorative?: boolean;
};

export function TragramLogo({
    className = "h-8 w-auto",
    decorative = false,
    variant = "symbol",
    tone = "color",
}: TragramLogoProps) {
    const asset = getBrandAsset({ variant, tone } as BrandAssetKey);
    return (
        <Image
            src={asset.src}
            alt={decorative ? "" : asset.label}
            aria-hidden={decorative || undefined}
            width={asset.width}
            height={asset.height}
            className={className}
        />
    );
}
