type FaqsHeroProps = {
    title: string;
    subtitle: string;
};

export function FaqsHero({ title, subtitle }: FaqsHeroProps) {
    return (
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-8 md:p-10 reveal">
            <div
                aria-hidden="true"
                className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-primary/15 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute -right-12 bottom-6 h-28 w-28 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="relative space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                    {title}
                </p>
                <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
                <p className="max-w-2xl text-sm text-white/70">{subtitle}</p>
            </div>
        </section>
    );
}
