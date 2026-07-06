import { testHook } from '@odh-dashboard/jest-config/hooks';
import { groupVersionKind, useAccessReview, useGroups } from '#~/api';
import { GroupModel } from '#~/api/models';
import { mockGroup } from '#~/__mocks__/mockGroup';
import { mock404Error, mock500Error } from '#~/__mocks__/mockK8sStatus';
import { K8sStatusError } from '#~/api/errorUtils';
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
  it('should watch groups via useK8sWatchResourceList', async () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useGroups)();

    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      { isList: true, groupVersionKind: groupVersionKind(GroupModel) },
      GroupModel,
    );
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should render list of groups', () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue([[mockGroup({})], true, undefined]);
    const { result } = testHook(useGroups)();
    expect(result.current).toStrictEqual([[mockGroup({})], true, undefined]);
  });

  it('should handle access review denial (403)', () => {
    useAccessReviewMock.mockReturnValue([false, true]);
    useK8sWatchResourceListMock.mockReturnValue([[], true, undefined]);
    const { result } = testHook(useGroups)();
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(null, GroupModel);
    expect(result.current).toStrictEqual([[], true, undefined]);
  });

  it('should return empty groups when the Group CRD does not exist (404 on BYOIDC clusters)', () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue([[], false, new K8sStatusError(mock404Error({}))]);
    const { result } = testHook(useGroups)();
    expect(result.current).toStrictEqual([[], true, undefined]);
  });

  it('should propagate non-404 errors', () => {
    const serverError = new K8sStatusError(mock500Error({}));
    useAccessReviewMock.mockReturnValue([true, true]);
    useK8sWatchResourceListMock.mockReturnValue([[], false, serverError]);
    const { result } = testHook(useGroups)();
    expect(result.current).toStrictEqual([[], false, serverError]);
  });
});
