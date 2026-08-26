import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { PipelinesApi } from '../../../api/pipelines';
import { ProductContextProvider } from '../../../context';
import {
  useDeletePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '../usePipelineRunMutations';

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

const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      ProductContextProvider,
      {
        product: 'automl',
        apiPrefix: '/automl',
        bffApiVersion: 'v1',
        isRunInTerminalState: () => false,
        parseErrorStatus: () => undefined,
      },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

describe('pipeline run mutations', () => {
  const terminatePipelineRun = jest.mocked(mockPipelinesApi.terminatePipelineRun);
  const retryPipelineRun = jest.mocked(mockPipelinesApi.retryPipelineRun);
  const deletePipelineRun = jest.mocked(mockPipelinesApi.deletePipelineRun);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTerminatePipelineRunMutation', () => {
    it('should POST to the terminate endpoint', async () => {
      terminatePipelineRun.mockResolvedValueOnce();

      const { result } = renderHook(() => useTerminatePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(terminatePipelineRun).toHaveBeenCalledWith('ns', 'run-1');
    });

    it('should throw with the server error message on failure', async () => {
      terminatePipelineRun.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderHook(() => useTerminatePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('boom');
    });
  });

  describe('useRetryPipelineRunMutation', () => {
    it('should POST to the retry endpoint', async () => {
      retryPipelineRun.mockResolvedValueOnce();

      const { result } = renderHook(() => useRetryPipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(retryPipelineRun).toHaveBeenCalledWith('ns', 'run-1');
    });
  });

  describe('useDeletePipelineRunMutation', () => {
    it('should DELETE the run', async () => {
      deletePipelineRun.mockResolvedValueOnce();

      const { result } = renderHook(() => useDeletePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(deletePipelineRun).toHaveBeenCalledWith('ns', 'run-1');
    });

    it('should throw with the server error message on failure', async () => {
      deletePipelineRun.mockRejectedValueOnce(new Error('plain text error'));

      const { result } = renderHook(() => useDeletePipelineRunMutation('ns', 'run-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('plain text error');
    });
  });
});
