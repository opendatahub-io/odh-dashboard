/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { PipelineRun, PipelinesApi } from '../../../api/pipelines';
import { ProductContextProvider } from '../../../context';
import { usePipelineRunQuery } from '../usePipelineRunQuery';

const mockPipelinesApi: PipelinesApi = {
  getPipelineRunsFromBFF: jest.fn(),
  getPipelineRunFromBFF: jest.fn(),
  enableManagedPipelines: jest.fn(),
  terminatePipelineRun: jest.fn(),
  retryPipelineRun: jest.fn(),
  deletePipelineRun: jest.fn(),
};

jest.mock('../../../api', () => ({
  ...jest.requireActual('../../../api'),
  createPipelinesApi: jest.fn(() => mockPipelinesApi),
}));

const isRunInTerminalState = jest.fn().mockReturnValue(false);
const parseErrorStatus = jest.fn().mockReturnValue(undefined);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      ProductContextProvider,
      {
        product: 'automl',
        apiPrefix: '/automl',
        bffApiVersion: 'v1',
        isRunInTerminalState,
        parseErrorStatus,
      },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

const mockRun: PipelineRun = {
  run_id: 'run-1',
  display_name: 'Run 1',
  created_at: '2025-01-17',
  state: 'RUNNING',
};

describe('usePipelineRunQuery', () => {
  const getPipelineRunFromBFF = jest.mocked(mockPipelinesApi.getPipelineRunFromBFF);

  beforeEach(() => {
    jest.clearAllMocks();
    isRunInTerminalState.mockReturnValue(false);
    parseErrorStatus.mockReturnValue(undefined);
  });

  it('should be disabled when runId or namespace is undefined', () => {
    const { result } = renderHook(() => usePipelineRunQuery(undefined, 'ns'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getPipelineRunFromBFF).not.toHaveBeenCalled();
  });

  it('should fetch the pipeline run when enabled', async () => {
    getPipelineRunFromBFF.mockResolvedValue(mockRun);
    const { result } = renderHook(() => usePipelineRunQuery('run-1', 'ns'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRun);
    expect(getPipelineRunFromBFF).toHaveBeenCalledWith('', 'run-1', 'ns', {
      signal: expect.any(AbortSignal),
    });
  });

  it('should apply the optional normalize callback to the fetched run', async () => {
    getPipelineRunFromBFF.mockResolvedValue(mockRun);
    const normalized = { ...mockRun, display_name: 'Normalized Run 1' };
    const normalize = jest.fn().mockReturnValue(normalized);
    const { result } = renderHook(() => usePipelineRunQuery('run-1', 'ns'), {
      wrapper: ({ children }) =>
        React.createElement(
          ProductContextProvider,
          {
            product: 'automl',
            apiPrefix: '/automl',
            bffApiVersion: 'v1',
            isRunInTerminalState,
            parseErrorStatus,
            normalize,
          },
          React.createElement(
            QueryClientProvider,
            { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
            children,
          ),
        ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(normalize).toHaveBeenCalledWith(mockRun);
    expect(result.current.data).toEqual(normalized);
  });

  it('should not retry on a 4xx error status', async () => {
    const httpError = new Error('status code 404');
    getPipelineRunFromBFF.mockRejectedValue(httpError);
    parseErrorStatus.mockReturnValue(404);
    const { result } = renderHook(() => usePipelineRunQuery('run-1', 'ns'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(getPipelineRunFromBFF).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(httpError);
  });
});
