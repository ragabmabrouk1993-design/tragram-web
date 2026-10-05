import { cn } from "@/lib/utils";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <section className={cn(styles.shell, className)}>
      <div className={styles.shellInner}>{children}</div>
    </section>
  );
}
