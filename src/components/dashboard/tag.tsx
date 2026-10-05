import { cn } from "@/lib/utils";

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "accent" | "muted";
};

export function Tag({ className, tone = "default", ...props }: TagProps) {
  return (
    <span
      className={cn("dashboard-tag", `dashboard-tag-${tone}`, className)}
      {...props}
    />
  );
}
