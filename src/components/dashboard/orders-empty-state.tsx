import Home2Image from "@/app/[lang]/marketing/components/marketing-image";

type OrdersEmptyStateProps = {
  title: string;
  subtitle: string;
  imageAlt?: string;
};

export function OrdersEmptyState({ title, subtitle, imageAlt = "" }: OrdersEmptyStateProps) {
  return (
    <div className="dashboard-empty">
      <div className="dashboard-empty-illustration" aria-hidden="true">
        <Home2Image src="/assets/orders-empty.svg" alt={imageAlt} loading="eager" fetchPriority="high" />
      </div>
      <h3 className="dashboard-empty-title">{title}</h3>
      <p className="dashboard-empty-subtitle">{subtitle}</p>
    </div>
  );
}
