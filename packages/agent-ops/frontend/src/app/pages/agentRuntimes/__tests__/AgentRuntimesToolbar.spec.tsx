import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentRuntimesToolbar from '~/app/pages/agentRuntimes/AgentRuntimesToolbar';
import { emptyAgentRuntimesFilterData } from '~/app/pages/agentRuntimes/const';

jest.mock('@odh-dashboard/ui-core/components/FilterToolbar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseCanDeployAgent = jest.fn();

jest.mock('~/app/hooks/useCanDeployAgent', () => ({
  useCanDeployAgent: (namespace?: string) => mockUseCanDeployAgent(namespace),
}));

describe('AgentRuntimesToolbar', () => {
  const onDeployAgent = jest.fn();
  const onFilterUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanDeployAgent.mockImplementation((namespace?: string) => ({
      canDeploy: !!namespace,
      loaded: true,
      disabledReason: namespace ? '' : 'Select a project to deploy an agent',
    }));
  });

  it('disables deploy agent button when no namespace is selected', () => {
    render(
      <AgentRuntimesToolbar
        deployMode
        filterData={emptyAgentRuntimesFilterData}
        onFilterUpdate={onFilterUpdate}
        onDeployAgent={onDeployAgent}
      />,
    );

    expect(screen.getByTestId('deploy-agent-button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onDeployAgent when deploy button is clicked with a namespace', async () => {
    const user = userEvent.setup();

    render(
      <AgentRuntimesToolbar
        deployMode
        namespace="team1"
        filterData={emptyAgentRuntimesFilterData}
        onFilterUpdate={onFilterUpdate}
        onDeployAgent={onDeployAgent}
      />,
    );

    const deployButton = screen.getByTestId('deploy-agent-button');
    expect(deployButton).toBeEnabled();

    await user.click(deployButton);
    expect(onDeployAgent).toHaveBeenCalledTimes(1);
  });

  it('disables deploy agent button when user lacks create permission', () => {
    mockUseCanDeployAgent.mockReturnValue({
      canDeploy: false,
      loaded: true,
      disabledReason: 'You do not have permission to deploy agents in this project',
    });

    render(
      <AgentRuntimesToolbar
        deployMode
        namespace="team1"
        filterData={emptyAgentRuntimesFilterData}
        onFilterUpdate={onFilterUpdate}
        onDeployAgent={onDeployAgent}
      />,
    );

    expect(screen.getByTestId('deploy-agent-button')).toHaveAttribute('aria-disabled', 'true');
  });
});
