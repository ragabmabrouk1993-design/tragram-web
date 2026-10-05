import { beginChannelsLoad, type ChannelsLoadState } from './channels-page-state';

const initialState: ChannelsLoadState = {
  loading: true,
  error: false,
  subscriptionRequired: false,
};

describe('channels page loading state', () => {
  test('keeps the skeleton visible until the first saved projection is ready', () => {
    expect(beginChannelsLoad(initialState, false)).toEqual(initialState);
  });

  test('keeps the saved projection visible during a background refresh', () => {
    const loadedState: ChannelsLoadState = {
      ...initialState,
      loading: false,
    };

    expect(beginChannelsLoad(loadedState, true)).toEqual(loadedState);
  });
});
