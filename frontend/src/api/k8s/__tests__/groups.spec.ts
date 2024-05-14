import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { groupVersionKind, useAccessReview, useGroups } from '~/api';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { GroupModel } from '~/api/models';
import { mockGroup } from '~/__mocks__/mockGroup';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(),
}));

jest.mock('~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

const useAccessReviewMock = jest.mocked(useAccessReview);
const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;

describe('useGroups', () => {
  it('should wrap useK8sWatchResource to watch groups', async () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [[], false, undefined];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();

    expect(useK8sWatchResourceMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(GroupModel),
      },
      GroupModel,
    );
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should render list of groups', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [
      [mockGroup({})],
      true,
      undefined,
    ];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceMock).toHaveBeenCalledWith(
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
    useK8sWatchResourceMock.mockReturnValue([undefined, true, undefined]);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceMock).toHaveBeenCalledTimes(1);
    expect(useK8sWatchResourceMock).toHaveBeenCalledWith(null, GroupModel);
    expect(result.current).toStrictEqual([[], true, undefined]);
  });
});
