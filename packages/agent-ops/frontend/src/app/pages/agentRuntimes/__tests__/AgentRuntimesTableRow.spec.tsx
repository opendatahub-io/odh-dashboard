import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table as PfTable, Tbody } from '@patternfly/react-table';
import { MemoryRouter } from 'react-router-dom';
import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import AgentRuntimesTableRow from '~/app/pages/agentRuntimes/AgentRuntimesTableRow';
import {
  createFailedRuntime,
  createMockAgentRuntime,
  createReadyRuntime,
} from './agentRuntimeTestUtils';

jest.mock('~/app/hooks/useAgentRuntimeDetail', () => ({
  useAgentRuntimeDetail: jest.fn(),
}));

const mockUseAgentRuntimeDetail = jest.mocked(useAgentRuntimeDetail);

const renderRow = (runtime: AgentRuntime) =>
  render(
    <MemoryRouter>
      <PfTable>
        <Tbody>
          <AgentRuntimesTableRow runtime={runtime} />
        </Tbody>
      </PfTable>
    </MemoryRouter>,
  );

describe('AgentRuntimesTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail(),
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('should render name and namespace columns', () => {
    renderRow(createMockAgentRuntime());
    expect(screen.getByTestId('agent-runtime-name')).toHaveTextContent('sample-support-agent');
    expect(screen.getByTestId('agent-runtime-namespace')).toHaveTextContent('agent-ops-demo');
  });

  it('should wire status label from runtime status', () => {
    renderRow(createReadyRuntime());
    expect(screen.getByTestId('agent-runtime-status-label')).toBeInTheDocument();
  });

  it('should disable View when runtime has no endpoints', () => {
    renderRow(createFailedRuntime());
    expect(screen.getByTestId('agent-runtime-endpoint-view')).toBeDisabled();
  });

  it('should open endpoints modal when View is clicked', async () => {
    const user = userEvent.setup();
    renderRow(createReadyRuntime());

    await user.click(screen.getByTestId('agent-runtime-endpoint-view'));
    expect(screen.getByTestId('agent-runtime-endpoints-modal')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
      ),
    ).toBeInTheDocument();
  });

  it('should show View details row action', async () => {
    const user = userEvent.setup();
    renderRow(createReadyRuntime());

    await user.click(screen.getByRole('button', { name: 'Kebab toggle' }));
    expect(screen.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Restart' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
