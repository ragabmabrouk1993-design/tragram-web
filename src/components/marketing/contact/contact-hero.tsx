type ContactHeroProps = {
    kicker: string;
    title: string;
    description: string;
};

export function ContactHero({ kicker, title, description }: ContactHeroProps) {
    return (
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-8 md:p-10 reveal">
            <div
                aria-hidden="true"
                className="absolute -left-8 top-10 h-24 w-24 rounded-full bg-primary/15 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute -right-10 bottom-6 h-24 w-24 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="relative space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">{kicker}</p>
                <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
                <p className="max-w-2xl text-sm text-white/70">{description}</p>
            </div>
        </section>
    );
}
