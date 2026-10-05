import { HomeSection } from "@/components/marketing/home/home-section";

type HomeStatsStripProps = {
    stats: Array<{ label: string; value: string }>;
};

export function HomeStatsStrip({ stats }: HomeStatsStripProps) {
    return (
        <HomeSection className="pt-0">
            <div className="grid gap-8 rounded-4xl border border-white/10 bg-slate/60 p-8 md:grid-cols-3">
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="text-center reveal"
                        style={{ animationDelay: `${index * 120}ms` }}
                    >
                        <p className="text-4xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>
        </HomeSection>
    );
}
