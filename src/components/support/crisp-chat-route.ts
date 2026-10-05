export const shouldShowCrispLauncher = (pathname?: string | null) => {
  const currentPath = pathname ?? "";
  return !/\/auth(?:\/|$)/.test(currentPath) && !/\/account-deletion(?:\/|$)/.test(currentPath);
};
