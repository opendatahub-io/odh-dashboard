import { testHook } from '@odh-dashboard/jest-config/hooks';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { NIMAccountModel } from '../k8s';
import { useWatchNIMAccounts } from '../watch';

jest.mock('@odh-dashboard/internal/utilities/useK8sWatchResourceList');

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);

describe('useWatchNIMAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass correct resource config when namespace is provided', () => {
    const accounts = [mockNimAccount({ namespace: 'test-ns' })];
    mockUseK8sWatchResourceList.mockReturnValue([accounts, true, undefined]);

    const renderResult = testHook(useWatchNIMAccounts)('test-ns');

    expect(mockUseK8sWatchResourceList).toHaveBeenCalledWith(
      expect.objectContaining({
        isList: true,
        groupVersionKind: groupVersionKind(NIMAccountModel),
        namespace: 'test-ns',
      }),
      NIMAccountModel,
      undefined,
    );
    expect(renderResult.result.current).toEqual([accounts, true, undefined]);
  });

  it('should pass null resource config when namespace is undefined', () => {
    mockUseK8sWatchResourceList.mockReturnValue([[], false, undefined]);

    testHook(useWatchNIMAccounts)(undefined);

    expect(mockUseK8sWatchResourceList).toHaveBeenCalledWith(null, NIMAccountModel, undefined);
  });
});
