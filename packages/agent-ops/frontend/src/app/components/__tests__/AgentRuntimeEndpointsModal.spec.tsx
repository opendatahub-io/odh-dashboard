import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import AgentRuntimeEndpointsModal from '~/app/components/AgentRuntimeEndpointsModal';
import { createReadyRuntime } from '~/app/pages/agentRuntimes/__tests__/agentRuntimeTestUtils';

jest.mock('~/app/hooks/useAgentRuntimeDetail', () => ({
  useAgentRuntimeDetail: jest.fn(),
}));

const mockUseAgentRuntimeDetail = jest.mocked(useAgentRuntimeDetail);

const createForbiddenError = () => {
  const error = new AxiosError('Forbidden');
  error.response = {
    status: 403,
    data: {},
    statusText: 'Forbidden',
    headers: {},
    config: {} as never,
  };
  return error;
};

describe('AgentRuntimeEndpointsModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail(),
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('should show a loading spinner while detail is loading', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([undefined, false, undefined, jest.fn()]);

    render(<AgentRuntimeEndpointsModal runtime={createReadyRuntime()} onClose={onClose} />);

    expect(screen.getByRole('progressbar', { name: 'Loading endpoints' })).toBeInTheDocument();
  });

  it('should show an access denied alert when detail returns 403', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([undefined, true, createForbiddenError(), jest.fn()]);

    render(<AgentRuntimeEndpointsModal runtime={createReadyRuntime()} onClose={onClose} />);

    expect(screen.getByTestId('agent-runtime-endpoints-error')).toHaveTextContent(
      'Access permissions needed',
    );
    expect(
      screen.getByText(
        'You do not have permission to view endpoint details for this agent deployment.',
      ),
    ).toBeInTheDocument();
  });

  it('should show a generic error alert when detail fails', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      undefined,
      true,
      new Error('Network error'),
      jest.fn(),
    ]);

    render(<AgentRuntimeEndpointsModal runtime={createReadyRuntime()} onClose={onClose} />);

    expect(screen.getByTestId('agent-runtime-endpoints-error')).toHaveTextContent(
      'Error loading endpoints',
    );
    expect(
      screen.getByText('Unable to load endpoint details. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('should render endpoint fields when detail loads successfully', () => {
    render(<AgentRuntimeEndpointsModal runtime={createReadyRuntime()} onClose={onClose} />);

    expect(
      screen.getByDisplayValue('http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080'),
    ).toBeInTheDocument();
  });
});
