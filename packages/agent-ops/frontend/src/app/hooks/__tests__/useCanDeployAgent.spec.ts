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
  });

  it('returns select-project message when namespace is missing', () => {
    mockUseAccessReview.mockReturnValue([false, false]);

    const { result } = testHook(useCanDeployAgent)();

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: true,
      disabledReason: 'Select a project to deploy an agent',
    });
  });

  it('returns checking-access message while permissions are loading', () => {
    mockUseAccessReview.mockReturnValue([false, false]);

    const { result } = testHook(useCanDeployAgent)('team1');

    expect(result.current).toEqual({
      canDeploy: false,
      loaded: false,
      disabledReason: 'Checking access...',
    });
  });
});
