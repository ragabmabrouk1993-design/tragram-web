export type ChannelsLoadState = {
  loading: boolean;
  error: boolean;
  subscriptionRequired: boolean;
};

/** Keep the initial skeleton up until the first saved projection is available. */
export const beginChannelsLoad = (
  current: ChannelsLoadState,
  hasLoadedProjection: boolean,
): ChannelsLoadState => ({
  ...current,
  loading: !hasLoadedProjection,
  error: false,
});
