/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router';
import type { PipelineRun } from '~/app/types';
import * as pipelinesApi from '~/app/api/pipelines';
import AutoragResults from '../AutoragResults';

jest.mock('react-router', () => ({
  useParams: jest.fn(),
}));

jest.mock('~/app/api/pipelines');

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutoRAGTaskTopology', () => ({
  useAutoRAGTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

const mockGetPipelineRunFromBFF = pipelinesApi.getPipelineRunFromBFF as jest.MockedFunction<
  typeof pipelinesApi.getPipelineRunFromBFF
>;

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoRAG Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

const createMockRun = (state: string): PipelineRun => ({
  run_id: 'test-run-123',
  display_name: 'Test Pipeline Run',
  description: 'Test description',
  state,
  created_at: '2025-01-17T10:00:00Z',
  runtime_config: {
    parameters: {
      test_param: 'test_value',
      another_param: 'another_value',
    },
  },
});

describe('AutoragResults', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchInterval: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    (useParams as jest.Mock).mockReturnValue({
      namespace: 'test-namespace',
      runId: 'run-123',
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AutoragResults />
      </QueryClientProvider>,
    );

  it('should render the configuration title with pipeline run name', async () => {
    mockGetPipelineRunFromBFF.mockResolvedValue(mockPipelineRun);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('My AutoRAG Run configurations')).toBeInTheDocument();
    });
  });

  it('should render the PipelineTopology component', async () => {
    mockGetPipelineRunFromBFF.mockResolvedValue(mockPipelineRun);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
    });
  });

  it('should pass the autorag-topology-container className to PipelineTopology', async () => {
    mockGetPipelineRunFromBFF.mockResolvedValue(mockPipelineRun);
    renderComponent();
    await waitFor(() => {
      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toHaveClass('autorag-topology-container');
    });
  });

  it('should pass nodes from useAutoRAGTaskTopology to PipelineTopology', async () => {
    mockGetPipelineRunFromBFF.mockResolvedValue(mockPipelineRun);
    renderComponent();
    await waitFor(() => {
      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toHaveAttribute('data-node-count', '2');
    });
  });

  it('should render gracefully when pipelineRun is undefined', async () => {
    mockGetPipelineRunFromBFF.mockResolvedValue(undefined as unknown as PipelineRun);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('configurations')).toBeInTheDocument();
    });
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });
});

describe('AutoragResults Polling Behavior', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Disable automatic refetching in tests for predictable behavior
          refetchInterval: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    (useParams as jest.Mock).mockReturnValue({
      namespace: 'test-namespace',
      runId: 'test-run-123',
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AutoragResults />
      </QueryClientProvider>,
    );

  it('should fetch pipeline run data on mount', async () => {
    const mockRun = createMockRun('RUNNING');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledWith(
        '',
        'test-namespace',
        'test-run-123',
        expect.anything(),
      );
    });
  });

  it('should call API with correct parameters', async () => {
    const mockRun = createMockRun('SUCCEEDED');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledWith(
        '',
        'test-namespace',
        'test-run-123',
        expect.anything(),
      );
    });

    expect(mockGetPipelineRunFromBFF).toHaveBeenCalledTimes(1);
  });

  it('should render component when state is RUNNING', async () => {
    const mockRun = createMockRun('RUNNING');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should render component when state is PENDING', async () => {
    const mockRun = createMockRun('PENDING');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should render component when state is SUCCEEDED', async () => {
    const mockRun = createMockRun('SUCCEEDED');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should render component when state is FAILED', async () => {
    const mockRun = createMockRun('FAILED');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should render component when state is CANCELED', async () => {
    const mockRun = createMockRun('CANCELED');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockGetPipelineRunFromBFF.mockRejectedValue(new Error('API Error'));

    const { container } = renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalled();
    });

    expect(container).toBeInTheDocument();
  });

  it('should stop polling when pipeline run reaches terminal state', async () => {
    jest.useFakeTimers();

    // First call returns RUNNING, second call returns SUCCEEDED
    mockGetPipelineRunFromBFF
      .mockResolvedValueOnce(createMockRun('RUNNING'))
      .mockResolvedValueOnce(createMockRun('SUCCEEDED'));

    renderComponent();

    // Wait for the first fetch (initial load)
    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledTimes(1);
    });

    // Advance timers by 10000ms to trigger the next poll
    await jest.advanceTimersByTimeAsync(10000);

    // Wait for the second fetch
    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledTimes(2);
    });

    // Advance timers again - should NOT trigger another fetch because state is SUCCEEDED
    await jest.advanceTimersByTimeAsync(10000);

    // Assert that exactly 2 calls were made (no further calls after terminal state)
    expect(mockGetPipelineRunFromBFF).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
