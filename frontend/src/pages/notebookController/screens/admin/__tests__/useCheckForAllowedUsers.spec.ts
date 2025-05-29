import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { getAllowedUsers } from '#~/redux/actions/actions';
import { mockAllowedUsers } from '#~/__mocks__/mockAllowedUsers';
import useCheckForAllowedUsers from '#~/pages/notebookController/screens/admin/useCheckForAllowedUsers';
import { AllowedUser } from '#~/pages/notebookController/screens/admin/types';

jest.mock('#~/redux/actions/actions', () => ({
  getAllowedUsers: jest.fn(),
}));

jest.mock('#~/pages/notebookController/useNamespaces', () => () => ({
  notebookNamespace: 'test-project',
  dashboardNamespace: 'opendatahub',
}));

const getAllowedUsersMock = jest.mocked(getAllowedUsers);

describe('useCheckForAllowedUsers', () => {
  it('should return list of users', async () => {
    const mockAllowedUser: AllowedUser = mockAllowedUsers({});
    getAllowedUsersMock.mockResolvedValue([mockAllowedUser]);
    const renderResult = testHook(useCheckForAllowedUsers)();

    expect(getAllowedUsersMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual([[], false, undefined]);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(getAllowedUsersMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual([[mockAllowedUser], true, undefined]);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle error', async () => {
    const error = (message: string) => ({
      response: {
        data: {
          message,
        },
      },
    });
    getAllowedUsersMock.mockRejectedValue(error('error1'));
    const renderResult = testHook(useCheckForAllowedUsers)();

    expect(getAllowedUsersMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual([[], false, undefined]);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(getAllowedUsersMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual([[], false, new Error('error1')]);
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
