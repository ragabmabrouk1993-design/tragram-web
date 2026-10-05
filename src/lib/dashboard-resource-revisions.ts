export type RevisionDecision = {
  apply: boolean;
  gap: boolean;
};

export const decideDashboardRevision = (
  currentRevision: number,
  incomingRevision: number | null | undefined
): RevisionDecision => {
  if (incomingRevision === null || incomingRevision === undefined) {
    return { apply: true, gap: false };
  }
  if (incomingRevision <= currentRevision) {
    return { apply: false, gap: false };
  }
  return { apply: true, gap: currentRevision > 0 && incomingRevision > currentRevision + 1 };
};
