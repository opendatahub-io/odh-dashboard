import * as React from 'react';
import { Provider } from 'react-redux';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { ReduxContext } from '~/redux/context';
import { store } from '~/redux/store/store';
import { fetchGroupsSettings } from '~/services/groupSettingsService';
import { useWatchGroups } from '~/utilities/useWatchGroups';

jest.mock('~/services/groupSettingsService', () => ({
  fetchGroupsSettings: jest.fn(),
}));

const fetchGroupSettingsMock = fetchGroupsSettings as jest.Mock;

describe('useWatchGroups', () => {
  it('should fetch groups successfully', async () => {
    const mockEmptyGroupSettings = {
      adminGroups: [],
      allowedGroups: [],
    };
    const mockGroupSettings = {
      adminGroups: ['odh-admins'],
      allowedGroups: [],
    };
    fetchGroupSettingsMock.mockReturnValue(Promise.resolve(mockGroupSettings));

    const renderResult = renderHook(() => useWatchGroups(), {
      wrapper: ({ children }) => (
        <Provider store={store} context={ReduxContext}>
          {children}
        </Provider>
      ),
    });
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current.groupSettings).toStrictEqual(mockEmptyGroupSettings);

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.groupSettings).toStrictEqual(mockGroupSettings);
  });
});
