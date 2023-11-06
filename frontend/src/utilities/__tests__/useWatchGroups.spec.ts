import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { fetchGroupsSettings } from '~/services/groupSettingsService';
import { useWatchGroups } from '~/utilities/useWatchGroups';

jest.mock('~/services/groupSettingsService', () => ({
  fetchGroupsSettings: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
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

    const renderResult = testHook(useWatchGroups)();
    expect(fetchGroupSettingsMock).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current.groupSettings).toStrictEqual(mockEmptyGroupSettings);

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.groupSettings).toStrictEqual(mockGroupSettings);
  });
});
