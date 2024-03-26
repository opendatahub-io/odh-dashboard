import { act } from 'react-dom/test-utils';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { GroupsConfig } from '~/pages/groupSettings/groupTypes';
import { fetchGroupsSettings, updateGroupsSettings } from '~/services/groupSettingsService';
import { useWatchGroups } from '~/utilities/useWatchGroups';
import useNotification from '~/utilities/useNotification';

jest.mock('~/services/groupSettingsService', () => ({
  fetchGroupsSettings: jest.fn(),
  updateGroupsSettings: jest.fn(),
}));
// Mock the useNotification hook
jest.mock('../useNotification', () => {
  const mock = {
    success: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mock),
  };
});
const fetchGroupSettingsMock = jest.mocked(fetchGroupsSettings);
const useNotificationMock = jest.mocked(useNotification);
const updateGroupSettingsMock = jest.mocked(updateGroupsSettings);
const mockEmptyGroupSettings = {
  adminGroups: [],
  allowedGroups: [],
};

const createResult = (r: Partial<ReturnType<typeof useWatchGroups>>) =>
  Object.assign(
    {
      groupSettings: mockEmptyGroupSettings,
      loaded: true,
      isLoading: false,
      isGroupSettingsChanged: false,
      loadError: undefined,
      updateGroups: expect.any(Function),
      setGroupSettings: expect.any(Function),
      setIsGroupSettingsChanged: expect.any(Function),
    },
    r,
  );

describe('useWatchGroups', () => {
  it('should fetch groups successfully', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 1, name: 'odh-admins', enabled: true }],
      allowedGroups: [],
    };
    updateGroupSettingsMock.mockImplementation((group) => Promise.resolve(group));
    fetchGroupSettingsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(createResult({ loaded: false, isLoading: true }));
    await renderResult.waitForNextUpdate();
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(createResult({ groupSettings: mockGroupSettings }));
    renderResult.rerender();
    expect(renderResult).hookToBeStable({
      groupSettings: true,
      loaded: true,
      isLoading: true,
      isGroupSettingsChanged: true,
      loadError: true,
      updateGroups: true,
      setGroupSettings: true,
      setIsGroupSettingsChanged: true,
    });
    const mockUpdatedGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 2, name: 'odh-admins', enabled: false }],
      allowedGroups: [],
    };
    act(() => {
      renderResult.result.current.setIsGroupSettingsChanged(true);
    });
    expect(renderResult).hookToStrictEqual(
      createResult({ groupSettings: mockGroupSettings, isGroupSettingsChanged: true }),
    );
    act(() => {
      renderResult.result.current.updateGroups(mockUpdatedGroupSettings);
    });
    expect(renderResult).hookToStrictEqual(
      createResult({
        groupSettings: mockGroupSettings,
        isLoading: true,
        isGroupSettingsChanged: true,
      }),
    );
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      createResult({ groupSettings: mockUpdatedGroupSettings }),
    );
  });

  it('should handle error', async () => {
    fetchGroupSettingsMock.mockRejectedValue(new Error(`Error updating group settings`));
    const renderResult = testHook(useWatchGroups)();
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(createResult({ loaded: false, isLoading: true }));
    await renderResult.waitForNextUpdate();
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      createResult({ loaded: false, loadError: new Error('Error updating group settings') }),
    );
    expect(useNotificationMock().error).toHaveBeenCalledWith(
      'Error',
      'Error updating group settings',
    );
  });

  it('should test admin error', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 1, name: 'odh-admins', enabled: true }],
      allowedGroups: [],
      errorAdmin: 'errorAdmin',
    };
    fetchGroupSettingsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    await renderResult.waitForNextUpdate();
    expect(useNotificationMock().error).toHaveBeenCalledWith('Group error', 'errorAdmin');
  });

  it('should test user error', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 1, name: 'odh-admins', enabled: true }],
      allowedGroups: [],
      errorUser: 'errorUser',
    };
    fetchGroupSettingsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    await renderResult.waitForNextUpdate();
    expect(useNotificationMock().error).toHaveBeenCalledWith('Group error', 'errorUser');
  });
});
