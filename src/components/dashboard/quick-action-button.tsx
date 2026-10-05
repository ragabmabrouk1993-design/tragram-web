import { cn } from "@/lib/utils";

type QuickActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export function QuickActionButton({
  title,
  subtitle,
  icon,
  className,
  type = "button",
  ...props
}: QuickActionButtonProps) {
  return (
    <button type={type} className={cn("dashboard-quick-action", className)} {...props}>
      {icon && (
        <span className="dashboard-quick-action-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="dashboard-quick-action-text">
        <span className="dashboard-quick-action-title">{title}</span>
        {subtitle && <span className="dashboard-quick-action-subtitle">{subtitle}</span>}
      </span>
      <span className="dashboard-quick-action-arrow" aria-hidden="true">
        <i className="fa-solid fa-arrow-right" />
      </span>
    </button>
  );
}
