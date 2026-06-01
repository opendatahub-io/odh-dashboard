import { testHook } from '@odh-dashboard/jest-config/hooks';
import { GroupsConfig } from '#~/concepts/userConfigs/groupTypes';
import { useWatchGroups } from '#~/concepts/userConfigs/useWatchGroups';
import { useGroups } from '#~/api';
import useNotification from '#~/utilities/useNotification';
import { GroupKind } from '#~/k8sTypes';
import { mockGroup } from '#~/__mocks__/mockGroup';
import { fetchAuthGroups } from '#~/concepts/userConfigs/utils';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  useGroups: jest.fn(),
}));
jest.mock('#~/concepts/userConfigs/utils', () => ({
  ...jest.requireActual('#~/concepts/userConfigs/utils'),
  fetchAuthGroups: jest.fn(),
}));
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

const fetchAuthGroupsMock = jest.mocked(fetchAuthGroups);
const useNotificationMock = jest.mocked(useNotification);
const useGroupsMock = jest.mocked(useGroups);

const mockEmptyGroupSettings: GroupsConfig = {
  adminGroups: [],
  allowedGroups: [],
};

const mockGroups: GroupKind[] = [mockGroup({ name: 'odh-admins' })];

const createResult = (r: Partial<ReturnType<typeof useWatchGroups>>) =>
  Object.assign(
    {
      groupSettings: mockEmptyGroupSettings,
      setGroupSettings: expect.any(Function),
      availableGroups: mockGroups,
      loaded: true,
      isLoading: false,
      loadError: undefined,
    },
    r,
  );

describe('useWatchGroups', () => {
  beforeEach(() => {
    useGroupsMock.mockImplementation(() => [mockGroups, true, undefined]);
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
    expect(renderResult).hookToStrictEqual(createResult({ groupSettings: mockGroupSettings }));
    renderResult.rerender();
    expect(renderResult).hookToBeStable({
      groupSettings: true,
      setGroupSettings: true,
      availableGroups: true,
      loaded: true,
      isLoading: true,
      loadError: true,
    });
  });

  it('should handle fetch error', async () => {
    fetchAuthGroupsMock.mockRejectedValue(new Error('Error getting group settings'));
    const renderResult = testHook(useWatchGroups)();
    expect(renderResult).hookToStrictEqual(createResult({ loaded: false, isLoading: true }));
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      createResult({ loaded: false, loadError: new Error('Error getting group settings') }),
    );
    expect(useNotificationMock().error).toHaveBeenCalledWith(
      'Error',
      'Error getting group settings',
    );
  });
});
