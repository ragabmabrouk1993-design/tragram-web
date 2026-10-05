import { cn } from "@/lib/utils";

type HorizontalScrollerProps = React.HTMLAttributes<HTMLDivElement>;

export function HorizontalScroller({ className, ...props }: HorizontalScrollerProps) {
  return <div className={cn("dashboard-scroller", className)} {...props} />;
}
