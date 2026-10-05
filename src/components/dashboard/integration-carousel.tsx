import { cn } from "@/lib/utils";
import { HorizontalScroller } from "@/components/dashboard/horizontal-scroller";

type IntegrationCarouselProps = React.HTMLAttributes<HTMLDivElement>;

export function IntegrationCarousel({ className, ...props }: IntegrationCarouselProps) {
  return <HorizontalScroller className={cn("dashboard-integration-carousel", className)} {...props} />;
}
