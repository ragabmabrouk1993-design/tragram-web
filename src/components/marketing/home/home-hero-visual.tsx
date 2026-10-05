import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type HomeHeroVisualProps = {
    previewHeading: string;
    previewSubtitle: string;
    previewStatus: string;
    icons?: LucideIcon[];
    symbols?: string[];
};

const iconPositions = [
    "-left-6 top-8",
    "right-4 top-24",
    "left-10 bottom-6",
];

export function HomeHeroVisual({
    previewHeading,
    previewSubtitle,
    previewStatus,
    icons = [],
    symbols = ["EUR/USD", "BTC/USD", "USD/JPY"],
}: HomeHeroVisualProps) {
    return (
        <div className="relative">
            <div
                aria-hidden="true"
                className="absolute -top-16 right-6 h-32 w-32 rounded-full bg-primary/15 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-accent/15 blur-3xl"
            />

            <div className="relative rounded-4xl border border-white/10 bg-[var(--marketing-panel-gradient)] p-6 shadow-[0_25px_70px_rgba(5,8,20,0.6)] backdrop-blur-2xl">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                    {previewHeading}
                </p>
                <div className="mt-6 space-y-4">
                    {symbols.map((symbol) => (
                        <div
                            key={symbol}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                            <div>
                                <p className="text-sm text-white/80">{symbol}</p>
                                <p className="text-xs text-white/50">{previewSubtitle}</p>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-green-400">
                                {previewStatus}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {icons.slice(0, iconPositions.length).map((Icon, index) => (
                <div
                    key={index}
                    aria-hidden="true"
                    className={cn(
                        "absolute flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-primary shadow-lg",
                        iconPositions[index]
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            ))}
        </div>
    );
}
