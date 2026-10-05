export type MtAccountConnectionSnapshot = {
  isActive?: boolean;
  connectionStatus?: string;
};

export const hasConnectedMtAccount = (
  accounts: MtAccountConnectionSnapshot[]
): boolean =>
  accounts.some(
    (account) =>
      account.isActive === true && account.connectionStatus === "CONNECTED"
  );
