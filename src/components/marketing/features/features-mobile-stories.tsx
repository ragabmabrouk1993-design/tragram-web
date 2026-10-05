import { Badge } from "@/components/ui/badge";
import type { MobileStory } from "@/components/marketing/features/features-types";

type FeaturesMobileStoriesProps = {
    title: string;
    subtitle: string;
    badge: string;
    stories: MobileStory[];
};

export function FeaturesMobileStories({
    title,
    subtitle,
    badge,
    stories,
}: FeaturesMobileStoriesProps) {
    return (
        <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-8">
                <div className="rounded-4xl border border-white/10 bg-white/5 p-6 md:p-8">
                    <div className="flex flex-col gap-6 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">{title}</h2>
                            <p className="text-sm text-white/60">{subtitle}</p>
                        </div>
                        <Badge variant="outline">{badge}</Badge>
                    </div>
                    <div className="mt-6 grid gap-6 md:grid-cols-3">
                        {stories.map((story, index) => (
                            <article
                                key={story.title}
                                className="rounded-2xl border border-white/10 bg-black/30 p-5 reveal"
                                style={{ animationDelay: `${index * 120}ms` }}
                            >
                                <h3 className="text-lg font-semibold text-white">
                                    {story.title}
                                </h3>
                                <ul className="mt-3 space-y-2 text-sm text-white/70">
                                    {story.ops.map((op) => (
                                        <li key={op} className="flex items-start gap-2">
                                            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                                            {op}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
