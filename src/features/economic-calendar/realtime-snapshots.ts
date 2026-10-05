export type EconomicNewsRevisionState = {
  calendarRevision: string | null;
  guardRevision: string | null;
  settingsRevision: string | null;
};

export const shouldApplyRevision = (currentRevision: string | null, nextRevision: unknown): nextRevision is string => typeof nextRevision === 'string' && nextRevision.length > 0 && nextRevision !== currentRevision;

export const nextRevisionState = (state: EconomicNewsRevisionState, resource: keyof EconomicNewsRevisionState, revision: string): EconomicNewsRevisionState => ({ ...state, [resource]: revision });
