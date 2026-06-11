import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { mockAgentCard } from '~/__mocks__/mockAgentCard';
import { AgentOptionalCapability } from '~/app/types/agentCard';
import { getAgentOptionalCapabilityTestId } from '~/app/pages/agentDeploymentDetail/agentDeploymentDetailUtils';
import AgentDeploymentCapabilitiesCard from '~/app/pages/agentDeploymentDetail/AgentDeploymentCapabilitiesCard';

describe('AgentDeploymentCapabilitiesCard', () => {
  it('should render skill name, id, and description', () => {
    render(<AgentDeploymentCapabilitiesCard agentCard={mockAgentCard()} />);

    expect(screen.getByTestId('agent-capabilities-skills-heading')).toHaveTextContent('Skills');
    expect(screen.getAllByTestId('agent-skill-name')[0]).toHaveTextContent('Ticket triage');
    expect(screen.getAllByTestId('agent-skill-id')[0]).toHaveTextContent('ID: ticket-triage');
    expect(screen.getAllByTestId('agent-skill-description')[0]).toHaveTextContent(
      'Classifies incoming support tickets by priority and topic.',
    );
    expect(screen.getAllByTestId('agent-skill-name')[1]).toHaveTextContent('Response drafting');
    expect(screen.getAllByTestId('agent-skill-id')[1]).toHaveTextContent('ID: response-draft');
  });

  it('should show Streaming label when streaming is enabled', () => {
    render(
      <AgentDeploymentCapabilitiesCard
        agentCard={mockAgentCard({ capabilities: { streaming: true, pushNotifications: false } })}
      />,
    );

    expect(
      screen.getByTestId(getAgentOptionalCapabilityTestId(AgentOptionalCapability.Streaming)),
    ).toHaveTextContent(AgentOptionalCapability.Streaming);
    expect(
      screen.queryByTestId(
        getAgentOptionalCapabilityTestId(AgentOptionalCapability.PushNotifications),
      ),
    ).not.toBeInTheDocument();
  });

  it('should show Push notifications label when pushNotifications is enabled', () => {
    render(
      <AgentDeploymentCapabilitiesCard
        agentCard={mockAgentCard({ capabilities: { streaming: false, pushNotifications: true } })}
      />,
    );

    expect(
      screen.getByTestId(
        getAgentOptionalCapabilityTestId(AgentOptionalCapability.PushNotifications),
      ),
    ).toHaveTextContent(AgentOptionalCapability.PushNotifications);
    expect(
      screen.queryByTestId(getAgentOptionalCapabilityTestId(AgentOptionalCapability.Streaming)),
    ).not.toBeInTheDocument();
  });

  it('should show empty value when no optional capabilities are enabled', () => {
    render(
      <AgentDeploymentCapabilitiesCard
        agentCard={mockAgentCard({ capabilities: { streaming: false, pushNotifications: false } })}
      />,
    );

    expect(screen.getByTestId('agent-capabilities-none')).toHaveTextContent('—');
  });

  it('should show no-skills message when skills array is empty', () => {
    render(<AgentDeploymentCapabilitiesCard agentCard={mockAgentCard({ skills: [] })} />);

    expect(screen.getByTestId('agent-capabilities-no-skills')).toHaveTextContent('No skills');
    expect(screen.queryByTestId('agent-skill-card')).not.toBeInTheDocument();
  });

  it('should show loading skeleton when agent card is not loaded', () => {
    render(<AgentDeploymentCapabilitiesCard agentCard={null} loaded={false} />);

    expect(screen.getByTestId('agent-capabilities-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-capabilities-no-skills')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-capabilities-none')).not.toBeInTheDocument();
  });

  it('should show error message when agent card fetch fails', () => {
    render(
      <AgentDeploymentCapabilitiesCard
        agentCard={null}
        loaded
        error={new Error('Failed to load agent card')}
      />,
    );

    expect(screen.getByTestId('agent-capabilities-error')).toHaveTextContent(
      'Failed to load agent card',
    );
    expect(screen.queryByTestId('agent-capabilities-no-skills')).not.toBeInTheDocument();
  });

  it('should show empty states when loaded with null agentCard', () => {
    render(<AgentDeploymentCapabilitiesCard agentCard={null} loaded />);

    expect(screen.getByTestId('agent-deployment-capabilities-card')).toBeInTheDocument();
    expect(screen.getByTestId('agent-capabilities-no-skills')).toBeInTheDocument();
    expect(screen.getByTestId('agent-capabilities-none')).toBeInTheDocument();
  });
});
