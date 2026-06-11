import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { mockAgentCard } from '~/__mocks__/mockAgentCard';
import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntimeDetail';
import { NO_REFRESH_INTERVAL } from '~/app/const';
import { useAgentCard } from '~/app/hooks/useAgentCard';
import AgentDeploymentOverviewTab from '~/app/pages/agentDeploymentDetail/AgentDeploymentOverviewTab';

jest.mock('~/app/hooks/useAgentCard', () => ({
  useAgentCard: jest.fn(),
}));

const mockUseAgentCard = jest.mocked(useAgentCard);

describe('AgentDeploymentOverviewTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentCard.mockReturnValue([mockAgentCard(), true, undefined, jest.fn()]);
  });

  it('should render description, capabilities, and agent details fields', () => {
    const detail = mockAgentRuntimeDetail();
    render(<AgentDeploymentOverviewTab detail={detail} />);

    expect(screen.getByTestId('agent-deployment-description')).toHaveTextContent(
      'Customer support agent',
    );
    expect(screen.getByTestId('agent-deployment-capabilities-card')).toBeInTheDocument();
    expect(screen.getByText('Capabilities')).toBeInTheDocument();
    expect(screen.getByTestId('agent-detail-version')).toHaveTextContent('1.2.0');
    expect(screen.getByTestId('agent-detail-provider-link')).toHaveTextContent('Open Data Hub');
    expect(screen.getByTestId('agent-detail-agent-card-copy')).toBeInTheDocument();
    expect(screen.getByTestId('agent-detail-authentication')).toHaveTextContent('Bearer');
    expect(screen.getByTestId('agent-detail-spiffe-copy')).toBeInTheDocument();
    expect(mockUseAgentCard).toHaveBeenCalledWith(
      detail.namespace,
      detail.name,
      NO_REFRESH_INTERVAL,
    );
  });
});
