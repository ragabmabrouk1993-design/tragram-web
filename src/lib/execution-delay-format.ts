export const formatExecutionDuration = (
  value: number | null | undefined,
  locale: string
): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  const seconds = value / 1000;
  if (seconds < 60) {
    const formattedSeconds = new Intl.NumberFormat(locale, {
      minimumFractionDigits: seconds < 10 && !Number.isInteger(seconds) ? 1 : 0,
      maximumFractionDigits: seconds < 10 ? 1 : 0,
    }).format(seconds);
    return `${formattedSeconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

