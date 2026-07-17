import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgentDeploymentDetailGate from '~/app/components/AgentDeploymentDetailGate';

const mockUseAgentOpsDiscoveryMode = jest.fn();

jest.mock('~/app/hooks/useAgentOpsDiscoveryMode', () => ({
  useAgentOpsDiscoveryMode: () => mockUseAgentOpsDiscoveryMode(),
}));

describe('AgentDeploymentDetailGate', () => {
  it('redirects away when discovery mode is on', () => {
    mockUseAgentOpsDiscoveryMode.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/ai-hub/agents/deployments/team1/my-agent']}>
        <Routes>
          <Route
            path="/ai-hub/agents/deployments/:namespace/:agentId/*"
            element={
              <AgentDeploymentDetailGate>
                <div data-testid="detail-content">Detail page</div>
              </AgentDeploymentDetailGate>
            }
          />
          <Route
            path="/ai-hub/agents/deployments/:namespace"
            element={<div data-testid="list-page">List</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('detail-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('list-page')).toBeInTheDocument();
  });

  it('renders children when discovery mode is off', () => {
    mockUseAgentOpsDiscoveryMode.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/ai-hub/agents/deployments/team1/my-agent']}>
        <Routes>
          <Route
            path="/ai-hub/agents/deployments/:namespace/:agentId/*"
            element={
              <AgentDeploymentDetailGate>
                <div data-testid="detail-content">Detail page</div>
              </AgentDeploymentDetailGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('detail-content')).toBeInTheDocument();
  });
});
