import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { mockAgentRuntime, mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';
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

  it('should show an empty state when detail loads without endpoints', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({
        runtime: {
          ...mockAgentRuntimeDetail().runtime,
          endpointUrl: '',
          ports: [],
        },
        serviceEndpoints: [],
        agentCard: null,
      }),
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <AgentRuntimeEndpointsModal
        runtime={mockAgentRuntime({ endpointUrl: '', ports: [] })}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('agent-runtime-endpoints-empty')).toBeInTheDocument();
    expect(screen.getByText('No endpoints available')).toBeInTheDocument();
    expect(screen.getByText(/No endpoints are available for this agent yet/i)).toBeInTheDocument();
  });

  it('should show a pending-specific empty state message', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({
        runtime: mockAgentRuntime({ status: 'pending', endpointUrl: '', ports: [] }),
        serviceEndpoints: [],
        agentCard: null,
        workloadStatus: 'pending',
      }),
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <AgentRuntimeEndpointsModal
        runtime={mockAgentRuntime({ status: 'pending', endpointUrl: '', ports: [] })}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('agent-runtime-endpoints-empty')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Endpoints appear when the agent Sandbox is Ready and the cluster Service is available. Check back shortly.',
      ),
    ).toBeInTheDocument();
  });

  it('should show a failed-specific empty state message', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({
        runtime: mockAgentRuntime({ status: 'failed', endpointUrl: '', ports: [] }),
        serviceEndpoints: [],
        agentCard: null,
        workloadStatus: 'failed',
      }),
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <AgentRuntimeEndpointsModal
        runtime={mockAgentRuntime({ status: 'failed', endpointUrl: '', ports: [] })}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('agent-runtime-endpoints-empty')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This agent is not healthy. Open the agent detail page to review conditions and resolve deployment issues.',
      ),
    ).toBeInTheDocument();
  });

  it('should show a stopped-specific empty state message', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({
        runtime: mockAgentRuntime({ status: 'stopped', endpointUrl: '', ports: [] }),
        serviceEndpoints: [],
        agentCard: null,
        workloadStatus: 'stopped',
      }),
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <AgentRuntimeEndpointsModal
        runtime={mockAgentRuntime({ status: 'stopped', endpointUrl: '', ports: [] })}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('agent-runtime-endpoints-empty')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This agent is stopped. Start it to restore in-cluster and external endpoints.',
      ),
    ).toBeInTheDocument();
  });

  it('should show a not-ready-specific empty state message', () => {
    mockUseAgentRuntimeDetail.mockReturnValue([
      mockAgentRuntimeDetail({
        runtime: mockAgentRuntime({ status: 'not ready', endpointUrl: '', ports: [] }),
        serviceEndpoints: [],
        agentCard: null,
        workloadStatus: 'not ready',
      }),
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <AgentRuntimeEndpointsModal
        runtime={mockAgentRuntime({ status: 'not ready', endpointUrl: '', ports: [] })}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('agent-runtime-endpoints-empty')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Endpoints appear when the agent Sandbox is Ready and the cluster Service is available. Check back shortly.',
      ),
    ).toBeInTheDocument();
  });
});
