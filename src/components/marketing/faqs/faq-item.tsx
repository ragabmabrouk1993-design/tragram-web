type FaqItemProps = {
    question: string;
    answer: string;
};

export function FaqItem({ question, answer }: FaqItemProps) {
    return (
        <details className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
            <summary className="cursor-pointer text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                {question}
            </summary>
            <p className="mt-3 text-white/70">{answer}</p>
        </details>
    );
}
