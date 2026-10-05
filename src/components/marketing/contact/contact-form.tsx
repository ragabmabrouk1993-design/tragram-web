import { Button } from "@/components/ui/button";

type ContactFormProps = {
    form: {
        nameLabel: string;
        namePlaceholder: string;
        emailLabel: string;
        emailPlaceholder: string;
        messageLabel: string;
        messagePlaceholder: string;
        cta: string;
    };
};

export function ContactForm({ form }: ContactFormProps) {
    return (
        <form className="space-y-5">
            <div>
                <label className="text-sm text-white/70" htmlFor="name">
                    {form.nameLabel}
                </label>
                <input
                    id="name"
                    type="text"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                    placeholder={form.namePlaceholder}
                    autoComplete="name"
                />
            </div>

            <div>
                <label className="text-sm text-white/70" htmlFor="email">
                    {form.emailLabel}
                </label>
                <input
                    id="email"
                    type="email"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                    placeholder={form.emailPlaceholder}
                    autoComplete="email"
                />
            </div>

            <div>
                <label className="text-sm text-white/70" htmlFor="message">
                    {form.messageLabel}
                </label>
                <textarea
                    id="message"
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                    placeholder={form.messagePlaceholder}
                />
            </div>

            <Button variant="gradient" className="w-full">
                {form.cta}
            </Button>
        </form>
    );
}
