import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeSectionProps = {
    children: ReactNode;
    className?: string;
    containerClassName?: string;
};

export function HomeSection({ children, className, containerClassName }: HomeSectionProps) {
    return (
        <section className={cn("relative py-16 md:py-24", className)}>
            <div className={cn("container mx-auto px-4 md:px-6", containerClassName)}>
                {children}
            </div>
        </section>
    );
}
