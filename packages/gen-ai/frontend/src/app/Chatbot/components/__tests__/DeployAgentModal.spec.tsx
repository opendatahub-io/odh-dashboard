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
  it('shows a deployment name and the reused configuration snapshot', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" onClose={jest.fn()} />);

    expect(screen.getByTestId('deploy-agent-name-input')).toHaveValue('hr-chatbot');
    expect(screen.getByTestId('configuration-snapshot')).toHaveTextContent(
      'Configuration snapshot',
    );
  });

  it('shows a public route preview when the serving name is customized', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('deploy-agent-advanced-options'));
    const servingName = screen.getByTestId('deploy-agent-serving-name-input');
    fireEvent.change(servingName, { target: { value: 'hr-api' } });

    expect(screen.getByText(/Public route: https:\/\/hr-api-my-project\./)).toBeInTheDocument();
  });

  it('validates the serving name as it changes', () => {
    render(<DeployAgentModal profile={profile} namespace="my-project" onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('deploy-agent-advanced-options'));
    fireEvent.change(screen.getByTestId('deploy-agent-serving-name-input'), {
      target: { value: 'not valid' },
    });

    expect(
      screen.getByText(/Use lowercase letters, numbers, and hyphens. The serving name must start/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('deploy-agent-submit-button')).toBeDisabled();
  });
});
