import { cn } from "@/lib/utils";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted";
};

export function GlassCard({ className, variant = "default", ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "dashboard-card",
        variant === "muted" && "dashboard-card-muted",
        className
      )}
      {...props}
    />
  );
}
