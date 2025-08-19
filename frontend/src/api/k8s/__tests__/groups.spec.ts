import { testHook } from '@odh-dashboard/jest-config/hooks';
import { groupVersionKind, useAccessReview, useGroups } from '#~/api';
import { GroupModel } from '#~/api/models';
import { mockGroup } from '#~/__mocks__/mockGroup';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { GroupKind } from '#~/k8sTypes';

jest.mock('#~/utilities/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

const useAccessReviewMock = jest.mocked(useAccessReview);
const useK8sWatchResourceListMock = jest.mocked(useK8sWatchResourceList<GroupKind[]>);

describe('useGroups', () => {
  it('should wrap useK8sWatchResource to watch groups', async () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();

    expect(useK8sWatchResourceListMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(GroupModel),
      },
      GroupModel,
    );
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should render list of groups', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [
      [mockGroup({})],
      true,
      undefined,
    ];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceListMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(GroupModel),
      },
      GroupModel,
    );
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should handle 403 error', () => {
    useAccessReviewMock.mockReturnValue([false, true]);
    useK8sWatchResourceListMock.mockReturnValue([[], true, undefined]);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceListMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(null, GroupModel);
    expect(result.current).toStrictEqual([[], true, undefined]);
  });

  it('should handle errors and rethrow', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [
      [],
      true,
      new Error('Unknown error occured'),
    ];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceListMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(GroupModel),
      },
      GroupModel,
    );
    expect(result.current).toStrictEqual(mockReturnValue);
  });
});
