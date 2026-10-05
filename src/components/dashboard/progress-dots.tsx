import { cn } from "@/lib/utils";

type ProgressDotsProps = {
  total: number;
  current: number;
  className?: string;
};

export function ProgressDots({ total, current, className }: ProgressDotsProps) {
  const dots = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <div className={cn("dashboard-progress", className)} aria-hidden="true">
      {dots.map((value) => (
        <span
          key={value}
          className={cn(
            "dashboard-progress-dot",
            value <= current && "dashboard-progress-dot-active"
          )}
        />
      ))}
    </div>
  );
}
