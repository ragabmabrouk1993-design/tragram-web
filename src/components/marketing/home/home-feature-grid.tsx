import { HomeSection } from "@/components/marketing/home/home-section";
import type { HomeFeaturePillar } from "@/components/marketing/home/home-types";

type HomeFeatureGridProps = {
    title: string;
    features: HomeFeaturePillar[];
};

export function HomeFeatureGrid({ title, features }: HomeFeatureGridProps) {
    return (
        <HomeSection className="pt-0">
            <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-6 md:p-8">
                <div
                    aria-hidden="true"
                    className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl"
                />
                <h2 className="relative text-xl font-semibold text-white">{title}</h2>
                <div className="relative mt-6 grid gap-6 md:grid-cols-3">
                    {features.map((feature, index) => (
                        <article
                            key={feature.title}
                            className="flex h-full flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-6 reveal"
                            style={{ animationDelay: `${index * 120}ms` }}
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-primary">
                                <feature.icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                            <p className="text-sm text-white/70">{feature.description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </HomeSection>
    );
}
