import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { GroupsConfig } from '#~/concepts/userConfigs/groupTypes';
import { useWatchGroups } from '#~/concepts/userConfigs/useWatchGroups';
import { getAuth, patchAuth, useGroups } from '#~/api';
import useNotification from '#~/utilities/useNotification';
import { GroupKind } from '#~/k8sTypes';
import { mockGroup } from '#~/__mocks__/mockGroup';
import { fetchAuthGroups } from '#~/concepts/userConfigs/utils';
import { mockAuth } from '#~/__mocks__/mockAuth';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  getAuth: jest.fn(),
  patchAuth: jest.fn(),
  useGroups: jest.fn(),
}));
jest.mock('#~/concepts/userConfigs/utils', () => ({
  ...jest.requireActual('#~/concepts/userConfigs/utils'),
  fetchAuthGroups: jest.fn(),
}));
// Mock the useNotification hook
jest.mock('../../../utilities/useNotification', () => {
  const mock = {
    success: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mock),
  };
});
const getAuthMock = jest.mocked(getAuth);
const patchAuthMock = jest.mocked(patchAuth);
const fetchAuthGroupsMock = jest.mocked(fetchAuthGroups);
const useNotificationMock = jest.mocked(useNotification);
const useGroupsMock = jest.mocked(useGroups);
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
  beforeEach(() => {
    getAuthMock.mockImplementation(() => Promise.resolve(mockAuth()));
    patchAuthMock.mockResolvedValue(mockAuth());
    const groups: GroupKind[] = [mockGroup({ name: 'odh-admins' })];
    useGroupsMock.mockImplementation(() => [groups, true, undefined]);
  });

  it('should fetch groups successfully', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 'odh-admins', name: 'odh-admins', enabled: true }],
      allowedGroups: [],
    };

    fetchAuthGroupsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    expect(fetchAuthGroupsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(createResult({ loaded: false, isLoading: true }));
    await renderResult.waitForNextUpdate();
    expect(fetchAuthGroupsMock).toHaveBeenCalledTimes(1);
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
      adminGroups: [{ id: 'odh-admins', name: 'odh-admins', enabled: true }],
      allowedGroups: [
        { id: 'odh-admins', name: 'odh-admins', enabled: false },
        { id: 'system:authenticated', name: 'system:authenticated', enabled: true },
      ],
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
    fetchAuthGroupsMock.mockRejectedValue(new Error(`Error getting group settings`));
    const renderResult = testHook(useWatchGroups)();
    expect(fetchAuthGroupsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(createResult({ loaded: false, isLoading: true }));
    await renderResult.waitForNextUpdate();
    expect(fetchAuthGroupsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      createResult({ loaded: false, loadError: new Error('Error getting group settings') }),
    );
    expect(useNotificationMock().error).toHaveBeenCalledWith(
      'Error',
      'Error getting group settings',
    );
  });

  it('should test admin error', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 'odh-admins', name: 'odh-admins', enabled: true }],
      allowedGroups: [],
      errorAdmin: 'errorAdmin',
    };
    fetchAuthGroupsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    await renderResult.waitForNextUpdate();
    expect(useNotificationMock().error).toHaveBeenCalledWith('Group error', 'errorAdmin');
  });

  it('should test user error', async () => {
    const mockGroupSettings: GroupsConfig = {
      adminGroups: [{ id: 'odh-admins', name: 'odh-admins', enabled: true }],
      allowedGroups: [],
      errorUser: 'errorUser',
    };
    fetchAuthGroupsMock.mockResolvedValue(mockGroupSettings);
    const renderResult = testHook(useWatchGroups)();
    await renderResult.waitForNextUpdate();
    expect(useNotificationMock().error).toHaveBeenCalledWith('Group error', 'errorUser');
  });
});
