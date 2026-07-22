import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentDeploymentsEmptyState from '~/app/pages/AgentDeploymentsEmptyState';

const mockUseCanDeployAgent = jest.fn();

jest.mock('~/app/hooks/useCanDeployAgent', () => ({
  useCanDeployAgent: (namespace?: string) => mockUseCanDeployAgent(namespace),
}));

describe('AgentDeploymentsEmptyState', () => {
  const onDeployAgent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanDeployAgent.mockReturnValue({
      canDeploy: true,
      loaded: true,
      disabledReason: '',
    });
  });

  it('should render deploy agent button in the empty state footer', async () => {
    const user = userEvent.setup();

    render(<AgentDeploymentsEmptyState namespace="team1" onDeployAgent={onDeployAgent} />);

    expect(screen.getByTestId('agent-deployments-empty-state')).toBeInTheDocument();
    const deployButton = screen.getByTestId('deploy-agent-button');
    expect(deployButton).toBeEnabled();

    await user.click(deployButton);
    expect(onDeployAgent).toHaveBeenCalledTimes(1);
  });
});
