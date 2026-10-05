import { cn } from "@/lib/utils";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} className={cn("dashboard-icon-button", className)} {...props}>
      {children}
    </button>
  );
}
