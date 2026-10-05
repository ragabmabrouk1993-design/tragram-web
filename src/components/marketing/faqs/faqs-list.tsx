import { FaqItem } from "@/components/marketing/faqs/faq-item";

type FaqsListProps = {
    items: Array<{ question: string; answer: string }>;
};

export function FaqsList({ items }: FaqsListProps) {
    return (
        <div className="space-y-4">
            {items.map((faq, index) => (
                <div
                    key={faq.question}
                    className="reveal"
                    style={{ animationDelay: `${index * 120}ms` }}
                >
                    <FaqItem question={faq.question} answer={faq.answer} />
                </div>
            ))}
        </div>
    );
}
