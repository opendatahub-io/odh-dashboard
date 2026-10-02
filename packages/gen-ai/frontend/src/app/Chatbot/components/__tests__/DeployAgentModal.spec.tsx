import * as React from 'react';
import { render, screen } from '@testing-library/react';
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
      screen.getByText('The deployment endpoint will be available when creation completes.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Advanced: use a different serving name')).not.toBeInTheDocument();
    expect(screen.getByTestId('configuration-snapshot')).toHaveTextContent(
      'Configuration snapshot',
    );
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
