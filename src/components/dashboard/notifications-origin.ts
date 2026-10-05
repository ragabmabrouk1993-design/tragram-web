type NotificationOriginContext = {
  mtAccountId?: string | null;
  scopeKind?: 'MT_ACCOUNT' | 'GLOBAL';
};

export type NotificationOriginLabels = {
  originAccount: string;
  retainedAccount: string;
};

/** Resolve the user-facing broker account number without exposing the database UUID. */
export const resolveNotificationOriginLabel = (
  context: NotificationOriginContext,
  accountNumbersById: Readonly<Record<string, string>>,
  labels: NotificationOriginLabels,
): string | null => {
  const accountNumber = context.mtAccountId
    ? accountNumbersById[context.mtAccountId]
    : undefined;

  if (accountNumber) {
    return labels.originAccount.replace('{account}', accountNumber);
  }

  return context.scopeKind === 'MT_ACCOUNT' ? labels.retainedAccount : null;
};
