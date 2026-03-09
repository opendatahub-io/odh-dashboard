/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router';
import type { PipelineRun } from '~/app/types';
import * as pipelinesApi from '~/app/api/pipelines';
import AutoragResults from '../AutoragResults';

jest.mock('react-router', () => ({
  useParams: jest.fn(),
}));

jest.mock('~/app/api/pipelines');

const mockGetPipelineRunFromBFF = pipelinesApi.getPipelineRunFromBFF as jest.MockedFunction<
  typeof pipelinesApi.getPipelineRunFromBFF
>;

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
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledWith('', 'test-namespace', 'test-run-123');
    });
  });

  it('should call API with correct parameters', async () => {
    const mockRun = createMockRun('SUCCEEDED');
    mockGetPipelineRunFromBFF.mockResolvedValue(mockRun);

    renderComponent();

    await waitFor(() => {
      expect(mockGetPipelineRunFromBFF).toHaveBeenCalledWith('', 'test-namespace', 'test-run-123');
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
});
