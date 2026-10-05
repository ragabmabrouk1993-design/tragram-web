import { useRouteMessages } from "@/components/i18n/route-messages-provider";

type GreetingHeaderProps = {
  name: string;
  accountId?: string;
  onAccountClick?: () => void;
};

export function GreetingHeader({ name, accountId, onAccountClick }: GreetingHeaderProps) {
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardPage.greeting;
  const greeting = t.hello.replace("{name}", name);
  return (
    <div className="dashboard-greeting">
      <h1 className="dashboard-greeting-title">{greeting}</h1>
      {accountId && onAccountClick && (
        <button
          type="button"
          className="dashboard-greeting-meta"
          onClick={onAccountClick}
          aria-label={t.switchAccount}
        >
          <span className="dashboard-account-id">{accountId}</span>
          <span className="dashboard-account-caret" aria-hidden="true">
            <i className="fa-solid fa-chevron-down" />
          </span>
        </button>
      )}
      {accountId && !onAccountClick && (
        <span className="dashboard-greeting-meta" aria-label={t.switchAccount}>
          <span className="dashboard-account-id">{accountId}</span>
        </span>
      )}
    </div>
  );
}
