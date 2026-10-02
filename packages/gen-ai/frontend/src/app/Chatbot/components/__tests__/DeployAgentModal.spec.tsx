import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DeployAgentModal from '~/app/Chatbot/components/DeployAgentModal';

jest.mock('~/app/AIAssets/components/agentprofiles/AgentConfigurationCard', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => (
    <div data-testid="configuration-snapshot">{title}</div>
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
    onDeploy: jest.fn(),
    onClose: jest.fn(),
  };

  it('shows a deployment name and the reused configuration snapshot', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" {...defaultProps} />);

    expect(screen.getByTestId('deploy-agent-name-input')).toHaveValue('hr-chatbot');
    expect(
      screen.getByText(/Endpoint: https:\/\/hr-chatbot-my-project\..*\/v1\/responses/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('configuration-snapshot')).toHaveTextContent(
      'Configuration snapshot',
    );
  });

  it('shows a public route preview when the serving name is customized', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" {...defaultProps} />);

    fireEvent.click(screen.getByText('Advanced: use a different serving name'));
    const servingName = screen.getByTestId('deploy-agent-serving-name-input');
    fireEvent.change(servingName, { target: { value: 'hr-api' } });

    expect(
      screen.getByText(/Public route: https:\/\/hr-api-my-project\..*\/v1\/responses/),
    ).toBeInTheDocument();
  });

  it('validates the serving name as it changes', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" {...defaultProps} />);

    fireEvent.click(screen.getByText('Advanced: use a different serving name'));
    fireEvent.change(screen.getByTestId('deploy-agent-serving-name-input'), {
      target: { value: 'not valid' },
    });

    expect(
      screen.getByText(/Use lowercase letters, numbers, and hyphens. The serving name must start/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('deploy-agent-submit-button')).toBeDisabled();
  });

  it('submits the advanced serving name when it is enabled', () => {
    const onDeploy = jest.fn();
    render(
      <DeployAgentModal
        profile={profile}
        namespace="my-project"
        {...defaultProps}
        onDeploy={onDeploy}
      />,
    );

    fireEvent.click(screen.getByText('Advanced: use a different serving name'));
    fireEvent.change(screen.getByTestId('deploy-agent-serving-name-input'), {
      target: { value: 'hr-api' },
    });
    fireEvent.click(screen.getByTestId('deploy-agent-submit-button'));

    expect(onDeploy).toHaveBeenCalledWith('hr-api');
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
});
