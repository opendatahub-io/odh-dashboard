import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigateToDeployAgentWizard } from '~/app/deployWizard/useNavigateToDeployAgentWizard';
import { agentOpsDeploymentsRoute, getAgentDeployWizardRoute } from '~/app/utilities/routes';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/ai-hub/agents/deployments/providers/native/projects/team1',
  }),
}));

describe('useNavigateToDeployAgentWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not navigate when namespace is missing', () => {
    const { result } = renderHook(() => useNavigateToDeployAgentWizard(), {
      wrapper: MemoryRouter,
    });

    result.current(undefined);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to wizard with namespace and return route', () => {
    const { result } = renderHook(() => useNavigateToDeployAgentWizard(), {
      wrapper: MemoryRouter,
    });

    result.current('team1');

    expect(mockNavigate).toHaveBeenCalledWith(getAgentDeployWizardRoute('team1'), {
      state: {
        namespace: 'team1',
        returnRoute: agentOpsDeploymentsRoute('team1'),
      },
    });
  });
});
