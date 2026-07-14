import { useAccessReview } from '@odh-dashboard/internal/api/index';
import { useCanDeployAgent } from '~/app/hooks/useCanDeployAgent';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('@odh-dashboard/internal/api/index', () => ({
  useAccessReview: jest.fn(),
}));

const mockUseAccessReview = jest.mocked(useAccessReview);

describe('useCanDeployAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  it('returns select-project message when namespace is missing', () => {
    mockUseAccessReview.mockReturnValue([false, false]);

    const { result } = testHook(useCanDeployAgent)();

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: true,
      disabledReason: 'Select a project to deploy an agent',
    });
    expect(mockUseAccessReview).toHaveBeenCalledTimes(2);
    expect(mockUseAccessReview).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ namespace: '' }),
      false,
    );
  });

  it('returns checking-access message while permissions are loading', () => {
    mockUseAccessReview.mockReturnValueOnce([true, false]).mockReturnValueOnce([true, true]);

    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: false,
      disabledReason: 'Checking access...',
    });
    expect(mockUseAccessReview).toHaveBeenCalledTimes(2);
  });

  it('returns canDeploy true when create and get permissions are granted', () => {
    mockUseAccessReview.mockReturnValue([true, true]);

    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: true,
      loaded: true,
      disabledReason: '',
    });
    expect(mockUseAccessReview).toHaveBeenNthCalledWith(
      1,
      {
        group: 'agents.x-k8s.io',
        resource: 'sandboxes',
        verb: 'create',
        namespace: 'team1',
      },
      true,
    );
    expect(mockUseAccessReview).toHaveBeenNthCalledWith(
      2,
      {
        group: 'agents.x-k8s.io',
        resource: 'sandboxes',
        verb: 'get',
        namespace: 'team1',
      },
      true,
    );
  });

  it('returns permission-denied message when create access is denied', () => {
    mockUseAccessReview.mockReturnValueOnce([false, true]).mockReturnValueOnce([true, true]);

    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: true,
      disabledReason: 'You do not have permission to deploy agents in this project',
    });
  });

  it('returns permission-denied message when get access is denied', () => {
    mockUseAccessReview.mockReturnValueOnce([true, true]).mockReturnValueOnce([false, true]);

    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: true,
      disabledReason: 'You do not have permission to deploy agents in this project',
    });
  });
});
