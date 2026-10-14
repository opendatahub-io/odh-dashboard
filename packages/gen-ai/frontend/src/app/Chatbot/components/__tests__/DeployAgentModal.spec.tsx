import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import DeployAgentModal from '~/app/Chatbot/components/DeployAgentModal';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/AIAssets/components/agentprofiles/AgentConfigurationCard', () => ({
  __esModule: true,
  default: ({
    title,
    profile,
  }: {
    title: string;
    profile: { spec: { model: { id: string } } };
  }) => (
    <div data-testid="configuration-snapshot">
      {title}: {profile.spec.model.id}
    </div>
  ),
}));

const profile = {
  spec: {
    displayName: 'HR Chatbot',
    model: { id: 'llama-3.1-8b', uri: 'https://models.example.com/v1' },
  },
};

describe('DeployAgentModal', () => {
  const defaultProps = {
    isDeploying: false,
    missingMCPServerAuth: [],
    existingDeploymentNames: [],
    onDeploy: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a deployment name and the reused configuration snapshot', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" {...defaultProps} />);

    expect(screen.getByTestId('deploy-agent-name-input')).toHaveValue('hr-chatbot-1');
    expect(
      screen.getByText('The deployment endpoint will be available when creation completes.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Advanced: use a different serving name')).not.toBeInTheDocument();
    expect(screen.getByTestId('configuration-snapshot')).toHaveTextContent(
      'Configuration snapshot: llama-3.1-8b',
    );
  });

  it('renders the current configuration passed for deployment', () => {
    render(
      <DeployAgentModal
        profile={{
          spec: {
            ...profile.spec,
            model: { id: 'llama-4-scout', uri: 'https://models.example.com/v1' },
          },
        }}
        namespace="my-project"
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId('configuration-snapshot')).toHaveTextContent(
      'Configuration snapshot: llama-4-scout',
    );
  });

  it('uses the lowest available numeric suffix for the default name', () => {
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        existingDeploymentNames={['hr-chatbot-1', 'hr-chatbot-3']}
      />,
    );

    expect(screen.getByTestId('deploy-agent-name-input')).toHaveValue('hr-chatbot-2');
  });

  it('disables deployment when the entered name is already in use', async () => {
    const user = userEvent.setup();
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        existingDeploymentNames={['hr-chatbot-2']}
      />,
    );

    const input = screen.getByTestId('deploy-agent-name-input');
    await user.clear(input);
    await user.type(input, 'hr-chatbot-2');
    await user.tab();

    expect(
      screen.getByText(
        'An agent deployment with this name already exists. Choose a different name.',
      ),
    ).toBeVisible();
    expect(screen.getByTestId('deploy-agent-submit-button')).toBeDisabled();
  });

  it('does not report the in-flight deployment name as a duplicate', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        existingDeploymentNames={[]}
      />,
    );

    await user.click(screen.getByTestId('deploy-agent-name-input'));
    await user.tab();

    rerender(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        isDeploying
        existingDeploymentNames={['hr-chatbot-1']}
      />,
    );

    expect(
      screen.queryByText(
        'An agent deployment with this name already exists. Choose a different name.',
      ),
    ).not.toBeInTheDocument();
  });

  it('warns and disables deployment when selected MCP server authorization is missing', () => {
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        missingMCPServerAuth={['GitHub-MCP-Server']}
      />,
    );

    expect(screen.getByTestId('deploy-agent-mcp-auth-warning')).toHaveTextContent(
      'Connect GitHub-MCP-Server in the MCP servers tab before deploying',
    );
    expect(screen.getByTestId('deploy-agent-submit-button')).toBeDisabled();
  });

  it('tracks deployment submission and cancellation', async () => {
    const user = userEvent.setup();
    const onDeploy = jest.fn();
    const onClose = jest.fn();
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        onDeploy={onDeploy}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByTestId('deploy-agent-submit-button'));
    expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_SUBMITTED,
      { outcome: 'submit' },
    );
    expect(onDeploy).toHaveBeenCalledWith('hr-chatbot-1');

    await user.click(screen.getByTestId('deploy-agent-cancel-button'));
    expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_SUBMITTED,
      { outcome: 'cancel' },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not track cancellation when closing while deployment is in progress', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        isDeploying
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(fireMiscTrackingEvent).not.toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_SUBMITTED,
      { outcome: 'cancel' },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
